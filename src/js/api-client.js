/**
 * Gemini TTS API クライアント
 * PBI-003: APIクライアント実装
 */

(function attachGeminiClientToWindow(global) {
  const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';
  const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

  /**
   * Gemini API 呼び出し時のエラー
   */
  class GeminiApiError extends Error {
    constructor(message, { status, details } = {}) {
      super(message);
      this.name = 'GeminiApiError';
      this.status = status;
      this.details = details;
    }
  }

  /**
   * Gemini TTS API クライアント
   */
  class GeminiTtsClient {
    constructor({ apiKey = null, model = DEFAULT_MODEL, baseUrl = DEFAULT_BASE_URL } = {}) {
      this.apiKey = apiKey;
      this.model = model;
      this.baseUrl = baseUrl;
    }

  /**
   * APIキーを設定
   * @param {string} apiKey
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * モデルを変更
   * @param {string} model
   */
  setModel(model) {
    this.model = model;
  }

  /**
   * 単一話者TTSを生成
   */
  async generateSingleSpeaker({ text, voiceName, languageCode = 'ja-JP', generationConfig = {} }) {
    if (!text || !voiceName) {
      throw new Error('text と voiceName は必須です。');
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text }]
        }
      ],
      config: {
        response_modalities: ['AUDIO'],
        speech_config: {
          languageCode,
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName
            }
          }
        }
      },
      generationConfig
    };

    return this.#sendGenerateRequest(payload);
  }

  /**
   * 複数話者TTSを生成（最大2名）
   */
  async generateMultiSpeaker({
    prompt,
    speakerConfigs,
    languageCode = 'ja-JP',
    generationConfig = {}
  }) {
    if (!prompt) {
      throw new Error('prompt は必須です。');
    }
    if (!Array.isArray(speakerConfigs) || speakerConfigs.length === 0) {
      throw new Error('speakerConfigs は1件以上必要です。');
    }

    const normalizedSpeakerConfigs = speakerConfigs.map((cfg) => {
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

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      config: {
        response_modalities: ['AUDIO'],
        speech_config: {
          languageCode,
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: normalizedSpeakerConfigs
          }
        }
      },
      generationConfig
    };

    return this.#sendGenerateRequest(payload);
  }

  /**
   * 共通の generateContent 呼び出し
   */
  async #sendGenerateRequest(payload) {
    if (!this.apiKey) {
      throw new Error('APIキーが設定されていません。');
    }

    const url = `${this.baseUrl}/${this.model}:generateContent`;
    const response = await fetch(`${url}?key=${encodeURIComponent(this.apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      await this.#handleErrorResponse(response);
    }

    const data = await response.json();
    const audioPart = this.#extractAudioPart(data);
    const audioBlob = this.#decodeAudioPart(audioPart);

    return {
      blob: audioBlob,
      mimeType: audioPart.inlineData?.mimeType || 'audio/wav',
      usage: data.usageMetadata ?? null,
      rawResponse: data
    };
  }

  async #handleErrorResponse(response) {
    let message = `Gemini API request failed (HTTP ${response.status})`;
    let details = null;
    try {
      const errorBody = await response.json();
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
      details = errorBody;
    } catch {
      // ignore JSON parse failure
    }

    if (response.status === 401 || response.status === 403) {
      throw new GeminiApiError('APIキーが無効か、アクセスが拒否されました。', {
        status: response.status,
        details
      });
    }

    if (response.status === 429) {
      throw new GeminiApiError('レート制限に達しました。しばらく待ってから再試行してください。', {
        status: response.status,
        details
      });
    }

    throw new GeminiApiError(message, { status: response.status, details });
  }

  #extractAudioPart(responseJson) {
    const candidates = responseJson?.candidates ?? [];
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return part;
        }
      }
    }
    throw new GeminiApiError('音声データが取得できませんでした。レスポンスを確認してください。', {
      status: 200,
      details: responseJson
    });
  }

  #decodeAudioPart(part) {
    const mimeType = part.inlineData?.mimeType || 'audio/wav';
    const base64Data = part.inlineData?.data;
    if (!base64Data) {
      throw new GeminiApiError('音声データが空です。');
    }

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i += 1) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
  }

  global.GeminiApiError = GeminiApiError;
  global.GeminiTtsClient = GeminiTtsClient;
})(window);
