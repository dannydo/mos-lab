import { describe, expect, it, beforeEach } from 'vitest';
import { cleanupOmiCallMediaBridge, ensureOmiCallMediaBridge } from '../mediaBridge';
import { getAudioWarningKeys, clearAudioWarningKeys } from '../audioWarningState';
import { recordOmiCallAudioDiagnostics } from '../audioDiagnostics';
import { ensureOmiCallSwitchboardOnline } from '../switchboardUtils';

describe('OmiCall MediaBridge and AudioDiagnostics Circular Dependency Fix (MOS-BUG-42)', () => {
  beforeEach(() => {
    clearAudioWarningKeys();
  });

  it('verifies cleanupOmiCallMediaBridge is exported directly as a callable function', () => {
    expect(typeof cleanupOmiCallMediaBridge).toBe('function');
  });

  it('runs cleanupOmiCallMediaBridge safely with null or undefined call without throwing', () => {
    expect(() => cleanupOmiCallMediaBridge(null)).not.toThrow();
    expect(() => cleanupOmiCallMediaBridge(undefined)).not.toThrow();
    expect(() => cleanupOmiCallMediaBridge({})).not.toThrow();
  });

  it('manages audioWarningState independently without circular import', () => {
    const warningKeys = getAudioWarningKeys();
    expect(warningKeys).toBeInstanceOf(Set);
    expect(warningKeys.size).toBe(0);

    warningKeys.add('test-key-1');
    expect(getAudioWarningKeys().has('test-key-1')).toBe(true);

    clearAudioWarningKeys();
    expect(getAudioWarningKeys().size).toBe(0);
  });

  it('executes ensureOmiCallMediaBridge and recordOmiCallAudioDiagnostics cleanly without module cycle crash', async () => {
    const mockCall = {
      uuid: 'test-uuid-1234',
      state: 'connected',
      direction: 'inbound',
    };

    expect(() => ensureOmiCallMediaBridge(mockCall)).not.toThrow();

    const diagnostics = await recordOmiCallAudioDiagnostics(mockCall, 'test-stage');
    expect(diagnostics).toBeDefined();
    expect(diagnostics?.uuid).toBe('test-uuid-1234');
    expect(diagnostics?.stage).toBe('test-stage');
  });

  it('safely handles switchboard online check when OMICallSDK is present but not initialized', async () => {
    const originalOmiCallSdk = (window as SafeAny).OMICallSDK;
    const originalInitialized = (window as SafeAny).__omicall_initialized;

    try {
      (window as SafeAny).OMICallSDK = {
        SB_STATE: { ONLINE: 'online' },
        getSbState: () => 'offline',
      };
      (window as SafeAny).__omicall_initialized = false;

      const isOnline = await ensureOmiCallSwitchboardOnline();
      expect(isOnline).toBe(false);
    } finally {
      (window as SafeAny).OMICallSDK = originalOmiCallSdk;
      (window as SafeAny).__omicall_initialized = originalInitialized;
    }
  });
});
