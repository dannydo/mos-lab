import './types';

export const ensureOmiCallSwitchboardOnline = async () => {
  if (typeof window === 'undefined' || !window.OMICallSDK) return true;
  if (!(window as SafeAny).__omicall_initialized) {
    console.warn('[OmiCallContext] SDK not initialized yet when checking switchboard');
    return false;
  }

  const sdk = window.OMICallSDK;
  const onlineState = window.OMICallSDK.SB_STATE?.ONLINE;
  if (!onlineState) return true;

  const waitForConnected = () =>
    new Promise<boolean>((resolve) => {
      let settled = false;
      let timeout: SafeAny = null;

      const finish = (result: boolean) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        try {
          sdk.off?.('register', onRegister);
        } catch (e) {}
        resolve(result);
      };

      const onRegister = (data: SafeAny) => {
        console.log('[OmiCallContext] register event:', data);
        if (data?.status === 'connected') finish(true);
        if (data?.status === 'disconnect') finish(false);
      };

      try {
        sdk.on?.('register', onRegister);
        timeout = setTimeout(() => finish(false), 8000);
      } catch (e) {
        finish(false);
      }
    });

  try {
    const currentState = sdk.getSbState?.();
    if (currentState === onlineState && sdk.validateSb?.()) {
      try {
        sdk.sbKeepAlive?.();
      } catch (e) {}
      return true;
    }

    let connected = false;
    if (typeof sdk.reregister === 'function') {
      const connectedPromise = waitForConnected();
      try {
        sdk.reregister(onlineState);
      } catch (err) {
        console.warn('[OmiCallContext] Error invoking sdk.reregister:', err);
      }
      connected = await connectedPromise;
    }

    if (typeof sdk.syncRegister === 'function') {
      try {
        await sdk.syncRegister(onlineState);
      } catch (err) {
        console.warn('[OmiCallContext] Error invoking sdk.syncRegister:', err);
      }
    }

    try {
      sdk.sbKeepAlive?.();
    } catch (e) {}

    return connected || sdk.validateSb?.() === true;
  } catch (err) {
    console.warn('[OmiCallContext] Failed to set OmiCall switchboard online:', err);
    return false;
  }
};
export default ensureOmiCallSwitchboardOnline;
