export interface CcDiamondEntry {
  rank?: number;
  ccId: number;
  tenCc: string;
  tongKhach: number;
  soKhachDiamond: number;
  thuongDiamond: number;
  potentialThuong: number;
  tyLeGioiThieu: number;
  datDieuKien: boolean;
}

export interface CcDiamondResponse {
  dateFrom: string;
  dateTo: string;
  month: string;
  totalReferralGuests: number;
  totalDiamondBonus: number;
  data: CcDiamondEntry[];
}

export interface CcDiamondDetailEntry {
  referralId: number;
  referralDate: string;
  referrerUserId?: number;
  referrerName: string;
  referrerPhone: string;
  newUserId: number;
  newName: string;
  newPhone: string;
}

export interface CcDiamondDetailsResponse {
  ccId: number;
  tenCc: string;
  totalCount: number;
  data: CcDiamondDetailEntry[];
}
