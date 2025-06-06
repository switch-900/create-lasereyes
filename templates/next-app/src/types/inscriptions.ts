export interface Inscription {
  inscriptionId: string;
  inscriptionNumber: string;
  address: string;
  outputValue: string;
  contentType?: string;
  contentLength?: string;
  timestamp?: number;
  offset?: number;
  output?: string;
  genesisTransaction?: string;
  location?: string;
  preview?: string;
  content?: string;
}
export interface InscriptionsResponse {
  total: number;
  list: Inscription[];
}
export interface MethodResult {
  success: boolean;
  method: string;
  error?: any;
  data?: InscriptionsResponse;
}
export type OutputType = 'any' | 'cardinal' | 'inscribed' | 'runic';
export interface OutputResponse {
  address: string;
  indexed: boolean;
  inscriptions: string[];
  outpoint: string;
  runes: Record<string, any>;
  sat_ranges: number[][];
  script_pubkey: string;
  spent: boolean;
  transaction: string;
  value: number;
}
