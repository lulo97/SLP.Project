import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test('redis set/get works', async () => {
  execSync('docker exec redis redis-cli SET playwright hello');

  const result = execSync('docker exec redis redis-cli GET playwright')
    .toString()
    .trim();

  expect(result).toBe('hello');
});