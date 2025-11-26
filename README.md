# 研修ナレーションスタジオ（シンプル版）

> Gemini TTS APIを使った音声生成アプリケーション

## 📋 プロジェクト概要

ブラウザだけで Gemini TTS を利用し、講師が原稿を入力して即時にナレーション音声を生成・ダウンロードできる個人向けツール。

### 主な機能
- ✅ Gemini TTS API連携による高品質な音声生成
- ✅ 最大2名の話者設定（複数話者TTS対応）
- ✅ 30種類の音声プリセットから選択可能
- ✅ ブラウザ完結（サーバー不要）
- ✅ 原稿のテキスト入力・編集
- ✅ 生成した音声の再生・ダウンロード（WAV形式）
- ✅ 履歴管理（localStorage）

---

## 📁 プロジェクト構造

```
GooglrTTSSimpleApp/
├── src/                          # アプリケーションソースコード（実装予定）
│   ├── index.html               # メインHTML
│   ├── app.js                   # メインロジック
│   ├── api-client.js            # Gemini API クライアント
│   └── styles.css               # スタイルシート
├── tests/                        # E2Eテスト
│   └── e2e/
│       ├── api-key-management.spec.js    # APIキー管理テスト
│       └── regression-smoke.spec.js      # 煙テスト
├── Doc/                          # ドキュメント
│   ├── simple-version-spec.md           # 仕様書
│   ├── product-backlog.md               # プロダクトバックログ
│   ├── sprint-plan.md                   # スプリント計画
│   ├── development-process.md           # 開発プロセス
│   ├── quick-reference.md               # クイックリファレンス
│   ├── e2e-testing-tools.md            # E2Eテストツール選定
│   ├── test-cases/                      # テストケース
│   │   ├── sprint1/
│   │   │   └── TC001_api_key_management.md
│   │   └── regression/
│   │       └── RG001_main_flow_smoke_test.md
│   ├── GeminiTTS_API_利用メモ.md        # API利用ドキュメント
│   ├── API疎通確認記録.md               # API接続テスト記録
│   └── narration-app-mock.html          # UIモックアップ
├── playwright.config.js          # Playwright設定
├── package.json                  # Node.js設定
├── .env.example                  # 環境変数サンプル
├── .gitignore                    # Git除外設定
├── TESTING.md                    # テスト実行ガイド
└── README.md                     # このファイル
```

---

## 🚀 クイックスタート

### 1. 環境準備

**前提条件**:
- Node.js v18以上
- npm
- Gemini API キー（[Google AI Studio](https://ai.google.dev/)で取得）

### 2. セットアップ

```bash
# リポジトリをクローン（Gitを使用する場合）
git clone <repository-url>
cd GooglrTTSSimpleApp

# 依存関係をインストール
npm install

# Playwrightブラウザをインストール
npx playwright install chromium

# 環境変数を設定
copy .env.example .env
# .env ファイルを編集してAPIキーを設定
```

`.env` ファイル:
```env
GEMINI_API_KEY=your_api_key_here
BASE_URL=http://localhost:5500
```

### 2.1. Google Cloud Text-to-Speech API のセットアップ（オプション - Proモデル使用時）

Proモデル（`gemini-2.5-pro-tts`）を使用する場合は、Google Cloud Text-to-Speech APIのセットアップが必要です。

#### ステップ1: APIの有効化

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成または選択
3. 画面上部の検索バーで「text-to-speech」と入力
4. 「Cloud Text-to-Speech API」を選択
5. 「有効にする」ボタンをクリック

#### ステップ2: サービスアカウント鍵の作成

1. **IAM & Admin → Service Accounts** に移動
2. 「サービス アカウントを作成」をクリック
3. サービスアカウント名を入力（例: `tts-service-account`）
4. ロールで「Cloud Text-to-Speech API ユーザー」を選択
5. 作成したサービスアカウントの「︙」→「鍵を管理」を選択
6. 「鍵を追加」→「新しい鍵を作成」をクリック
7. キーのタイプで「**JSON**」を選択して「作成」
8. JSON鍵ファイルが自動的にダウンロードされます

#### ステップ3: 環境変数の設定

**Windows の場合:**

1. 「スタートメニュー」を右クリック→「システム」
2. 「システムの詳細設定」→「環境変数」をクリック
3. 「新規」をクリックして以下を設定:
   - 変数名: `GOOGLE_APPLICATION_CREDENTIALS`
   - 変数値: ダウンロードしたJSONファイルのフルパス
     ```
     C:\Users\YourName\keys\tts-service-account.json
     ```
4. コマンドプロンプトまたはPowerShellを再起動

**コマンドラインで一時的に設定（Windows）:**
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account-key.json
```

**PowerShellの場合:**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account-key.json"
```

#### ステップ4: 設定の確認

```cmd
echo %GOOGLE_APPLICATION_CREDENTIALS%
```

#### 重要な注意事項

- ⚠️ JSON鍵ファイルは安全な場所に保管してください
- ⚠️ 鍵ファイルをGitリポジトリにコミットしないでください
- ⚠️ `.gitignore`に鍵ファイルのパスを追加してください

#### 参考リンク

- [Google Cloud Text-to-Speech API ドキュメント](https://cloud.google.com/text-to-speech/docs)
- [サービスアカウント鍵の作成](https://cloud.google.com/iam/docs/keys-create-delete)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)

### 3. アプリケーション起動

**方法1: Live Server（VS Code拡張機能）**
1. VS Codeで `src/index.html` を開く
2. 右クリック → "Open with Live Server"

**方法2: Pythonのhttpサーバー**
```bash
cd src
python -m http.server 5500
```

ブラウザで `http://localhost:5500` を開く

### 4. テスト実行

```bash
# すべてのテストを実行
npm test

# 煙テストのみ（約1-2分）
npm run test:smoke

# UIモードで実行（インタラクティブ）
npm run test:ui
```

詳細は [TESTING.md](./TESTING.md) を参照。

---

## 📖 ドキュメント

### 仕様・設計
- [仕様書](./Doc/simple-version-spec.md) - アプリケーションの仕様
- [プロダクトバックログ](./Doc/product-backlog.md) - 30個のPBI
- [スプリント計画](./Doc/sprint-plan.md) - 4スプリント（8週間）の開発計画

### 開発プロセス
- [開発プロセス・ルール](./Doc/development-process.md) - 開発の進め方
- [クイックリファレンス](./Doc/quick-reference.md) - ルールの要点
- [E2Eテストツール選定](./Doc/e2e-testing-tools.md) - Playwright導入の経緯

### テスト
- [テスト実行ガイド](./TESTING.md) - Playwright E2Eテストの実行方法
- [TC001: APIキー管理テスト](./Doc/test-cases/sprint1/TC001_api_key_management.md)
- [RG001: 煙テスト](./Doc/test-cases/regression/RG001_main_flow_smoke_test.md)

### API
- [Gemini TTS API 利用メモ](./Doc/GeminiTTS_API_利用メモ.md)
- [API疎通確認記録](./Doc/API疎通確認記録.md)

---

## 🛠️ 開発

### 開発の進め方

1. **プロセスを確認**
   - [クイックリファレンス](./Doc/quick-reference.md)を常に開いておく
   - Outside-In開発フロー（UI First → Integration → Refinement → Testing）

2. **PBI実装**
   - [プロダクトバックログ](./Doc/product-backlog.md)からPBIを選択
   - Phase 1-4に従って実装
   - 各フェーズでブラウザ確認

3. **テスト実施**
   - 実装後、該当するテストケースを実行
   - DoDチェックリストを確認

4. **毎日の終わり**
   - 煙テスト（RG001）を実行
   - Pass確認後、コミット

### 開発コマンド

```bash
# テスト実行
npm test                    # すべてのテスト
npm run test:smoke          # 煙テスト（毎日実施）
npm run test:headed         # ブラウザ表示
npm run test:ui             # UIモード
npm run test:debug          # デバッグモード
npm run test:report         # レポート表示
```

### ブランチ戦略（Git使用時）

```
main (常に動作する状態)
  ├── feature/PBI-001-project-setup
  ├── feature/PBI-002-api-key-management
  └── feature/PBI-003-api-client
```

**ルール**:
- mainは常に動作する状態を維持
- PBI単位でfeatureブランチを作成
- DoDを満たしたらmainにマージ

---

## 🎯 開発スケジュール

### Sprint 1: MVP基盤構築（2週間）
- PBI-001: プロジェクト初期セットアップ
- PBI-002: API キー管理機能
- PBI-003: APIクライアント実装
- PBI-004: 原稿入力エディタ
- PBI-007: スピーカー設定
- PBI-009: 生成設定フォーム

**ゴール**: API疎通とUI基礎を確立

### Sprint 2: コア音声生成機能（2週間）
- PBI-010: 音声生成メイン処理
- PBI-011: セクション分割処理
- PBI-013: セクションプレビュー表示
- PBI-014: 音声再生機能
- PBI-015: セクション単位ダウンロード

**ゴール**: エンドツーエンドで音声生成〜ダウンロード実現

### Sprint 3: 拡張機能と履歴管理（2週間）
- PBI-005: サンプルスクリプト機能
- PBI-006: テキストファイルインポート
- PBI-008: 音声プリセット試聴機能
- PBI-017-019: 履歴管理機能

**ゴール**: ユーザビリティ向上と履歴管理実装

### Sprint 4: UI/UX改善と最終調整（2週間）
- PBI-022: レスポンシブデザイン対応
- PBI-025: ヘルプ・使い方ガイド
- PBI-026: 設定画面
- 統合テスト・バグ修正
- ドキュメント整備

**ゴール**: アプリ完成とリリース準備

詳細は[スプリント計画](./Doc/sprint-plan.md)を参照。

---

## 📊 テスト戦略

### E2Eテスト（Playwright）

- **TC001**: APIキー管理機能テスト（12シナリオ）
- **RG001**: メインフロー煙テスト（毎日実施）

### 実施タイミング

| タイミング | テスト | コマンド |
|----------|--------|----------|
| 毎日の終わり | 煙テスト | `npm run test:smoke` |
| PBI完了時 | 該当テスト | `npm run test:api-key` |
| スプリント終了時 | 全テスト | `npm test` |
| リリース前 | 全テスト + 手動確認 | `npm test` |

---

## 🔒 セキュリティ

### 注意事項
- ⚠️ **APIキーは `.env` ファイルに保存**し、Gitにコミットしない
- ⚠️ `.env` は `.gitignore` に含まれている
- ⚠️ localStorageにAPIキーが保存される（ブラウザローカルのみ）

### XSS対策
- ユーザー入力はサニタイズされる
- Content Security Policy (CSP) を設定

---

## 🤝 コントリビューション

### プルリクエストの手順

1. featureブランチを作成
2. 実装 → テスト → DoDチェック
3. コミット
4. プルリクエスト作成
5. レビュー → マージ

### コミットメッセージ例

```
[PBI-002] APIキー管理機能を実装

- APIキー入力モーダルUI実装
- localStorage保存処理実装
- API検証機能実装

Test: TC001 実施済み（Pass）
```

---

## 📝 ライセンス

ISC

---

## 📞 サポート・連絡先

- **Issue報告**: GitHubのIssue
- **質問**: チームSlack / メール
- **ドキュメント**: [Doc/](./Doc/)ディレクトリ参照

---

## 🔗 参考リンク

- [Gemini API ドキュメント](https://ai.google.dev/gemini-api/docs/speech-generation)
- [Playwright公式ドキュメント](https://playwright.dev/docs/intro)
- [Google AI Studio](https://ai.google.dev/)

---

## ✅ チェックリスト

### 開発開始前
- [ ] Node.js、npmがインストール済み
- [ ] Gemini API キーを取得済み
- [ ] 依存関係をインストール済み
- [ ] `.env` ファイルを作成し、APIキーを設定済み
- [ ] （Proモデル使用時）Google Cloud Text-to-Speech APIを有効化済み
- [ ] （Proモデル使用時）サービスアカウント鍵をダウンロード済み
- [ ] （Proモデル使用時）`GOOGLE_APPLICATION_CREDENTIALS`環境変数を設定済み
- [ ] [クイックリファレンス](./Doc/quick-reference.md)を確認済み

### 毎日の終わり
- [ ] コードが動作する状態になっている
- [ ] 煙テスト（RG001）が Pass
- [ ] コミット済み

### PBI完了時
- [ ] 受入基準をすべて満たしている
- [ ] E2Eテストが成功している
- [ ] 既存機能が壊れていない
- [ ] エラーハンドリングが実装されている
- [ ] 主要ブラウザで動作確認済み
- [ ] セキュリティチェック完了
- [ ] ドキュメント更新済み

---

## 📌 最初の一歩

1. **ドキュメントを読む**
   - [クイックリファレンス](./Doc/quick-reference.md)
   - [開発プロセス](./Doc/development-process.md)

2. **環境をセットアップ**
   - Node.js、npm確認
   - 依存関係インストール
   - `.env` 設定

3. **テストを実行してみる**
   ```bash
   npm run test:ui
   ```

4. **Sprint 1の実装を開始**
   - [プロダクトバックログ](./Doc/product-backlog.md)
   - PBI-001から着手

---

**成功の鍵は「常に動作する状態を維持すること」です！**
