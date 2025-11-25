/**
 * 研修ナレーションスタジオ - メインアプリケーション
 * PBI-001: プロジェクト初期セットアップ / PBI-002: APIキー管理
 */

import { GeminiTtsClient, GeminiApiError } from './api-client.js';

// 定数定義
const STORAGE_KEY_API_KEY = 'gemini_api_key';
const STORAGE_KEY_HISTORY = 'narration_history';
const STORAGE_KEY_SPEAKERS = 'speaker_settings';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const API_VALIDATION_MODEL = 'gemini-2.5-flash-preview-tts';
const API_VALIDATION_TIMEOUT_MS = 8000;
const USD_TO_JPY = 150;
const TOKENS_PER_SECOND = 25;
const SAMPLE_SCRIPT = `林: 研修にようこそ。[short pause] 本日はナレーションツールの基本操作を確認します。
彩: [uhm] ありがとうございます。最初に確認すべきポイントは何でしょうか？
林: 最初は原稿の入力とスピーカー設定です。[medium pause] そのあとに音声生成を実行します。
彩: [sarcasm] わかりました。[short pause] 私も担当パートを追加しておきますね。
[laughing] 林: では実践してみましょう。`;
const VOICE_PREVIEW_TEXT = 'こんにちは。これは音声プリセットのサンプルです。';

// モデルごとの価格（USD / 100万トークン）
const MODEL_PRICING = {
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
};

const DEFAULT_SPEAKERS = {
  a: { name: '林', voice: 'Kore', style: '落ち着いたトーン' },
  b: { name: '彩', voice: 'Puck', style: '明るく親しみやすい' }
};

// グローバル状態
const appState = {
  apiKey: null,
  currentScript: '',
  speakers: JSON.parse(JSON.stringify(DEFAULT_SPEAKERS)),
  settings: {
    selectedModel: 'gemini-2.5-flash-preview-tts',
    outputFormat: 'wav',
    temperature: 0.6,
    sectionSplit: 'auto'
  },
  history: [],
  generatedSections: [], // 生成された音声セクション
  currentSectionIndex: 0
};

let pendingConfirmAction = null;
const geminiClient = new GeminiTtsClient();

// DOM要素（initApp内で初期化）
let elements = {};
let confirmButtonDefaults = {};

/**
 * アプリケーション初期化
 */
function initApp() {
  console.log('アプリケーション起動中...');

  // DOM要素を取得
  elements = {
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
    confirmPrimaryButton: document.querySelector('[data-testid="confirm-primary-button"]'),
    historyTableBody: document.getElementById('history-tbody'),
    slideCurrent: document.getElementById('current-section'),
    slideTotal: document.getElementById('total-sections')
  };

  confirmButtonDefaults = {
    text: elements.confirmPrimaryButton?.textContent || 'OK',
    variant: 'primary'
  };

  // スピーカー設定を読み込み
  loadSpeakerSettings();

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

  applySpeakerSettingsToInputs();

  // 履歴を localStorage から読み込み（B5）
  loadHistoryFromStorage();

  // イベントリスナーを設定
  setupEventListeners();

  renderHistoryTable();
  updateModelCostDisplay();

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

  // モデル選択
  const aiModelSelect = document.getElementById('ai-model');
  if (aiModelSelect) {
    aiModelSelect.addEventListener('change', (e) => {
      appState.settings.selectedModel = e.target.value;
      geminiClient.setModel(e.target.value);
      console.log('モデル変更:', e.target.value);
      updateModelCostDisplay();
    });
  }

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

  // TXT ファイルインポート（B1）
  const importTxtButton = document.querySelector('[data-testid="import-txt-button"]');
  if (importTxtButton) {
    importTxtButton.addEventListener('click', handleImportTxt);
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

  document.addEventListener('click', handleGlobalClicks);

  // 音声生成ボタン
  if (elements.generateButton) {
    elements.generateButton.addEventListener('click', handleGenerateAudio);
  }

  // 音声再生/一時停止ボタン
  const playButton = document.querySelector('[data-testid="play-button"]');
  const pauseButton = document.querySelector('[data-testid="pause-button"]');

  if (playButton) {
    playButton.addEventListener('click', handlePlayAudio);
  }

  if (pauseButton) {
    pauseButton.addEventListener('click', handlePauseAudio);
  }

  // ダウンロードボタン
  const downloadButton = document.querySelector('[data-testid="download-button"]');
  if (downloadButton) {
    downloadButton.addEventListener('click', handleDownloadAudio);
  }

  // 再生成ボタン
  const regenerateButton = document.querySelector('[data-testid="regenerate-button"]');
  if (regenerateButton) {
    regenerateButton.addEventListener('click', handleRegenerateSection);
  }

  // 音声プリセット試聴ボタン（B2）
  const previewVoiceAButton = document.querySelector('[data-testid="preview-voice-a"]');
  const previewVoiceBButton = document.querySelector('[data-testid="preview-voice-b"]');

  if (previewVoiceAButton) {
    previewVoiceAButton.addEventListener('click', () => handlePreviewVoice('a'));
  }

  if (previewVoiceBButton) {
    previewVoiceBButton.addEventListener('click', () => handlePreviewVoice('b'));
  }

  registerSpeakerInputListeners();

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
 * TXT ファイルインポート
 * B1: TXT ファイルインポート機能
 */
function handleImportTxt() {
  // ファイル選択ダイアログを開く
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt,text/plain';

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MB まで）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。');
      return;
    }

    // ファイルタイプチェック
    if (!file.type.includes('text') && !file.name.endsWith('.txt')) {
      alert('テキストファイル (.txt) を選択してください。');
      return;
    }

    // FileReader でファイル読み込み
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        alert('ファイルの読み込みに失敗しました。');
        return;
      }

      // 既存のテキストがある場合は確認ダイアログ
      const existing = elements.scriptTextarea.value.trim();
      if (existing.length > 0) {
        openConfirmDialog(
          `現在の原稿を "${file.name}" の内容で置き換えます。よろしいですか？`,
          () => applyImportedText(text),
          { confirmText: '読み込む', variant: 'primary' }
        );
      } else {
        applyImportedText(text);
      }
    };

    reader.onerror = () => {
      alert('ファイルの読み込み中にエラーが発生しました。');
    };

    reader.readAsText(file, 'UTF-8');
  });

  // ファイル選択ダイアログを開く
  fileInput.click();
}

function applyImportedText(text) {
  elements.scriptTextarea.value = text;
  updateCharCount();
  elements.scriptTextarea.focus();
  console.log('TXT ファイルを読み込みました');
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
 * 音声の長さ（秒）を計算
 */
function getAudioDuration(audioBlob) {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });

    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });

    audio.src = url;
  });
}

function calculateCostDetails(usage, script, durationSeconds, modelName) {
  const pricing = MODEL_PRICING[modelName];
  if (!pricing) return null;

  const inputTokens = extractInputTokens(usage, script);
  const outputTokens = extractOutputTokens(usage, durationSeconds, script);

  const usdInput = (inputTokens / 1_000_000) * pricing.inputUsdPerMillion;
  const usdOutput = (outputTokens / 1_000_000) * pricing.outputUsdPerMillion;
  const usdTotal = usdInput + usdOutput;

  return {
    usd: usdTotal,
    jpy: usdTotal * USD_TO_JPY,
    inputTokens,
    outputTokens,
    usdBreakdown: { input: usdInput, output: usdOutput }
  };
}

function extractInputTokens(usage, script) {
  if (!usage && script) return estimateInputTokensFromScript(script);
  if (usage?.promptTokenCount) return usage.promptTokenCount;
  if (usage?.inputTokenCount) return usage.inputTokenCount;
  if (Array.isArray(usage?.promptTokensDetails)) {
    return usage.promptTokensDetails.reduce((sum, item) => sum + (item.tokenCount || 0), 0);
  }
  return estimateInputTokensFromScript(script);
}

function extractOutputTokens(usage, durationSeconds, script) {
  if (usage?.candidatesTokenCount) return usage.candidatesTokenCount;
  if (usage?.outputTokenCount) return usage.outputTokenCount;
  if (Array.isArray(usage?.candidatesTokensDetails)) {
    return usage.candidatesTokensDetails.reduce((sum, item) => sum + (item.tokenCount || 0), 0);
  }

  const effectiveDuration = durationSeconds && durationSeconds > 0
    ? durationSeconds
    : estimateDurationSecondsFromScript(script);

  return Math.round(effectiveDuration * TOKENS_PER_SECOND);
}

function estimateInputTokensFromScript(script) {
  if (!script) return 0;
  return Math.max(1, Math.round(script.length * 1.2));
}

function estimateDurationSecondsFromScript(script) {
  if (!script) return 5;
  return Math.max(5, script.length / 6);
}

function formatUsd(value) {
  if (value < 0.0001) {
    return `$${value.toFixed(6)}`;
  }
  if (value < 0.01) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(3)}`;
}

function formatYenFromUsd(value) {
  return Math.round(value * USD_TO_JPY).toLocaleString('ja-JP');
}

function formatCostDisplay(costInfo) {
  if (!costInfo || !Number.isFinite(costInfo.usd)) {
    return '--';
  }
  const yenText = `約${formatYenFromUsd(costInfo.usd)}円`;
  return `${formatUsd(costInfo.usd)} (${yenText})`;
}

function formatTokenCount(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }
  return value.toLocaleString('ja-JP');
}

function formatSpeakerInfo(info) {
  if (!info) return '--';
  return `${info.name || '(未設定)'} / Voice: ${info.voice || '--'} / Style: ${info.style || '--'}`;
}

function parseSpeakerSegments(script) {
  const lines = script.split(/\r?\n/);
  const segments = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // 先頭に置かれる [laughing] などのマークアップタグを無視して話者名を抽出
    const match = trimmed.match(/^(?:\[[^\]]+\]\s*)*([^\s:：]+)\s*[:：]\s*(.+)$/);
    if (match) {
      segments.push({
        speaker: match[1],
        text: match[2]
      });
    }
  });

  return segments;
}

function normalizeSpeakersRecord(rawSpeakers) {
  const normalizeEntry = (entry) => {
    if (!entry) return null;
    return {
      name: entry.name || '',
      voice: entry.voice || entry.voicePreset || '',
      style: entry.style || entry.styleMemo || ''
    };
  };

  const speakerA = rawSpeakers?.a || rawSpeakers?.speakerA || null;
  const speakerB = rawSpeakers?.b || rawSpeakers?.speakerB || null;

  return {
    a: normalizeEntry(speakerA),
    b: normalizeEntry(speakerB)
  };
}

function normalizeSpeakerLabel(label) {
  if (!label) return '';
  return label.trim().replace(/[\s\u3000]+/g, ' ').toLowerCase();
}

function assignSpeakerKeysToSegments(segments, speakerConfig) {
  const normalizedA = normalizeSpeakerLabel(speakerConfig?.speakerA?.name);
  const normalizedB = normalizeSpeakerLabel(speakerConfig?.speakerB?.name);

  return segments.map((segment) => {
    const normalizedSegmentName = normalizeSpeakerLabel(segment.speaker);
    let speakerKey = null;

    if (normalizedA && normalizedSegmentName === normalizedA) {
      speakerKey = 'speaker_a';
    } else if (normalizedB && normalizedSegmentName === normalizedB) {
      speakerKey = 'speaker_b';
    }

    return {
      ...segment,
      speakerKey
    };
  });
}

/**
 * 音声生成メイン処理
 * PBI-010: 音声生成メイン処理
 */
async function handleGenerateAudio() {
  console.log('音声生成を開始します...');

  try {
    // 入力検証
    console.log('1. 入力検証を開始...');
    const validationError = validateGenerationInputs();
    if (validationError) {
      console.log('検証エラー:', validationError);
      alert(validationError);
      return;
    }
    console.log('入力検証OK');

    // スピーカー設定を取得
    console.log('2. スピーカー設定を取得中...');
    const speakerConfig = getSpeakerConfiguration();
    console.log('スピーカー設定:', speakerConfig);

    const script = appState.currentScript;
    console.log('原稿:', script.substring(0, 50) + '...');

    // UI状態を生成中に変更
    console.log('3. UI状態を生成中に変更...');
    setGeneratingState(true);
    console.log('UI状態変更完了');

    // 音声生成処理を実行
    console.log('4. 音声生成処理を開始...');
    const result = await generateAudioFromScript(script, speakerConfig);
    console.log('音声生成処理完了');

    // プレビュー表示
    await displayGeneratedAudio(result);

    console.log('音声生成が完了しました');
  } catch (error) {
    console.error('音声生成エラー:', error);
    console.error('エラーメッセージ:', error.message);
    console.error('エラー詳細:', error.details);
    console.error('エラースタック:', error.stack);
    alert(`音声生成に失敗しました: ${error.message}`);
  } finally {
    setGeneratingState(false);
  }
}

/**
 * 入力値を検証
 * B3: スピーカー設定バリデーション強化
 */
function validateGenerationInputs() {
  const script = elements.scriptTextarea.value.trim();

  // 原稿検証
  if (!script) {
    return '原稿を入力してください。';
  }

  if (script.length < 5) {
    return '原稿が短すぎます。もう少し長い文章を入力してください。';
  }

  const speakerAName = document.getElementById('speaker-a-name').value.trim();
  const speakerBName = document.getElementById('speaker-b-name').value.trim();

  // 原稿に話者名が含まれているかチェック
  const hasMultipleSpeakers = script.includes(':');

  // 複数話者形式の検証
  if (hasMultipleSpeakers) {
    // 両方の名前が必要
    if (!speakerAName || !speakerBName) {
      return '複数話者の原稿には、Speaker A と Speaker B の両方の名前タグが必要です。';
    }

    // 名前の重複チェック
    if (speakerAName.toLowerCase() === speakerBName.toLowerCase()) {
      return 'Speaker A と Speaker B の名前タグは異なる名前にしてください。';
    }

    // 名前が原稿に含まれているかチェック
    const scriptLower = script.toLowerCase();
    const speakerAInScript = scriptLower.includes(speakerAName.toLowerCase() + ':');
    const speakerBInScript = scriptLower.includes(speakerBName.toLowerCase() + ':');

    if (!speakerAInScript && !speakerBInScript) {
      return `原稿に "${speakerAName}" または "${speakerBName}" が見つかりません。名前タグを確認してください。`;
    }

    // 名前フォーマット検証（英数字と基本的な文字のみ）
    const namePattern = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]+$/;

    if (!namePattern.test(speakerAName)) {
      return `Speaker A の名前タグ "${speakerAName}" に使用できない文字が含まれています。`;
    }

    if (!namePattern.test(speakerBName)) {
      return `Speaker B の名前タグ "${speakerBName}" に使用できない文字が含まれています。`;
    }
  } else {
    // 単一話者の場合、Speaker A の設定があればOK（名前は任意）
    // 特に検証不要
  }

  return null; // 検証OK
}

/**
 * スピーカー設定を取得
 */
function getSpeakerConfiguration() {
  const speakerAName = document.getElementById('speaker-a-name').value.trim();
  const speakerAVoice = document.getElementById('speaker-a-voice').value;
  const speakerAStyle = document.getElementById('speaker-a-style').value.trim();

  const speakerBName = document.getElementById('speaker-b-name').value.trim();
  const speakerBVoice = document.getElementById('speaker-b-voice').value;
  const speakerBStyle = document.getElementById('speaker-b-style').value.trim();

  // appStateを更新
  appState.speakers.a = {
    name: speakerAName,
    voice: speakerAVoice,
    style: speakerAStyle
  };

  appState.speakers.b = {
    name: speakerBName,
    voice: speakerBVoice,
    style: speakerBStyle
  };

  return {
    speakerA: appState.speakers.a,
    speakerB: appState.speakers.b
  };
}

/**
 * 生成中状態の切り替え
 */
function setGeneratingState(isGenerating) {
  // ボタンを無効化/有効化
  elements.generateButton.disabled = isGenerating;
  elements.generateButton.textContent = isGenerating ? '生成中...' : '音声を生成する';

  // 進捗バーの表示/非表示
  const progressBar = document.querySelector('[data-testid="progress-bar"]');
  if (progressBar) {
    progressBar.style.display = isGenerating ? 'block' : 'none';
  }

  // 原稿入力を無効化/有効化
  elements.scriptTextarea.disabled = isGenerating;
}

function loadSpeakerSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SPEAKERS);
    if (!stored) {
      appState.speakers = JSON.parse(JSON.stringify(DEFAULT_SPEAKERS));
      return;
    }
    const parsed = JSON.parse(stored);
    if (parsed?.a && parsed?.b) {
      appState.speakers = {
        a: {
          name: parsed.a.name || DEFAULT_SPEAKERS.a.name,
          voice: parsed.a.voice || DEFAULT_SPEAKERS.a.voice,
          style: parsed.a.style || DEFAULT_SPEAKERS.a.style
        },
        b: {
          name: parsed.b.name || DEFAULT_SPEAKERS.b.name,
          voice: parsed.b.voice || DEFAULT_SPEAKERS.b.voice,
          style: parsed.b.style || DEFAULT_SPEAKERS.b.style
        }
      };
    }
  } catch (error) {
    console.warn('スピーカー設定の読み込みに失敗しました。デフォルトを使用します。', error);
    appState.speakers = JSON.parse(JSON.stringify(DEFAULT_SPEAKERS));
  }
}

function persistSpeakerSettings() {
  try {
    localStorage.setItem(STORAGE_KEY_SPEAKERS, JSON.stringify(appState.speakers));
  } catch (error) {
    console.warn('スピーカー設定の保存に失敗しました', error);
  }
}

function applySpeakerSettingsToInputs() {
  const aName = document.getElementById('speaker-a-name');
  const aVoice = document.getElementById('speaker-a-voice');
  const aStyle = document.getElementById('speaker-a-style');
  const bName = document.getElementById('speaker-b-name');
  const bVoice = document.getElementById('speaker-b-voice');
  const bStyle = document.getElementById('speaker-b-style');

  if (aName) aName.value = appState.speakers.a.name;
  if (aVoice) aVoice.value = appState.speakers.a.voice;
  if (aStyle) aStyle.value = appState.speakers.a.style;
  if (bName) bName.value = appState.speakers.b.name;
  if (bVoice) bVoice.value = appState.speakers.b.voice;
  if (bStyle) bStyle.value = appState.speakers.b.style;
}

function registerSpeakerInputListeners() {
  const mappings = [
    { id: 'speaker-a-name', key: 'a', field: 'name', event: 'input' },
    { id: 'speaker-a-voice', key: 'a', field: 'voice', event: 'change' },
    { id: 'speaker-a-style', key: 'a', field: 'style', event: 'input' },
    { id: 'speaker-b-name', key: 'b', field: 'name', event: 'input' },
    { id: 'speaker-b-voice', key: 'b', field: 'voice', event: 'change' },
    { id: 'speaker-b-style', key: 'b', field: 'style', event: 'input' }
  ];

  mappings.forEach(({ id, key, field, event }) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener(event, () => {
      const value = field === 'voice' ? element.value : element.value.trim();
      appState.speakers[key][field] = value;
      persistSpeakerSettings();
    });
  });
}

function updateModelCostDisplay() {
  const display = document.getElementById('model-cost-display');
  if (!display) return;

  const pricing = MODEL_PRICING[appState.settings.selectedModel];
  if (!pricing) {
    display.textContent = '料金情報がありません';
    return;
  }

  const inputUsd = pricing.inputUsdPerMillion;
  const outputUsd = pricing.outputUsdPerMillion;
  const inputJpy = Math.round(inputUsd * USD_TO_JPY).toLocaleString('ja-JP');
  const outputJpy = Math.round(outputUsd * USD_TO_JPY).toLocaleString('ja-JP');

  display.textContent = `入力: $${inputUsd.toFixed(2)} (約${inputJpy}円) /100万テキストトークン、出力: $${outputUsd.toFixed(2)} (約${outputJpy}円) /100万音声トークン`;
}

/**
 * 原稿から音声を生成
 * Phase 2で詳細実装
 */
async function generateAudioFromScript(script, speakerConfig) {
  console.log('音声生成API呼び出し:', { script, speakerConfig });

  // 単一話者か複数話者か判定
  const segments = parseSpeakerSegments(script);
  const keyedSegments = assignSpeakerKeysToSegments(segments, speakerConfig);
  const speakerANameRaw = speakerConfig.speakerA?.name?.trim();
  const speakerBNameRaw = speakerConfig.speakerB?.name?.trim();
  const hasSpeakerA = keyedSegments.some(seg => seg.speakerKey === 'speaker_a');
  const hasSpeakerB = keyedSegments.some(seg => seg.speakerKey === 'speaker_b');
  const hasMultipleSpeakers = Boolean(
    hasSpeakerA &&
    hasSpeakerB &&
    speakerANameRaw &&
    speakerBNameRaw
  );

  let audioBlob;
  let mimeType;
  let usageMetadata;

  if (hasMultipleSpeakers) {
    // 複数話者TTS
    console.log('複数話者モードで生成');

    const speakerAName = speakerANameRaw || 'Speaker A';
    const speakerBName = speakerBNameRaw || 'Speaker B';

    const multiSpeakerScript = keyedSegments
      .map((seg) => {
        const isSpeakerB = seg.speakerKey === 'speaker_b';
        const placeholder = isSpeakerB ? 'speaker_b' : 'speaker_a';
        const spokenName = isSpeakerB ? speakerBName : speakerAName;
        return `<speaker name="${placeholder}">${spokenName}: ${seg.text}</speaker>`;
      })
      .join('\n');

    const result = await geminiClient.generateMultiSpeaker({
      prompt: multiSpeakerScript,
      speakerConfigs: [
        {
          speaker: 'speaker_a',
          voiceName: speakerConfig.speakerA.voice
        },
        {
          speaker: 'speaker_b',
          voiceName: speakerConfig.speakerB.voice
        }
      ]
      // languageCodeとgenerationConfigは省略（REST API公式サンプルに合わせる）
    });
    audioBlob = result.blob;
    mimeType = result.mimeType;
    usageMetadata = result.usage;
  } else {
    // 単一話者TTS
    console.log('単一話者モードで生成');
    const voiceName = speakerConfig.speakerA.voice || 'Kore';
    const result = await geminiClient.generateSingleSpeaker({
      text: script,
      voiceName: voiceName,
      generationConfig: {
        temperature: appState.settings.temperature
      }
    });
    audioBlob = result.blob;
    mimeType = result.mimeType;
    usageMetadata = result.usage;
  }

  return {
    blob: audioBlob,
    mimeType: mimeType,
    script: script,
    timestamp: new Date().toISOString(),
    speakers: normalizeSpeakersRecord(speakerConfig),
    modelName: appState.settings.selectedModel,
    usage: usageMetadata
  };
}

/**
 * 生成された音声を表示
 * Phase 3で詳細実装
 */
async function displayGeneratedAudio(result) {
  console.log('音声プレビューを表示:', result);

  // 音声の長さを取得してコストを計算
  const duration = await getAudioDuration(result.blob);
  const costInfo = calculateCostDetails(result.usage, result.script, duration, result.modelName);

  const sectionRecord = createSectionRecord(result, duration, costInfo);
  appState.generatedSections = [sectionRecord];
  appState.currentSectionIndex = 0;

  showSectionPreview(sectionRecord, 1, 1);
  addHistoryEntry(sectionRecord);
  renderHistoryTable();
  showGenerationCompleteMessage();
}

function createSectionRecord(result, duration = 0, costInfo = null) {
  const timestamp = result.timestamp || new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, '-').substring(0, 19);

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `section_${Date.now()}`,
    script: result.script,
    scriptSnippet: result.script?.substring(0, 80) ?? '',
    timestamp,
    speakers: normalizeSpeakersRecord(result.speakers),
    mimeType: result.mimeType,
    blob: result.blob,
    fileName: `narration_${safeTimestamp}.wav`,
    modelName: result.modelName,
    duration,
    cost: costInfo
  };
}

function showSectionPreview(record, currentIndex, totalCount) {
  const sectionPreview = document.querySelector('[data-testid="section-preview"]');
  if (sectionPreview) {
    sectionPreview.style.display = 'block';
  }

  if (elements.slideCurrent) {
    elements.slideCurrent.textContent = String(currentIndex).padStart(2, '0');
  }
  if (elements.slideTotal) {
    elements.slideTotal.textContent = String(totalCount).padStart(2, '0');
  }

  // コスト表示
  const sectionCost = document.getElementById('section-cost');
  if (sectionCost) {
    if (record.cost) {
      const durationText = record.duration ? `${record.duration.toFixed(1)}秒` : '--';
      sectionCost.textContent = `コスト: ${formatCostDisplay(record.cost)} / ${durationText}`;
      if (record.cost.inputTokens !== undefined && record.cost.outputTokens !== undefined) {
        sectionCost.title = `入力トークン: ${record.cost.inputTokens.toLocaleString()} / 出力トークン: ${record.cost.outputTokens.toLocaleString()}`;
      } else {
        sectionCost.title = '';
      }
    } else {
      sectionCost.textContent = '';
      sectionCost.title = '';
    }
  }

  const audioElement = document.getElementById('audio-element');
  if (audioElement) {
    if (audioElement.dataset.previewUrl) {
      URL.revokeObjectURL(audioElement.dataset.previewUrl);
    }

    const previewUrl = URL.createObjectURL(record.blob);
    audioElement.dataset.previewUrl = previewUrl;
    audioElement.src = previewUrl;
    audioElement.load();
  }
}

function showGenerationCompleteMessage() {
  const completeMessage = document.querySelector('[data-testid="generation-complete"]');
  if (!completeMessage) return;

  completeMessage.style.display = 'block';
  setTimeout(() => {
    completeMessage.style.display = 'none';
  }, 3000);
}

function addHistoryEntry(record) {
  appState.history.unshift({
    ...record
  });

  // localStorage に保存（B5）
  saveHistoryToStorage();
}

/**
 * 履歴を localStorage に保存
 * B5: 履歴の localStorage 永続化
 */
function saveHistoryToStorage() {
  try {
    // Blob は保存できないため、メタデータのみを保存
    const historyMetadata = appState.history.map((entry) => ({
      id: entry.id,
      script: entry.script,
      timestamp: entry.timestamp,
      scriptSnippet: entry.scriptSnippet,
      mimeType: entry.mimeType,
      fileName: entry.fileName,
      speakers: normalizeSpeakersRecord(entry.speakers),
      modelName: entry.modelName,
      duration: entry.duration,
      cost: entry.cost
      // blob は除外
    }));

    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyMetadata));
    console.log('履歴を localStorage に保存しました');
  } catch (error) {
    console.error('履歴の保存に失敗しました:', error);
  }
}

/**
 * 履歴を localStorage から読み込み
 * B5: 履歴の localStorage 永続化
 */
function loadHistoryFromStorage() {
  try {
    const storedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!storedHistory) {
      console.log('保存された履歴はありません');
      return;
    }

    const historyMetadata = JSON.parse(storedHistory);
    if (!Array.isArray(historyMetadata)) {
      console.warn('履歴データの形式が不正です');
      return;
    }

    // メタデータのみの履歴（Blob なし）を復元
    appState.history = historyMetadata.map((meta) => {
      const normalizedCost = typeof meta.cost === 'number'
        ? { usd: meta.cost, jpy: meta.cost * USD_TO_JPY }
        : meta.cost || null;

      return {
        ...meta,
        blob: null,
        cost: normalizedCost,
        speakers: normalizeSpeakersRecord(meta.speakers)
      };
    });

    console.log(`${appState.history.length} 件の履歴を読み込みました`);
  } catch (error) {
    console.error('履歴の読み込みに失敗しました:', error);
    appState.history = [];
  }
}

function renderHistoryTable() {
  if (!elements.historyTableBody) return;

  elements.historyTableBody.innerHTML = '';
  if (appState.history.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 7;
    emptyCell.textContent = '生成履歴がありません';
    emptyCell.className = 'empty-history';
    emptyRow.appendChild(emptyCell);
    elements.historyTableBody.appendChild(emptyRow);
    return;
  }

  appState.history.forEach((entry, index) => {
    const row = document.createElement('tr');

    // Blob がない場合はダウンロードボタンを無効化
    const hasBlob = entry.blob !== null && entry.blob !== undefined;
    const playButtonHtml = hasBlob
      ? `<button class="btn btn-small" data-history-play="${entry.id}">▶ Play</button>`
      : `<button class="btn btn-small" disabled title="このセッションでは音声データがありません">▶ Play</button>`;
    const downloadAudioButton = hasBlob
      ? `<button class="btn btn-small" data-history-audio="${entry.id}">⬇ Audio</button>`
      : `<button class="btn btn-small" disabled title="このセッションでは音声データがありません">⬇ Audio</button>`;
    const downloadInfoButton = `<button class="btn btn-small" data-history-download="${entry.id}">⬇ Info</button>`;

    // 長さとコストの表示
    const durationText = entry.duration ? `${entry.duration.toFixed(1)}秒` : '--';
    const costInfo = typeof entry.cost === 'number'
      ? { usd: entry.cost, jpy: entry.cost * USD_TO_JPY }
      : entry.cost;
    const costText = costInfo
      ? `<span title="入力:${formatTokenCount(costInfo.inputTokens)} / 出力:${formatTokenCount(costInfo.outputTokens)}">${formatCostDisplay(costInfo)}</span>`
      : '--';

    row.innerHTML = `
      <td>${String(index + 1).padStart(2, '0')}</td>
      <td>${new Date(entry.timestamp).toLocaleString()}</td>
      <td title="${entry.scriptSnippet || ''}">1 セクション</td>
      <td>${entry.mimeType?.toUpperCase() || 'audio/wav'}</td>
      <td>${durationText}</td>
      <td>${costText}</td>
      <td>${playButtonHtml} ${downloadAudioButton} ${downloadInfoButton}</td>
    `;

    elements.historyTableBody.appendChild(row);
  });
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function handleHistoryDownload(entryId) {
  const record = appState.history.find((item) => item.id === entryId);
  if (!record) return;

  const lines = [];
  lines.push(`Timestamp: ${new Date(record.timestamp).toLocaleString()}`);
  lines.push(`Model: ${record.modelName || '--'}`);
  lines.push('');
  lines.push('Speaker Settings:');
  lines.push(`  Speaker A: ${formatSpeakerInfo(record.speakers?.a)}`);
  lines.push(`  Speaker B: ${formatSpeakerInfo(record.speakers?.b)}`);
  lines.push('');
  lines.push('Script:');
  lines.push(record.script || '(No script stored)');

  const textContent = lines.join('\n');
  const blob = new Blob([textContent], {type: 'text/plain'});
  const filename = `narration_${record.id}_info.txt`;
  triggerBlobDownload(blob, filename);
}

function handleGlobalClicks(event) {
  const downloadButton = event.target.closest('[data-history-download]');
  if (downloadButton) {
    const entryId = downloadButton.dataset.historyDownload;
    handleHistoryDownload(entryId);
  }

  const playButton = event.target.closest('[data-history-play]');
  if (playButton) {
    const entryId = playButton.dataset.historyPlay;
    handleHistoryPlay(entryId);
  }

  const audioButton = event.target.closest('[data-history-audio]');
  if (audioButton) {
    const entryId = audioButton.dataset.historyAudio;
    handleHistoryAudioDownload(entryId);
  }
}

function handleHistoryPlay(entryId) {
  const record = appState.history.find((item) => item.id === entryId);
  if (!record) return;
  if (!record.blob) {
    alert('この履歴の音声データは現在のセッションでは再生できません。');
    return;
  }

  appState.generatedSections = [record];
  appState.currentSectionIndex = 0;
  showSectionPreview(record, 1, 1);
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function handleHistoryAudioDownload(entryId) {
  const record = appState.history.find((item) => item.id === entryId);
  if (!record || !record.blob) {
    alert('この履歴の音声データは現在のセッションではダウンロードできません。');
    return;
  }

  triggerBlobDownload(record.blob, record.fileName);
}

/**
 * 音声再生
 * PBI-014: 音声再生機能
 */
function handlePlayAudio() {
  const audioElement = document.getElementById('audio-element');
  if (!audioElement || !audioElement.src) {
    alert('再生する音声がありません。');
    return;
  }

  audioElement.play();

  // ボタン表示切り替え
  const playButton = document.querySelector('[data-testid="play-button"]');
  const pauseButton = document.querySelector('[data-testid="pause-button"]');

  if (playButton) playButton.style.display = 'none';
  if (pauseButton) pauseButton.style.display = 'inline-block';
}

/**
 * 音声一時停止
 */
function handlePauseAudio() {
  const audioElement = document.getElementById('audio-element');
  if (audioElement) {
    audioElement.pause();
  }

  // ボタン表示切り替え
  const playButton = document.querySelector('[data-testid="play-button"]');
  const pauseButton = document.querySelector('[data-testid="pause-button"]');

  if (playButton) playButton.style.display = 'inline-block';
  if (pauseButton) pauseButton.style.display = 'none';
}

/**
 * 音声ダウンロード
 * PBI-015: セクション単位ダウンロード
 */
function handleDownloadAudio() {
  const currentSection = appState.generatedSections[appState.currentSectionIndex];

  if (!currentSection || !currentSection.blob) {
    alert('ダウンロードする音声がありません。');
    return;
  }

  triggerBlobDownload(currentSection.blob, currentSection.fileName);
  console.log('音声をダウンロードしました:', currentSection.fileName);
}

/**
 * セクションの再生成
 */
async function handleRegenerateSection() {
  if (!appState.currentScript) {
    alert('原稿がありません。');
    return;
  }

  const confirmed = confirm('現在のセクションを再生成しますか？');
  if (!confirmed) return;

  // 音声生成を再実行
  await handleGenerateAudio();
}

/**
 * 音声プリセット試聴
 * B2: 音声プリセット試聴機能
 */
async function handlePreviewVoice(speaker) {
  console.log(`音声プリセット試聴: Speaker ${speaker.toUpperCase()}`);

  // APIキーチェック
  if (!appState.apiKey) {
    alert('APIキーが設定されていません。設定メニューからAPIキーを入力してください。');
    return;
  }

  // スピーカー設定を取得
  const voiceSelectId = `speaker-${speaker}-voice`;
  const voiceSelect = document.getElementById(voiceSelectId);

  if (!voiceSelect) {
    console.error(`Voice select element not found: ${voiceSelectId}`);
    return;
  }

  const selectedVoice = voiceSelect.value;
  console.log(`選択された音声: ${selectedVoice}`);

  // ボタンを無効化
  const previewButton = document.querySelector(`[data-testid="preview-voice-${speaker}"]`);
  const originalButtonText = previewButton ? previewButton.textContent : '▶ 試聴';

  if (previewButton) {
    previewButton.disabled = true;
    previewButton.textContent = '生成中...';
  }

  try {
    // 短いサンプル音声を生成
    const result = await geminiClient.generateSingleSpeaker({
      text: VOICE_PREVIEW_TEXT,
      voiceName: selectedVoice,
      languageCode: 'ja-JP'
    });

    console.log('試聴音声生成完了');

    // 音声を即座に再生
    const audioBlob = result.blob;
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
      console.log('試聴音声再生終了');
    });

    audio.play();
    console.log('試聴音声再生開始');

  } catch (error) {
    console.error('音声プリセット試聴エラー:', error);
    alert(`試聴音声の生成に失敗しました: ${error.message}`);
  } finally {
    // ボタンを有効化
    if (previewButton) {
      previewButton.disabled = false;
      previewButton.textContent = originalButtonText;
    }
  }
}

/**
 * ページ読み込み時に初期化
 */
document.addEventListener('DOMContentLoaded', initApp);

// デバッグ用（開発時のみ）
window.appState = appState;
console.log('app.js ロード完了');
