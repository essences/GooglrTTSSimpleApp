import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import { createApiKeyController } from '../../src/js/app/controllers/api-key-controller.js';

function createDom() {
  const dom = new JSDOM(
    `
    <div data-testid="loading" style="display:none"></div>
    <input data-testid="api-key-display" class="api-key-status" />
    <input data-testid="api-key-display" />
    <div data-testid="validation-error"></div>
    <div data-testid="error-message"></div>
    <div data-testid="success-message"></div>
    <div data-testid="settings-modal"></div>
    <div data-testid="test-result-message"></div>
    <button data-testid="test-api-key"></button>
    <button data-testid="delete-api-key"></button>
    <button id="save-api-key-btn"></button>
    <input id="api-key-input" />
    `,
    { url: 'http://localhost' }
  );
  return dom;
}

function createController(dom, overrides = {}) {
  const appState = { apiKey: null };
  const elements = {
    saveApiKeyButton: dom.window.document.getElementById('save-api-key-btn'),
    apiKeyInput: dom.window.document.getElementById('api-key-input'),
    testApiKeyButton: dom.window.document.querySelector('[data-testid="test-api-key"]'),
    deleteApiKeyButton: dom.window.document.querySelector('[data-testid="delete-api-key"]'),
    testResultMessage: dom.window.document.querySelector('[data-testid="test-result-message"]'),
    testingIndicator: dom.window.document.querySelector('[data-testid="loading"]'),
    settingsModal: dom.window.document.querySelector('[data-testid="settings-modal"]')
  };
  const calls = { validate: 0, store: 0, clear: 0, showMain: 0, showModal: 0 };
  const controller = createApiKeyController({
    appState,
    validateApiKey: async () => {
      calls.validate += 1;
      return true;
    },
    storeApiKey: () => {
      calls.store += 1;
    },
    clearStoredApiKey: () => {
      calls.clear += 1;
    },
    setAppStateApiKey: (key) => {
      appState.apiKey = key;
    },
    setGeminiApiKey: () => {},
    showMainApp: () => {
      calls.showMain += 1;
    },
    showApiKeyModal: () => {
      calls.showModal += 1;
    },
    openConfirmDialog: (msg, fn) => {
      calls.confirmMessage = msg;
      fn();
    },
    documentRef: dom.window.document,
    elementsRef: elements,
    ...overrides
  });

  return { controller, appState, calls, elements };
}

async function testSaveApiKeySuccess() {
  const dom = createDom();
  const { controller, appState, calls, elements } = createController(dom);
  elements.apiKeyInput.value = '1234567890abcdef';
  await controller.handleSaveApiKey();
  assert.equal(appState.apiKey, '1234567890abcdef');
  assert.equal(calls.store, 1);
  assert.equal(calls.validate, 1);
  assert.equal(calls.showMain, 1);
}

async function testDeleteApiKey() {
  const dom = createDom();
  const { controller, appState, calls, elements } = createController(dom);
  appState.apiKey = 'abc';
  elements.apiKeyInput.value = 'abc';
  controller.handleDeleteApiKeyRequest();
  assert.equal(appState.apiKey, null);
  assert.equal(calls.clear, 1);
  assert.ok(calls.confirmMessage.includes('削除'));
}

async function run() {
  await testSaveApiKeySuccess();
  await testDeleteApiKey();
  console.log('api-key-controller.unit.js passed');
}

run();
