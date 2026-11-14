import test from 'node:test';
import assert from 'node:assert/strict';
import { SafeAny } from '@mos-lab/shared';
import { scanIosProductByCode, ScannedWarehouseCandidateRow } from './services/ios-product-scan.service.js';
import { buildLegacyOrderPayloads, LegacyOrderCatalogSnapshot } from './services/ios-legacy-payload.mapper.js';
import { IosAuthContext } from './services/ios-auth.service.js';

const mockActor: IosAuthContext = {
  id: 88,
  role: 'cc',
  careerTier: 'CC',
  legacyStaffId: 37790,
  displayName: 'Diễm Hương',
  clientStoreId: 6,
};

function makeCandidate(overrides: Partial<ScannedWarehouseCandidateRow> = {}): ScannedWarehouseCandidateRow {
  return {
    inventoryWarehouseItemId: 8001,
    inventoryWarehouseId: 12,
    inventoryItemId: 501,
    firstInventoryWarehouseOrderItemId: 1045,
    scanCode: 'QR-YEP-8001',
    itemState: 'New',
    warehouseClientStoreId: 6,
    warehouseDisabled: 0,
    storeName: 'Wings Điện Biên Phủ',
    productId: 36,
    productSku: 'YEPPEUM-01',
    productDisabled: 0,
    productName: 'Dưỡng Mi Yeppeum Korea (Giá gốc 1.100.000đ)',
    unitPrice: 1100000,
    ...overrides,
  };
}

test('scanIosProductByCode accepts New branch item by scan_code or #serial and strips legacy price suffix', async () => {
  const res = await scanIosProductByCode(
    mockActor,
    { bookingId: 339999, code: '#1045' },
    {
      findOrderById: async () => ({ id: 339999, clientStoreId: 6, orderState: 'Servicing' }),
      findWarehouseCandidatesByCode: async () => [makeCandidate()],
      findActiveOrderProductConflict: async () => null,
      loadBookingOverride: async () => null,
      listBookingOverrides: async () => [],
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.product?.productName, 'Dưỡng Mi Yeppeum Korea');
  assert.equal(res.payload.product?.unitPrice, 1100000);
  assert.equal(res.payload.product?.scannedUnit.inventoryWarehouseItemId, 8001);
  assert.equal(res.payload.product?.scannedUnit.firstInventoryWarehouseOrderItemId, 1045);
});

test('scanIosProductByCode rejects non-New states (Using / Used), wrong branch, and duplicate cart/order scans', async () => {
  // 1. Wrong branch
  const wrongBranch = await scanIosProductByCode(
    mockActor,
    { bookingId: 339999, code: 'QR-Q3' },
    {
      findOrderById: async () => ({ id: 339999, clientStoreId: 6, orderState: 'Servicing' }),
      findWarehouseCandidatesByCode: async () => [
        makeCandidate({ warehouseClientStoreId: 3, storeName: 'Wings Quận 3' }),
      ],
      findActiveOrderProductConflict: async () => null,
      loadBookingOverride: async () => null,
      listBookingOverrides: async () => [],
    }
  );
  assert.equal(wrongBranch.statusCode, 409);
  assert.match(wrongBranch.payload.error || '', /Wings Quận 3/);

  // 2. Used state rejected
  const usedState = await scanIosProductByCode(
    mockActor,
    { bookingId: 339999, code: 'QR-USED' },
    {
      findOrderById: async () => ({ id: 339999, clientStoreId: 6, orderState: 'Servicing' }),
      findWarehouseCandidatesByCode: async () => [makeCandidate({ itemState: 'Used' })],
      findActiveOrderProductConflict: async () => null,
      loadBookingOverride: async () => null,
      listBookingOverrides: async () => [],
    }
  );
  assert.equal(usedState.statusCode, 409);
  assert.match(usedState.payload.error || '', /Used/);

  // 3. Using state rejected
  const usingState = await scanIosProductByCode(
    mockActor,
    { bookingId: 339999, code: 'QR-USING' },
    {
      findOrderById: async () => ({ id: 339999, clientStoreId: 6, orderState: 'Servicing' }),
      findWarehouseCandidatesByCode: async () => [makeCandidate({ itemState: 'Using' })],
      findActiveOrderProductConflict: async () => null,
      loadBookingOverride: async () => null,
      listBookingOverrides: async () => [],
    }
  );
  assert.equal(usingState.statusCode, 409);
  assert.match(usingState.payload.error || '', /Using/);

  // 4. Duplicate in current cart scannedItemIds
  const duplicateCart = await scanIosProductByCode(
    mockActor,
    { bookingId: 339999, code: 'QR-YEP-8001', scannedItemIds: [8001] },
    {
      findOrderById: async () => ({ id: 339999, clientStoreId: 6, orderState: 'Servicing' }),
      findWarehouseCandidatesByCode: async () => [makeCandidate()],
      findActiveOrderProductConflict: async () => null,
      loadBookingOverride: async () => null,
      listBookingOverrides: async () => [],
    }
  );
  assert.equal(duplicateCart.statusCode, 409);
  assert.match(duplicateCart.payload.error || '', /đã được quét/i);

  // 5. Held in another active booking override
  const heldOtherBooking = await scanIosProductByCode(
    mockActor,
    { bookingId: 339999, code: 'QR-YEP-8001' },
    {
      findOrderById: async () => ({ id: 339999, clientStoreId: 6, orderState: 'Servicing' }),
      findWarehouseCandidatesByCode: async () => [makeCandidate()],
      findActiveOrderProductConflict: async () => null,
      loadBookingOverride: async () => null,
      listBookingOverrides: async () => [
        {
          bookingId: 339888,
          override: {
            status: 'SERVICING',
            cartProducts: [
              {
                productId: 36,
                quantity: 1,
                scannedUnits: [{ inventoryWarehouseItemId: 8001, firstInventoryWarehouseOrderItemId: 1045 }],
              },
            ],
          },
        },
      ],
    }
  );
  assert.equal(heldOtherBooking.statusCode, 409);
  assert.match(heldOtherBooking.payload.error || '', /339888/);
});

test('buildLegacyOrderPayloads groups multiple scanned warehouse units into PHP per-unit price & array of item IDs', () => {
  const catalog: LegacyOrderCatalogSnapshot = {
    orderExists: true,
    orderId: 339999,
    customerUserId: 88991,
    clientStoreId: 6,
    currentOrderState: 'Consultation',
    promotionId: null,
    userUrlId: null,
    existingOrderServiceIds: [501001],
    upperService: {
      serviceId: 5,
      serviceGroup: 'LashesTop',
      singlePriceId: 15,
      singlePriceAmount: 340000,
      balancePriceId: 16,
      staffSurveySetId: 2,
      customerSurveySetId: 3,
    },
    products: [
      {
        productId: 36,
        inventoryWarehouseItemId: 8001,
        firstInventoryWarehouseOrderItemId: 1045,
        unitPrice: 1100000,
        quantity: 1,
        discountAmount: 0,
      },
      {
        productId: 36,
        inventoryWarehouseItemId: 8002,
        firstInventoryWarehouseOrderItemId: 1046,
        unitPrice: 1100000,
        quantity: 1,
        discountAmount: 0,
      },
    ],
    staffFiveStarSurveyAnswers: {},
    customerHappySurveyAnswers: {},
  };

  const built = buildLegacyOrderPayloads({
    orderId: 339999,
    assignedStaffId: 46272,
    serviceName: 'Classic 1D',
    servicePrice: 340000,
    cartProducts: [
      {
        productId: 36,
        productName: 'Dưỡng Mi Yeppeum Korea',
        price: 1100000,
        quantity: 2,
        scannedUnits: [
          { inventoryWarehouseItemId: 8001, firstInventoryWarehouseOrderItemId: 1045, scanCode: 'QR-8001' },
          { inventoryWarehouseItemId: 8002, firstInventoryWarehouseOrderItemId: 1046, scanCode: 'QR-8002' },
        ],
      },
    ],
    billing: {
      paymentMethod: 'CASH',
      tipAmount: 0,
    },
    catalog: catalog as SafeAny,
  });

  assert.equal(built.selectedProductForPayment.length, 1);
  assert.deepEqual(built.selectedProductForPayment[0].first_inventory_warehouse_order_item_ids, ['1045', '1046']);
  assert.equal(built.selectedProductForPayment[0].product_price, '1100000');
  assert.equal(built.selectedProductForPayment[0].tax_amount, '176000');
});
