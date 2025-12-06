import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import { createScriptController } from '../../src/js/app/controllers/script-controller.js';

function createDom() {
  const dom = new JSDOM(
    `
    <textarea id="script-textarea"></textarea>
    <span id="char-count"></span>
    <button id="sample-script-button"></button>
    `,
    { url: 'http://localhost' }
  );
  return dom;
}

function createController(dom, overrides = {}) {
  const appState = { currentScript: '' };
  const elements = {
    scriptTextarea: dom.window.document.getElementById('script-textarea'),
    charCount: dom.window.document.getElementById('char-count'),
    sampleScriptButton: dom.window.document.getElementById('sample-script-button')
  };
  const openConfirmDialog = (...args) => {
    openConfirmDialog.calls.push(args);
  };
  openConfirmDialog.calls = [];

  const controller = createScriptController({
    appState,
    openConfirmDialog,
    elementsRef: elements,
    documentRef: dom.window.document,
    ...overrides
  });

  return { controller, appState, elements, openConfirmDialog };
}

function testUpdateCharCount() {
  const dom = createDom();
  const { controller, appState, elements } = createController(dom);
  elements.scriptTextarea.value = 'hello';
  controller.updateCharCount();
  assert.equal(appState.currentScript, 'hello');
  assert.equal(elements.charCount.textContent, '5');
}

function run() {
  testUpdateCharCount();
  console.log('script-controller.unit.js passed');
}

run();
