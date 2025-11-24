import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright設定ファイル
 * プロジェクト: 研修ナレーションスタジオ（シンプル版）
 */
export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',

  // 並列実行しない（API制限考慮）
  fullyParallel: false,

  // CI環境でのみ.only使用を禁止
  forbidOnly: !!process.env.CI,

  // リトライ設定
  retries: process.env.CI ? 2 : 0,

  // ワーカー数（1つずつ実行）
  workers: 1,

  // レポート形式
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],

  // 共通設定
  use: {
    // ベースURL（Live Serverなどのローカルサーバー）
    baseURL: process.env.BASE_URL || 'http://localhost:5500',

    // トレース記録（失敗時のみ）
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // 動画録画（失敗時のみ保持）
    video: 'retain-on-failure',

    // タイムアウト設定
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // ビューポートサイズ
    viewport: { width: 1280, height: 720 },

    // ロケール
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
  },

  // テストプロジェクト（ブラウザ）
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // ヘッドレスモード（デバッグ時はfalseに）
        headless: true,
      },
    },

    // Firefox（必要に応じて有効化）
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // WebKit/Safari（必要に応じて有効化）
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // ローカル開発サーバーの起動（オプション）
  // Live Serverなどを手動起動する場合はコメントアウト
  // webServer: {
  //   command: 'npx live-server --port=5500 --no-browser',
  //   url: 'http://localhost:5500',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
