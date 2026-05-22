function _print(level: string, msg: string, toStderr = false): void {
  const ts = new Date().toTimeString().slice(0, 8);
  const line = `[${ts}] ${level} ${msg}\n`;
  if (toStderr) process.stderr.write(line);
  else process.stdout.write(line);
}

export function info(msg: string): void  { _print('INFO ', msg); }
export function warn(msg: string): void  { _print('WARN ', msg, true); }
export function error(msg: string): void { _print('ERROR', msg, true); }
export function ok(msg: string): void    { _print('OK   ', msg); }
