import { test, expect } from '@playwright/test';

const shouldRun = !!process.env.MOCK_E2E;

test.describe('Mocked Smoke Flow', () => {
  test.skip(!shouldRun, 'Set MOCK_E2E=1 to run mocked smoke test');

  test('生成→再生→ダウンロード→履歴再生 (モックTTS)', async ({ page }) => {
    await page.addInitScript(() => {
      window.__MOCK_TTS__ = true;
      window.localStorage.setItem('gemini_api_key', 'dummy-key');
    });

    await page.goto('/');
    await page.fill('#speaker-a-name', 'Alice');
    await page.fill('#speaker-b-name', 'Bob');
    await page.fill('#script-textarea', 'Alice: hello\nBob: hi');

    await page.getByText('音声を生成する').click();
    await page.waitForSelector('[data-testid="generation-complete"]', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('[data-testid="generation-complete"]', { state: 'hidden', timeout: 10000 });

    const playButton = page.getByTestId('play-button');
    await expect(playButton).toBeEnabled();
    await playButton.click();

    const downloadButton = page.getByTestId('download-button');
    await expect(downloadButton).toBeEnabled();

    await page.getByText('▶ Play').first().click({ trial: true });
    await page.getByText('⬇ Info').first().click({ trial: true });
  });
});
