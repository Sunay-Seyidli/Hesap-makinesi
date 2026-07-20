export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

export type CalculatorMode = 'standard' | 'scientific';

export type AngleUnit = 'deg' | 'rad';

export interface ButtonConfig {
  value: string;
  label: string;
  type: 'digit' | 'operator' | 'function' | 'action' | 'scientific';
  colorClass?: string;
  icon?: string;
}
