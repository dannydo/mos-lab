const originalWarn = console.warn;
console.warn = (...args: SafeAny[]) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('antd v5 support React is 16 ~ 18') ||
      args[0].includes('antd: compatible') ||
      args[0].includes('bordered') ||
      args[0].includes('is not connected to any Form element') ||
      args[0].includes('addonAfter') ||
      args[0].includes('addonBefore') ||
      args[0].includes('Space.Compact') ||
      args[0].includes('Static function can not consume context') ||
      args[0].includes('antd: message') ||
      args[0].includes('bodyStyle') ||
      args[0].includes('index` parameter of `rowKey` function is deprecated') ||
      args[0].includes('`tip` only work in nest') ||
      args[0].includes('registering a cleanup function after unmount'))
  ) {
    return;
  }
  originalWarn(...args);
};

const originalError = console.error;
console.error = (...args: SafeAny[]) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('antd v5 support React is 16 ~ 18') ||
      args[0].includes('antd: compatible') ||
      args[0].includes('bordered') ||
      args[0].includes('is not connected to any Form element') ||
      args[0].includes('addonAfter') ||
      args[0].includes('addonBefore') ||
      args[0].includes('Space.Compact') ||
      args[0].includes('Static function can not consume context') ||
      args[0].includes('antd: message') ||
      args[0].includes('bodyStyle') ||
      args[0].includes('index` parameter of `rowKey` function is deprecated') ||
      args[0].includes('`tip` only work in nest') ||
      args[0].includes('destroyOnClose') ||
      args[0].includes('destroyOnHidden') ||
      args[0].includes('registering a cleanup function after unmount'))
  ) {
    return;
  }
  originalError(...args);
};
