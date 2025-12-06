# Playwright E2Eテスト実行ガイド

## 📋 目次
- [環境セットアップ](#環境セットアップ)
- [テストの実行方法](#テストの実行方法)
- [テストケース一覧](#テストケース一覧)
- [トラブルシューティング](#トラブルシューティング)

---

## 環境セットアップ

### 1. 前提条件
- Node.js v18以上がインストールされていること
- npm がインストールされていること
- Gemini API キーを取得済みであること

### 2. 依存関係のインストール

```bash
# プロジェクトディレクトリに移動
cd "c:\Users\eiichi.hayashi.67\OneDrive - 株式会社 SHIFT\ドキュメント\GItProject\GooglrTTSSimpleApp"

# 依存関係をインストール
npm install

# Playwrightブラウザをインストール（初回のみ）
npx playwright install chromium
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成し、APIキーを設定します。

```bash
# Windowsの場合
copy .env.example .env

# Linux/Macの場合
cp .env.example .env
```

`.env` ファイルを編集して、実際のAPIキーを設定:

```env
GEMINI_API_KEY=AIzaSyCUhDCOC2nXOSLtZR624tQwnL5nXUUSfZA
BASE_URL=http://localhost:5500
```

### 4. ローカルサーバーの起動

テストを実行する前に、アプリケーションをローカルサーバーで起動しておく必要があります。

**方法1: Live Server（VS Code拡張機能）**
1. VS Codeで `src/index.html` を開く
2. 右クリック → "Open with Live Server"
3. ブラウザが起動し、`http://localhost:5500` で表示される

**方法2: Pythonのhttpサーバー**
```bash
cd src
python -m http.server 5500
```

**方法3: Node.jsのhttpサーバー**
```bash
npx http-server src -p 5500
```

---

## テストの実行方法

### 基本コマンド

```bash
# すべてのテストを実行（ヘッドレスモード）
npm test

# ブラウザを表示して実行（デバッグに便利）
npm run test:headed

# UIモードで実行（インタラクティブ）
npm run test:ui

# デバッグモード（ステップ実行）
npm run test:debug

# 煙テストのみ実行（RG001）
npm run test:smoke

# APIキー管理テストのみ実行
npm run test:api-key

# テストレポートを表示
npm run test:report
```

### 個別のテストファイルを実行

```bash
# APIキー管理テストのみ
npx playwright test api-key-management.spec.js

# 煙テストのみ
npx playwright test regression-smoke.spec.js

# 特定のテストケースのみ（テスト名で絞り込み）
npx playwright test -g "初回起動時にAPIキー入力モーダルが表示される"
```

### ブラウザを指定して実行

```bash
# Chromiumのみ
npx playwright test --project=chromium

# Firefoxのみ（設定ファイルで有効化が必要）
npx playwright test --project=firefox
```

---

## テストケース一覧

### TC001: APIキー管理機能テスト
**ファイル**: `tests/e2e/api-key-management.spec.js`

| # | テストケース | 目的 |
|---|------------|------|
| 1-1 | 初回起動時にモーダル表示 | APIキー未設定時の動作確認 |
| 1-2 | モーダルが簡単に閉じられない | 必須入力の制御確認 |
| 1-3 | 無効なAPIキーでエラー | バリデーション確認 |
| 1-4 | 有効なAPIキーで保存成功 | 正常系の動作確認 |
| 2 | APIキーが永続化される | localStorage保存確認 |
| 3 | APIキーの検証機能 | テスト機能の動作確認 |
| 4 | APIキーの削除機能 | 削除フローの確認 |
| 5 | バリデーション | 空入力、空白文字の検証 |
| 6 | セキュリティ | XSS対策、マスク表示確認 |

**実行コマンド**:
```bash
npm run test:api-key
```

---

### RG001: メインフロー煙テスト
**ファイル**: `tests/e2e/regression-smoke.spec.js`

**目的**: アプリの基本機能が壊れていないことを迅速に確認

| # | チェック項目 | 確認内容 |
|---|------------|---------|
| 1 | アプリ表示 | メイン画面が正常に表示される |
| 2 | サンプル読込 | サンプルスクリプトが読み込める |
| 3 | 話者設定 | 2名の話者設定ができる |
| 4 | 音声生成 | API呼び出しが成功する |
| 5 | 音声再生 | 生成された音声が再生できる |
| 6 | ダウンロード | WAVファイルがダウンロードできる |
| 7 | 履歴記録 | 履歴に記録される |
| 8 | エラーチェック | コンソールエラーがない |

**実行コマンド**:
```bash
npm run test:smoke
```

**所要時間**: 約1-2分

### RG002: モック煙テスト（ネットワーク依存なし）
**ファイル**: `tests/e2e/mock-smoke.spec.js`
**目的**: モックTTS/ストレージで生成→再生→DL→履歴再生の最小フローを安定確認（`MOCK_E2E=1` で有効化）

**実行手順**:
```bash
# サーバーを起動（例）
npx http-server src -p 5500

# モック煙テスト
npm run test:mock-e2e
```
`MOCK_E2E` を指定しない場合はスキップされる。`window.__MOCK_TTS__` を利用してTTS呼び出しをモック化し、外部ネットワークに依存しない。

---

## 実行結果の確認

### レポートの表示

テスト実行後、HTMLレポートが自動生成されます。

```bash
# レポートを開く
npm run test:report
```

レポートには以下が含まれます：
- テスト成功/失敗の一覧
- 実行時間
- スクリーンショット（失敗時）
- トレース情報（失敗時）

### ファイル構成

```
playwright-report/       # HTMLレポート
test-results/           # テスト結果（JSON、スクリーンショットなど）
  ├── api-key-management-xxx/
  │   ├── test-failed-1.png
  │   └── trace.zip
  └── ...
```

---

## デバッグ方法

### UIモードを使う（推奨）

```bash
npm run test:ui
```

**できること**:
- テストをステップ実行
- 各アクションの前後で画面を確認
- タイムトラベルデバッグ
- ロケーターの検証

### デバッグモードを使う

```bash
npm run test:debug
```

**できること**:
- ブレークポイントで停止
- DevToolsでDOMを調査
- コンソールログを確認

### ヘッド付きモードで実行

```bash
npm run test:headed
```

ブラウザが表示されるので、テストの動作を目視確認できます。

---

## トラブルシューティング

### 1. テストが失敗する: "Timeout 30000ms exceeded"

**原因**: ローカルサーバーが起動していない、または要素が見つからない

**対処法**:
1. ローカルサーバーが起動しているか確認
   ```bash
   # ブラウザで開いて確認
   start http://localhost:5500
   ```
2. `data-testid` 属性がHTMLに実装されているか確認
3. タイムアウト時間を延ばす（playwright.config.jsで設定）

---

### 2. 環境変数が読み込まれない

**原因**: `.env` ファイルが存在しない、または形式が間違っている

**対処法**:
1. `.env` ファイルが存在するか確認
   ```bash
   ls -la .env
   ```
2. 環境変数を直接設定して実行
   ```bash
   # Windows PowerShell
   $env:GEMINI_API_KEY="your_key_here"; npm test

   # Linux/Mac
   GEMINI_API_KEY=your_key_here npm test
   ```

---

### 3. "GEMINI_API_KEY環境変数が設定されていません" エラー

**原因**: APIキーが設定されていない

**対処法**:
1. `.env` ファイルにAPIキーを記載
2. APIキーなしでも実行できるテストのみ実行
   ```bash
   # UIテストなど、APIキー不要なテストのみ
   npx playwright test -g "初回起動時にモーダル表示"
   ```

---

### 4. ブラウザが起動しない

**原因**: Playwrightのブラウザがインストールされていない

**対処法**:
```bash
# ブラウザを再インストール
npx playwright install chromium

# すべてのブラウザをインストール
npx playwright install
```

---

### 5. "data-testid属性が見つからない" エラー

**原因**: アプリケーション側のHTMLに `data-testid` 属性が実装されていない

**対処法**:
1. 実装が完了するまでテストをスキップ
2. 代替のセレクタを使用（一時的）
   ```javascript
   // data-testidの代わりにIDやクラスを使用
   await page.click('#api-key-input');
   ```

---

## ベストプラクティス

### 1. 毎日の終わりに煙テストを実行

```bash
npm run test:smoke
```

約1-2分で基本機能の動作確認ができます。

### 2. 機能実装後に該当テストを実行

```bash
# APIキー機能を実装した後
npm run test:api-key
```

### 3. コミット前にすべてのテストを実行

```bash
npm test
```

### 4. CI/CD統合

GitHub Actionsなどで自動実行する設定例:

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm test
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

---

## 追加情報

### Playwrightドキュメント
- [公式ドキュメント（日本語）](https://playwright.dev/docs/intro)
- [API リファレンス](https://playwright.dev/docs/api/class-playwright)

### プロジェクトドキュメント
- [開発プロセス](./Doc/development-process.md)
- [テストケース詳細](./Doc/test-cases/)
- [クイックリファレンス](./Doc/quick-reference.md)

---

## サポート

問題が解決しない場合は:
1. [Playwrightのトラブルシューティング](https://playwright.dev/docs/troubleshooting)を確認
2. プロジェクトのIssueを起票
3. チームに相談
