# プロダクトバックログ v2 — 研修ナレーションスタジオ（ブラウザ版）

更新日: 2025-12-06 (Epic B 主要機能実装完了)
対象: `GooglrTTSSimpleApp` リポジトリ (Google AI SDK を直接読み込むシングルページアプリケーション)

---

## 0. 現在の実装サマリー

- **基盤/UI**
  - `src/index.html` ＋ Vanilla JS 構成。`START_SERVER.bat` で Python HTTP サーバーをポート `8080` に起動。
  - import map で `@google/generative-ai` (ESM) を直接ブラウザに配信。
  - Google フォントなし。`styles.css` によるライトテーマ UI。
- **アプリ構造**
  - `src/js/app.js` は初期化とイベント配線のみを担当するオーケストレーターへ再構成。
  - `src/js/app/controllers/` 配下に API キー／スクリプト／スピーカー／音声／生成コントローラーを追加し、責務分離。
  - DOM キャッシュやプレビュー更新は UI モジュールへ集約し、テスト容易性と可読性を向上。

- **APIキー管理 (完了)**
  - 初回表示は API キーモーダル。localStorage (key:`gemini_api_key`) に保存/読込/削除。
  - 設定モーダルから API キーテスト/再入力/削除が可能。キーはマスク表示。

- **原稿入力 (完了)**
  - ScriptEditor: 文字数カウンタ、プレースホルダー、`Sample Script` ボタン (確認ダイアログ付き)。
  - TXT ファイルインポート機能実装済み（5MB 制限、UTF-8 対応、確認ダイアログ）。
  - 日本語 IME を考慮した `textarea` 属性。

- **スピーカー/生成設定 (完了)**
  - Speaker A/B の名前・プリセット・メモ入力。
  - 音声プリセット試聴機能実装済み（サンプル音声即時生成・再生）。
  - スピーカー設定バリデーション強化（名前重複チェック、原稿内存在確認、フォーマット検証）。
  - 温度スライダー／出力フォーマット（値は状態保持のみ）。

- **音声生成 (完了)**
  - `GeminiTtsClient` が Google AI SDK v0.21 を直接利用。
  - 単一/複数話者 API を呼び出し、`audio/L16` PCM を `convertPcm16ToWav` で WAV Blob に変換。
  - 生成中は UI ロック、完了後は `<audio>` に表示・再生・一時停止・ダウンロードが可能。

- **生成履歴 (完了)**
  - 生成結果を `createSectionRecord` で整理し、セクションプレビュー＋履歴テーブルに即時反映。
  - 履歴からの再ダウンロードに対応（セッション内の Blob のみ）。
  - localStorage 永続化実装済み（メタデータのみ保存、過去セッションの音声は参照のみ）。

---

## 1. Epic A: 体験を成立させる必須機能 (Release MVP)

| ID | ストーリー | 状態 | メモ |
|----|------------|------|------|
| A1 | API キー入力・保存・検証を行いたい | ✅ Done | `src/js/app.js` のモーダル+設定モーダル。`localStorage` 連携済み。 |
| A2 | 原稿を入力し文字数を確認したい | ✅ Done | ScriptEditor とカウンタ、サンプル挿入、TXT インポート実装済み。 |
| A3 | 2 名のスピーカー情報と生成設定を保持したい | ✅ Done | UI実装済み。試聴機能・バリデーション強化完了。 |
| A4 | 生成ボタンから Google AI SDK を直接呼び、音声を再生したい | ✅ Done | `GeminiTtsClient` と `displayGeneratedAudio` で実現。WAV 変換済み。 |
| A5 | 生成した音声をダウンロードして保管したい | ✅ Done | `handleDownloadAudio` で Blob を `anchor` ダウンロード。ファイル名は timestamp。 |
| A6 | 生成履歴・セクションプレビューを管理したい | ✅ Done | 生成結果を `createSectionRecord` で整理し、セクションプレビュー＋履歴テーブルに即時反映。localStorage 永続化済み。 |

---

## 2. Epic B: 使い勝手向上

| ID | ストーリー | 状態 | 実装詳細 |
|----|------------|------|----------|
| B1 | TXT ファイルインポートで原稿を読み込みたい | ✅ Done | `handleImportTxt` 実装済み。FileReader で UTF-8 読込、5MB 制限、確認ダイアログ付き。 |
| B2 | 音声プリセットごとの試聴をワンクリックで行いたい | ✅ Done | `handlePreviewVoice` 実装済み。サンプルテキストで短時間音声を即時生成・再生。 |
| B3 | スピーカー設定のバリデーション (必須項目、タグ重複) を行いたい | ✅ Done | `validateGenerationInputs` 強化済み。名前重複・原稿内存在・フォーマット検証を実装。 |
| B4 | 生成を複数セクションに分割し、再生成/並行ダウンロードしたい | ✅ Done | `splitScriptIntoSections` と `generateSectionWithRetries` により章ごとに自動分割。Prev/Next・再生成・DL をセクション単位で提供。 |
| B5 | 履歴一覧を localStorage に保存し、ページ再訪でも参照したい | ✅ Done | `saveHistoryToStorage` / `loadHistoryFromStorage` 実装済み。メタデータのみ永続化。 |
| B6 | 生成失敗時のリトライ・再接続を行いたい | ✅ Done | 各セクション生成を最大3試行まで自動リトライし、進捗ステータスに再試行状況とエラーメッセージを表示。 |

---

## 3. 技術課題メモ

1. **Google AI SDK (ES Modules)**  
   - import map で読み込むため、Chrome/Edge などモダンブラウザ必須。  
   - SDK は `audio/L16` PCM を返すため WAV 変換が必須。`convertPcm16ToWav` は単一チャンネル想定。

2. **ローカル開発**  
   - `START_SERVER.bat` → `python -m http.server 8080`。CORS 設定不要。  
   - 環境変数不要。ブラウザで API 直呼びするためキーの扱いは自己責任。

3. **UI 実装ガイド**  
   - 各ボタンには `data-testid` を付与済み。Playwright テスト (`tests/e2e`) を更新して整合させる。  
   - 日本語入力向け `textarea` 属性（`lang`, `inputmode`, `autocomplete="off"`）を維持すること。

---

## 4. 次のアクション

**完了済み (2025-11-25)**:
- ✅ B1: TXT ファイルインポート
- ✅ B2: 音声プリセット試聴
- ✅ B3: スピーカー設定バリデーション強化
- ✅ B5: 履歴の localStorage 永続化

**今後の優先タスク**:
1. **Playwright テスト更新**: コントローラー分割後の主要ユーザーフロー（APIキー保存、生成、履歴再生）を再検証。
2. **PBI-012 補完**: 進捗バーに数値表示とエラーカラー反映を追加し、UX を改善。
3. **PBI-011 補完**: トークン制限（32,000 トークン）を考慮したセクション分割ロジックの導入。
4. **PBI-015 拡張**: MP3 併用ダウンロードやファイル名ルールの見直しを検討。

---

## 5. 参考リンク

- [Google AI SDK Docs](https://ai.google.dev/gemini-api/docs/get-started/web)  
- `tests/e2e/api-key-management.spec.js` / `tests/e2e/regression-smoke.spec.js` — 既存テストケース  
- `Doc/quick-reference.md` — チーム内の操作ガイドメモ

---
