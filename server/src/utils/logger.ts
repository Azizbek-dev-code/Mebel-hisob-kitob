/* eslint-disable no-console */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Minimal structured logger.
 *
 * Emits single-line JSON in production so a log collector can parse it, and a
 * readable form during development. Kept dependency-free on purpose — swapping in
 * pino or winston later only requires changing this file.
 */
class Logger {
  constructor(
    private readonly minLevel: LogLevel = 'info',
    private readonly pretty: boolean = true,
  ) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;

    const timestamp = new Date().toISOString();
    const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

    if (this.pretty) {
      const suffix =
        context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
      sink(`${timestamp} ${level.toUpperCase().padEnd(5)} ${message}${suffix}`);
      return;
    }

    sink(JSON.stringify({ timestamp, level, message, ...context }));
  }
}

const configuredLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = new Logger(
  LEVEL_ORDER[configuredLevel] ? configuredLevel : 'info',
  !isProduction,
);
