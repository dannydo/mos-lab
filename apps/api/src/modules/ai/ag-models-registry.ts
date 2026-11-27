import {
  AG_CHAT_MODEL_CATALOG,
  DEFAULT_MAI_CHAT_MODEL_ID,
  DEFAULT_MAI_DEBUG_MODEL_ID,
  findAgModelOption,
  type AgModelOption,
  type AgModelTag,
  type ListAgModelsResponse,
} from '@mos-lab/shared';

export interface LiveCascadeModelInput {
  label?: string;
  modelId?: string;
  model?: string;
  tagTitle?: string;
  tagDescription?: string;
  disabled?: boolean;
}

const REMOTE_MODELS_TTL_MS = 15 * 60 * 1000;

let cachedRemoteModels: AgModelOption[] = [];
let cachedRemoteUpdatedAt = 0;
let cachedLocalModels: AgModelOption[] = [];

function normalizeTag(tagTitle?: string): AgModelTag | undefined {
  const val = String(tagTitle || '').trim();
  if (val === 'New' || val === 'Leaving Soon' || val === 'Notice') return val;
  return undefined;
}

function inferFamilyAndEffort(
  label: string,
  id: string
): {
  family: string;
  effort?: AgModelOption['effort'];
  shortLabel: string;
} {
  const known = findAgModelOption(id);
  if (known) {
    return {
      family: known.family,
      effort: known.effort,
      shortLabel: known.shortLabel,
    };
  }
  const effortMatch = label.match(/\((Low|Medium|High|XHigh|Neon|Carbon|Argon)\)/i);
  const effort = effortMatch ? (effortMatch[1] as AgModelOption['effort']) : undefined;
  const family = label.replace(/\s*\([^)]*\)\s*$/, '').trim() || id;
  return {
    family,
    effort,
    shortLabel: label.replace(/\s*\(([^)]*)\)/, ' $1').trim(),
  };
}

export function normalizeCascadeModels(rawModels: LiveCascadeModelInput[]): AgModelOption[] {
  const seen = new Set<string>();
  const normalized: AgModelOption[] = [];

  for (const item of rawModels) {
    if (item.disabled) continue;
    const id = String(item.modelId || '').trim();
    const label = String(item.label || '').trim();
    if (!id || !label || seen.has(id.toLowerCase())) continue;
    seen.add(id.toLowerCase());

    const known = findAgModelOption(id);
    const inferred = inferFamilyAndEffort(label, id);
    normalized.push({
      id,
      label: known?.label || label,
      shortLabel: inferred.shortLabel,
      family: inferred.family,
      effort: inferred.effort,
      tag: normalizeTag(item.tagTitle) ?? known?.tag,
      description: item.tagDescription || known?.description,
      modelEnum: item.model || known?.modelEnum,
    });
  }

  return normalized;
}

export function updateRemoteAgModels(rawModels: LiveCascadeModelInput[]): AgModelOption[] {
  const normalized = normalizeCascadeModels(rawModels);
  cachedRemoteModels = normalized;
  cachedRemoteUpdatedAt = Date.now();
  return normalized;
}

export function getLiveAgModelIdSet(): Set<string> {
  const ids = new Set<string>(AG_CHAT_MODEL_CATALOG.map((m) => m.id));
  const isRemoteFresh = Date.now() - cachedRemoteUpdatedAt < REMOTE_MODELS_TTL_MS;
  for (const item of isRemoteFresh ? cachedRemoteModels : []) {
    ids.add(item.id);
  }
  for (const item of cachedLocalModels) {
    ids.add(item.id);
  }
  return ids;
}

export async function fetchLocalAgModels(
  lsEnv: Record<string, string>,
  fetcher: typeof fetch = fetch
): Promise<AgModelOption[]> {
  const address = lsEnv.ANTIGRAVITY_LS_ADDRESS?.trim();
  const csrfToken = lsEnv.ANTIGRAVITY_CSRF_TOKEN?.trim();
  if (!address || !csrfToken) return [];
  const baseUrl = /^https?:\/\//i.test(address) ? address.replace(/\/$/, '') : `http://${address}`;

  try {
    const res = await fetcher(`${baseUrl}/exa.language_server_pb.LanguageServerService/GetCascadeModelConfigData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-codeium-csrf-token': csrfToken,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(2_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      clientModelConfigs?: Array<{
        label?: string;
        modelId?: string;
        disabled?: boolean;
        tagTitle?: string;
        tagDescription?: string;
        modelOrAlias?: { model?: string };
      }>;
    };
    const normalized = normalizeCascadeModels(
      (data.clientModelConfigs || []).map((c) => ({
        label: c.label,
        modelId: c.modelId,
        model: c.modelOrAlias?.model,
        tagTitle: c.tagTitle,
        tagDescription: c.tagDescription,
        disabled: c.disabled,
      }))
    );
    if (normalized.length > 0) {
      cachedLocalModels = normalized;
    }
    return normalized;
  } catch {
    return [];
  }
}

export async function getAvailableAgModels(options: {
  isLocalAvailable: boolean;
  isRemoteActive: boolean;
  detectLsEnv: () => Promise<Record<string, string>>;
}): Promise<ListAgModelsResponse> {
  if (options.isLocalAvailable) {
    const lsEnv = await options.detectLsEnv();
    const live = await fetchLocalAgModels(lsEnv);
    if (live.length > 0) {
      return {
        models: live,
        defaultChatModelId: DEFAULT_MAI_CHAT_MODEL_ID,
        defaultDebugModelId: DEFAULT_MAI_DEBUG_MODEL_ID,
        source: 'live',
        bridgeOnline: true,
      };
    }
  }

  const isRemoteFresh =
    options.isRemoteActive &&
    cachedRemoteModels.length > 0 &&
    Date.now() - cachedRemoteUpdatedAt < REMOTE_MODELS_TTL_MS;

  if (isRemoteFresh) {
    return {
      models: cachedRemoteModels,
      defaultChatModelId: DEFAULT_MAI_CHAT_MODEL_ID,
      defaultDebugModelId: DEFAULT_MAI_DEBUG_MODEL_ID,
      source: 'live',
      bridgeOnline: true,
    };
  }

  return {
    models: [...AG_CHAT_MODEL_CATALOG],
    defaultChatModelId: DEFAULT_MAI_CHAT_MODEL_ID,
    defaultDebugModelId: DEFAULT_MAI_DEBUG_MODEL_ID,
    source: 'catalog',
    bridgeOnline: options.isLocalAvailable || options.isRemoteActive,
  };
}
