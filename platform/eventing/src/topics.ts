export const TOPICS = {
  TELEMETRY_MILEAGE: 'ad.telemetry.mileage.realtime',
  VEHICLE_STATUS: 'ad.vehicle.status.tracking',
  ISSUE_REPORTS: 'ad.testing.issue.reports',
  KPI_METRICS: 'ad.testing.kpi.metrics',
} as const;

export const DLQ_SUFFIX = '.dlq';
