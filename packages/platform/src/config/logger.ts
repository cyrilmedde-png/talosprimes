/**
 * Logger partagé pour les services qui n'ont pas accès au request.log de Fastify.
 *
 * Avant l'initialisation de Fastify, les messages sont envoyés sur la sortie
 * standard via un logger minimal. Une fois setLogger() appelé (dans index.ts),
 * le vrai logger Fastify/pino prend le relais.
 */

interface Logger {
  info: (objOrMsg: unknown, msg?: string) => void;
  error: (objOrMsg: unknown, msg?: string) => void;
  warn: (objOrMsg: unknown, msg?: string) => void;
  debug: (objOrMsg: unknown, msg?: string) => void;
}

// Logger de secours avant l'init de Fastify
const fallbackLogger: Logger = {
  info: (_objOrMsg: unknown, _msg?: string) => { /* noop */ },
  error: (objOrMsg: unknown, msg?: string) => {
    process.stderr.write(JSON.stringify({ level: 'error', objOrMsg, msg }) + '\n');
  },
  warn: (objOrMsg: unknown, msg?: string) => {
    process.stderr.write(JSON.stringify({ level: 'warn', objOrMsg, msg }) + '\n');
  },
  debug: (_objOrMsg: unknown, _msg?: string) => { /* noop */ },
};

let _logger: Logger = fallbackLogger;

/** Appelé une fois dans index.ts après création de l'instance Fastify. */
export function setLogger(fastifyLogger: Logger): void {
  _logger = fastifyLogger;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogFn = (...args: any[]) => void;

export const logger: Logger = {
  info: (...args: unknown[]) => (_logger.info as LogFn)(...args),
  error: (...args: unknown[]) => (_logger.error as LogFn)(...args),
  warn: (...args: unknown[]) => (_logger.warn as LogFn)(...args),
  debug: (...args: unknown[]) => (_logger.debug as LogFn)(...args),
};
