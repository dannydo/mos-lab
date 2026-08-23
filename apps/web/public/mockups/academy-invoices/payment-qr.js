const BANK = 'VCB';
const ACCOUNT_NUMBER = '1024731897';
const ACCOUNT_NAME = 'CONG TY TNHH WINGS LIFE';

const paymentOptions = {
  deposit: {
    label: 'Cọc giữ suất học bổng',
    amount: 1000000,
    info: 'WA20260823 COC HOC BONG',
  },
  full: {
    label: 'Thanh toán trọn gói',
    amount: 1990000,
    info: 'WA20260823 HOC PHI TRON GOI',
  },
};

const formatVnd = (amount) => `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;

const vietQrUrl = ({ amount, info }) => {
  const query = new URLSearchParams({
    amount: String(amount),
    addInfo: info,
    accountName: ACCOUNT_NAME,
  });

  return `https://img.vietqr.io/image/${BANK}-${ACCOUNT_NUMBER}-compact2.png?${query}`;
};

const setPaymentMode = (root, mode) => {
  const option = paymentOptions[mode];
  if (!option) return;

  root.dataset.paymentMode = mode;
  root.querySelectorAll('[data-payment-choice]').forEach((button) => {
    const selected = button.dataset.paymentChoice === mode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  root.querySelectorAll('[data-payment-label]').forEach((element) => {
    element.textContent = option.label;
  });
  root.querySelectorAll('[data-payment-amount]').forEach((element) => {
    element.textContent = formatVnd(option.amount);
  });
  root.querySelectorAll('[data-payment-qr]').forEach((image) => {
    image.src = vietQrUrl(option);
    image.alt = `VietQR ${option.label}, ${formatVnd(option.amount)}`;
  });
};

document.querySelectorAll('[data-invoice-mockup]').forEach((root) => {
  root.querySelectorAll('[data-payment-choice]').forEach((button) => {
    button.addEventListener('click', () => setPaymentMode(root, button.dataset.paymentChoice));
  });
  setPaymentMode(root, root.dataset.paymentMode || 'deposit');
});
