import { SafeAny } from '@mos-lab/shared';

export interface OrderRevenueBreakdown {
  totalTax: number;
  finalRevCombo: number;
  finalRevProduct: number;
  finalRevLe: number;
  finalNetCombo: number;
  finalNetProduct: number;
  finalNetLe: number;
}

export function computeOrderRevenueBreakdown(
  orderTotal: number,
  orderCombos: SafeAny[],
  orderProducts: SafeAny[],
  orderServices: SafeAny[]
): OrderRevenueBreakdown {
  const totalTax =
    orderServices.reduce((sum, s) => sum + Number(s.tax_amount || 0), 0) +
    orderCombos.reduce((sum, c) => sum + Number(c.tax_amount || 0), 0) +
    orderProducts.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);

  const comboRev = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
  const productRev = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0), 0);

  let finalRevCombo = comboRev;
  let finalRevProduct = productRev;
  let finalRevLe = 0;

  if (orderTotal < 0) {
    if (comboRev + productRev === 0) {
      finalRevLe = orderTotal;
    } else {
      const scale = orderTotal / (comboRev + productRev);
      finalRevCombo = comboRev * scale;
      finalRevProduct = productRev * scale;
    }
  } else {
    if (comboRev + productRev > orderTotal) {
      const scale = orderTotal / (comboRev + productRev);
      finalRevCombo = comboRev * scale;
      finalRevProduct = productRev * scale;
    } else {
      finalRevLe = orderTotal - comboRev - productRev;
    }
  }

  const comboNet = orderCombos.reduce((sum, c) => sum + Number(c.total_price || 0) - Number(c.tax_amount || 0), 0);
  const productNet = orderProducts.reduce((sum, p) => sum + Number(p.total_price || 0) - Number(p.tax_amount || 0), 0);
  const orderNet = orderTotal - totalTax;

  let finalNetCombo = comboNet;
  let finalNetProduct = productNet;
  let finalNetLe = 0;

  if (orderNet < 0) {
    if (comboNet + productNet === 0) {
      finalNetLe = orderNet;
    } else {
      const scaleNet = orderNet / (comboNet + productNet);
      finalNetCombo = comboNet * scaleNet;
      finalNetProduct = productNet * scaleNet;
    }
  } else {
    if (comboNet + productNet > orderNet) {
      const scaleNet = orderNet / (comboNet + productNet);
      finalNetCombo = comboNet * scaleNet;
      finalNetProduct = productNet * scaleNet;
    } else {
      finalNetLe = orderNet - comboNet - productNet;
    }
  }

  return {
    totalTax,
    finalRevCombo,
    finalRevProduct,
    finalRevLe,
    finalNetCombo,
    finalNetProduct,
    finalNetLe,
  };
}

interface PopulateCcShiftsAndRevenueParams {
  branchDetailMap: Record<string, SafeAny>;
  allSchedules: SafeAny[];
  weekOffRows: SafeAny[];
  dayOffs: SafeAny[];
  workingShifts: SafeAny[];
  targetDateStr: string;
  staffMap: Map<number, string>;
  comingOrders: SafeAny[];
  comingServicesByOrderId: Map<number, SafeAny[]>;
  comingCombosByOrderId: Map<number, SafeAny[]>;
  comingProductsByOrderId: Map<number, SafeAny[]>;
  ccClientOrderIds: Map<number, Set<number>>;
}

const getShiftType = (startTime: SafeAny, endTime: SafeAny): 'sáng' | 'chiều' | 'full' => {
  if (!startTime) return 'full';

  let startStr = '';
  if (typeof startTime === 'string') {
    startStr = startTime;
  } else if (startTime instanceof Date) {
    startStr = startTime.toISOString().substr(11, 8);
  } else if (startTime && typeof startTime === 'object' && startTime.toISOString) {
    startStr = startTime.toISOString().substr(11, 8);
  }

  let endStr = '';
  if (typeof endTime === 'string') {
    endStr = endTime;
  } else if (endTime instanceof Date) {
    endStr = endTime.toISOString().substr(11, 8);
  } else if (endTime && typeof endTime === 'object' && endTime.toISOString) {
    endStr = endTime.toISOString().substr(11, 8);
  }

  if (startStr.startsWith('09:00') || startStr.startsWith('08:30')) {
    if (endStr.startsWith('18:00') || endStr.startsWith('17:00')) {
      return 'sáng';
    }
    return 'full';
  } else if (startStr >= '10:30') {
    return 'chiều';
  }
  return 'full';
};

export function populateCcShiftsAndRevenue({
  branchDetailMap,
  allSchedules,
  weekOffRows,
  dayOffs,
  workingShifts,
  targetDateStr,
  staffMap,
  comingOrders,
  comingServicesByOrderId,
  comingCombosByOrderId,
  comingProductsByOrderId,
  ccClientOrderIds,
}: PopulateCcShiftsAndRevenueParams) {
  const schedulesByUserId: { [uid: number]: SafeAny[] } = {};
  for (const s of allSchedules) {
    const uid = Number(s.user_id);
    const list = schedulesByUserId[uid] || [];
    list.push(s);
    schedulesByUserId[uid] = list;
  }

  const weekOffsByUserId: { [uid: number]: { weekday: number; cnt: number }[] } = {};
  for (const r of weekOffRows) {
    const uid = Number(r.userId);
    const day = Number(r.weekday);
    const cnt = Number(r.cnt);
    const list = weekOffsByUserId[uid] || [];
    list.push({ weekday: day, cnt });
    weekOffsByUserId[uid] = list;
  }

  const offUserIds = new Set(dayOffs.map((d) => Number(d.from_user_id)));
  const dayOfWeek = new Date(targetDateStr).getDay();
  const weekdayStr = dayOfWeek === 0 ? '7' : String(dayOfWeek);

  const shiftMap = new Map<number, SafeAny>();
  workingShifts.forEach((ws) => {
    shiftMap.set(Number(ws.user_id), ws);
  });

  // Update CCs' shift, attendance, and doing from actual check-in records (workingShifts)
  Object.keys(branchDetailMap).forEach((bKey) => {
    branchDetailMap[bKey].cc.forEach((cc: SafeAny) => {
      const wsRecord = shiftMap.get(cc.id);

      let shift: 'sáng' | 'chiều' | 'full' | 'off' = 'full';
      const list = schedulesByUserId[cc.id] || [];
      const todaySchedule =
        list.find((s) => s.type === 'Weekday' && s.type_value === weekdayStr) ||
        list.find((s) => s.type === 'Day' && s.type_value === 'All');
      if (todaySchedule) {
        shift = getShiftType(todaySchedule.start_time, todaySchedule.end_time);
      }

      const weekOffs = weekOffsByUserId[cc.id] || [];
      let isWeekOff = false;
      if (weekOffs.length > 0) {
        const sorted = [...weekOffs].sort((a, b) => b.cnt - a.cnt);
        isWeekOff = String(sorted[0].weekday) === weekdayStr;
      } else if (list.length > 0) {
        const worksAll = list.some((s) => s.type === 'Day' && s.type_value === 'All');
        if (!worksAll) {
          const workingWeekdays = list.filter((s) => s.type === 'Weekday').map((s) => s.type_value);
          if (workingWeekdays.length > 0 && !workingWeekdays.includes(weekdayStr)) {
            isWeekOff = true;
          }
        }
      }

      const hasSpecificDayOff = offUserIds.has(cc.id);
      const isOffCC = isWeekOff || hasSpecificDayOff;

      if (isOffCC) {
        shift = 'off';
      }

      let attendance: 'none' | 'checked_in' | 'checked_out' | 'late' = 'none';
      let doing = isOffCC ? 'Nghỉ phép tuần' : 'Chưa check-in';

      if (wsRecord) {
        if (!isOffCC || wsRecord.check_in_staff_task_id !== null) {
          shift = getShiftType(wsRecord.start_time, wsRecord.end_time);
        }
        if (wsRecord.check_out_staff_task_id !== null) {
          attendance = 'checked_out';
          doing = 'Đã về';
        } else if (wsRecord.check_in_staff_task_id !== null) {
          attendance = 'checked_in';
          doing = 'Trống (Sẵn sàng đón khách)';
        }
      }

      cc.shift = shift;
      cc.attendance = attendance;
      cc.doing = doing;
    });
  });

  // Helper function to find and move CC to their active branch today
  const getOrMoveCC = (ccId: number, targetBranchKey: string) => {
    let ccObj: SafeAny = null;
    Object.keys(branchDetailMap).forEach((k) => {
      const foundIdx = branchDetailMap[k].cc.findIndex((c: SafeAny) => c.id === ccId);
      if (foundIdx !== -1) {
        ccObj = branchDetailMap[k].cc[foundIdx];
        if (k !== targetBranchKey) {
          branchDetailMap[k].cc.splice(foundIdx, 1);
        }
      }
    });

    if (!ccObj) {
      const staffName = staffMap.get(ccId) || 'Tư vấn viên';
      ccObj = {
        id: ccId,
        name: staffName,
        doing: 'Đang hoạt động',
        clients: 0,
        combos: 0,
        revenue: 0,
        revLe: 0,
        revCombo: 0,
        revProduct: 0,
        netRevenue: 0,
        netLe: 0,
        netCombo: 0,
        netProduct: 0,
        shift: 'full',
        attendance: 'checked_in',
      };
    }

    const exists = branchDetailMap[targetBranchKey].cc.some((c: SafeAny) => c.id === ccId);
    if (!exists) {
      branchDetailMap[targetBranchKey].cc.push(ccObj);
    }

    return ccObj;
  };

  comingOrders.forEach((o) => {
    const bKey = o.client_store_id === 16 ? 'estella' : 'detham';
    const orderSvs = comingServicesByOrderId.get(Number(o.id)) || [];
    if (orderSvs.length === 0) return;

    const checkInStaffId = orderSvs.find((cs) => cs.check_in_staff_id)?.check_in_staff_id;
    if (checkInStaffId) {
      const ccId = Number(checkInStaffId);
      const cc = getOrMoveCC(ccId, bKey);

      if (['CheckIn', 'Parking', 'Consultation', 'Preparation'].includes(o.order_state)) {
        cc.doing = 'Đang hỗ trợ khách check-in';
        if (cc.attendance !== 'checked_out') {
          cc.attendance = 'checked_in';
        }
      }
    }

    const checkOutStaffId = orderSvs.find((cs) => cs.check_out_staff_id)?.check_out_staff_id;
    if (checkOutStaffId) {
      const ccId = Number(checkOutStaffId);
      const cc = getOrMoveCC(ccId, bKey);

      if (o.order_state === 'CheckOut') {
        cc.doing = 'Đang thanh toán cho khách';
        if (cc.attendance !== 'checked_out') {
          cc.attendance = 'checked_in';
        }
      }

      if (o.order_state === 'Completed') {
        const orderCombos = comingCombosByOrderId.get(Number(o.id)) || [];
        const orderProducts = comingProductsByOrderId.get(Number(o.id)) || [];
        const orderTotal = Number(o.total_price || 0);
        const rev = computeOrderRevenueBreakdown(orderTotal, orderCombos, orderProducts, orderSvs);

        cc.revCombo += rev.finalRevCombo;
        cc.revProduct += rev.finalRevProduct;
        cc.revLe += rev.finalRevLe;
        cc.revenue += orderTotal;

        cc.netCombo += rev.finalNetCombo;
        cc.netProduct += rev.finalNetProduct;
        cc.netLe += rev.finalNetLe;
        cc.netRevenue += orderTotal - rev.totalTax;

        cc.combos += orderCombos.length;
      }
    }
  });

  // Compute unique clients count for each CC today, and set default idle states
  Object.keys(branchDetailMap).forEach((bKey) => {
    branchDetailMap[bKey].cc.forEach((cc: SafeAny) => {
      const ccId = cc.id;
      cc.clients = ccClientOrderIds.get(ccId)?.size || 0;

      if (cc.clients > 0 && cc.doing === 'Nghỉ phép tuần') {
        cc.doing = 'Trống (Sẵn sàng đón khách)';
        cc.shift = 'full';
        cc.attendance = 'checked_in';
      }
    });
  });
}
