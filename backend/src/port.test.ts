import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { listenWithFallback } from './port.js';

const servers: http.Server[] = [];
afterEach(async () => Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve())))));

describe('automatic port fallback', () => {
  it('selects the next port when the preferred port is occupied', async () => {
    const occupied = http.createServer(); servers.push(occupied);
    const preferred = await listenWithFallback(occupied, 32100, true);
    const studio = http.createServer(); servers.push(studio);
    const selected = await listenWithFallback(studio, preferred, true);
    expect(selected).toBe(preferred + 1);
  });
});
