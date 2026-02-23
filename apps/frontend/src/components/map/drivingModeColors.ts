export const DRIVING_MODE_COLORS: Record<string, string> = {
  Manual: '#8c8c8c',
  ACC: '#1890ff',
  LCC: '#52c41a',
  HighwayPilot: '#fa8c16',
  UrbanPilot: '#722ed1',
  Standby: '#595959',
  Autonomous: '#13c2c2',
};

export const SEVERITY_COLORS: Record<string, string> = {
  Blocker: '#f5222d',
  High: '#fa8c16',
  Medium: '#fadb14',
  Low: '#8c8c8c',
};

export function getDrivingModeColor(mode: string): string {
  return DRIVING_MODE_COLORS[mode] ?? '#8c8c8c';
}

export function getSeverityColor(severity: string): string {
  return SEVERITY_COLORS[severity] ?? '#8c8c8c';
}
