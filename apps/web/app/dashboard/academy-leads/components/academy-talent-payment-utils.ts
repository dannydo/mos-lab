export const ACADEMY_VIETQR_BANK = 'VCB';
export const ACADEMY_VIETQR_ACCOUNT = '1024731897';
export const ACADEMY_VIETQR_ACCOUNT_NAME = "CÔNG TY TNHH WINGS' LIFE";

export function buildAcademyVietQrUrl(amountVnd: number, reference: string) {
  const query = new URLSearchParams({
    amount: String(Math.max(0, Math.round(amountVnd))),
    addInfo: reference,
    accountName: ACADEMY_VIETQR_ACCOUNT_NAME,
  });
  // qr_only keeps the QR payload scannable without a large central provider mark.
  return `https://img.vietqr.io/image/${ACADEMY_VIETQR_BANK}-${ACADEMY_VIETQR_ACCOUNT}-qr_only.png?${query}`;
}
