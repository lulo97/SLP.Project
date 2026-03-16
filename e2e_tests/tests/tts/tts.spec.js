const { test, expect, request } = require('@playwright/test');
const fs = require("fs");
const path = require("path");

test('TTS API should return audio', async () => {

  const api = await request.newContext();

  const text = "hello from playwright";

  const response = await api.get(
    `http://localhost:8000/tts?text=${encodeURIComponent(text)}`
  );

  expect(response.ok()).toBeTruthy();

  const buffer = await response.body();

  const filePath = path.join(__dirname, "tts-output.wav");

  fs.writeFileSync(filePath, buffer);

  console.log("Saved audio:", filePath);

  await api.dispose();
});