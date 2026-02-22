import pino, { Logger } from 'pino';

export function createLogger(serviceName: string): Logger {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    base: {
      service: serviceName,
    },
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  });
}
