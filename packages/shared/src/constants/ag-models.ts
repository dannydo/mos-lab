export type AgModelTag = 'New' | 'Leaving Soon' | 'Notice';

export interface AgModelOption {
  id: string;
  label: string;
  shortLabel: string;
  family: string;
  effort?: 'Low' | 'Medium' | 'High' | 'XHigh' | 'Neon' | 'Carbon' | 'Argon';
  tag?: AgModelTag;
  description?: string;
  modelEnum?: string;
}

export interface ListAgModelsResponse {
  models: AgModelOption[];
  defaultChatModelId: string;
  defaultDebugModelId: string;
  source: 'live' | 'catalog';
  bridgeOnline: boolean;
}

export const DEFAULT_MAI_CHAT_MODEL_ID = 'gemini-3.8-flash-high';
export const DEFAULT_MAI_DEBUG_MODEL_ID = 'gemini-pro-orchestrator-neon';

export const AG_MODEL_ID_REGEX = /^[a-z0-9][a-z0-9._-]{1,63}$/i;

/**
 * Canonical Antigravity model catalog matching live `GetCascadeModelConfigData`
 * so Super Admin Danny can switch between any supported AG model directly from mOS Chat.
 */
export const AG_CHAT_MODEL_CATALOG: readonly AgModelOption[] = [
  // Gemini 4 Neon
  {
    id: 'gemini-4-neon-high',
    label: 'Gemini 4 Neon (High)',
    shortLabel: 'Neon High',
    family: 'Gemini 4 Neon',
    effort: 'High',
    tag: 'New',
    description: 'For most deep reasoning and complex problems',
    modelEnum: 'MODEL_PLACEHOLDER_M532',
  },
  {
    id: 'gemini-4-neon-xhigh',
    label: 'Gemini 4 Neon (XHigh)',
    shortLabel: 'Neon XHigh',
    family: 'Gemini 4 Neon',
    effort: 'XHigh',
    tag: 'New',
    description: 'For most deep reasoning and complex problems',
    modelEnum: 'MODEL_PLACEHOLDER_M535',
  },
  {
    id: 'gemini-4-neon-medium',
    label: 'Gemini 4 Neon (Medium)',
    shortLabel: 'Neon Med',
    family: 'Gemini 4 Neon',
    effort: 'Medium',
    tag: 'New',
    description: 'For most deep reasoning and complex problems',
    modelEnum: 'MODEL_PLACEHOLDER_M533',
  },
  {
    id: 'gemini-4-neon-low',
    label: 'Gemini 4 Neon (Low)',
    shortLabel: 'Neon Low',
    family: 'Gemini 4 Neon',
    effort: 'Low',
    tag: 'New',
    description: 'For most deep reasoning and complex problems',
    modelEnum: 'MODEL_PLACEHOLDER_M534',
  },
  // Gemini 4 Carbon
  {
    id: 'gemini-4-carbon-medium',
    label: 'Gemini 4 Carbon (Medium)',
    shortLabel: 'Carbon Med',
    family: 'Gemini 4 Carbon',
    effort: 'Medium',
    tag: 'New',
    description: 'For your hardest, long-horizon tasks',
    modelEnum: 'MODEL_PLACEHOLDER_M437',
  },
  {
    id: 'gemini-4-carbon-high',
    label: 'Gemini 4 Carbon (High)',
    shortLabel: 'Carbon High',
    family: 'Gemini 4 Carbon',
    effort: 'High',
    tag: 'New',
    description: 'For your hardest, long-horizon tasks',
    modelEnum: 'MODEL_PLACEHOLDER_M427',
  },
  {
    id: 'gemini-4-carbon-low',
    label: 'Gemini 4 Carbon (Low)',
    shortLabel: 'Carbon Low',
    family: 'Gemini 4 Carbon',
    effort: 'Low',
    tag: 'New',
    description: 'For your hardest, long-horizon tasks',
    modelEnum: 'MODEL_PLACEHOLDER_M438',
  },
  // Gemini 4 Argon
  {
    id: 'gemini-4-argon-medium',
    label: 'Gemini 4 Argon (Medium)',
    shortLabel: 'Argon Med',
    family: 'Gemini 4 Argon',
    effort: 'Medium',
    tag: 'Leaving Soon',
    description: 'The original Gemini 4 model for advanced workflows. Leaving on Nov 30.',
    modelEnum: 'MODEL_PLACEHOLDER_M418',
  },
  {
    id: 'gemini-4-argon-high',
    label: 'Gemini 4 Argon (High)',
    shortLabel: 'Argon High',
    family: 'Gemini 4 Argon',
    effort: 'High',
    tag: 'Leaving Soon',
    description: 'The original Gemini 4 model for advanced workflows. Leaving on Nov 30.',
    modelEnum: 'MODEL_PLACEHOLDER_M417',
  },
  {
    id: 'gemini-4-argon-low',
    label: 'Gemini 4 Argon (Low)',
    shortLabel: 'Argon Low',
    family: 'Gemini 4 Argon',
    effort: 'Low',
    tag: 'Leaving Soon',
    description: 'The original Gemini 4 model for advanced workflows. Leaving on Nov 30.',
    modelEnum: 'MODEL_PLACEHOLDER_M419',
  },
  // Gemini 4 Hydrogen
  {
    id: 'gemini-4-hydrogen-high',
    label: 'Gemini 4 Hydrogen (High)',
    shortLabel: 'Hydrogen High',
    family: 'Gemini 4 Hydrogen',
    effort: 'High',
    tag: 'New',
    description: 'For speed and efficiency in execution tasks',
    modelEnum: 'MODEL_PLACEHOLDER_M525',
  },
  {
    id: 'gemini-4-hydrogen-xhigh',
    label: 'Gemini 4 Hydrogen (XHigh)',
    shortLabel: 'Hydrogen XHigh',
    family: 'Gemini 4 Hydrogen',
    effort: 'XHigh',
    tag: 'New',
    description: 'For speed and efficiency in execution tasks',
    modelEnum: 'MODEL_PLACEHOLDER_M528',
  },
  {
    id: 'gemini-4-hydrogen-medium',
    label: 'Gemini 4 Hydrogen (Medium)',
    shortLabel: 'Hydrogen Med',
    family: 'Gemini 4 Hydrogen',
    effort: 'Medium',
    tag: 'New',
    description: 'For speed and efficiency in execution tasks',
    modelEnum: 'MODEL_PLACEHOLDER_M526',
  },
  {
    id: 'gemini-4-hydrogen-low',
    label: 'Gemini 4 Hydrogen (Low)',
    shortLabel: 'Hydrogen Low',
    family: 'Gemini 4 Hydrogen',
    effort: 'Low',
    tag: 'New',
    description: 'For speed and efficiency in execution tasks',
    modelEnum: 'MODEL_PLACEHOLDER_M527',
  },
  // Orchestrator
  {
    id: 'gemini-pro-orchestrator-neon',
    label: 'Orchestrator (Gemini 4 Neon High)',
    shortLabel: 'Orchestrator Neon',
    family: 'Orchestrator',
    effort: 'Neon',
    tag: 'New',
    description: 'Neon that may offload routine steps to Hydrogen. Same Neon-level quality, fewer tokens used.',
    modelEnum: 'MODEL_PLACEHOLDER_M537',
  },
  {
    id: 'gemini-pro-orchestrator',
    label: 'Orchestrator (Gemini 4 Carbon Medium)',
    shortLabel: 'Orchestrator Carbon',
    family: 'Orchestrator',
    effort: 'Carbon',
    tag: 'New',
    description: 'Carbon that may offload routine steps to Hydrogen. Same Carbon-level quality, fewer tokens used.',
    modelEnum: 'MODEL_PLACEHOLDER_M667',
  },
  {
    id: 'gemini-pro-orchestrator-argon',
    label: 'Orchestrator (Gemini 4 Argon Medium)',
    shortLabel: 'Orchestrator Argon',
    family: 'Orchestrator',
    effort: 'Argon',
    tag: 'New',
    description: 'Argon that may offload routine steps to Hydrogen. Same Argon-level quality, fewer tokens used.',
    modelEnum: 'MODEL_PLACEHOLDER_M681',
  },
  // Gemini 3.8 Flash
  {
    id: 'gemini-3.8-flash-high',
    label: 'Gemini 3.8 Flash (High)',
    shortLabel: 'Flash 3.8 High',
    family: 'Gemini 3.8 Flash',
    effort: 'High',
    tag: 'Leaving Soon',
    description: 'Use Hydrogen for better quality with lower quota usage. Leaving on Nov 30.',
    modelEnum: 'MODEL_PLACEHOLDER_M318',
  },
  {
    id: 'gemini-3.8-flash-medium',
    label: 'Gemini 3.8 Flash (Medium)',
    shortLabel: 'Flash 3.8 Med',
    family: 'Gemini 3.8 Flash',
    effort: 'Medium',
    tag: 'Leaving Soon',
    description: 'Use Hydrogen for better quality with lower quota usage. Leaving on Nov 30.',
    modelEnum: 'MODEL_PLACEHOLDER_M319',
  },
  {
    id: 'gemini-3.8-flash-low',
    label: 'Gemini 3.8 Flash (Low)',
    shortLabel: 'Flash 3.8 Low',
    family: 'Gemini 3.8 Flash',
    effort: 'Low',
    tag: 'Leaving Soon',
    description: 'Use Hydrogen for better quality with lower quota usage. Leaving on Nov 30.',
    modelEnum: 'MODEL_PLACEHOLDER_M320',
  },
  // Claude Opus 5.5
  {
    id: 'claude-opus-5-5-low',
    label: 'Claude Opus 5.5 (Low)',
    shortLabel: 'Opus 5.5 Low',
    family: 'Claude Opus 5.5',
    effort: 'Low',
    tag: 'New',
    modelEnum: 'MODEL_PLACEHOLDER_M400',
  },
  {
    id: 'claude-opus-5-5-medium',
    label: 'Claude Opus 5.5 (Medium)',
    shortLabel: 'Opus 5.5 Med',
    family: 'Claude Opus 5.5',
    effort: 'Medium',
    tag: 'New',
    modelEnum: 'MODEL_PLACEHOLDER_M401',
  },
  {
    id: 'claude-opus-5-5-high',
    label: 'Claude Opus 5.5 (High)',
    shortLabel: 'Opus 5.5 High',
    family: 'Claude Opus 5.5',
    effort: 'High',
    tag: 'New',
    modelEnum: 'MODEL_PLACEHOLDER_M402',
  },
  // Claude Sonnet 5.5
  {
    id: 'claude-sonnet-5-5-low',
    label: 'Claude Sonnet 5.5 (Low)',
    shortLabel: 'Sonnet 5.5 Low',
    family: 'Claude Sonnet 5.5',
    effort: 'Low',
    tag: 'New',
    modelEnum: 'MODEL_PLACEHOLDER_M403',
  },
  {
    id: 'claude-sonnet-5-5-medium',
    label: 'Claude Sonnet 5.5 (Medium)',
    shortLabel: 'Sonnet 5.5 Med',
    family: 'Claude Sonnet 5.5',
    effort: 'Medium',
    tag: 'New',
    modelEnum: 'MODEL_PLACEHOLDER_M404',
  },
  {
    id: 'claude-sonnet-5-5-high',
    label: 'Claude Sonnet 5.5 (High)',
    shortLabel: 'Sonnet 5.5 High',
    family: 'Claude Sonnet 5.5',
    effort: 'High',
    tag: 'New',
    modelEnum: 'MODEL_PLACEHOLDER_M405',
  },
  // GPT-OSS 120B
  {
    id: 'gpt-oss-120b-medium',
    label: 'GPT-OSS 120B (Medium)',
    shortLabel: 'GPT-OSS 120B',
    family: 'GPT-OSS 120B',
    effort: 'Medium',
    tag: 'Notice',
    description: 'GPT-OSS will be removed from Antigravity on November 30, 2026.',
    modelEnum: 'MODEL_OPENAI_GPT_OSS_120B_MEDIUM',
  },
];

const AG_MODEL_BY_ID = new Map<string, AgModelOption>(
  AG_CHAT_MODEL_CATALOG.map((item) => [item.id.toLowerCase(), item])
);

export function findAgModelOption(modelId?: string | null): AgModelOption | undefined {
  const key = String(modelId || '')
    .trim()
    .toLowerCase();
  if (!key) return undefined;
  return AG_MODEL_BY_ID.get(key);
}

export function isKnownAgModelId(modelId?: string | null): boolean {
  return Boolean(findAgModelOption(modelId));
}

export function isAllowedAgModelId(modelId?: string | null, extraLiveIds?: ReadonlySet<string>): boolean {
  const trimmed = String(modelId || '').trim();
  if (!trimmed || !AG_MODEL_ID_REGEX.test(trimmed)) return false;
  if (isKnownAgModelId(trimmed)) return true;
  if (extraLiveIds && (extraLiveIds.has(trimmed) || extraLiveIds.has(trimmed.toLowerCase()))) {
    return true;
  }
  return false;
}
