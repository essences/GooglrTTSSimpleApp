export const elements = {};

export const confirmButtonDefaults = {
  text: 'OK',
  variant: 'primary'
};

export let pendingConfirmAction = null;

export const setPendingConfirmAction = (action) => {
  pendingConfirmAction = action;
};

export const resetPendingConfirmAction = () => {
  pendingConfirmAction = null;
};

export const getPendingConfirmAction = () => pendingConfirmAction;

export const cacheDomElements = () => {
  elements.apiKeyModal = document.getElementById('api-key-modal');
  elements.mainApp = document.getElementById('main-app');
  elements.apiKeyInput = document.getElementById('api-key-input');
  elements.saveApiKeyButton = document.getElementById('save-api-key-button');
  elements.scriptTextarea = document.getElementById('script-textarea');
  elements.charCount = document.querySelector('[data-testid="char-count"]');
  elements.generateButton = document.getElementById('generate-button');
  elements.sampleScriptButton = document.querySelector('[data-testid="sample-script-button"]');
  elements.settingsButton = document.querySelector('[data-testid="settings-button"]');
  elements.settingsModal = document.getElementById('settings-modal');
  elements.closeSettingsButton = document.querySelector('[data-testid="close-settings-button"]');
  elements.testApiKeyButton = document.querySelector('[data-testid="test-api-key-button"]');
  elements.testingIndicator = document.querySelector('[data-testid="testing-indicator"]');
  elements.testResultMessage = document.querySelector('[data-testid="test-success-message"]');
  elements.deleteApiKeyButton = document.querySelector('[data-testid="delete-api-key-button"]');
  elements.confirmDialog = document.getElementById('confirm-dialog');
  elements.confirmMessage = document.getElementById('confirm-message');
  elements.cancelButton = document.querySelector('[data-testid="cancel-button"]');
  elements.confirmPrimaryButton = document.querySelector('[data-testid="confirm-primary-button"]');
  elements.historyTableBody = document.getElementById('history-tbody');
  elements.slideCurrent = document.getElementById('current-section');
  elements.slideTotal = document.getElementById('total-sections');
  elements.progressStatus = document.getElementById('progress-status');

  confirmButtonDefaults.text = elements.confirmPrimaryButton?.textContent || 'OK';
  confirmButtonDefaults.variant = 'primary';
};
