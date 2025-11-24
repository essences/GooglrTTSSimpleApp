# Gemini TTS API 疎通確認記録

## 実施日時
2025年11月21日

## 接続情報
- **プロジェクト ID**: `roocline-451300`
- **API キー**: `AIzaSyCUhDCOC2nXOSLtZR624tQwnL5nXUUSfZA`
- **エンドポイント**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`

## 疎通確認結果

### テスト1: 基本的な音声生成（英語）
**リクエスト**:
```powershell
$body = '{"contents":[{"parts":[{"text":"Test"}]}],"generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Kore"}}}}}';
$response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=AIzaSyCUhDCOC2nXOSLtZR624tQwnL5nXUUSfZA" -Method Post -Headers @{"Content-Type"="application/json"} -Body $body
```

**レスポンス**:
- **ステータス**: 成功 (`finishReason: STOP`)
- **モデルバージョン**: `gemini-2.5-flash-preview-tts`
- **トークン使用量**:
  - プロンプト: 1トークン (TEXT)
  - 生成: 30トークン (AUDIO)
  - 合計: 31トークン
- **音声データ**: Base64エンコード済みWAVデータ取得成功
- **MIME Type**: `audio/wav`
- **データサイズ**: 約64KB (Base64文字列)

### テスト2: 日本語音声生成とファイル保存
**リクエスト**:
```powershell
$body = '{"contents":[{"parts":[{"text":"こんにちは、テストです"}]}],"generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Kore"}}}}}';
$response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=AIzaSyCUhDCOC2nXOSLtZR624tQwnL5nXUUSfZA" -Method Post -Headers @{"Content-Type"="application/json"} -Body $body;
$base64Audio = $response.candidates[0].content.parts[0].inlineData.data;
$audioBytes = [System.Convert]::FromBase64String($base64Audio);
$outputPath = "test_output.wav";
[System.IO.File]::WriteAllBytes($outputPath, $audioBytes);
```

**結果**:
- **ファイル名**: `test_output.wav`
- **ファイルサイズ**: 52,366 バイト (約 51 KB)
- **形式**: WAV (24kHz PCM 16-bit mono)
- **保存場所**: `C:\Users\eiichi.hayashi.67\OneDrive - 株式会社 SHIFT\ドキュメント\GItProject\GeminiTTSアプリ\test_output.wav`
- **ステータス**: ファイル保存成功

## API仕様確認

### リクエスト形式
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "生成したいテキスト"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {
          "voiceName": "Kore"
        }
      }
    }
  }
}
```

### レスポンス構造
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "inlineData": {
              "mimeType": "audio/wav",
              "data": "<Base64エンコードされた音声データ>"
            }
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 1,
    "candidatesTokenCount": 30,
    "totalTokenCount": 31,
    "promptTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 1
      }
    ],
    "candidatesTokensDetails": [
      {
        "modality": "AUDIO",
        "tokenCount": 30
      }
    ]
  },
  "modelVersion": "gemini-2.5-flash-preview-tts",
  "responseId": "..."
}
```

### 音声データの抽出とファイル保存方法
```powershell
# 1. Base64データを取得
$base64Audio = $response.candidates[0].content.parts[0].inlineData.data

# 2. Base64デコード
$audioBytes = [System.Convert]::FromBase64String($base64Audio)

# 3. ファイルに保存
[System.IO.File]::WriteAllBytes("output.wav", $audioBytes)
```

## 確認事項

### ✅ 動作確認済み
- API認証（APIキー認証）
- 英語テキストの音声生成
- 日本語テキストの音声生成
- 音声プリセット（Kore）の適用
- Base64エンコードされた音声データの取得
- WAVファイルへの変換と保存
- トークン使用量の取得

### 📝 備考
1. **音声形式**: 生成される音声は24kHz PCM 16-bit mono WAV形式
2. **言語自動検出**: 日本語テキストを送信した際も正常に日本語音声が生成され、言語自動検出が機能している
3. **レスポンス時間**: 短いテキストであれば数秒以内にレスポンスが返る
4. **認証方式**: クエリパラメータでAPIキーを渡す方式（`?key=xxx`）が有効

## 次のステップ
1. 複数話者（Multi-speaker）での音声生成テスト
2. より長いテキストでの生成テスト
3. 異なる音声プリセットでのテスト
4. エラーハンドリングの実装
5. レート制限の確認

## 参考資料
- [Gemini TTS API利用メモ](./GeminiTTS_API_利用メモ.md)
- [アーキテクチャ設計](../Design/narration-app-architecture.md)
