# Gemini TTS API 利用メモ（2025-11-21 更新）

## 1. 概要
- Gemini API にはネイティブなテキスト読み上げ（TTS）機能があり、テキスト入力を単一・複数話者の PCM 音声に変換できる。
- TTS 機能は Gemini 2.5 系列のプレビューモデル専用で、ポッドキャストやオーディオブックなどスタイル制御が重要なユースケース向けに最適化されている。[1]
- Gemini Live API の会話音声生成とは異なり、より決定的なテキスト朗読と詳細な音声スタイル指定が可能。[1]

## 2. 利用前提条件
- Google AI Studio で発行した Gemini API キー（`GEMINI_API_KEY` 環境変数を推奨）。[1]
- Google GenAI SDK（`google-genai` for Python/Node.js など）または REST クライアント環境。
- TTS 対応モデル（2025-11 時点では `gemini-2.5-flash-preview-tts` と `gemini-2.5-pro-preview-tts`）。[1]

## 3. API エンドポイントと共通設定
- REST エンドポイント: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`。[2]
- リクエスト本体のポイント:
  - `contents` にユーザー指示を記述。
  - `config.response_modalities` に `"AUDIO"` を指定すると音声出力が返る。[1][2]
  - `config.speech_config` で音声種別や言語コードを設定。単一話者の場合は `voiceConfig`、2 話者なら `multiSpeakerVoiceConfig` を使用。[1][2]
- 認証: API キーを HTTP ヘッダ `x-goog-api-key: <API_KEY>` またはクエリ文字列 `?key=<API_KEY>` で付与（API キーガイド参照）。

### 3.1 リクエストボディ主要フィールド
| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `contents[]` | ○ | テキスト指示や会話履歴。単発生成なら 1 要素で十分。[2] |
| `config.response_modalities[]` | △ | `AUDIO` を含めると音声レスポンスを要求。[1][2] |
| `config.speech_config.voiceConfig.prebuiltVoiceConfig.voiceName` | △ | 単一話者 TTS の音声プリセット名。[1] |
| `config.speech_config.multiSpeakerVoiceConfig.speakerVoiceConfigs[]` | △ | 話者名と音声プリセットの組。最大 2 名。[1] |
| `config.speech_config.languageCode` | × | 入力テキスト言語。省略時は自動判定だが、BCP 47 形式で明示指定も可。[2] |
| `generationConfig.maxOutputTokens` 等 | × | トークン数や温度など共通生成パラメータ。[2] |

## 4. 単一話者 TTS の呼び出し例（Python SDK）
```python
from google import genai
from google.genai import types
import wave

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash-preview-tts",
    contents="Say cheerfully: Have a wonderful day!",
    config=types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Kore"
                )
            )
        )
    )
)

audio_bytes = response.candidates[0].content.parts[0].inline_data.data
with wave.open("out.wav", "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(24000)
    wf.writeframes(audio_bytes)
```
- レスポンスは 24 kHz PCM（16-bit little endian）のバイト列として `inline_data` に含まれる。[1]

## 5. 複数話者 TTS 利用ガイド

### 5.1 リクエスト構造
- `contents` には会話形式で話者名を明示（例: `Joe:` `Jane:`）。話者名の後ろに一貫したコロンを付けるとモデルがマッピングしやすい。[1]
- `config.speech_config.multiSpeakerVoiceConfig.speakerVoiceConfigs[]` に、プロンプト内の話者名と同名の `speaker` を設定し、それぞれに `voiceConfig` を割り当てる。[1][2]
- `voiceConfig` には単一話者と同じ `prebuiltVoiceConfig.voiceName` を使用可能。話者ごとに異なるボイスを指定して感情差を表現する。
- `multiSpeakerVoiceConfig` と `voiceConfig` は排他。複数話者利用時は `voiceConfig` を設定しない。

**REST リクエスト骨子**
```json
{
    "contents": [
        {
            "role": "user",
            "parts": [
                {
                    "text": "TTS the following conversation between Joe and Jane:\nJoe: How's it going today Jane?\nJane: Not too bad, how about you?"
                }
            ]
        }
    ],
    "config": {
        "response_modalities": ["AUDIO"],
        "speech_config": {
            "multi_speaker_voice_config": {
                "speaker_voice_configs": [
                    {
                        "speaker": "Joe",
                        "voice_config": {
                            "prebuilt_voice_config": {
                                "voice_name": "Kore"
                            }
                        }
                    },
                    {
                        "speaker": "Jane",
                        "voice_config": {
                            "prebuilt_voice_config": {
                                "voice_name": "Puck"
                            }
                        }
                    }
                ]
            }
        }
    }
}
```

### 5.2 SDK / REST サンプル
**Python（google-genai）**
```python
from google import genai
from google.genai import types
import wave

client = genai.Client()

prompt = """TTS the following conversation between Joe and Jane:\n"
prompt += "Joe: How's it going today Jane?\n"
prompt += "Jane: Not too bad, how about you?"""

response = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=prompt,
        config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                        multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
                                speaker_voice_configs=[
                                        types.SpeakerVoiceConfig(
                                                speaker="Joe",
                                                voice_config=types.VoiceConfig(
                                                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                                                voice_name="Kore"
                                                        )
                                                )
                                        ),
                                        types.SpeakerVoiceConfig(
                                                speaker="Jane",
                                                voice_config=types.VoiceConfig(
                                                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                                                                voice_name="Puck"
                                                        )
                                                )
                                        )
                                ]
                        )
                )
        )
)

audio_bytes = response.candidates[0].content.parts[0].inline_data.data
with wave.open("multi_out.wav", "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(audio_bytes)
```

**Node.js（@google/genai）**
```javascript
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "node:fs";

const client = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const model = client.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });

const prompt = `TTS the following conversation between Joe and Jane:
Joe: How's it going today Jane?
Jane: Not too bad, how about you?`;

const response = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
            multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                    {
                        speaker: "Joe",
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: "Kore" }
                        }
                    },
                    {
                        speaker: "Jane",
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: "Puck" }
                        }
                    }
                ]
            }
        }
    }
});

const audioPart = response.response.candidates[0].content.parts[0];
fs.writeFileSync("multi_out.wav", Buffer.from(audioPart.inlineData.data, "base64"));
```

**curl（REST）**
```powershell
$body = @'
{
    "contents": [{
        "role": "user",
        "parts": [{
            "text": "TTS the following conversation between Joe and Jane:\nJoe: How's it going today Jane?\nJane: Not too bad, how about you?"
        }]
    }],
    "config": {
        "response_modalities": ["AUDIO"],
        "speech_config": {
            "multi_speaker_voice_config": {
                "speaker_voice_configs": [
                    {
                        "speaker": "Joe",
                        "voice_config": {
                            "prebuilt_voice_config": { "voice_name": "Kore" }
                        }
                    },
                    {
                        "speaker": "Jane",
                        "voice_config": {
                            "prebuilt_voice_config": { "voice_name": "Puck" }
                        }
                    }
                ]
            }
        }
    }
}
'@

curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=$env:GEMINI_API_KEY" `
    -H "Content-Type: application/json" `
    -d $body | Set-Content -Path response.json

# レスポンスの inlineData.data を Base64 デコードして WAV に保存する。
```

### 5.3 プロンプト設計とスタイル制御
- 会話テキストは **話者名: 発話内容** の形式で統一。段落が長い場合は改行で区切ると明瞭。
- スタイル指示は話者ごとに含められる（例: `Joe (calm tone):`）。自然言語でのトーン指定に加え、ボイスプリセットの選択で補完する。[1]
- シーン説明や感情のトランジションを明示すると抑揚が安定。例: `Narrator:` を追加して状況説明をさせると自然な間が作れる。
- 長文会話は複数リクエストに分割し、後段のオーディオ編集で結合すると生成精度が保てる。

### 5.4 制約とトラブルシューティング
- 話者数は最大 2 名。3 名以上を表現したい場合はリクエストを分割し、同じ役者を別リクエストで生成後に編集する。[1]
- 話者名が `speaker_voice_configs[].speaker` と一致しない場合、モデルがデフォルト話者にフォールバックし音声が混在する。事前に文字列一致を確認する。
- 同一音声プリセットで複数話者を生成すると声質が似通うため、`voice_name` は差別化する。
- 生成音声の長さが長い場合は `GenerationConfig.maxOutputTokens` を広めに設定し、`temperature` を低め（例: 0.6）にして再現性を確保。[2]
- Base64 データのサイズが大きくメモリ不足になる場合は、レスポンスをストリーム処理可能な SDK（`generate_content_stream`）を利用する。[1]

### 5.5 運用ワークフロー例
- **シナリオ分割**: 会話を章単位に分け、各章ごとに同一ボイス構成で生成→音声編集ツールで結合。
- **ボイス選定**: 事前に AI Studio で各プリセットを試聴し、話者キャラクターに最適な組み合わせを選ぶ。[1]
- **ガイドライン共有**: プロンプトテンプレートと `multiSpeakerVoiceConfig` の JSON をテンプレート化し、開発チームで共有すると再利用性が高まる。

## 6. 音声スタイル制御
- 自然言語でスタイル指定が可能（例: `Say in a spooky whisper:`）。[1]
- 話者ごとに異なるトーンや感情を指示でき、音声プリセットの選択と合わせて表現を調整する。

## 7. 音声オプション一覧
Gemini TTS が提供する 30 種類の事前構築音声（抜粋）。[1]

| カテゴリ | 音声名 | 備考 |
| --- | --- | --- |
| 明るい系 | Zephyr, Autonoe | ブライト調 |
| 力強い | Kore, Orus, Alnilam | フィルム・ナレーション向き |
| カジュアル | Puck, Umbriel, Zubenelgenubi | フレンドリー・カジュアル |
| 情報量重視 | Charon, Rasalgethi | ハウツー向け |
| 若々しい | Leda | 少年少女ボイス |
| 息遣い強め | Enceladus | ささやき調 |
| ソフト | Achernar | 柔らかいトーン |
| 温かみ | Sulafat | 安心感ある声 |
| その他 | Erinome, Algenib, Sadachbia など | 多彩なアクセント |

> すべての音声は AI Studio の「Generate Speech」から試聴可能。[1]

## 8. 対応言語（自動判定）
24 言語に対応（主要言語を抜粋）。[1]

- 英語（en-US / en-IN）、日本語（ja-JP）、韓国語（ko-KR）
- フランス語（fr-FR）、ドイツ語（de-DE）、イタリア語（it-IT）、スペイン語（es-US / es-ES）
- ポルトガル語（pt-BR）、ロシア語（ru-RU）、オランダ語（nl-NL）、ポーランド語（pl-PL）
- ヒンディー語（hi-IN）、ベンガル語（bn-BD）、マラーティー語（mr-IN）、タミル語（ta-IN）、テルグ語（te-IN）
- タイ語（th-TH）、トルコ語（tr-TR）、ベトナム語（vi-VN）、ルーマニア語（ro-RO）、ウクライナ語（uk-UA）

## 9. 制限事項と注意点
- 入力はテキストのみ、出力は音声のみ（テキスト出力は得られない）。[1]
- コンテキストウィンドウ上限は約 32,000 トークン。長文ナレーションでは分割生成を検討。[1]
- マルチ話者は最大 2 名まで。3 名以上は将来の更新待ち。
- 1 リクエストで扱える音声長は最大約 9.5 時間。超過する場合は分割するかバッチ API を利用（バッチ API ガイド参照）。[1]
- レスポンスの安全性設定やトークン上限は `GenerationConfig` で調整可能。[2]

## 10. 実装ベストプラクティス
- **PCM 取り扱い**: `inline_data.data` は Base64 デコード済みバイト列。ファイル保存時は 24 kHz, 16-bit, モノラル設定を明示。
- **リクエストサイズ管理**: 長文入力は Files API でアップロードし、`contents` からファイル参照を行うと 20 MB 制限を回避できる。[1]
- **スタイル検証**: 事前に AI Studio で目的の声質と指示の相性を確認すると再現しやすい。[1]
- **安全設定**: 公開サービスでは `safetySettings` を利用し、ヘイトスピーチや危険コンテンツを明示的にブロック。[2]

## 11. 参考リンク
1. [Gemini API: 音声生成（テキスト読み上げ）](https://ai.google.dev/gemini-api/docs/speech-generation)
2. [Gemini API: models.generateContent リファレンス](https://ai.google.dev/api/rest/v1beta/models/generateContent)
