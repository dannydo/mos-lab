export const OPEN_MOS_BIBLE_EVENT = 'open-mos-bible';

export interface OpenMosBibleOptions {
  commandmentId?: string;
}

export function openMosBible(options?: OpenMosBibleOptions): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<OpenMosBibleOptions>(OPEN_MOS_BIBLE_EVENT, {
      detail: options,
    })
  );
}
