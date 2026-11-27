import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AG_CHAT_MODEL_CATALOG } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { MaiDebugControlPill } from '../components/MaiDebugControlPill';
import {
  getActiveMaiDebugPayload,
  isStrictSuperAdminClientUser,
  MAI_DEBUG_MODE_STORAGE_KEY,
  MAI_MODEL_ID_STORAGE_KEY,
  resetMaiDebugMemoryStateForTest,
} from '../shared/hooks/useMaiDebugSettings';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    ai: {
      listAgModels: vi.fn(),
    },
  },
}));

describe('MaiDebugControlPill & Super Admin AG Debug settings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetMaiDebugMemoryStateForTest();
    vi.clearAllMocks();
    vi.mocked(apiClient.ai.listAgModels).mockResolvedValue({
      models: [...AG_CHAT_MODEL_CATALOG],
      defaultChatModelId: 'gemini-3.8-flash-high',
      defaultDebugModelId: 'gemini-pro-orchestrator-neon',
      source: 'catalog',
      bridgeOnline: true,
    });
  });

  it('strictly hides debug controls and strips debug/model payloads for non-Super-Admin roles', () => {
    expect(isStrictSuperAdminClientUser({ id: 202, username: 'branch_admin', role: 'admin' })).toBe(false);
    expect(isStrictSuperAdminClientUser({ id: 303, username: 'sale1', role: 'telesales' })).toBe(false);
    expect(isStrictSuperAdminClientUser({ id: 1, username: 'danhdo@gmail.com', role: 'super_admin' })).toBe(true);

    window.localStorage.setItem(MAI_DEBUG_MODE_STORAGE_KEY, 'true');
    window.localStorage.setItem(MAI_MODEL_ID_STORAGE_KEY, 'claude-opus-5-5-medium');
    expect(getActiveMaiDebugPayload(false)).toEqual({});

    const { container } = render(<MaiDebugControlPill isStrictDannySuperAdmin={false} isDark={true} />);
    expect(container.firstChild).toBeNull();
    expect(apiClient.ai.listAgModels).not.toHaveBeenCalled();
  });

  it('renders AG Debug toggle and all Antigravity model families for Super Admin and persists selection', async () => {
    const onEnsureMaiMention = vi.fn();

    render(
      <MaiDebugControlPill
        isStrictDannySuperAdmin={true}
        isDark={true}
        isAiPrivateConv={false}
        onEnsureMaiMention={onEnsureMaiMention}
      />
    );

    const debugBtn = screen.getByTestId('mai-debug-toggle-btn');
    const modelBtn = screen.getByTestId('mai-model-picker-btn');
    expect(debugBtn).toBeTruthy();
    expect(modelBtn).toBeTruthy();

    await waitFor(() => {
      expect(apiClient.ai.listAgModels).toHaveBeenCalledTimes(1);
    });

    // Toggle AG Debug ON -> sets localStorage, updates payload, and inserts @MAI in room
    fireEvent.click(debugBtn);
    expect(window.localStorage.getItem(MAI_DEBUG_MODE_STORAGE_KEY)).toBe('true');
    expect(onEnsureMaiMention).toHaveBeenCalledTimes(1);
    expect(getActiveMaiDebugPayload(true)).toEqual({ debugMode: true });

    // Open Model Picker popover and verify all model families from Antigravity
    fireEvent.click(modelBtn);
    await waitFor(() => {
      expect(screen.getByTestId('mai-model-picker-popover')).toBeTruthy();
    });

    const popoverText = screen.getByTestId('mai-model-picker-popover').textContent || '';
    for (const family of [
      'Gemini 4 Neon',
      'Gemini 4 Carbon',
      'Gemini 4 Argon',
      'Gemini 4 Hydrogen',
      'Orchestrator',
      'Gemini 3.8 Flash',
      'Claude Opus 5.5',
      'Claude Sonnet 5.5',
      'GPT-OSS 120B',
    ]) {
      expect(popoverText).toContain(family);
    }

    // Select Claude Opus 5.5 (Medium)
    fireEvent.click(screen.getByTestId('mai-model-option-claude-opus-5-5-medium'));
    expect(window.localStorage.getItem(MAI_MODEL_ID_STORAGE_KEY)).toBe('claude-opus-5-5-medium');
    expect(getActiveMaiDebugPayload(true)).toEqual({
      debugMode: true,
      modelId: 'claude-opus-5-5-medium',
    });
  });
});
