import { createServer } from 'net';

export async function findAvailablePort(preferredPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.listen(preferredPort, () => {
      server.close(() => {
        resolve(preferredPort);
      });
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port in use, try next port
        findAvailablePort(preferredPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}
