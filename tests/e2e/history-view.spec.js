import { test, expect } from '@playwright/test';

test.describe('History View Rendering', () => {
  test('空の履歴ではプレースホルダーが表示される', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('gemini_api_key', 'dummy-key-1234567890');
      localStorage.removeItem('narration_history');
    });

    await page.goto('/');

    await expect(page.locator('[data-testid="main-app"]')).toBeVisible({ timeout: 5000 });
    const emptyCell = page.locator('[data-testid="history-table"] tbody td.empty-history');
    await expect(emptyCell).toHaveText('生成履歴がありません');
  });

  test('保存済み履歴がテーブルに描画される', async ({ page }) => {
    const now = new Date().toISOString();
    const historyEntry = {
      id: 'run_test_case',
      timestamp: now,
      script: 'A: Hello world',
      scriptSnippet: 'A: Hello world',
      modelName: 'gemini-2.5-flash-preview-tts',
      duration: 12.3,
      cost: {
        usd: 0.05,
        jpy: 7.5,
        inputTokens: 1200,
        outputTokens: 2400
      },
      speakers: {
        a: { name: 'A', voice: 'Kore', style: 'calm' },
        b: { name: 'B', voice: 'Puck', style: 'cheerful' }
      },
      sectionCount: 1,
      sections: [
        {
          id: 'section_test_case',
          script: 'A: Hello world',
          scriptSnippet: 'A: Hello world',
          timestamp: now,
          speakers: {
            a: { name: 'A', voice: 'Kore', style: 'calm' },
            b: { name: 'B', voice: 'Puck', style: 'cheerful' }
          },
          mimeType: 'audio/wav',
          fileName: 'narration_test.wav',
          duration: 12.3,
          cost: {
            usd: 0.05,
            jpy: 7.5,
            inputTokens: 1200,
            outputTokens: 2400
          }
        }
      ]
    };

    await page.addInitScript((entry) => {
      localStorage.clear();
      localStorage.setItem('gemini_api_key', 'dummy-key-1234567890');
      localStorage.setItem('narration_history', JSON.stringify([entry]));
    }, historyEntry);

    await page.goto('/');

    await expect(page.locator('[data-testid="main-app"]')).toBeVisible({ timeout: 5000 });

    const row = page.locator('[data-testid="history-table"] tbody tr').first();
    await expect(row.locator('td').nth(0)).toHaveText('01');
    await expect(row.locator('td').nth(2)).toContainText('1 セクション');
    await expect(row.locator('td').nth(4)).toContainText('秒');

    const infoButton = row.locator('button[data-history-download]');
    await expect(infoButton).toBeEnabled();

    const audioButton = row.locator('button[data-history-audio]');
    await expect(audioButton).toBeDisabled();
  });
});
