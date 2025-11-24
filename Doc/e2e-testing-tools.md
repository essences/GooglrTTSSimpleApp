# E2Eテストツール選定ガイド

## プロジェクト情報
- **作成日**: 2025-11-24
- **対象**: 研修ナレーションスタジオ（シンプル版）
- **アプリタイプ**: ブラウザベース、シングルページアプリケーション
- **技術スタック**: Vanilla JS（ビルドレス）

---

## 推奨E2Eテストツール

### 🥇 推奨1位: Playwright（最推奨）

#### 選定理由
- ✅ **セットアップが簡単**（Node.js環境のみ必要）
- ✅ **複数ブラウザ対応**（Chromium, Firefox, WebKit）を標準サポート
- ✅ **日本語ドキュメント充実**
- ✅ **自動待機機能**が優秀（flaky testになりにくい）
- ✅ **トレース・デバッグ機能**が強力
- ✅ **ヘッドレス/ヘッド付き**両方対応
- ✅ **スクリーンショット・動画録画**が標準機能
- ✅ Microsoft製で長期サポートが期待できる

#### デメリット
- Node.js環境が必要
- 学習コストがやや高い（ただしドキュメント充実）

#### 適用方法
```bash
# 1. インストール
npm init playwright@latest

# 2. テスト作成（例: tests/e2e/api-key-management.spec.js）
# 3. テスト実行
npx playwright test

# 4. レポート確認
npx playwright show-report
```

---

### 🥈 推奨2位: Cypress

#### 選定理由
- ✅ **開発者体験が優れている**（リアルタイムリロード、タイムトラベルデバッグ）
- ✅ **日本語ドキュメント充実**
- ✅ **UIが分かりやすい**（Test Runnerが視覚的）
- ✅ **デバッグが容易**
- ✅ **スクリーンショット・動画録画**が標準機能
- ✅ コミュニティが活発

#### デメリット
- 複数ブラウザサポートが限定的（有料版でのみ一部対応）
- Node.js環境が必要

#### 適用方法
```bash
# 1. インストール
npm install cypress --save-dev

# 2. 初期化
npx cypress open

# 3. テスト作成（cypress/e2e/api-key-management.cy.js）
# 4. テスト実行
npx cypress run
```

---

### 🥉 推奨3位: Selenium WebDriver（Node.js版）

#### 選定理由
- ✅ **最も成熟したツール**（長い歴史）
- ✅ **複数ブラウザ対応**
- ✅ **多言語対応**（Python, Java, C#など）
- ✅ 既存資産がある場合に有利

#### デメリット
- セットアップが複雑
- 自動待機機能が弱い
- モダンなツールに比べてDXが劣る

---

### 💡 推奨4位: Puppeteer（軽量シンプル）

#### 選定理由
- ✅ **軽量・高速**
- ✅ **セットアップが簡単**
- ✅ Google製で信頼性が高い
- ✅ APIがシンプル

#### デメリット
- Chromiumのみサポート（Firefox, Safariは非対応）
- E2E専用ではない（汎用ブラウザ自動化ツール）

---

## 本プロジェクトでの推奨構成

### 構成A: Playwright（バランス型）✨ **最推奨**

**対象**: 本格的にE2E自動化を導入したい場合

```
プロジェクト構成:
/
├── src/
│   ├── index.html
│   ├── app.js
│   └── ...
├── tests/
│   └── e2e/
│       ├── api-key-management.spec.js
│       ├── audio-generation.spec.js
│       ├── regression-smoke.spec.js
│       └── ...
├── playwright.config.js
└── package.json
```

**メリット**:
- 複数ブラウザで自動テスト可能
- CI/CD統合が容易
- 詳細なレポート・トレース

**初期セットアップ時間**: 約30分

---

### 構成B: 手動テスト + Playwright（段階的導入）⭐ **現実的**

**対象**: 初期は手動、重要な箇所から段階的に自動化

**フェーズ1（Sprint 1-2）**: 手動E2Eテスト
- テストケース（TC001など）に従って手動実行
- 所要時間: 1機能あたり10-20分

**フェーズ2（Sprint 3-4）**: 煙テスト自動化
- RG001（メインフロー煙テスト）をPlaywrightで自動化
- 毎日の終わりに自動実行
- 所要時間: 5分 → 1分に短縮

**フェーズ3（リリース後）**: 主要シナリオを順次自動化
- TC001, TC002 などを徐々に自動化

**メリット**:
- 学習コストを分散できる
- 最初から動作確認できる
- 必要性を感じてから自動化

**初期セットアップ時間**: 0分（手動から開始）

---

### 構成C: 手動テストのみ（最軽量）

**対象**: 開発スピード最優先、リソースが限られている場合

**方法**:
- すべて手動でテスト実行
- チェックリストを活用
- スクリーンショットを手動保存

**メリット**:
- セットアップ不要
- すぐに開始できる
- シンプル

**デメリット**:
- テスト時間がかかる
- 人的ミスの可能性

---

## 🎯 本プロジェクトでの推奨: 構成B（段階的導入）

**理由**:
1. **初期は手動で素早く開発**
   - ツール学習時間を開発に充てる
   - 仕様が固まっていない段階での自動化は非効率

2. **重要な箇所から自動化**
   - 煙テスト（RG001）は毎日実行するため自動化効果が高い
   - 主要シナリオを自動化すればリグレッションテストが楽になる

3. **学習コストを分散**
   - Sprint 1-2: 開発に集中
   - Sprint 3-4: Playwright導入・自動化開始
   - リリース後: さらに拡充

---

## Playwright 導入ガイド

### ステップ1: インストール

```bash
# プロジェクトディレクトリに移動
cd "c:\Users\eiichi.hayashi.67\OneDrive - 株式会社 SHIFT\ドキュメント\GItProject\GooglrTTSSimpleApp"

# package.json が未作成の場合
npm init -y

# Playwrightインストール（対話式）
npm init playwright@latest
```

**インストール時の選択**:
- Language: JavaScript
- Test folder: tests
- GitHub Actions: No（後で設定可能）
- Install browsers: Yes

---

### ステップ2: 設定ファイル編集

`playwright.config.js`:
```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // 並列実行しない（API制限考慮）
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 1つずつ実行
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5500', // Live ServerのURL
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Safariテストが必要な場合
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // ローカル開発サーバー起動（オプション）
  // webServer: {
  //   command: 'npx live-server --port=5500',
  //   url: 'http://localhost:5500',
  //   reuseExistingServer: !process.env.CI,
  // },
});
```

---

### ステップ3: テスト作成例

`tests/e2e/api-key-management.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

// テスト前にlocalStorageをクリア
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.describe('APIキー管理機能', () => {

  test('TC001-1: 初回起動時にAPIキー入力モーダルが表示される', async ({ page }) => {
    await page.goto('/');

    // モーダルが表示されることを確認
    const modal = page.locator('[data-testid="api-key-modal"]');
    await expect(modal).toBeVisible();

    // モーダルのタイトルを確認
    await expect(page.locator('h2')).toContainText('APIキー設定');
  });

  test('TC001-2: 無効なAPIキーでエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/');

    // 無効なAPIキーを入力
    await page.fill('[data-testid="api-key-input"]', 'invalid-key');
    await page.click('[data-testid="save-button"]');

    // エラーメッセージが表示されることを確認
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('APIキーが無効です');
  });

  test('TC001-3: 有効なAPIキーで保存成功', async ({ page }) => {
    await page.goto('/');

    // 有効なAPIキーを入力（環境変数から取得）
    const validApiKey = process.env.GEMINI_API_KEY;
    await page.fill('[data-testid="api-key-input"]', validApiKey);
    await page.click('[data-testid="save-button"]');

    // ローディング表示を待つ
    await page.waitForSelector('[data-testid="loading"]', { state: 'visible' });
    await page.waitForSelector('[data-testid="loading"]', { state: 'hidden' });

    // 成功メッセージが表示される
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // モーダルが閉じる
    await expect(page.locator('[data-testid="api-key-modal"]')).toBeHidden();

    // メイン画面が表示される
    await expect(page.locator('[data-testid="main-app"]')).toBeVisible();
  });

  test('TC001-4: APIキーが永続化される', async ({ page, context }) => {
    await page.goto('/');

    // APIキーを保存
    const validApiKey = process.env.GEMINI_API_KEY;
    await page.fill('[data-testid="api-key-input"]', validApiKey);
    await page.click('[data-testid="save-button"]');
    await page.waitForSelector('[data-testid="api-key-modal"]', { state: 'hidden' });

    // localStorageを確認
    const storedKey = await page.evaluate(() => localStorage.getItem('gemini_api_key'));
    expect(storedKey).toBe(validApiKey);

    // ページをリロード
    await page.reload();

    // モーダルが表示されない（APIキーが保持されている）
    await expect(page.locator('[data-testid="api-key-modal"]')).toBeHidden();
    await expect(page.locator('[data-testid="main-app"]')).toBeVisible();
  });
});
```

---

### ステップ4: テスト実行

```bash
# すべてのテストを実行（ヘッドレスモード）
npx playwright test

# 特定のテストファイルのみ実行
npx playwright test api-key-management.spec.js

# UIモードで実行（デバッグに便利）
npx playwright test --ui

# ヘッド付きモードで実行（ブラウザが表示される）
npx playwright test --headed

# 特定のブラウザのみ実行
npx playwright test --project=chromium

# レポートを表示
npx playwright show-report
```

---

### ステップ5: HTMLに data-testid 属性を追加

Playwrightでテストしやすくするため、HTMLに `data-testid` 属性を追加します。

**Before**:
```html
<div class="modal">
  <input type="text" id="api-key" />
  <button class="save-btn">保存</button>
</div>
```

**After**:
```html
<div class="modal" data-testid="api-key-modal">
  <input type="text" id="api-key" data-testid="api-key-input" />
  <button class="save-btn" data-testid="save-button">保存</button>
</div>
```

**メリット**:
- CSSクラスやIDに依存しない（リファクタリングに強い）
- テスト専用の属性なので意図が明確
- Playwrightが推奨する方法

---

## 煙テスト（RG001）の自動化例

`tests/e2e/regression-smoke.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

test.describe('RG001: メインフロー煙テスト', () => {

  test('エンドツーエンドで音声生成〜ダウンロードまで実行できる', async ({ page }) => {
    // 前提: APIキーが設定済み（beforeEachで設定）
    await page.goto('/');

    // 1. サンプルスクリプトを読み込む
    await page.click('[data-testid="sample-script-button"]');
    await expect(page.locator('[data-testid="script-textarea"]')).not.toBeEmpty();

    // 2. Speaker A 設定
    await page.fill('[data-testid="speaker-a-name"]', 'Joe');
    await page.selectOption('[data-testid="speaker-a-voice"]', 'Kore');

    // 3. Speaker B 設定
    await page.fill('[data-testid="speaker-b-name"]', 'Jane');
    await page.selectOption('[data-testid="speaker-b-voice"]', 'Puck');

    // 4. 音声生成ボタンをクリック
    await page.click('[data-testid="generate-button"]');

    // 5. 進捗バーが表示される
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // 6. 生成完了を待つ（最大30秒）
    await page.waitForSelector('[data-testid="section-preview"]', {
      state: 'visible',
      timeout: 30000
    });

    // 7. セクションプレビューに音声プレーヤーが表示される
    const audioPlayer = page.locator('[data-testid="audio-player"]').first();
    await expect(audioPlayer).toBeVisible();

    // 8. 再生ボタンをクリック
    await page.click('[data-testid="play-button"]');

    // 音声が再生されることを確認（audio要素のplayingイベント）
    const isPlaying = await page.evaluate(() => {
      const audio = document.querySelector('audio');
      return !audio.paused;
    });
    expect(isPlaying).toBe(true);

    // 9. ダウンロードボタンをクリック
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]');
    const download = await downloadPromise;

    // ダウンロードファイル名を確認
    expect(download.suggestedFilename()).toMatch(/\.wav$/);

    // 10. 履歴に記録される
    await expect(page.locator('[data-testid="history-table"] tbody tr')).toHaveCount(1);
  });
});
```

---

## CI/CD統合（GitHub Actions）

`.github/workflows/e2e-test.yml`:
```yaml
name: E2E Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## テスト戦略（段階的導入計画）

### Sprint 1-2（手動テスト期）
- **方法**: 手動E2Eテスト
- **実施内容**: TC001, TC002 など
- **所要時間**: 1機能あたり10-20分
- **自動化**: なし

### Sprint 3（自動化導入期）
- **方法**: Playwright導入
- **実施内容**:
  - Playwrightセットアップ（1日）
  - RG001 煙テストを自動化（1日）
  - data-testid属性を既存コードに追加（1日）
- **所要時間**: 約3日
- **効果**: 毎日の煙テストが5分→1分に短縮

### Sprint 4（自動化拡充期）
- **方法**: 主要シナリオを自動化
- **実施内容**:
  - TC001 APIキー管理を自動化
  - TC010 音声生成メインフローを自動化
- **所要時間**: 約2日
- **効果**: リグレッションテストが大幅に効率化

### リリース後（継続的改善）
- 発見したバグのシナリオを自動化
- 新機能のテストケースを自動化
- CI/CD統合

---

## コスト・時間比較

| 項目 | 手動テスト | Playwright自動化 |
|------|-----------|-----------------|
| **初期セットアップ** | 0時間 | 8時間（学習+実装） |
| **煙テスト1回** | 5分 | 1分 |
| **煙テスト×30日** | 150分（2.5時間） | 30分 + 自動実行 |
| **リグレッション（10ケース）** | 100分 | 10分 |
| **メンテナンスコスト** | 低 | 中（テストコード更新必要） |

**損益分岐点**: 約20回実施で自動化の方が効率的

---

## おすすめの進め方

### 現時点（Sprint 1開始前）
1. **手動テストで開始**
   - TC001, RG001 を手動実行
   - 開発スピードを優先

### Sprint 3開始時（余裕があれば）
2. **Playwright導入検討**
   - RG001（煙テスト）を自動化
   - 毎日の負担を軽減

### リリース後（必要性を感じたら）
3. **段階的に自動化拡充**
   - よく実行するテストから自動化
   - CI/CD統合

---

## まとめ

### ✅ 推奨アプローチ: 構成B（段階的導入）

1. **Sprint 1-2**: 手動テストのみ
   - 素早く開発を進める
   - テストケースに従って手動実行

2. **Sprint 3**: Playwright導入
   - 煙テスト（RG001）を自動化
   - 毎日の負担を軽減

3. **Sprint 4以降**: 段階的に拡充
   - 主要シナリオを自動化
   - CI/CD統合

### 💡 重要なポイント
- **自動化は目的ではなく手段**
- **初期は手動で問題なし**
- **効果の高い箇所から自動化**
- **学習コストを考慮する**

---

## 参考リンク

- [Playwright公式ドキュメント（日本語）](https://playwright.dev/docs/intro)
- [Cypress公式ドキュメント](https://docs.cypress.io/)
- [Playwright vs Cypress 比較記事](https://playwright.dev/docs/why-playwright)

---

## 次のステップ

どの構成を選択するか決定してください：

- **構成A**: 今すぐPlaywright導入
- **構成B**: 手動→段階的自動化（推奨）
- **構成C**: 手動テストのみ

選択後、必要に応じてPlaywrightのセットアップをサポートします！
