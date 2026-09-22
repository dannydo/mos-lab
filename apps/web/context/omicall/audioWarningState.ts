const audioHealthWarningKeys = new Set<string>();

export const getAudioWarningKeys = (): Set<string> => audioHealthWarningKeys;

export const clearAudioWarningKeys = (): void => {
  audioHealthWarningKeys.clear();
};
