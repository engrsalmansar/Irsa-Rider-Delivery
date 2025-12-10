export interface OrderData {
  id: string | number;
  timestamp: number;
  // Add other fields from your JSON file if needed for display
  details?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  MONITORING = 'MONITORING',
  ALARM_ACTIVE = 'ALARM_ACTIVE',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
}