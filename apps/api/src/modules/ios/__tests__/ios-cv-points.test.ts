import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeCanonicalCvRotationPoints,
  resolveBookingCvRotationPointsBackend,
  summarizeOrderLedgerCvPoints,
} from '../services/ios-cv-points.helper.js';

describe('ios-cv-points helper', () => {
  it('deduplicates multi-user BonusPoint rows on the same order_service (prefers assigned_staff_id)', () => {
    const summary = summarizeOrderLedgerCvPoints({
      orderServices: [
        {
          osId: 367988,
          orderId: 338985,
          assignedStaffId: 51154,
          serviceKey: 'new-ultralight-550',
          serviceName: 'Ultralight 550',
          serviceType: 'Normal',
          isTemporary: 0,
        },
      ],
      bonusRows: [
        { order_service_id: 367988, user_id: 37790, bonus_amount: 3, type: 'OrderServiceClass', opt_key: 'round' },
        { order_service_id: 367988, user_id: 37790, bonus_amount: 7, type: 'OrderServiceType', opt_key: 'Normal' },
        {
          order_service_id: 367988,
          user_id: 37790,
          bonus_amount: 7,
          type: 'OrderServiceAttributeDesign',
          opt_key: 'doll',
        },
        { order_service_id: 367988, user_id: 37790, bonus_amount: 1, type: 'OrderServiceAttributeFan', opt_key: '3d' },
        {
          order_service_id: 367988,
          user_id: 37790,
          bonus_amount: 20,
          type: 'OrderServiceAttributeLashes',
          opt_key: '60',
        },
        {
          order_service_id: 367988,
          user_id: 37790,
          bonus_amount: 0,
          type: 'OrderServiceAttributeColor',
          opt_key: 'black',
        },
        { order_service_id: 367988, user_id: 51154, bonus_amount: 3, type: 'OrderServiceClass', opt_key: 'round' },
        { order_service_id: 367988, user_id: 51154, bonus_amount: 7, type: 'OrderServiceType', opt_key: 'Normal' },
        {
          order_service_id: 367988,
          user_id: 51154,
          bonus_amount: 7,
          type: 'OrderServiceAttributeDesign',
          opt_key: 'doll',
        },
        { order_service_id: 367988, user_id: 51154, bonus_amount: 1, type: 'OrderServiceAttributeFan', opt_key: '3d' },
        {
          order_service_id: 367988,
          user_id: 51154,
          bonus_amount: 20,
          type: 'OrderServiceAttributeLashes',
          opt_key: '60',
        },
        {
          order_service_id: 367988,
          user_id: 51154,
          bonus_amount: 0,
          type: 'OrderServiceAttributeColor',
          opt_key: 'black',
        },
      ],
    });

    const orderSummary = summary.get(338985);
    assert.equal(orderSummary?.ledgerPoints, 38);
    assert.deepEqual(orderSummary?.actualSpecs, {
      volume: '3D',
      count: '60 fan',
      style: 'Doll',
      color: 'Đen Tuyền (Jet Black)',
    });
  });

  it('falls back to recorded FM/manager user bucket when assigned_staff_id is CVL without direct BonusPoint rows', () => {
    const summary = summarizeOrderLedgerCvPoints({
      orderServices: [
        {
          osId: 368464,
          orderId: 339415,
          assignedStaffId: 3832,
          serviceKey: 'new-hyperlight-770-refill',
          serviceName: 'Hyperlight 770 Refill',
          serviceType: 'Retain',
          isTemporary: 0,
        },
      ],
      bonusRows: [
        { order_service_id: 368464, user_id: 37790, bonus_amount: 3, type: 'OrderServiceClass', opt_key: 'round' },
        { order_service_id: 368464, user_id: 37790, bonus_amount: 0, type: 'OrderServiceType', opt_key: 'Retain' },
        {
          order_service_id: 368464,
          user_id: 37790,
          bonus_amount: 0,
          type: 'OrderServiceAttributeDesign',
          opt_key: 'natural',
        },
        { order_service_id: 368464, user_id: 37790, bonus_amount: 2, type: 'OrderServiceAttributeFan', opt_key: '4d' },
        {
          order_service_id: 368464,
          user_id: 37790,
          bonus_amount: 23,
          type: 'OrderServiceAttributeLashes',
          opt_key: '70',
        },
        {
          order_service_id: 368464,
          user_id: 37790,
          bonus_amount: 0,
          type: 'OrderServiceAttributeColor',
          opt_key: 'black',
        },
      ],
    });

    const orderSummary = summary.get(339415);
    assert.equal(orderSummary?.ledgerPoints, 28);
    assert.deepEqual(orderSummary?.actualSpecs, {
      volume: '4X',
      count: '70 fan',
      style: 'Natural',
      color: 'Đen Tuyền (Jet Black)',
    });
  });

  it('sums Upper + Under Mink services on the same order and marks hasUnderMink', () => {
    const summary = summarizeOrderLedgerCvPoints({
      orderServices: [
        {
          osId: 368354,
          orderId: 339317,
          assignedStaffId: 46272,
          serviceKey: 'new-volume-550',
          serviceName: 'Volume 550',
          serviceType: 'Normal',
          isTemporary: 0,
        },
        {
          osId: 368512,
          orderId: 339317,
          assignedStaffId: 46272,
          serviceKey: 'new-flawless.mink-390',
          serviceName: 'Flawless Under Mink 390',
          serviceType: 'Normal',
          isTemporary: 0,
        },
      ],
      bonusRows: [
        { order_service_id: 368354, user_id: 37790, bonus_amount: 3, type: 'OrderServiceClass', opt_key: 'round' },
        { order_service_id: 368354, user_id: 37790, bonus_amount: 7, type: 'OrderServiceType', opt_key: 'Normal' },
        {
          order_service_id: 368354,
          user_id: 37790,
          bonus_amount: 6,
          type: 'OrderServiceAttributeDesign',
          opt_key: 'wing',
        },
        { order_service_id: 368354, user_id: 37790, bonus_amount: 0, type: 'OrderServiceAttributeFan', opt_key: '1d' },
        {
          order_service_id: 368354,
          user_id: 37790,
          bonus_amount: 26,
          type: 'OrderServiceAttributeLashes',
          opt_key: '80',
        },
        {
          order_service_id: 368354,
          user_id: 37790,
          bonus_amount: 5,
          type: 'OrderServiceAttributeColor',
          opt_key: 'brown',
        },
        { order_service_id: 368512, user_id: 37790, bonus_amount: 5, type: 'OrderServiceClass', opt_key: 'round' },
        { order_service_id: 368512, user_id: 37790, bonus_amount: 7, type: 'OrderServiceType', opt_key: 'Normal' },
        {
          order_service_id: 368512,
          user_id: 37790,
          bonus_amount: 0,
          type: 'OrderServiceAttributeDesign',
          opt_key: 'natural',
        },
        { order_service_id: 368512, user_id: 37790, bonus_amount: 0, type: 'OrderServiceAttributeFan', opt_key: '1d' },
        {
          order_service_id: 368512,
          user_id: 37790,
          bonus_amount: 17,
          type: 'OrderServiceAttributeLashes',
          opt_key: '20',
        },
      ],
    });

    const orderSummary = summary.get(339317);
    assert.equal(orderSummary?.ledgerPoints, 76);
    assert.equal(orderSummary?.actualSpecs.hasUnderMink, true);
    assert.equal(orderSummary?.actualSpecs.underMinkServiceType, 'Normal');
    assert.equal(orderSummary?.actualSpecs.color, 'Nâu Tự Nhiên (Choco Brown)');
  });

  it('rounds fractional ledger points accurately and extracts 5X 50 Wing from Hyperlight 660', () => {
    const fractional = summarizeOrderLedgerCvPoints({
      orderServices: [
        {
          osId: 368462,
          orderId: 339414,
          assignedStaffId: 25337,
          serviceKey: 'new-classic-440',
          serviceName: 'Classic 440',
          serviceType: 'Normal',
        },
      ],
      bonusRows: [
        { order_service_id: 368462, user_id: 37790, bonus_amount: 3.5, type: 'OrderServiceType', opt_key: 'Normal' },
        {
          order_service_id: 368462,
          user_id: 37790,
          bonus_amount: 11.5,
          type: 'OrderServiceAttributeLashes',
          opt_key: '70',
        },
      ],
    });
    assert.equal(fractional.get(339414)?.ledgerPoints, 15);

    const hangSummary = summarizeOrderLedgerCvPoints({
      orderServices: [
        {
          osId: 368436,
          orderId: 339389,
          assignedStaffId: 13783,
          serviceKey: 'new-hyperlight-660',
          serviceName: 'Hyperlight 660',
          serviceType: 'Normal',
        },
      ],
      bonusRows: [
        { order_service_id: 368436, user_id: 13783, bonus_amount: 3, type: 'OrderServiceClass', opt_key: 'round' },
        { order_service_id: 368436, user_id: 13783, bonus_amount: 7, type: 'OrderServiceType', opt_key: 'Normal' },
        {
          order_service_id: 368436,
          user_id: 13783,
          bonus_amount: 6,
          type: 'OrderServiceAttributeDesign',
          opt_key: 'wing',
        },
        { order_service_id: 368436, user_id: 13783, bonus_amount: 3, type: 'OrderServiceAttributeFan', opt_key: '5d' },
        {
          order_service_id: 368436,
          user_id: 13783,
          bonus_amount: 17,
          type: 'OrderServiceAttributeLashes',
          opt_key: '50',
        },
      ],
    });
    assert.equal(hangSummary.get(339389)?.ledgerPoints, 36);
    assert.deepEqual(hangSummary.get(339389)?.actualSpecs, {
      volume: '5X',
      count: '50 fan',
      style: 'Wing',
    });
  });

  it('computes canonical CV rotation points matching official rules', () => {
    assert.equal(
      computeCanonicalCvRotationPoints({ material: 'HyperLight', volume: '3X', count: '50 fan', serviceType: 'Retain' })
        .totalPoints,
      21
    );
    assert.equal(
      computeCanonicalCvRotationPoints({ material: 'HyperLight', volume: '3X', count: '50 fan', serviceType: 'Normal' })
        .totalPoints,
      28
    );
    assert.equal(
      computeCanonicalCvRotationPoints({ material: 'HyperLight', volume: '4X', count: '70 fan', serviceType: 'Retain' })
        .totalPoints,
      28
    );
    assert.equal(
      computeCanonicalCvRotationPoints({ material: 'HyperLight', volume: '4X', count: '70 fan', serviceType: 'Normal' })
        .totalPoints,
      35
    );
    assert.equal(
      computeCanonicalCvRotationPoints({
        material: 'UltraLight',
        volume: '3D',
        count: '60 fan',
        serviceType: 'Normal',
        style: 'Doll',
      }).totalPoints,
      38
    );
    assert.equal(
      resolveBookingCvRotationPointsBackend({
        serviceName: 'HyperLight 4X 770',
        serviceType: 'Retain',
        attributes: { material: 'HyperLight', volume: '4X', count: '70 fan' },
      }),
      28
    );
  });
});
