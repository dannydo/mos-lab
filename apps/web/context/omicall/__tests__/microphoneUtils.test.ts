import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMicrophoneConstraints,
  getLiveAudioTracks,
  hasUsableMicrophoneStream,
  isPlainRecord,
  omitDefaultAudioDevice,
  sanitizeOmiCallMediaConstraints,
  shouldUsePreparedMicrophoneForConstraints,
} from '../microphoneUtils';

describe('microphoneUtils', () => {
  beforeEach(() => {
    // Reset global objects
    (window as SafeAny).__mosGlobalAudioDevices = undefined;
  });

  describe('getMicrophoneConstraints', () => {
    it('should return default audio constraints when no global selected input', () => {
      const constraints = getMicrophoneConstraints();
      expect(constraints).toEqual({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
    });

    it('should return constraints with deviceId when global input is set', () => {
      (window as SafeAny).__mosGlobalAudioDevices = {
        selectedInputId: 'custom-mic-id',
      };
      const constraints = getMicrophoneConstraints();
      expect(constraints.deviceId).toEqual({ exact: 'custom-mic-id' });
    });
  });

  describe('getLiveAudioTracks', () => {
    it('should filter only live and enabled audio tracks', () => {
      const mockTracks = [
        { readyState: 'live', enabled: true },
        { readyState: 'ended', enabled: true },
        { readyState: 'live', enabled: false },
      ] as SafeAny[];

      const mockStream = {
        getAudioTracks: () => mockTracks,
      } as SafeAny;

      const liveTracks = getLiveAudioTracks(mockStream);
      expect(liveTracks.length).toBe(1);
      expect(liveTracks[0]).toEqual({ readyState: 'live', enabled: true });
    });
  });

  describe('hasUsableMicrophoneStream', () => {
    it('should return true if stream has live tracks', () => {
      const mockStream = {
        getAudioTracks: () => [{ readyState: 'live', enabled: true }],
      } as SafeAny;
      expect(hasUsableMicrophoneStream(mockStream)).toBe(true);
    });

    it('should return false if stream is null/undefined or has no live tracks', () => {
      expect(hasUsableMicrophoneStream(null)).toBe(false);
      expect(hasUsableMicrophoneStream(undefined)).toBe(false);

      const mockStream = {
        getAudioTracks: () => [],
      } as SafeAny;
      expect(hasUsableMicrophoneStream(mockStream)).toBe(false);
    });
  });

  describe('isPlainRecord', () => {
    it('should identify plain objects correctly', () => {
      expect(isPlainRecord({})).toBe(true);
      expect(isPlainRecord({ a: 1 })).toBe(true);
      expect(isPlainRecord([])).toBe(false);
      expect(isPlainRecord(null)).toBe(false);
      expect(isPlainRecord('string')).toBe(false);
      expect(isPlainRecord(123)).toBe(false);
    });
  });

  describe('omitDefaultAudioDevice', () => {
    it('should skip non-objects', () => {
      expect(omitDefaultAudioDevice(true)).toBe(true);
      expect(omitDefaultAudioDevice(undefined)).toBeUndefined();
    });

    it('should omit deviceId if it equals default', () => {
      const input = { deviceId: 'default', echoCancellation: true };
      const output = omitDefaultAudioDevice(input);
      expect(output).toEqual({ echoCancellation: true });
    });

    it('should omit deviceId if ideal/exact equals default', () => {
      const input1 = { deviceId: { ideal: 'default' }, noiseSuppression: true };
      const output1 = omitDefaultAudioDevice(input1);
      expect(output1).toEqual({ noiseSuppression: true });

      const input2 = { deviceId: { exact: 'default' }, autoGainControl: true };
      const output2 = omitDefaultAudioDevice(input2);
      expect(output2).toEqual({ autoGainControl: true });
    });

    it('should omit voiceIsolation property', () => {
      const input = { voiceIsolation: true, echoCancellation: true };
      const output = omitDefaultAudioDevice(input);
      expect(output).toEqual({ echoCancellation: true });
    });
  });

  describe('sanitizeOmiCallMediaConstraints', () => {
    it('should sanitize audio constraints object', () => {
      const constraints = {
        audio: {
          deviceId: 'default',
          echoCancellation: true,
        },
        video: false,
      };
      const sanitized = sanitizeOmiCallMediaConstraints(constraints);
      expect(sanitized).toEqual({
        audio: {
          echoCancellation: true,
        },
        video: false,
      });
    });
  });

  describe('shouldUsePreparedMicrophoneForConstraints', () => {
    it('should return true for audio only constraints', () => {
      expect(shouldUsePreparedMicrophoneForConstraints({ audio: true })).toBe(true);
      expect(shouldUsePreparedMicrophoneForConstraints({ audio: {}, video: false })).toBe(true);
    });

    it('should return false for video constraints', () => {
      expect(shouldUsePreparedMicrophoneForConstraints({ audio: true, video: true })).toBe(false);
      expect(shouldUsePreparedMicrophoneForConstraints({ video: true })).toBe(false);
    });
  });
});
