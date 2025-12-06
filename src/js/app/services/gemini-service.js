import { GeminiTtsClient, GeminiApiError } from '../../api-client.js';
import {
  API_BASE_URL,
  API_VALIDATION_MODEL,
  API_VALIDATION_TIMEOUT_MS
} from '../config/constants.js';

function createMockTtsClient() {
  return {
    generateSingleSpeaker: async ({ text, voiceName }) => ({
      blob: new Blob([text || 'mock'], { type: 'audio/wav' }),
      mimeType: 'audio/wav',
      usage: null,
      voiceName
    }),
    generateMultiSpeaker: async ({ prompt }) => ({
      blob: new Blob([prompt || 'mock'], { type: 'audio/wav' }),
      mimeType: 'audio/wav',
      usage: null
    })
  };
}

export class GeminiService {
  constructor({ client = null, fetchFn = fetch } = {}) {
    const useMock = typeof globalThis !== 'undefined' && globalThis.__MOCK_TTS__;
    this.client = client || (useMock ? createMockTtsClient() : new GeminiTtsClient());
    this.fetchFn = fetchFn;
  }

  getClient() {
    return this.client;
  }

  setApiKey(apiKey) {
    this.client.setApiKey(apiKey);
  }

  setModel(model) {
    this.client.setModel(model);
  }

  async validateApiKey(apiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_VALIDATION_TIMEOUT_MS);
    const endpoint = `${API_BASE_URL}/${API_VALIDATION_MODEL}?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await this.fetchFn(endpoint, {
        method: 'GET',
        signal: controller.signal
      });

      if (response.ok) {
        return true;
      }

      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.error?.message) {
          errorMessage = errorBody.error.message;
        }
      } catch {
        /* ignore JSON parse errors */
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('APIキーが無効か、権限がありません。Gemini API キーを確認してください。');
      }

      throw new Error(`APIキー検証に失敗しました: ${errorMessage}`);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('APIキー検証がタイムアウトしました。通信環境を確認してください。');
      }
      throw new Error(error.message || 'APIキー検証に失敗しました。');
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

const defaultService = new GeminiService();
const defaultClient = defaultService.getClient();

export const getGeminiClient = () => defaultClient;
export const setGeminiApiKey = (apiKey) => defaultService.setApiKey(apiKey);
export const setGeminiModel = (model) => defaultService.setModel(model);
export const validateApiKey = (apiKey) => defaultService.validateApiKey(apiKey);
export { GeminiApiError };
