import assert from 'node:assert/strict';
import test from 'node:test';
import { LashSpecificationService } from './lash-specification.service.js';

test('LashSpecificationService: returns empty map when orderIds array is empty or contains non-positive numbers', async () => {
  let queryCalled = false;
  const mockFastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async () => {
          queryCalled = true;
          return [];
        },
      },
    },
  };

  const res = await LashSpecificationService.getLashSpecsByOrderIds(mockFastify as never, []);
  assert.equal(res.size, 0);
  assert.equal(queryCalled, false);

  const res2 = await LashSpecificationService.getLashSpecsByOrderIds(mockFastify as never, [0, -1, NaN]);
  assert.equal(res2.size, 0);
  assert.equal(queryCalled, false);
});

test('LashSpecificationService: correctly extracts and maps 7 technical specs for completed order', async () => {
  const mockFastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('FROM order_service os')) {
            return [
              {
                orderServiceId: 101n,
                orderId: 3001n,
                serviceId: 88n,
                attributeGroupKey: 'grp_3001',
                serviceName: 'New Flawless Mink 1440',
              },
            ];
          }
          if (sql.includes('FROM item_attribute_value iav')) {
            return [
              { groupKey: 'grp_3001', itemGroupId: '88', attributeId: 10n, val: 'Tự Nhiên' }, // Dáng
              { groupKey: 'grp_3001', itemGroupId: '88', attributeId: 9n, val: 'C' }, // Cong
              { groupKey: 'grp_3001', itemGroupId: '88', attributeId: 15n, val: '0.10' }, // Độ dày
              { groupKey: 'grp_3001', itemGroupId: '88', attributeId: 11n, val: '12' }, // Dài
              { groupKey: 'grp_3001', itemGroupId: '88', attributeId: 11n, val: '9' }, // Dài (should sort 9, 12)
              { groupKey: 'grp_3001', itemGroupId: '88', attributeId: 11n, val: '10' }, // Dài (should sort 9, 10, 12)
              { groupKey: 'grp_3001', itemGroupId: '88', attributeId: 12n, val: '110' }, // Số sợi
              { groupKey: 'grp_3001', itemGroupId: '88', attributeId: 13n, val: '1D' }, // Fan
              { groupKey: 'grp_3001', itemGroupId: '88', attributeId: 14n, val: 'Đen' }, // Màu
            ];
          }
          return [];
        },
      },
    },
  };

  const res = await LashSpecificationService.getLashSpecsByOrderIds(mockFastify as never, [3001]);
  assert.equal(res.size, 1);
  const specs = res.get(3001);
  assert.ok(specs);
  assert.equal(specs.length, 1);

  const spec = specs[0];
  assert.equal(spec.serviceId, 88);
  assert.equal(spec.serviceName, 'New Flawless Mink 1440');
  assert.equal(spec.style, 'Tự Nhiên');
  assert.equal(spec.curl, 'C');
  assert.equal(spec.thickness, '0.10');
  assert.equal(spec.length, '9, 10, 12');
  assert.equal(spec.strandCount, '110');
  assert.equal(spec.fan, '1D');
  assert.equal(spec.color, 'Đen');
});

test('LashSpecificationService: handles multi-service orders (Upper + Under lash) with distinct specs', async () => {
  const mockFastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('FROM order_service os')) {
            return [
              {
                orderServiceId: 201n,
                orderId: 4001n,
                serviceId: 88n,
                attributeGroupKey: 'grp_multi',
                serviceName: 'Mi Trên',
              },
              {
                orderServiceId: 202n,
                orderId: 4001n,
                serviceId: 127n,
                attributeGroupKey: 'grp_multi',
                serviceName: 'Mi Dưới',
              },
            ];
          }
          if (sql.includes('FROM item_attribute_value iav')) {
            return [
              // Upper lash
              { groupKey: 'grp_multi', itemGroupId: '88', attributeId: 10n, val: 'Wing' },
              { groupKey: 'grp_multi', itemGroupId: '88', attributeId: 9n, val: 'C' },
              { groupKey: 'grp_multi', itemGroupId: '88', attributeId: 15n, val: '0.07' },
              { groupKey: 'grp_multi', itemGroupId: '88', attributeId: 11n, val: '11' },
              { groupKey: 'grp_multi', itemGroupId: '88', attributeId: 12n, val: '80' },
              { groupKey: 'grp_multi', itemGroupId: '88', attributeId: 13n, val: '2D' },
              { groupKey: 'grp_multi', itemGroupId: '88', attributeId: 14n, val: 'Đen' },
              // Under lash
              { groupKey: 'grp_multi', itemGroupId: '127', attributeId: 10n, val: 'Tự Nhiên' },
              { groupKey: 'grp_multi', itemGroupId: '127', attributeId: 9n, val: 'B' },
              { groupKey: 'grp_multi', itemGroupId: '127', attributeId: 15n, val: '0.10' },
              { groupKey: 'grp_multi', itemGroupId: '127', attributeId: 11n, val: '7' },
              { groupKey: 'grp_multi', itemGroupId: '127', attributeId: 12n, val: '20' },
              { groupKey: 'grp_multi', itemGroupId: '127', attributeId: 13n, val: '1D' },
              { groupKey: 'grp_multi', itemGroupId: '127', attributeId: 14n, val: 'Đen' },
            ];
          }
          return [];
        },
      },
    },
  };

  const res = await LashSpecificationService.getLashSpecsByOrderIds(mockFastify as never, [4001]);
  assert.equal(res.size, 1);
  const specs = res.get(4001);
  assert.ok(specs);
  assert.equal(specs.length, 2);

  const upper = specs.find((s) => s.serviceId === 88);
  assert.ok(upper);
  assert.equal(upper.serviceName, 'Mi Trên');
  assert.equal(upper.style, 'Wing');
  assert.equal(upper.curl, 'C');
  assert.equal(upper.thickness, '0.07');
  assert.equal(upper.length, '11');
  assert.equal(upper.strandCount, '80');
  assert.equal(upper.fan, '2D');

  const under = specs.find((s) => s.serviceId === 127);
  assert.ok(under);
  assert.equal(under.serviceName, 'Mi Dưới');
  assert.equal(under.style, 'Tự Nhiên');
  assert.equal(under.curl, 'B');
  assert.equal(under.thickness, '0.10');
  assert.equal(under.length, '7');
  assert.equal(under.strandCount, '20');
  assert.equal(under.fan, '1D');
});
