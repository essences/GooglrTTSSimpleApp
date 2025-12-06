import { GeminiTtsClient, GeminiApiError } from '../../api-client.js';
import {
  API_BASE_URL,
  API_VALIDATION_MODEL,
  API_VALIDATION_TIMEOUT_MS
} from '../config/constants.js';

const geminiClient = new GeminiTtsClient();

export const getGeminiClient = () => geminiClient;

export const setGeminiApiKey = (apiKey) => {
  geminiClient.setApiKey(apiKey);
};

export const setGeminiModel = (model) => {
  geminiClient.setModel(model);
};

export async function validateApiKey(apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_VALIDATION_TIMEOUT_MS);
  const endpoint = `${API_BASE_URL}/${API_VALIDATION_MODEL}?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
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

export { GeminiApiError };
