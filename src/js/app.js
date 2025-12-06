/**
 * 研修ナレーションスタジオ - メインアプリケーション
 * アプリの初期化とイベント配線を担当
 */

import {
  appState,
  setApiKey as setAppStateApiKey
} from './app/state/app-state.js';
import {
  elements,
  cacheDomElements,
  getPendingConfirmAction
} from './app/ui/dom-elements.js';
import { renderHistoryTable, downloadHistoryDetails } from './app/ui/history-view.js';
import { defaultServiceRegistry } from './app/services/service-registry.js';
import { showSectionPreview, showSectionByIndex } from './app/ui/section-preview.js';
import { openConfirmDialog, closeConfirmDialog } from './app/ui/dialogs.js';
import { createAudioController } from './app/controllers/audio-controller.js';
import { createApiKeyController } from './app/controllers/api-key-controller.js';
import { createScriptController } from './app/controllers/script-controller.js';
import { createSpeakerController } from './app/controllers/speaker-controller.js';
import { createGenerationController } from './app/controllers/generation-controller.js';

const services = defaultServiceRegistry;
const {
  storageService,
  historyService,
  geminiService,
  ttsClient,
  costUtils,
  audioUtils
} = services;

const speakerController = createSpeakerController({
  appState,
  saveSpeakerSettingsToStorage: (speakers) => storageService.saveSpeakerSettingsToStorage(speakers)
});

const generationController = createGenerationController({
  appState,
  getSpeakerConfiguration: speakerController.getSpeakerConfiguration,
  ttsService: ttsClient
});

const scriptController = createScriptController({
  appState,
  openConfirmDialog
});

const audioController = createAudioController({
  appState,
  getSpeakerConfiguration: speakerController.getSpeakerConfiguration,
  generateAudioFromScript: generationController.generateAudioFromScript,
  getAudioDuration: audioUtils.getAudioDuration,
  calculateCostDetails: costUtils.calculateCostDetails,
  createSectionRecord: historyService.createSectionRecord.bind(historyService),
  updateHistorySectionRecord: (historyId, sectionIndex, updatedRecord) =>
    historyService.updateHistorySectionRecord(appState.history, historyId, sectionIndex, updatedRecord),
  showSectionPreview,
  refreshHistoryTable: () => renderHistoryTable(appState.history, historyService.getSectionsFromRecord.bind(historyService)),
  setGeneratingState: generationController.setGeneratingState,
  getSectionsFromRecord: historyService.getSectionsFromRecord.bind(historyService)
});

const apiKeyController = createApiKeyController({
  appState,
  validateApiKey: (apiKey) => geminiService.validateApiKey(apiKey),
  storeApiKey: (apiKey) => storageService.storeApiKey(apiKey),
  clearStoredApiKey: () => storageService.clearStoredApiKey(),
  setAppStateApiKey,
  setGeminiApiKey: (apiKey) => geminiService.setApiKey(apiKey),
  showMainApp,
  showApiKeyModal,
  openConfirmDialog
});

function initApp() {
  console.log('アプリケーション起動中...');

  cacheDomElements();

  appState.speakers = storageService.loadSpeakerSettingsFromStorage();
  speakerController.applySettingsToInputs();

  const storedApiKey = storageService.loadStoredApiKey();
  if (storedApiKey) {
    setAppStateApiKey(storedApiKey);
    geminiService.setApiKey(storedApiKey);
    showMainApp();
  } else {
    showApiKeyModal();
  }

  appState.history = storageService.loadHistoryMetadata();

  setupEventListeners();

  renderHistoryTable(appState.history, historyService.getSectionsFromRecord.bind(historyService));
  generationController.updateModelCostDisplay();
  scriptController.updateCharCount();

  console.log('アプリケーション起動完了');
}

function showApiKeyModal() {
  elements.apiKeyModal.style.display = 'flex';
  elements.mainApp.style.display = 'none';
}

function showMainApp() {
  elements.apiKeyModal.style.display = 'none';
  elements.mainApp.style.display = 'block';
  apiKeyController.updateApiKeyDisplays();
}

function setupEventListeners() {
  elements.saveApiKeyButton.addEventListener('click', apiKeyController.handleSaveApiKey);

  elements.apiKeyInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      apiKeyController.handleSaveApiKey();
    }
  });

  const prevSectionButton = document.querySelector('[data-testid="prev-section-button"]');
  if (prevSectionButton) {
    prevSectionButton.addEventListener('click', handlePrevSection);
  }

  const nextSectionButton = document.querySelector('[data-testid="next-section-button"]');
  if (nextSectionButton) {
    nextSectionButton.addEventListener('click', handleNextSection);
  }

  const aiModelSelect = document.getElementById('ai-model');
  if (aiModelSelect) {
    aiModelSelect.addEventListener('change', (event) => {
      const model = event.target.value;
      appState.settings.selectedModel = model;
      setGeminiModel(model);
      generationController.updateModelCostDisplay();
    });
  }

  const outputFormatSelect = document.getElementById('output-format');
  if (outputFormatSelect) {
    outputFormatSelect.addEventListener('change', (event) => {
      appState.settings.outputFormat = event.target.value;
    });
    outputFormatSelect.value = appState.settings.outputFormat || 'wav';
  }

  const temperatureInput = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperature-value');
  if (temperatureInput && temperatureValue) {
    temperatureInput.addEventListener('input', (event) => {
      temperatureValue.textContent = event.target.value;
      appState.settings.temperature = parseFloat(event.target.value);
    });
  }

  const sectionSplitSelect = document.getElementById('section-split');
  if (sectionSplitSelect) {
    sectionSplitSelect.addEventListener('change', (event) => {
      appState.settings.sectionSplit = event.target.value;
    });
    sectionSplitSelect.value = appState.settings.sectionSplit || 'auto';
  }

  elements.settingsButton.addEventListener('click', () => {
    elements.settingsModal.style.display = 'flex';
  });

  elements.closeSettingsButton.addEventListener('click', () => {
    elements.settingsModal.style.display = 'none';
  });

  elements.apiKeyModal.addEventListener('click', (event) => {
    if (event.target === elements.apiKeyModal) {
      apiKeyController.showMessage('validation-error', 'APIキーの設定は必須です');
    }
  });

  elements.settingsModal.addEventListener('click', (event) => {
    if (event.target === elements.settingsModal) {
      elements.settingsModal.style.display = 'none';
    }
  });

  if (elements.testApiKeyButton) {
    elements.testApiKeyButton.addEventListener('click', apiKeyController.handleTestApiKey);
  }

  if (elements.deleteApiKeyButton) {
    elements.deleteApiKeyButton.addEventListener('click', apiKeyController.handleDeleteApiKeyRequest);
  }

  if (elements.cancelButton) {
    elements.cancelButton.addEventListener('click', closeConfirmDialog);
  }

  if (elements.confirmPrimaryButton) {
    elements.confirmPrimaryButton.addEventListener('click', () => {
      const action = getPendingConfirmAction();
      if (typeof action === 'function') {
        action();
      }
      closeConfirmDialog();
    });
  }

  document.addEventListener('click', handleGlobalClicks);

  const playButton = document.querySelector('[data-testid="play-button"]');
  if (playButton) {
    playButton.addEventListener('click', audioController.handlePlayAudio);
  }

  const pauseButton = document.querySelector('[data-testid="pause-button"]');
  if (pauseButton) {
    pauseButton.addEventListener('click', audioController.handlePauseAudio);
  }

  const downloadButton = document.querySelector('[data-testid="download-button"]');
  if (downloadButton) {
    downloadButton.addEventListener('click', audioController.handleDownloadAudio);
  }

  const regenerateButton = document.querySelector('[data-testid="regenerate-button"]');
  if (regenerateButton) {
    regenerateButton.addEventListener('click', audioController.handleRegenerateSection);
  }

  scriptController.init();
  speakerController.init();
  generationController.init();

  console.log('イベントリスナー設定完了');
}

function handleGlobalClicks(event) {
  const downloadButton = event.target.closest('[data-history-download]');
  if (downloadButton) {
    const entryId = downloadButton.dataset.historyDownload;
    const record = appState.history.find((item) => item.id === entryId);
    if (record) {
      downloadHistoryDetails(record, getSectionsFromRecord);
    }
  }

  const playButton = event.target.closest('[data-history-play]');
  if (playButton) {
    audioController.handleHistoryPlay(playButton.dataset.historyPlay);
  }

  const audioButton = event.target.closest('[data-history-audio]');
  if (audioButton) {
    audioController.handleHistoryAudioDownload(audioButton.dataset.historyAudio);
  }
}

function handlePrevSection() {
  showSectionByIndex(appState, appState.currentSectionIndex - 1);
}

function handleNextSection() {
  showSectionByIndex(appState, appState.currentSectionIndex + 1);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initApp);
  window.appState = appState;
  console.log('app.js ロード完了');
}
