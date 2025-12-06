# サービスインターフェース指針（DI用）

PBI-044 の要件に基づき、主要サービスのインターフェースを明文化する。

## TTS サービス
- `ITtsService`: `{ generateSingleSpeaker({ text, voiceName, generationConfig? }), generateMultiSpeaker({ prompt, speakerConfigs, generationConfig? }) }`
- 実装: `GeminiService` → `GeminiTtsClient`。テスト時はフェイクを注入。

## ストレージサービス
- `IStorageService`: `{ loadStoredApiKey(), storeApiKey(key), clearStoredApiKey(), loadSpeakerSettingsFromStorage(), saveSpeakerSettingsToStorage(speakers), loadHistoryMetadata(), saveHistoryMetadata(history) }`
- 実装: `StorageService`（localStorageベース）／テスト用 in-memory。

## 履歴サービス
- `IHistoryService`: `{ addHistoryEntry(history, record), updateHistorySectionRecord(history, id, idx, section), createHistoryRunRecord(sections, fullScript, model), createSectionRecord(result, duration?, cost?), getSectionsFromRecord(record) }`
- 実装: `HistoryService`（コスト集計等をDI可能）。

## オーディオサービス
- `IAudioService`: `{ getAudioDuration(blob), triggerBlobDownload(blob, filename), base64ToBlob(base64, mimeType) }`
- 実装: `audio-utils` を束ねたオブジェクトで注入。テスト時はモック可能。

## フォーマッタ/ユーティリティ
- `ICostUtils`: `{ calculateCostDetails(...) }`
- `IScriptUtils`: `{ splitScriptIntoSections, parseSpeakerSegments, assignSpeakerKeysToSegments, normalizeSpeakersRecord }`
- 純関数のため直接注入か、サービスレジストリ経由で渡す。

## レジストリ
- `service-registry.js` でデフォルト実装を束ね、`app.js` から各コントローラーへ注入。
- テストでは必要なサービスだけモック化し、コントローラー/ビューの生成に渡す。
