type LogArgs = unknown[];

function ts(): string {
  return new Date().toISOString();
}

export const log = {
  info: (...args: LogArgs) => console.log(`[${ts()}] [info]`, ...args),
  warn: (...args: LogArgs) => console.warn(`[${ts()}] [warn]`, ...args),
  error: (...args: LogArgs) => console.error(`[${ts()}] [error]`, ...args),
  debug: (...args: LogArgs) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${ts()}] [debug]`, ...args);
    }
  },
};
