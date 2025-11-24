/**
 * 研修ナレーションスタジオ - メインアプリケーション
 * PBI-001: プロジェクト初期セットアップ
 */

// 定数定義
const STORAGE_KEY_API_KEY = 'gemini_api_key';
const STORAGE_KEY_HISTORY = 'narration_history';

// グローバル状態
const appState = {
  apiKey: null,
  currentScript: '',
  speakers: {
    a: { name: '', voice: 'Kore', style: '' },
    b: { name: '', voice: 'Puck', style: '' }
  },
  settings: {
    outputFormat: 'wav',
    temperature: 0.6,
    sectionSplit: 'auto'
  },
  history: []
};

// DOM要素
const elements = {
  apiKeyModal: document.getElementById('api-key-modal'),
  mainApp: document.getElementById('main-app'),
  apiKeyInput: document.getElementById('api-key-input'),
  saveApiKeyButton: document.getElementById('save-api-key-button'),
  scriptTextarea: document.getElementById('script-textarea'),
  charCount: document.querySelector('[data-testid="char-count"]'),
  generateButton: document.getElementById('generate-button'),
  settingsButton: document.querySelector('[data-testid="settings-button"]'),
  settingsModal: document.getElementById('settings-modal'),
  closeSettingsButton: document.querySelector('[data-testid="close-settings-button"]')
};

/**
 * アプリケーション初期化
 */
function initApp() {
  console.log('アプリケーション起動中...');

  // localStorageからAPIキーを読み込み
  const storedApiKey = localStorage.getItem(STORAGE_KEY_API_KEY);

  if (storedApiKey) {
    // APIキーが保存されている場合
    appState.apiKey = storedApiKey;
    showMainApp();
  } else {
    // APIキーが未設定の場合、モーダルを表示
    showApiKeyModal();
  }

  // イベントリスナーを設定
  setupEventListeners();

  console.log('アプリケーション起動完了');
}

/**
 * APIキーモーダルを表示
 */
function showApiKeyModal() {
  elements.apiKeyModal.style.display = 'flex';
  elements.mainApp.style.display = 'none';
}

/**
 * メインアプリを表示
 */
function showMainApp() {
  elements.apiKeyModal.style.display = 'none';
  elements.mainApp.style.display = 'block';

  // APIキーステータスを更新
  const apiKeyDisplays = document.querySelectorAll('[data-testid="api-key-display"]');
  apiKeyDisplays.forEach(display => {
    if (!display.disabled) {
      display.value = maskApiKey(appState.apiKey);
    }
  });
}

/**
 * APIキーをマスク表示
 */
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '****';
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * イベントリスナーをセットアップ
 */
function setupEventListeners() {
  // APIキー保存ボタン
  elements.saveApiKeyButton.addEventListener('click', handleSaveApiKey);

  // Enterキーでも保存
  elements.apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSaveApiKey();
    }
  });

  // 原稿入力の文字数カウント
  elements.scriptTextarea.addEventListener('input', updateCharCount);

  // 温度スライダー
  const temperatureInput = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperature-value');
  temperatureInput.addEventListener('input', (e) => {
    temperatureValue.textContent = e.target.value;
    appState.settings.temperature = parseFloat(e.target.value);
  });

  // 設定ボタン
  elements.settingsButton.addEventListener('click', () => {
    elements.settingsModal.style.display = 'flex';
  });

  // 設定モーダルを閉じる
  elements.closeSettingsButton.addEventListener('click', () => {
    elements.settingsModal.style.display = 'none';
  });

  // モーダルの外側をクリックしても閉じないようにする（APIキーモーダル）
  elements.apiKeyModal.addEventListener('click', (e) => {
    if (e.target === elements.apiKeyModal) {
      // 閉じない（APIキー設定は必須）
      showMessage('validation-error', 'APIキーの設定は必須です');
    }
  });

  // 設定モーダルは外側クリックで閉じる
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.style.display = 'none';
    }
  });

  console.log('イベントリスナー設定完了');
}

/**
 * APIキー保存処理
 */
async function handleSaveApiKey() {
  const apiKey = elements.apiKeyInput.value.trim();

  // バリデーション
  hideAllMessages();

  if (!apiKey) {
    showMessage('validation-error', 'APIキーを入力してください');
    return;
  }

  if (apiKey.length < 10) {
    showMessage('validation-error', 'APIキーの形式が正しくありません');
    return;
  }

  // ローディング表示
  showLoading(true);

  try {
    // API検証（簡易版）
    // 注: 実際のAPI検証はPBI-003で実装
    console.log('APIキー検証中...', apiKey.substring(0, 10) + '...');

    // 仮の検証（実装後は実際のAPI呼び出しに置き換え）
    const isValid = await validateApiKey(apiKey);

    if (isValid) {
      // localStorageに保存
      localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
      appState.apiKey = apiKey;

      showMessage('success-message', 'APIキーが保存されました');

      // 2秒後にメインアプリを表示
      setTimeout(() => {
        showMainApp();
      }, 2000);
    } else {
      showMessage('error-message', 'APIキーが無効です。正しいAPIキーを入力してください。');
    }
  } catch (error) {
    console.error('APIキー検証エラー:', error);
    showMessage('error-message', `エラーが発生しました: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

/**
 * APIキーを検証（仮実装）
 * PBI-003で実際のAPI呼び出しに置き換え
 */
async function validateApiKey(apiKey) {
  // 仮の検証: AIzaSyで始まる場合は有効とする
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待つ
  return apiKey.startsWith('AIzaSy');
}

/**
 * メッセージを表示
 */
function showMessage(elementId, message) {
  const element = document.querySelector(`[data-testid="${elementId}"]`);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

/**
 * すべてのメッセージを非表示
 */
function hideAllMessages() {
  const messageElements = [
    'validation-error',
    'error-message',
    'success-message'
  ];

  messageElements.forEach(id => {
    const element = document.querySelector(`[data-testid="${id}"]`);
    if (element) {
      element.style.display = 'none';
      element.textContent = '';
    }
  });
}

/**
 * ローディング表示
 */
function showLoading(show) {
  const loadingElement = document.querySelector('[data-testid="loading"]');
  if (loadingElement) {
    loadingElement.style.display = show ? 'flex' : 'none';
  }

  // 保存ボタンを無効化
  elements.saveApiKeyButton.disabled = show;
}

/**
 * 文字数カウント更新
 */
function updateCharCount() {
  const text = elements.scriptTextarea.value;
  appState.currentScript = text;
  elements.charCount.textContent = text.length.toLocaleString();
}

/**
 * ページ読み込み時に初期化
 */
document.addEventListener('DOMContentLoaded', initApp);

// デバッグ用（開発時のみ）
window.appState = appState;
console.log('app.js ロード完了');
