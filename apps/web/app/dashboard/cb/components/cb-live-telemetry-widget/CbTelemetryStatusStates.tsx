'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function CbTelemetryLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
      <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
      <p className="text-sm font-medium">Đang kết nối đường truyền Live Streaming 100% từ MySQL core...</p>
    </div>
  );
}

interface CbTelemetryErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function CbTelemetryErrorState({ error, onRetry }: CbTelemetryErrorStateProps) {
  return (
    <div className="p-6 bg-red-950/40 border border-red-800/60 rounded-2xl text-red-300">
      <div className="flex items-center gap-2 mb-2 font-semibold text-red-200">
        <AlertCircle className="w-5 h-5" />
        Lỗi kết nối đường truyền Live Telemetry
      </div>
      <p className="text-xs mb-4">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
      >
        Thử kết nối lại
      </button>
    </div>
  );
}
