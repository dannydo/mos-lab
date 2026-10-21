import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import type { SafeAny } from '@mos-lab/shared';
import {
  buildDefaultWorkflowTemplates,
  computeInventoryReconciliation,
  executeWorkflowSystemHook,
  saveOrUpgradeWorkflowFromThread,
} from './chat-workflow.service.js';

describe('mOS Chat Dynamic Workflow Engine & System Hooks', () => {
  it('provides built-in Cash Advance (CASHFLOW_ENTRY) and Inventory Audit (STOCK_INVENTORY) templates', () => {
    const templates = buildDefaultWorkflowTemplates();
    assert.equal(templates.length, 2);

    const cashAdvance = templates.find((t) => t.code === 'WF_CASH_ADVANCE');
    assert.ok(cashAdvance);
    assert.equal(cashAdvance.targetSystemHook, 'CASHFLOW_ENTRY');
    assert.equal(cashAdvance.steps.length, 5);
    assert.equal(cashAdvance.steps[3].requireAttachment, true);

    const inventoryAudit = templates.find((t) => t.code === 'WF_INVENTORY_AUDIT');
    assert.ok(inventoryAudit);
    assert.equal(inventoryAudit.targetSystemHook, 'STOCK_INVENTORY');
    assert.equal(inventoryAudit.steps.length, 2);
  });

  it('computes inventory reconciliation variance against mOS Stock Inventory', async () => {
    const mockFastify = {
      prisma: {
        crm: {
          crmStockInventory: {
            findMany: async () => [
              {
                id: 10,
                materialId: 101,
                materialName: 'Keo nối mi Dark Lashes',
                unit: 'Chai',
                quantity: 20,
                warehouse: 'detham',
              },
              {
                id: 11,
                materialId: 102,
                materialName: 'Khay mi Lụa 0.07 C',
                unit: 'Khay',
                quantity: 50,
                warehouse: 'detham',
              },
            ],
          },
        },
      },
    } as unknown as FastifyInstance;

    const report = await computeInventoryReconciliation(mockFastify, 'detham', [
      { materialName: 'Keo nối mi Dark Lashes', actualQty: 18 },
      { materialName: 'Khay mi Lụa 0.07 C', actualQty: 52 },
    ]);

    assert.equal(report.length, 2);
    assert.equal(report[0].systemQty, 20);
    assert.equal(report[0].actualQty, 18);
    assert.equal(report[0].variance, -2);
    assert.equal(report[1].systemQty, 50);
    assert.equal(report[1].actualQty, 52);
    assert.equal(report[1].variance, 2);
  });

  it('automatically records PAID CrmCashFlowEntry and CrmCashFlowAudit when Cash Advance workflow completes', async () => {
    let createdEntry: SafeAny = null;
    let createdAudit: SafeAny = null;

    const mockFastify = {
      prisma: {
        crm: {
          crmCashFlowEntry: {
            create: async ({ data }: SafeAny) => {
              createdEntry = { id: 889, ...data };
              return createdEntry;
            },
          },
          crmCashFlowAudit: {
            create: async ({ data }: SafeAny) => {
              createdAudit = { id: 901, ...data };
              return createdAudit;
            },
          },
        },
      },
    } as unknown as FastifyInstance;

    const templates = buildDefaultWorkflowTemplates();
    const cashTpl = templates[0];

    const res = await executeWorkflowSystemHook(
      mockFastify,
      {
        id: 'wf-inst-test-1',
        templateId: cashTpl.id,
        templateCode: cashTpl.code,
        templateName: cashTpl.name,
        category: 'FINANCE',
        targetSystemHook: 'CASHFLOW_ENTRY',
        title: 'Tạm ứng mua vật tư sự kiện',
        conversationId: 'space-ops',
        messageId: 'msg-1',
        status: 'COMPLETED',
        currentStepIndex: 4,
        initiatorStaffId: 12,
        initiatorName: 'Tâm Nguyễn',
        steps: cashTpl.steps,
        stepLogs: [
          {
            stepIndex: 2,
            stepId: 'step-3-ceo',
            stepTitle: 'CEO phê duyệt',
            status: 'APPROVED',
            actorStaffId: 1,
            actorName: 'Danny Do',
          },
        ],
        formData: {
          amount: 2500000,
          reason: 'Mua hoa và backdrop workshop',
          cashFlowCategory: 'OPEX',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      12,
      'Tâm Nguyễn'
    );

    assert.equal(res.syncedRecordType, 'CASHFLOW_ENTRY');
    assert.equal(res.syncedRecordId, 889);
    assert.ok(createdEntry);
    assert.equal(createdEntry.flowType, 'OUTFLOW');
    assert.equal(createdEntry.amount, 2500000);
    assert.equal(createdEntry.status, 'PAID');
    assert.ok(createdAudit);
    assert.equal(createdAudit.entryId, 889);
  });

  it('packages an ad-hoc chat thread into a reusable workflow and upgrades it via chat instruction', async () => {
    const savedConfigs: Record<string, string> = {};
    const mockFastify = {
      prisma: {
        crm: {
          crmConfig: {
            findUnique: async ({ where }: SafeAny) =>
              savedConfigs[where.key] ? { key: where.key, value: savedConfigs[where.key] } : null,
            upsert: async ({ where, create, update }: SafeAny) => {
              savedConfigs[where.key] = update?.value || create?.value;
              return { key: where.key, value: savedConfigs[where.key] };
            },
          },
        },
      },
    } as unknown as FastifyInstance;

    const created = await saveOrUpgradeWorkflowFromThread(
      mockFastify,
      {
        conversationId: 'space-ops',
        messageId: 'msg-thread-1',
        code: 'WF_CUSTOM_PURCHASE',
        name: 'Quy trình Duyệt Mua Sắm Nội Bộ',
        category: 'FINANCE',
        targetSystemHook: 'CASHFLOW_ENTRY',
      },
      'Danny (Super Admin)',
      [
        { senderName: 'Minh Thư', senderRole: 'STAFF', text: 'Em xin đề xuất mua thêm đèn nối mi' },
        { senderName: 'Tâm Nguyễn', senderRole: 'MANAGER', text: 'Chị duyệt nhé, chuyển trình anh Danny' },
        { senderName: 'Kế Toán', senderRole: 'ACCOUNTANT', text: 'Đã chuyển khoản và gửi ảnh UNC' },
      ],
      buildDefaultWorkflowTemplates()
    );

    assert.equal(created.code, 'WF_CUSTOM_PURCHASE');
    assert.equal(created.version, 1);
    assert.equal(created.steps.length, 4);

    // Upgrade workflow via natural language instruction
    const upgraded = await saveOrUpgradeWorkflowFromThread(
      mockFastify,
      {
        conversationId: 'space-ops',
        messageId: 'msg-thread-1',
        code: 'WF_CUSTOM_PURCHASE',
        name: 'Quy trình Duyệt Mua Sắm Nội Bộ',
        upgradeInstruction: 'Thêm bước Kế toán trưởng kiểm tra hóa đơn VAT',
      },
      'Danny (Super Admin)',
      [],
      [created]
    );

    assert.equal(upgraded.code, 'WF_CUSTOM_PURCHASE');
    assert.equal(upgraded.version, 2);
    assert.equal(upgraded.steps.length, 5);
  });
});
