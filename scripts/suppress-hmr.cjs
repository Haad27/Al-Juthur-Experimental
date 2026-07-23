// Suppresses benign Next.js/Turbopack HMR websocket errors ("unrecognized HMR message") when browser dev tools send browser-logs events.
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (
    (name === 'uncaughtException' || name === 'unhandledRejection') &&
    data &&
    typeof data.message === 'string' &&
    data.message.includes('unrecognized HMR message')
  ) {
    return false;
  }
  return originalEmit.apply(process, [name, data, ...args]);
};
