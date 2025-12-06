/**
 * Gemini TTS API クライアント (Google AI SDK版)
 * PBI-003: APIクライアント実装
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';

/**
 * Gemini API 呼び出し時のエラー
 */
export class GeminiApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Gemini TTS API クライアント (SDK版)
 */
export class GeminiTtsClient {
  constructor({ apiKey = null, model = DEFAULT_MODEL } = {}) {
    this.apiKey = apiKey;
    this.modelName = model;
    this.genAI = null;
    this.model = null;

    if (apiKey) {
      this.#initializeClient();
    }
  }

  /**
   * APIキーを設定
   * @param {string} apiKey
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.#initializeClient();
    } else {
      this.genAI = null;
      this.model = null;
    }
  }

  /**
   * モデルを変更
   * @param {string} model
   */
  setModel(model) {
    this.modelName = model;
    if (this.genAI) {
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }
  }

  /**
   * クライアントを初期化
   */
  #initializeClient() {
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  /**
   * 単一話者TTSを生成
   */
  async generateSingleSpeaker({ text, voiceName, languageCode = 'ja-JP', generationConfig = {} }) {
    if (!text || !voiceName) {
      throw new Error('text と voiceName は必須です。');
    }

    if (!this.model) {
      throw new Error('APIキーが設定されていません。');
    }

    console.log('SDK単一話者TTS呼び出し:', { text: text.substring(0, 50), voiceName, languageCode });

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName
              }
            }
          },
          ...generationConfig
        }
      });

      console.log('SDK API呼び出し成功');
      return this.#processAudioResponse(result);
    } catch (error) {
      console.error('SDK API呼び出しエラー:', error);
      throw new GeminiApiError(error.message || '音声生成に失敗しました', {
        status: error.status || 0,
        details: error
      });
    }
  }

  /**
   * 複数話者TTSを生成（最大2名）
   */
  async generateMultiSpeaker({
    prompt,
    speakerConfigs,
    languageCode = null,
    generationConfig = null
  }) {
    if (!prompt) {
      throw new Error('prompt は必須です。');
    }
    if (!Array.isArray(speakerConfigs) || speakerConfigs.length === 0) {
      throw new Error('speakerConfigs は1件以上必要です。');
    }

    if (!this.model) {
      throw new Error('APIキーが設定されていません。');
    }

    const speakerVoiceConfigs = speakerConfigs.map((cfg) => {
      if (!cfg?.speaker || !cfg?.voiceName) {
        throw new Error('speakerConfigs の各要素には speaker と voiceName が必要です。');
      }
      return {
        speaker: cfg.speaker,
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: cfg.voiceName
          }
        }
      };
    });

    console.log('SDK複数話者TTS呼び出し:', {
      prompt: prompt.substring(0, 100),
      speakers: speakerConfigs.map(s => ({ speaker: s.speaker, voice: s.voiceName }))
    });

    try {
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: speakerVoiceConfigs
            }
          },
          ...(generationConfig || {})
        }
      });

      console.log('SDK API呼び出し成功');
      return this.#processAudioResponse(result);
    } catch (error) {
      console.error('SDK API呼び出しエラー:', error);
      throw new GeminiApiError(error.message || '音声生成に失敗しました', {
        status: error.status || 0,
        details: error
      });
    }
  }

  /**
   * 音声レスポンスを処理
   */
  #processAudioResponse(result) {
    const response = result.response;
    const candidates = response.candidates || [];

    // 音声データを抽出
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'audio/wav';
          const base64Data = part.inlineData.data;

          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i += 1) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);

          let audioBlob;
          let normalizedMimeType = mimeType;

          if (mimeType.toLowerCase().includes('audio/l16')) {
            const sampleRateMatch = mimeType.match(/rate=(\d+)/i);
            const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
            const wavBuffer = convertPcm16ToWav(byteArray, sampleRate);
            normalizedMimeType = 'audio/wav';
            audioBlob = new Blob([wavBuffer], { type: normalizedMimeType });
          } else {
            audioBlob = new Blob([byteArray], { type: normalizedMimeType });
          }

          return {
            blob: audioBlob,
            mimeType: normalizedMimeType,
            usage: response.usageMetadata ?? null,
            rawResponse: response
          };
        }
      }
    }

    throw new GeminiApiError('音声データが取得できませんでした。レスポンスを確認してください。', {
      status: 200,
      details: response
    });
  }
}

// グローバルに公開（後方互換性のため、ブラウザ環境のみ）
if (typeof window !== 'undefined') {
  window.GeminiApiError = GeminiApiError;
  window.GeminiTtsClient = GeminiTtsClient;
}

function convertPcm16ToWav(pcmBytes, sampleRate = 24000) {
  const headerSize = 44;
  const totalSize = headerSize + pcmBytes.length;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmBytes.length, true);

  new Uint8Array(buffer, headerSize).set(pcmBytes);
  return buffer;
}
