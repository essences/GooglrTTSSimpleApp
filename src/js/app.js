/**
 * 研修ナレーションスタジオ - メインアプリケーション
 * PBI-001: プロジェクト初期セットアップ / PBI-002: APIキー管理
 */

// 定数定義
const STORAGE_KEY_API_KEY = 'gemini_api_key';
const STORAGE_KEY_HISTORY = 'narration_history';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const API_VALIDATION_MODEL = 'gemini-2.5-flash-preview-tts';
const API_VALIDATION_TIMEOUT_MS = 8000;
const SAMPLE_SCRIPT = `Joe: Welcome to the onboarding deck. Today we'll cover the basics.
Jane: Thanks Joe! I'm excited to learn about our platform.
Joe: Let's start with the dashboard overview, then dive into workflows.
Jane: Sounds good. I'll take notes for the team recap later.`;

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

let pendingConfirmAction = null;
const geminiClient = new window.GeminiTtsClient();

// DOM要素
const elements = {
  apiKeyModal: document.getElementById('api-key-modal'),
  mainApp: document.getElementById('main-app'),
  apiKeyInput: document.getElementById('api-key-input'),
  saveApiKeyButton: document.getElementById('save-api-key-button'),
  scriptTextarea: document.getElementById('script-textarea'),
  charCount: document.querySelector('[data-testid="char-count"]'),
  generateButton: document.getElementById('generate-button'),
  sampleScriptButton: document.querySelector('[data-testid="sample-script-button"]'),
  settingsButton: document.querySelector('[data-testid="settings-button"]'),
  settingsModal: document.getElementById('settings-modal'),
  closeSettingsButton: document.querySelector('[data-testid="close-settings-button"]'),
  testApiKeyButton: document.querySelector('[data-testid="test-api-key-button"]'),
  testingIndicator: document.querySelector('[data-testid="testing-indicator"]'),
  testResultMessage: document.querySelector('[data-testid="test-success-message"]'),
  deleteApiKeyButton: document.querySelector('[data-testid="delete-api-key-button"]'),
  confirmDialog: document.getElementById('confirm-dialog'),
  confirmMessage: document.getElementById('confirm-message'),
  cancelButton: document.querySelector('[data-testid="cancel-button"]'),
  confirmPrimaryButton: document.querySelector('[data-testid="confirm-primary-button"]')
};

const confirmButtonDefaults = {
  text: elements.confirmPrimaryButton?.textContent || 'OK',
  variant: 'primary'
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
    geminiClient.setApiKey(storedApiKey);
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
  updateApiKeyDisplays();
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

  // サンプルスクリプト読み込み
  if (elements.sampleScriptButton) {
    elements.sampleScriptButton.addEventListener('click', handleSampleScriptRequest);
  }

  // APIキーのテスト
  if (elements.testApiKeyButton) {
    elements.testApiKeyButton.addEventListener('click', handleTestApiKey);
  }

  // APIキー削除
  if (elements.deleteApiKeyButton) {
    elements.deleteApiKeyButton.addEventListener('click', handleDeleteApiKeyRequest);
  }

  // 確認ダイアログ操作
  if (elements.cancelButton) {
    elements.cancelButton.addEventListener('click', closeConfirmDialog);
  }

  if (elements.confirmPrimaryButton) {
    elements.confirmPrimaryButton.addEventListener('click', () => {
      if (typeof pendingConfirmAction === 'function') {
        pendingConfirmAction();
      }
      closeConfirmDialog();
    });
  }

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
    await validateApiKey(apiKey);

    // localStorageに保存
    localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
    appState.apiKey = apiKey;
    geminiClient.setApiKey(apiKey);

    showMessage('success-message', 'APIキーが保存されました');

    // 2秒後にメインアプリを表示
    setTimeout(() => {
      showMainApp();
    }, 2000);
  } catch (error) {
    console.error('APIキー検証エラー:', error);
    showMessage('error-message', `エラーが発生しました: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

/**
 * APIキーを検証
 * モデル取得APIを呼び出して認証チェックを行う
 */
async function validateApiKey(apiKey) {
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
      // ignore JSON parse errors
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
 * APIキーステータス表示を更新
 */
function updateApiKeyDisplays() {
  const apiKeyDisplays = document.querySelectorAll('[data-testid="api-key-display"]');
  apiKeyDisplays.forEach(display => {
    if (display.classList.contains('api-key-status')) {
      display.value = appState.apiKey ? 'Connected' : 'Not connected';
    } else {
      display.value = appState.apiKey ? maskApiKey(appState.apiKey) : '未設定';
    }
  });
}

/**
 * APIキーテスト処理
 */
async function handleTestApiKey() {
  hideSettingsFeedback();

  if (!appState.apiKey) {
    showSettingsFeedback('APIキーが設定されていません。', false);
    return;
  }

  setTestingState(true);

  try {
    await validateApiKey(appState.apiKey);
    showSettingsFeedback('APIキーは有効です。', true);
  } catch (error) {
    console.error('APIキーのテストに失敗しました:', error);
    showSettingsFeedback(error.message || 'APIキーのテストに失敗しました。', false);
  } finally {
    setTestingState(false);
  }
}

/**
 * APIキー削除フロー開始
 */
function handleDeleteApiKeyRequest() {
  hideSettingsFeedback();

  if (!appState.apiKey) {
    showSettingsFeedback('削除するAPIキーがありません。', false);
    return;
  }

  openConfirmDialog('保存されたAPIキーを削除しますか？', deleteStoredApiKey, {
    confirmText: '削除',
    variant: 'danger'
  });
}

/**
 * APIキー削除
 */
function deleteStoredApiKey() {
  localStorage.removeItem(STORAGE_KEY_API_KEY);
  appState.apiKey = null;
  geminiClient.setApiKey(null);
  elements.apiKeyInput.value = '';
  updateApiKeyDisplays();
  hideSettingsFeedback();
  elements.settingsModal.style.display = 'none';
  showApiKeyModal();
  showMessage('success-message', 'APIキーを削除しました。新しいキーを入力してください。');
}

/**
 * 設定モーダルのテスト進行状態切り替え
 */
function setTestingState(isTesting) {
  if (elements.testingIndicator) {
    elements.testingIndicator.style.display = isTesting ? 'block' : 'none';
  }
  if (elements.testApiKeyButton) {
    elements.testApiKeyButton.disabled = isTesting;
  }
}

/**
 * 設定モーダルのメッセージ表示
 */
function showSettingsFeedback(message, isSuccess) {
  if (!elements.testResultMessage) return;
  elements.testResultMessage.textContent = message;
  elements.testResultMessage.style.display = 'block';
  elements.testResultMessage.style.color = isSuccess ? '#15803d' : '#b91c1c';
}

function hideSettingsFeedback() {
  if (!elements.testResultMessage) return;
  elements.testResultMessage.style.display = 'none';
  elements.testResultMessage.textContent = '';
}

/**
 * 確認ダイアログ制御
 */
function openConfirmDialog(message, onConfirm, options = {}) {
  if (!elements.confirmDialog || !elements.confirmMessage) return;
  elements.confirmMessage.textContent = message;
  configureConfirmButton(options);
  elements.confirmDialog.style.display = 'flex';
  pendingConfirmAction = onConfirm;
}

function closeConfirmDialog() {
  if (!elements.confirmDialog) return;
  elements.confirmDialog.style.display = 'none';
  pendingConfirmAction = null;
  configureConfirmButton(confirmButtonDefaults);
}

function configureConfirmButton({ confirmText, variant } = {}) {
  if (!elements.confirmPrimaryButton) return;
  elements.confirmPrimaryButton.textContent = confirmText || confirmButtonDefaults.text;
  elements.confirmPrimaryButton.classList.remove('btn-danger', 'btn-primary');
  const selectedVariant = variant || confirmButtonDefaults.variant;
  if (selectedVariant === 'danger') {
    elements.confirmPrimaryButton.classList.add('btn-danger');
  } else {
    elements.confirmPrimaryButton.classList.add('btn-primary');
  }
}

/**
 * サンプルスクリプト読み込み
 */
function handleSampleScriptRequest() {
  const existing = elements.scriptTextarea.value.trim();
  if (existing.length > 0 && existing !== SAMPLE_SCRIPT.trim()) {
    openConfirmDialog(
      '現在の原稿をサンプルスクリプトで置き換えます。よろしいですか？',
      applySampleScript,
      { confirmText: '読み込む', variant: 'primary' }
    );
    return;
  }
  applySampleScript();
}

function applySampleScript() {
  elements.scriptTextarea.value = SAMPLE_SCRIPT;
  updateCharCount();
  elements.scriptTextarea.focus();
}

/**
 * ページ読み込み時に初期化
 */
document.addEventListener('DOMContentLoaded', initApp);

// デバッグ用（開発時のみ）
window.appState = appState;
console.log('app.js ロード完了');
