import { test, expect } from '@playwright/test';

/**
 * TC001: APIキー管理機能テスト
 *
 * 対象PBI: PBI-002
 * 目的: APIキーの設定・保存・検証・削除が正しく動作することを確認
 */

test.describe('TC001: APIキー管理機能', () => {

  // 各テストの前にlocalStorageをクリア
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('シナリオ1-1: 初回起動時にAPIキー入力モーダルが表示される', async ({ page }) => {
    await page.goto('/');

    // APIキー入力モーダルが表示されることを確認
    const modal = page.locator('[data-testid="api-key-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // モーダルのタイトルを確認
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('API');
  });

  test('シナリオ1-2: モーダルが簡単に閉じられない', async ({ page }) => {
    await page.goto('/');

    // モーダルの外側をクリック（閉じられないことを確認）
    await page.click('body', { position: { x: 10, y: 10 } });

    const modal = page.locator('[data-testid="api-key-modal"]');
    await expect(modal).toBeVisible();
  });

  test('シナリオ1-3: 無効なAPIキーでエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/');

    // 無効なAPIキーを入力
    await page.fill('[data-testid="api-key-input"]', 'invalid-test-key');

    // 保存ボタンをクリック
    await page.click('[data-testid="save-api-key-button"]');

    // ローディング表示を確認（オプション）
    // await expect(page.locator('[data-testid="loading"]')).toBeVisible();

    // エラーメッセージが表示されることを確認
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
    await expect(errorMessage).toContainText(/無効|エラー|失敗/i);
  });

  test('シナリオ1-4: 有効なAPIキーで保存成功', async ({ page }) => {
    await page.goto('/');

    // 有効なAPIキーを環境変数から取得（なければスキップ）
    const validApiKey = process.env.GEMINI_API_KEY;

    if (!validApiKey) {
      test.skip('GEMINI_API_KEY環境変数が設定されていません');
    }

    // 有効なAPIキーを入力
    await page.fill('[data-testid="api-key-input"]', validApiKey);

    // 保存ボタンをクリック
    await page.click('[data-testid="save-api-key-button"]');

    // 成功メッセージが表示される
    const successMessage = page.locator('[data-testid="success-message"]');
    await expect(successMessage).toBeVisible({ timeout: 15000 });

    // モーダルが閉じる
    const modal = page.locator('[data-testid="api-key-modal"]');
    await expect(modal).toBeHidden({ timeout: 5000 });

    // メインアプリ画面が表示される
    await expect(page.locator('[data-testid="main-app"]')).toBeVisible();
  });

  test('シナリオ2: APIキーが永続化される', async ({ page }) => {
    const validApiKey = process.env.GEMINI_API_KEY;

    if (!validApiKey) {
      test.skip('GEMINI_API_KEY環境変数が設定されていません');
    }

    // Step 1: APIキーを保存
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', validApiKey);
    await page.click('[data-testid="save-api-key-button"]');

    // モーダルが閉じるまで待つ
    await page.waitForSelector('[data-testid="api-key-modal"]', { state: 'hidden' });

    // Step 2: localStorageを確認
    const storedKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
    expect(storedKey).toBe(validApiKey);

    // Step 3: ページをリロード
    await page.reload();

    // Step 4: モーダルが表示されない（APIキーが保持されている）
    const modal = page.locator('[data-testid="api-key-modal"]');
    await expect(modal).toBeHidden({ timeout: 3000 });

    // Step 5: メインアプリが表示される
    await expect(page.locator('[data-testid="main-app"]')).toBeVisible();
  });

  test('シナリオ3: APIキーの検証機能', async ({ page }) => {
    const validApiKey = process.env.GEMINI_API_KEY;

    if (!validApiKey) {
      test.skip('GEMINI_API_KEY環境変数が設定されていません');
    }

    // 前提: APIキーを保存済み
    await page.goto('/');
    await page.fill('[data-testid="api-key-input"]', validApiKey);
    await page.click('[data-testid="save-api-key-button"]');
    await page.waitForSelector('[data-testid="api-key-modal"]', { state: 'hidden' });

    // 設定画面を開く
    await page.click('[data-testid="settings-button"]');

    // 設定モーダルが表示される
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();

    // APIキーテストボタンをクリック
    await page.click('[data-testid="test-api-key-button"]');

    // ローディング表示
    await expect(page.locator('[data-testid="testing-indicator"]')).toBeVisible();

    // 成功メッセージが表示される
    await expect(page.locator('[data-testid="test-success-message"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="test-success-message"]')).toContainText(/有効|成功/i);
  });

  test('シナリオ4: APIキーの削除機能', async ({ page }) => {
    const validApiKey = process.env.GEMINI_API_KEY || 'test-key-for-deletion';

    // 前提: APIキーを保存済み
    await page.goto('/');
    await page.evaluate((key) => localStorage.setItem('gemini_api_key', key), validApiKey);
    await page.reload();

    // 設定画面を開く
    await page.click('[data-testid="settings-button"]');

    // APIキー削除ボタンをクリック
    await page.click('[data-testid="delete-api-key-button"]');

    // 確認ダイアログが表示される
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();

    // キャンセルをクリック
    await page.click('[data-testid="cancel-button"]');

    // ダイアログが閉じる
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeHidden();

    // APIキーはまだ削除されていない
    let storedKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
    expect(storedKey).toBe(validApiKey);

    // 再度削除ボタンをクリック
    await page.click('[data-testid="delete-api-key-button"]');
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();

    // 削除を実行
    await page.click('[data-testid="confirm-delete-button"]');

    // APIキーが削除される
    storedKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
    expect(storedKey).toBeNull();

    // APIキー入力モーダルが再表示される
    await expect(page.locator('[data-testid="api-key-modal"]')).toBeVisible({ timeout: 3000 });
  });

  test('シナリオ5: バリデーション - 空のAPIキー', async ({ page }) => {
    await page.goto('/');

    // 空欄で保存ボタンをクリック
    await page.click('[data-testid="save-api-key-button"]');

    // バリデーションエラーが表示される
    const errorMessage = page.locator('[data-testid="validation-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/入力|必須/i);
  });

  test('シナリオ5: バリデーション - 空白文字のみ', async ({ page }) => {
    await page.goto('/');

    // 空白文字だけ入力
    await page.fill('[data-testid="api-key-input"]', '   ');
    await page.click('[data-testid="save-api-key-button"]');

    // バリデーションエラーが表示される
    const errorMessage = page.locator('[data-testid="validation-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/入力|必須/i);
  });

  test('シナリオ6: セキュリティ - XSS対策', async ({ page }) => {
    await page.goto('/');

    // スクリプトタグを含む文字列を入力
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('[data-testid="api-key-input"]', xssPayload);

    // アラートが表示されないことを確認（スクリプトが実行されない）
    page.on('dialog', async dialog => {
      // もしダイアログが出たら失敗
      expect(dialog.type()).not.toBe('alert');
      await dialog.dismiss();
    });

    // 保存ボタンをクリック
    await page.click('[data-testid="save-api-key-button"]');

    // エラーメッセージが表示される（スクリプトは実行されない）
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
  });

  test('シナリオ6: APIキーのマスク表示', async ({ page }) => {
    const validApiKey = process.env.GEMINI_API_KEY || 'test-key-12345';

    // APIキーを保存
    await page.goto('/');
    await page.evaluate((key) => localStorage.setItem('gemini_api_key', key), validApiKey);
    await page.reload();

    // 設定画面を開く
    await page.click('[data-testid="settings-button"]');

    // APIキー表示欄を確認
    const apiKeyDisplay = page.locator('[data-testid="api-key-display"]');
    await expect(apiKeyDisplay).toBeVisible();

    // マスク表示されていることを確認（****が含まれる）
    const displayText = await apiKeyDisplay.textContent();
    expect(displayText).toMatch(/\*+/);
    expect(displayText).not.toBe(validApiKey); // 生の値は表示されない
  });
});
