import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test('redis container is running', async () => {
  const output = execSync('docker ps --filter "name=redis" --format "{{.Names}}"')
    .toString()
    .trim();

  expect(output).toBe('redis');
});

test('kafka container is running', async () => {
  const output = execSync('docker ps --filter "name=kafka" --format "{{.Names}}"')
    .toString()
    .trim();

  expect(output).toBe('kafka');
});