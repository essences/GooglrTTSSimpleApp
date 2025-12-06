import { elements } from '../ui/dom-elements.js';

function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return '****';
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

function showMessage(elementId, message) {
  const element = document.querySelector(`[data-testid="${elementId}"]`);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

function hideAllMessages() {
  ['validation-error', 'error-message', 'success-message'].forEach((id) => {
    const element = document.querySelector(`[data-testid="${id}"]`);
    if (element) {
      element.style.display = 'none';
      element.textContent = '';
    }
  });
}

function showLoading(show) {
  const loadingElement = document.querySelector('[data-testid="loading"]');
  if (loadingElement) {
    loadingElement.style.display = show ? 'flex' : 'none';
  }

  if (elements.saveApiKeyButton) {
    elements.saveApiKeyButton.disabled = show;
  }
}

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

function setTestingState(isTesting) {
  if (elements.testingIndicator) {
    elements.testingIndicator.style.display = isTesting ? 'block' : 'none';
  }
  if (elements.testApiKeyButton) {
    elements.testApiKeyButton.disabled = isTesting;
  }
}

function updateApiKeyDisplays(appState) {
  const apiKeyDisplays = document.querySelectorAll('[data-testid="api-key-display"]');
  apiKeyDisplays.forEach((display) => {
    if (display.classList.contains('api-key-status')) {
      display.value = appState.apiKey ? 'Connected' : 'Not connected';
    } else {
      display.value = appState.apiKey ? maskApiKey(appState.apiKey) : '未設定';
    }
  });
}

export function createApiKeyController({
  appState,
  validateApiKey,
  storeApiKey,
  clearStoredApiKey,
  setAppStateApiKey,
  setGeminiApiKey,
  showMainApp,
  showApiKeyModal,
  openConfirmDialog
}) {
  async function handleSaveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();

    hideAllMessages();

    if (!apiKey) {
      showMessage('validation-error', 'APIキーを入力してください');
      return;
    }

    if (apiKey.length < 10) {
      showMessage('validation-error', 'APIキーの形式が正しくありません');
      return;
    }

    showLoading(true);

    try {
      await validateApiKey(apiKey);

      storeApiKey(apiKey);
      setAppStateApiKey(apiKey);
      setGeminiApiKey(apiKey);

      showMessage('success-message', 'APIキーが保存されました');

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

  function deleteStoredApiKey() {
    clearStoredApiKey();
    setAppStateApiKey(null);
    setGeminiApiKey(null);
    if (elements.apiKeyInput) {
      elements.apiKeyInput.value = '';
    }
    updateApiKeyDisplays(appState);
    hideSettingsFeedback();
    if (elements.settingsModal) {
      elements.settingsModal.style.display = 'none';
    }
    showApiKeyModal();
    showMessage('success-message', 'APIキーを削除しました。新しいキーを入力してください。');
  }

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

  return {
    handleSaveApiKey,
    handleTestApiKey,
    handleDeleteApiKeyRequest,
    updateApiKeyDisplays: () => updateApiKeyDisplays(appState),
    showMessage
  };
}
