import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import { GenerationController } from '../../src/js/app/controllers/generation-controller.js';

function createDom() {
  const dom = new JSDOM(
    `
    <div data-testid="progress-bar"><div id="progress-bar-fill"></div><span id="progress-percent"></span></div>
    <div id="progress-status"></div>
    <ul id="progress-log"></ul>
    <textarea id="script-textarea"></textarea>
    <button id="generate-button"></button>
    `,
    { url: 'http://localhost' }
  );
  return dom;
}

function createController(dom) {
  const appState = {
    apiKey: 'x',
    currentScript: '',
    settings: { selectedModel: 'gemini-2.5-flash-preview-tts', temperature: 0.6 }
  };
  const elements = {
    progressStatus: dom.window.document.getElementById('progress-status'),
    progressPercent: dom.window.document.getElementById('progress-percent'),
    generateButton: dom.window.document.getElementById('generate-button'),
    scriptTextarea: dom.window.document.getElementById('script-textarea')
  };
  const controller = new GenerationController({
    appState,
    getSpeakerConfiguration: () => ({}),
    ttsService: { generateSingleSpeaker: async () => ({ blob: new dom.window.Blob([]), mimeType: 'audio/wav' }) },
    uiHandlers: { elements, documentRef: dom.window.document, renderHistoryTable: () => {}, showSectionPreview: () => {}, showGenerationCompleteMessage: () => {} },
    audioUtils: {
      getAudioDuration: async () => 1,
      base64ToBlob: (b64) => new dom.window.Blob([b64], { type: 'audio/wav' })
    },
    scriptUtils: {
      splitScriptIntoSections: () => ['section'],
      parseSpeakerSegments: () => [],
      assignSpeakerKeysToSegments: () => [],
      normalizeSpeakersRecord: (s) => s
    },
    costUtils: { calculateCostDetails: () => null },
    historyService: {
      createSectionRecord: (r) => ({ ...r, duration: 1, cost: null }),
      createHistoryRunRecord: (sections) => ({ id: 'run', sections }),
      addHistoryEntry: () => {},
      getSectionsFromRecord: () => []
    },
    uiHandlers: {
      elements,
      renderHistoryTable: () => {},
      showSectionPreview: () => {},
      showGenerationCompleteMessage: () => {}
    }
  });
  return { controller, dom, elements };
}

function testProgressIndicatorUpdates() {
  const dom = createDom();
  const { controller } = createController(dom);
  controller.updateProgressIndicator(45);
  const fill = dom.window.document.getElementById('progress-bar-fill');
  const percentLabel = dom.window.document.getElementById('progress-percent');
  assert.equal(fill.style.width, '45%');
  assert.equal(percentLabel.textContent, '45%');
}

function testErrorStateSetsClass() {
  const dom = createDom();
  const { controller } = createController(dom);
  controller.setProgressStatusText('error', { isError: true });
  const bar = dom.window.document.querySelector('[data-testid="progress-bar"]');
  const status = dom.window.document.getElementById('progress-status');
  assert.ok(bar.classList.contains('error'));
  assert.ok(status.classList.contains('error'));
   // log should prepend entry
  const log = dom.window.document.getElementById('progress-log');
  assert.ok(log.firstChild && log.firstChild.textContent.includes('error'));
  controller.setGeneratingState(false);
  assert.ok(!bar.classList.contains('error'));
  assert.equal(dom.window.document.getElementById('progress-percent').textContent, '0%');
}

function run() {
  testProgressIndicatorUpdates();
  testErrorStateSetsClass();
  console.log('generation-controller.ui.unit.js passed');
}

run();
