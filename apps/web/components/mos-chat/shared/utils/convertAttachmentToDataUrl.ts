import type { MosChatImageAttachment } from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../../lib/api-base-url';

/**
 * Fetches an uploaded attachment URL and converts it into a Base64 Data URL for MAI Copilot multimodal calls.
 */
export async function convertAttachmentToDataUrl(attachment?: MosChatImageAttachment): Promise<string | undefined> {
  if (!attachment?.url) return undefined;
  try {
    const resolvedUrl = resolveMediaUrl(attachment.url);
    const resp = await fetch(resolvedUrl);
    if (!resp.ok) return undefined;
    const blob = await resp.blob();
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
