import { test, expect } from '@playwright/test';

/**
 * RG001: メインフロー煙テスト（Smoke Test）
 *
 * 目的: アプリケーションの基本的な動作が壊れていないことを迅速に確認する
 * 実施タイミング: 毎日の開発終了時、すべてのPBI実装後
 * 所要時間: 約1-2分（自動実行）
 */

test.describe('RG001: メインフロー煙テスト', () => {

  // テスト前の共通セットアップ
  test.beforeEach(async ({ page }) => {
    // APIキーが設定されていることを前提とする
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY環境変数が設定されていません。煙テストを実行するには有効なAPIキーが必要です。');
    }

    // localStorageをクリアしてからAPIキーを設定
    await page.goto('/');
    await page.evaluate((key) => {
      localStorage.clear();
      localStorage.setItem('gemini_api_key', key);
    }, apiKey);
    await page.reload();
  });

  test('エンドツーエンドで音声生成〜ダウンロードまで実行できる', async ({ page }) => {
    // フェーズ1: 初期設定確認（約10秒）
    test.step('フェーズ1: アプリが正常に表示される', async () => {
      // メインアプリ画面が表示される（APIキー設定済みのためモーダルなし）
      await expect(page.locator('[data-testid="main-app"]')).toBeVisible({ timeout: 5000 });

      // 主要要素が表示されることを確認
      await expect(page.locator('[data-testid="script-textarea"]')).toBeVisible();
      await expect(page.locator('[data-testid="speaker-a-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="speaker-b-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="generate-button"]')).toBeVisible();
    });

    // フェーズ2: 音声生成フロー（約1-2分）
    test.step('フェーズ2: サンプルスクリプトを読み込む', async () => {
      // サンプルスクリプトボタンをクリック
      await page.click('[data-testid="sample-script-button"]');

      // 原稿が読み込まれる
      const scriptContent = await page.locator('[data-testid="script-textarea"]').inputValue();
      expect(scriptContent.length).toBeGreaterThan(0);
      expect(scriptContent).toContain(':'); // 話者名の区切りがある
    });

    test.step('フェーズ2: Speaker A を設定', async () => {
      await page.fill('[data-testid="speaker-a-name"]', 'Joe');
      await page.selectOption('[data-testid="speaker-a-voice"]', 'Kore');

      // 設定が反映されることを確認
      expect(await page.inputValue('[data-testid="speaker-a-name"]')).toBe('Joe');
    });

    test.step('フェーズ2: Speaker B を設定', async () => {
      await page.fill('[data-testid="speaker-b-name"]', 'Jane');
      await page.selectOption('[data-testid="speaker-b-voice"]', 'Puck');

      // 設定が反映されることを確認
      expect(await page.inputValue('[data-testid="speaker-b-name"]')).toBe('Jane');
    });

    test.step('フェーズ2: 音声を生成', async () => {
      // 生成ボタンをクリック
      await page.click('[data-testid="generate-button"]');

      // 進捗バーが表示される
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible({ timeout: 3000 });

      // 生成ボタンが無効化される
      await expect(page.locator('[data-testid="generate-button"]')).toBeDisabled();

      // 生成完了を待つ（最大60秒）
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({ timeout: 60000 });

      // または、セクションプレビューが表示されるのを待つ
      await expect(page.locator('[data-testid="section-preview"]')).toBeVisible({ timeout: 60000 });
    });

    test.step('フェーズ2: 音声を再生', async () => {
      // セクションプレビューに音声プレーヤーが表示される
      const audioPlayer = page.locator('[data-testid="audio-player"]').first();
      await expect(audioPlayer).toBeVisible();

      // 再生ボタンをクリック
      await page.click('[data-testid="play-button"]');

      // 音声が再生されることを確認（audio要素のplayingイベント）
      await page.waitForTimeout(1000); // 少し待つ

      const isPlaying = await page.evaluate(() => {
        const audio = document.querySelector('audio');
        return audio && !audio.paused;
      });
      expect(isPlaying).toBe(true);

      // 再生を停止（次のテストのため）
      await page.click('[data-testid="pause-button"]');
    });

    test.step('フェーズ2: 音声をダウンロード', async () => {
      // ダウンロードボタンをクリック
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await page.click('[data-testid="download-button"]');

      const download = await downloadPromise;

      // ダウンロードファイル名を確認
      expect(download.suggestedFilename()).toMatch(/\.wav$/i);
    });

    test.step('フェーズ2: 履歴に記録される', async () => {
      // 履歴テーブルが表示される
      await expect(page.locator('[data-testid="history-table"]')).toBeVisible();

      // 少なくとも1件の履歴がある
      const historyRows = page.locator('[data-testid="history-table"] tbody tr');
      await expect(historyRows).toHaveCount(1, { timeout: 5000 });
    });

    // クイックチェックポイント: エラーがない
    test.step('クイックチェック: コンソールエラーがない', async () => {
      // コンソールエラーをキャプチャ（重大なエラーのみ）
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // 重大なエラーがないことを確認（警告は許容）
      expect(consoleErrors.length).toBe(0);
    });
  });

  test('クイックチェック: 主要UI要素が表示される', async ({ page }) => {
    // 高速チェック: 主要な画面要素が存在することのみ確認

    // ヘッダー
    await expect(page.locator('header')).toBeVisible();

    // 原稿入力エリア
    await expect(page.locator('[data-testid="script-section"]')).toBeVisible();

    // 話者設定
    await expect(page.locator('[data-testid="speaker-settings"]')).toBeVisible();

    // 生成設定
    await expect(page.locator('[data-testid="generation-settings"]')).toBeVisible();

    // 生成ボタン
    await expect(page.locator('[data-testid="generate-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-button"]')).toBeEnabled();
  });

  test('クイックチェック: ナビゲーションが機能する', async ({ page }) => {
    // 設定ボタンをクリック
    await page.click('[data-testid="settings-button"]');

    // 設定モーダルが開く
    await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible({ timeout: 3000 });

    // 閉じるボタンをクリック
    await page.click('[data-testid="close-settings-button"]');

    // モーダルが閉じる
    await expect(page.locator('[data-testid="settings-modal"]')).toBeHidden({ timeout: 3000 });

    // ヘルプボタンをクリック（実装されている場合）
    const helpButton = page.locator('[data-testid="help-button"]');
    if (await helpButton.isVisible()) {
      await helpButton.click();
      await expect(page.locator('[data-testid="help-modal"]')).toBeVisible({ timeout: 3000 });
    }
  });
});

// 追加の簡易テスト: 重要な機能が壊れていないことを素早く確認
test.describe('RG001: クイックサニティチェック（超高速）', () => {

  test('ページが正常にロードされる', async ({ page }) => {
    await page.goto('/');

    // ページタイトルを確認
    await expect(page).toHaveTitle(/ナレーション|TTS|研修/i);

    // 5秒以内にメイン要素が表示される
    await expect(page.locator('main, [data-testid="main-app"]')).toBeVisible({ timeout: 5000 });
  });

  test('JavaScriptエラーが発生しない', async ({ page }) => {
    const errors = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // JavaScriptエラーがないことを確認
    expect(errors).toHaveLength(0);
  });

  test('CSSが正しく読み込まれている', async ({ page }) => {
    await page.goto('/');

    // body要素の背景色を確認（CSSが適用されている）
    const bodyBgColor = await page.locator('body').evaluate(el =>
      window.getComputedStyle(el).backgroundColor
    );

    // デフォルトの白以外の色が設定されている
    expect(bodyBgColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});
