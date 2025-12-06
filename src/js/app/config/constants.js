// Core constants used across the application.

export const STORAGE_KEY_API_KEY = 'gemini_api_key';
export const STORAGE_KEY_HISTORY = 'narration_history';
export const STORAGE_KEY_SPEAKERS = 'speaker_settings';

export const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
export const API_VALIDATION_MODEL = 'gemini-2.5-flash-preview-tts';
export const API_VALIDATION_TIMEOUT_MS = 8000;

export const USD_TO_JPY = 150;
export const TOKENS_PER_SECOND = 25;

export const SAMPLE_SCRIPT = `林: 研修にようこそ。[short pause] 本日はナレーションツールの基本操作を確認します。
彩: [uhm] ありがとうございます。最初に確認すべきポイントは何でしょうか？
林: 最初は原稿の入力とスピーカー設定です。[medium pause] そのあとに音声生成を実行します。
彩: [sarcasm] わかりました。[short pause] 私も担当パートを追加しておきますね。
[laughing] 林: では実践してみましょう。`;

export const VOICE_PREVIEW_TEXT = 'こんにちは。これは音声プリセットのサンプルです。';

export const MAX_SECTION_RETRIES = 2;
export const RETRY_DELAY_BASE_MS = 1500;

export const PRO_TTS_ENDPOINT = 'http://localhost:8788/api/pro-tts';

export const MODEL_PRICING = Object.freeze({
  'gemini-2.5-flash-preview-tts': {
    label: 'Gemini 2.5 Flash TTS',
    inputUsdPerMillion: 0.50,
    outputUsdPerMillion: 10.0
  },
  'gemini-2.5-pro-tts': {
    label: 'Gemini 2.5 Pro TTS',
    inputUsdPerMillion: 1.0,
    outputUsdPerMillion: 20.0
  },
  'gemini-1.5-flash-tts': {
    label: 'Gemini 1.5 Flash TTS',
    inputUsdPerMillion: 0.50,
    outputUsdPerMillion: 12.0
  }
});

export const PRO_TTS_MODELS = new Set(['gemini-2.5-pro-tts']);

export const DEFAULT_SPEAKERS = Object.freeze({
  a: { name: '林', voice: 'Kore', style: '落ち着いたトーン' },
  b: { name: '彩', voice: 'Puck', style: '明るく親しみやすい' }
});
