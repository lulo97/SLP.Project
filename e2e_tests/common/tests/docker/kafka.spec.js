import { test, expect } from '@playwright/test';
import net from 'net';

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => resolve(false));
    socket.on('timeout', () => resolve(false));

    socket.connect(port, '127.0.0.1');
  });
}

test('Redis port is open', async () => {
  const open = await checkPort(6379);
  expect(open).toBeTruthy();
});

test('Redis port is open', async () => {
  const open = await checkPort(9092);
  expect(open).toBeTruthy();
});