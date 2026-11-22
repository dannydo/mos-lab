'use client';

import React, { useRef } from 'react';

interface PilotPhotoPickerTriggers {
  openCamera: () => void;
  openLibrary: () => void;
}

export interface PilotPhotoPickerProps {
  onSelectFile: (file: File) => void;
  children: (triggers: PilotPhotoPickerTriggers) => React.ReactNode;
}

/** Encapsulates hidden camera and photo-library file inputs for pilot photo steps. */
export function PilotPhotoPicker({ onSelectFile, children }: PilotPhotoPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onSelectFile(file);
    event.target.value = '';
  };

  return (
    <>
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input type="file" ref={libraryInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
      {children({
        openCamera: () => cameraInputRef.current?.click(),
        openLibrary: () => libraryInputRef.current?.click(),
      })}
    </>
  );
}
