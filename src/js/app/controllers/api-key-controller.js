import { elements } from '../ui/dom-elements.js';

function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '****';
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

export class ApiKeyController {
  constructor({
    appState,
    validateApiKey,
    storeApiKey,
    clearStoredApiKey,
    setAppStateApiKey,
    setGeminiApiKey,
    showMainApp,
    showApiKeyModal,
    openConfirmDialog,
    documentRef = typeof document !== 'undefined' ? document : null,
    elementsRef = elements
  }) {
    this.appState = appState;
    this.validateApiKey = validateApiKey;
    this.storeApiKey = storeApiKey;
    this.clearStoredApiKey = clearStoredApiKey;
    this.setAppStateApiKey = setAppStateApiKey;
    this.setGeminiApiKey = setGeminiApiKey;
    this.showMainApp = showMainApp;
    this.showApiKeyModal = showApiKeyModal;
    this.openConfirmDialog = openConfirmDialog;
    this.documentRef = documentRef;
    this.elements = elementsRef;
  }

  showMessage = (elementId, message) => {
    const element = this.documentRef.querySelector(`[data-testid="${elementId}"]`);
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
    }
  };

  hideAllMessages = () => {
    ['validation-error', 'error-message', 'success-message'].forEach((id) => {
      const element = this.documentRef.querySelector(`[data-testid="${id}"]`);
      if (element) {
        element.style.display = 'none';
        element.textContent = '';
      }
    });
  };

  showLoading = (show) => {
    const loadingElement = this.documentRef.querySelector('[data-testid="loading"]');
    if (loadingElement) {
      loadingElement.style.display = show ? 'flex' : 'none';
    }

    if (this.elements.saveApiKeyButton) {
      this.elements.saveApiKeyButton.disabled = show;
    }
  };

  showSettingsFeedback = (message, isSuccess) => {
    if (!this.elements.testResultMessage) return;
    this.elements.testResultMessage.textContent = message;
    this.elements.testResultMessage.style.display = 'block';
    this.elements.testResultMessage.style.color = isSuccess ? '#15803d' : '#b91c1c';
  };

  hideSettingsFeedback = () => {
    if (!this.elements.testResultMessage) return;
    this.elements.testResultMessage.style.display = 'none';
    this.elements.testResultMessage.textContent = '';
  };

  setTestingState = (isTesting) => {
    if (this.elements.testingIndicator) {
      this.elements.testingIndicator.style.display = isTesting ? 'block' : 'none';
    }
    if (this.elements.testApiKeyButton) {
      this.elements.testApiKeyButton.disabled = isTesting;
    }
  };

  updateApiKeyDisplays = () => {
    const apiKeyDisplays = this.documentRef.querySelectorAll('[data-testid="api-key-display"]');
    apiKeyDisplays.forEach((display) => {
      if (display.classList.contains('api-key-status')) {
        display.value = this.appState.apiKey ? 'Connected' : 'Not connected';
      } else {
        display.value = this.appState.apiKey ? maskApiKey(this.appState.apiKey) : '未設定';
      }
    });
  };

  handleSaveApiKey = async () => {
    const apiKey = this.elements.apiKeyInput.value.trim();

    this.hideAllMessages();

    if (!apiKey) {
      this.showMessage('validation-error', 'APIキーを入力してください');
      return;
    }

    if (apiKey.length < 10) {
      this.showMessage('validation-error', 'APIキーの形式が正しくありません');
      return;
    }

    this.showLoading(true);

    try {
      await this.validateApiKey(apiKey);

      this.storeApiKey(apiKey);
      this.setAppStateApiKey(apiKey);
      this.setGeminiApiKey(apiKey);

      this.showMessage('success-message', 'APIキーが保存されました');

      setTimeout(() => {
        this.showMainApp();
      }, 2000);
    } catch (error) {
      console.error('APIキー検証エラー:', error);
      this.showMessage('error-message', `エラーが発生しました: ${error.message}`);
    } finally {
      this.showLoading(false);
    }
  };

  handleTestApiKey = async () => {
    this.hideSettingsFeedback();

    if (!this.appState.apiKey) {
      this.showSettingsFeedback('APIキーが設定されていません。', false);
      return;
    }

    this.setTestingState(true);

    try {
      await this.validateApiKey(this.appState.apiKey);
      this.showSettingsFeedback('APIキーは有効です。', true);
    } catch (error) {
      console.error('APIキーのテストに失敗しました:', error);
      this.showSettingsFeedback(error.message || 'APIキーのテストに失敗しました。', false);
    } finally {
      this.setTestingState(false);
    }
  };

  deleteStoredApiKey = () => {
    this.clearStoredApiKey();
    this.setAppStateApiKey(null);
    this.setGeminiApiKey(null);
    if (this.elements.apiKeyInput) {
      this.elements.apiKeyInput.value = '';
    }
    this.updateApiKeyDisplays();
    this.hideSettingsFeedback();
    if (this.elements.settingsModal) {
      this.elements.settingsModal.style.display = 'none';
    }
    this.showApiKeyModal();
    this.showMessage('success-message', 'APIキーを削除しました。新しいキーを入力してください。');
  };

  handleDeleteApiKeyRequest = () => {
    this.hideSettingsFeedback();

    if (!this.appState.apiKey) {
      this.showSettingsFeedback('削除するAPIキーがありません。', false);
      return;
    }

    this.openConfirmDialog('保存されたAPIキーを削除しますか？', this.deleteStoredApiKey, {
      confirmText: '削除',
      variant: 'danger'
    });
  };
}

export function createApiKeyController(options) {
  const controller = new ApiKeyController(options);
  return {
    handleSaveApiKey: controller.handleSaveApiKey,
    handleTestApiKey: controller.handleTestApiKey,
    handleDeleteApiKeyRequest: controller.handleDeleteApiKeyRequest,
    updateApiKeyDisplays: controller.updateApiKeyDisplays,
    showMessage: controller.showMessage
  };
}
