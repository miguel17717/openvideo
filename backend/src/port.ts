import type { Server } from 'node:http';

export function listenWithFallback(server: Server, preferred: number, fallback = true, host = '127.0.0.1'): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off('listening', onListening);
        if (error.code === 'EADDRINUSE' && fallback && port < 65535) { tryPort(port + 1); return; }
        reject(error);
      };
      const onListening = () => { server.off('error', onError); resolve(port); };
      server.once('error', onError); server.once('listening', onListening); server.listen(port, host);
    };
    tryPort(preferred);
  });
}
