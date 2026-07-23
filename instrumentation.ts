export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const originalEmit = process.emit;
    process.emit = function (name: string, data: any, ...args: any[]) {
      if (
        (name === 'uncaughtException' || name === 'unhandledRejection') &&
        data &&
        typeof data.message === 'string' &&
        data.message.includes('unrecognized HMR message')
      ) {
        // Suppress benign Next.js/Turbopack HMR websocket errors thrown when browser dev tools send browser-logs events
        return false;
      }
      return originalEmit.apply(process, [name, data, ...args] as any);
    } as any;
  }
}
