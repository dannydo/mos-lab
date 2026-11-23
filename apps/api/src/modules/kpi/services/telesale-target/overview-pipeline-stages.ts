import type { FastifyInstance } from 'fastify';
import type {
  SafeAny,
  TelesalePipelineStage,
  TelesalePipelineStageKey,
  TelesaleTargetConfigDto,
} from '@mos-lab/shared';

export async function computePipelineStages(
  fastify: FastifyInstance,
  params: {
    monthOrders: SafeAny[];
    startDateTimeStr: string;
    config: TelesaleTargetConfigDto;
  }
): Promise<TelesalePipelineStage[]> {
  const { monthOrders, startDateTimeStr, config } = params;

  // 6. Aggregate 4 Pipeline Stages (Done in Month per stage)
  const stageCounts: Record<TelesalePipelineStageKey, { done: number; comboLiveDone: number; totalAssigned: number }> =
    {
      '0_30': { done: 0, comboLiveDone: 0, totalAssigned: 0 },
      '31_60': { done: 0, comboLiveDone: 0, totalAssigned: 0 },
      '61_120': { done: 0, comboLiveDone: 0, totalAssigned: 0 },
      gt_120: { done: 0, comboLiveDone: 0, totalAssigned: 0 },
    };

  try {
    // Decoupled batch resolution for daysSinceLastVisit
    const ordersNeedingDays = monthOrders.filter(
      (o) => o.daysSinceLastVisit === undefined && o.customerId && o.dateCreated
    );
    if (ordersNeedingDays.length > 0) {
      const uniqueCustomerIds = Array.from(
        new Set(ordersNeedingDays.map((o) => Number(o.customerId)).filter((id) => Number.isInteger(id) && id > 0))
      );
      if (uniqueCustomerIds.length > 0) {
        const prevOrdersSql = `
            SELECT 
              user_id as customerId,
              booking_date_start as bookingDateStart,
              date_created as dateCreated
            FROM \`order\`
            WHERE user_id IN (${uniqueCustomerIds.join(',')})
              AND order_state = 'Completed'
              AND date_created >= DATE_SUB('${startDateTimeStr}', INTERVAL 180 DAY)
            ORDER BY user_id, date_created DESC
          `;
        const prevRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(prevOrdersSql).catch(() => []);

        const prevOrdersByCustomer = new Map<number, Array<{ bookingDateStart: SafeAny; dateCreated: SafeAny }>>();
        for (const row of prevRows || []) {
          const cid = Number(row.customerId);
          let list = prevOrdersByCustomer.get(cid);
          if (!list) {
            list = [];
            prevOrdersByCustomer.set(cid, list);
          }
          list.push({
            bookingDateStart: row.bookingDateStart,
            dateCreated: row.dateCreated,
          });
        }

        const toDateStr = (val: SafeAny): string | null => {
          if (!val) return null;
          if (val instanceof Date) return val.toISOString().slice(0, 10);
          if (typeof val === 'string') return val.slice(0, 10);
          return null;
        };

        const toTimestamp = (val: SafeAny): number => {
          if (!val) return 0;
          if (val instanceof Date) return val.getTime();
          return new Date(val).getTime();
        };

        for (const ord of ordersNeedingDays) {
          const cid = Number(ord.customerId);
          const customerPrevOrders = prevOrdersByCustomer.get(cid);
          if (!customerPrevOrders || customerPrevOrders.length === 0) {
            ord.daysSinceLastVisit = 999;
            continue;
          }
          const ordCreatedTs = toTimestamp(ord.dateCreated);
          const ordDateStr = toDateStr(ord.dateCreated);
          const prevOrder = customerPrevOrders.find((p) => {
            const pCreatedTs = toTimestamp(p.dateCreated);
            return pCreatedTs < ordCreatedTs && p.bookingDateStart;
          });

          if (prevOrder && ordDateStr) {
            const prevBookingDateStr = toDateStr(prevOrder.bookingDateStart);
            if (prevBookingDateStr) {
              const d1 = new Date(ordDateStr).getTime();
              const d2 = new Date(prevBookingDateStr).getTime();
              const diffDays = Math.max(0, Math.round((d1 - d2) / 86400000));
              ord.daysSinceLastVisit = diffDays;
            } else {
              ord.daysSinceLastVisit = 999;
            }
          } else {
            ord.daysSinceLastVisit = 999;
          }
        }
      }
    }

    for (const ord of monthOrders) {
      const days = ord.daysSinceLastVisit !== undefined ? Number(ord.daysSinceLastVisit) : 999;
      const isCombo = Number(ord.isComboLive) === 1;
      let targetKey: TelesalePipelineStageKey;
      if (days <= 30) {
        targetKey = '0_30';
      } else if (days <= 60) {
        targetKey = '31_60';
      } else if (days <= 120) {
        targetKey = '61_120';
      } else {
        targetKey = 'gt_120';
      }

      if (isCombo) {
        stageCounts[targetKey].comboLiveDone++;
      } else {
        stageCounts[targetKey].done++;
      }
    }
  } catch (err) {
    fastify.log.warn(`Failed to compute pipeline stage month orders: ${err}`);
  }

  // Query customer pool counts for the 4 stages
  try {
    const poolCountsSql = `
        SELECT 
          CASE 
            WHEN DATEDIFF(CURDATE(), up.last_order_booking) <= 30 THEN '0_30'
            WHEN DATEDIFF(CURDATE(), up.last_order_booking) <= 60 THEN '31_60'
            WHEN DATEDIFF(CURDATE(), up.last_order_booking) <= 120 THEN '61_120'
            ELSE 'gt_120'
          END as stageKey,
          COUNT(DISTINCT u.id) as totalCount
        FROM \`user\` u
        JOIN \`user_profile\` up ON u.id = up.user_id
        WHERE u.user_type = 1 
          AND up.last_order_booking IS NOT NULL
        GROUP BY stageKey
      `;
    const poolRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(poolCountsSql).catch(() => []);
    for (const r of poolRows) {
      const key = r.stageKey as TelesalePipelineStageKey;
      if (stageCounts[key]) {
        stageCounts[key].totalAssigned = Number(r.totalCount || 0);
      }
    }
  } catch (e) {
    fastify.log.warn(`Could not compute pool counts: ${e}`);
  }

  return [
    {
      key: '0_30',
      label: '0D – 30D',
      subLabel: 'CHĂM SÓC CHU KỲ',
      stageName: 'Chăm sóc chu kỳ',
      description: 'Bảo hành kiểu Úc (1-3 ngày), Chạm 14, 19, 21 nhắc chu kỳ dặm mi',
      doneTarget: config.stageTargets['0_30'] || 200,
      doneActual: stageCounts['0_30'].done,
      comboLiveDoneActual: stageCounts['0_30'].comboLiveDone,
      totalAssignedCount: stageCounts['0_30'].totalAssigned,
      calledCount: Math.min(stageCounts['0_30'].done * 3, stageCounts['0_30'].totalAssigned),
      conversionRate:
        stageCounts['0_30'].totalAssigned > 0
          ? Number(((stageCounts['0_30'].done / stageCounts['0_30'].totalAssigned) * 100).toFixed(1))
          : 0,
      actionNote: 'Data được chia đều cho từng nhân sự (cá nhân hoá khách hàng)',
      itemsSummary: [
        'Bảo hành kiểu ÚC (1 - 3 ngày)',
        'Chạm 14 (hỏi thăm, quan tâm)',
        'Chạm 19 (nhắc chu kỳ dặm mi)',
        'Chạm 21 (nhắc chu kỳ dặm mi)',
      ],
    },
    {
      key: '31_60',
      label: '31D – 60D',
      subLabel: 'MISS YOU',
      stageName: 'Miss You',
      description: 'Khơi gợi nhu cầu booking làm mới (không ưu đãi)',
      doneTarget: config.stageTargets['31_60'] || 110,
      doneActual: stageCounts['31_60'].done,
      comboLiveDoneActual: stageCounts['31_60'].comboLiveDone,
      totalAssignedCount: stageCounts['31_60'].totalAssigned,
      calledCount: Math.min(stageCounts['31_60'].done * 4, stageCounts['31_60'].totalAssigned),
      conversionRate:
        stageCounts['31_60'].totalAssigned > 0
          ? Number(((stageCounts['31_60'].done / stageCounts['31_60'].totalAssigned) * 100).toFixed(1))
          : 0,
      actionNote: 'Data được chia đều cho từng nhân sự (cá nhân hoá khách hàng)',
      itemsSummary: ['Khơi gợi nhu cầu booking làm mới', 'Kịch bản tự nhiên, không giảm giá tràn lan'],
    },
    {
      key: '61_120',
      label: '61D – 120D',
      subLabel: 'COMEBACK',
      stageName: 'Comeback (30%)',
      description: '30% Mời khách hàng quay lại',
      doneTarget: config.stageTargets['61_120'] || 80,
      doneActual: stageCounts['61_120'].done,
      comboLiveDoneActual: stageCounts['61_120'].comboLiveDone,
      totalAssignedCount: stageCounts['61_120'].totalAssigned,
      calledCount: Math.min(stageCounts['61_120'].done * 5, stageCounts['61_120'].totalAssigned),
      conversionRate:
        stageCounts['61_120'].totalAssigned > 0
          ? Number(((stageCounts['61_120'].done / stageCounts['61_120'].totalAssigned) * 100).toFixed(1))
          : 0,
      actionNote: 'Data được chia đều cho từng nhân sự (cá nhân hoá khách hàng)',
      badge: '30% Ưu Đãi',
      itemsSummary: ['30% Mời khách hàng quay lại', 'Khảo sát lý do gián đoạn dịch vụ'],
    },
    {
      key: 'gt_120',
      label: '> 120D',
      subLabel: 'WAKE UP',
      stageName: 'Cua Lại Vợ Bầu (50%)',
      description: 'Chiến dịch Cua lại vợ bầu · Teamwork cùng khai thác chung',
      doneTarget: config.stageTargets.gt_120 || 60,
      doneActual: stageCounts.gt_120.done,
      comboLiveDoneActual: stageCounts.gt_120.comboLiveDone,
      totalAssignedCount: stageCounts.gt_120.totalAssigned,
      calledCount: Math.min(stageCounts.gt_120.done * 6, stageCounts.gt_120.totalAssigned),
      conversionRate:
        stageCounts.gt_120.totalAssigned > 0
          ? Number(((stageCounts.gt_120.done / stageCounts.gt_120.totalAssigned) * 100).toFixed(1))
          : 0,
      actionNote: 'Tạo chức năng mới Teamwork tất cả mọi người vào khai thác chung 1 chỗ',
      badge: '50% Ưu Đãi',
      itemsSummary: [
        '50% Mời khách hàng quay lại',
        'Chiến dịch Cua lại vợ bầu',
        'Teamwork tất cả mọi người khai thác chung',
      ],
    },
  ];
}
