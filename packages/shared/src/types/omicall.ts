export interface OmiCallDiagnosticResult {
  status: 'ok' | 'error' | 'simulation_fallback';
  code?: number;
  message: string;
  details?: any;
}

export interface OmiCallConfigPayload {
  id: number | null;
  staffId: number;
  displayName: string;
  username: string;
  role: string;
  extension: string | null;
  phoneNumber: string | null;
  hasSipPassword: boolean;
}

export interface OmiCallLogPayload {
  id: number;
  callUuid: string;
  duration: number;
  happyCallStatus: string;
  analysisStatus: string;
  laughCount: number;
  laughCountAgent: number;
  laughCountCustomer: number;
  laughTimestamps: any[];
  customerSatisfactionScore: number | null;
  customerSentiment: string | null;
  satisfactionAnalysis: string | null;
  transcript: string | null;
  customerName: string | null;
  legacyUserId: number | null;
}
