import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import { createAudioController } from '../../src/js/app/controllers/audio-controller.js';

function createDom() {
  const dom = new JSDOM(
    `
    <audio id="audio-element"></audio>
    <button data-testid="play-button"></button>
    <button data-testid="pause-button"></button>
    <button data-testid="download-button"></button>
    `,
    { url: 'http://localhost' }
  );
  dom.window.scrollTo = () => {};
  dom.window.alert = () => {};
  dom.window.confirm = () => true;
  dom.window.HTMLMediaElement.prototype.play = function play() {
    this._played = true;
  };
  dom.window.HTMLMediaElement.prototype.pause = function pause() {
    this._paused = true;
  };
  return dom;
}

function createController(dom, opts = {}) {
  const appState = {
    generatedSections: [],
    currentSectionIndex: 0,
    history: [],
    activeHistoryId: null
  };
  const calls = { download: 0, showPreview: 0, refresh: 0 };
  const controller = createAudioController({
    appState,
    getSpeakerConfiguration: () => ({}),
    generateAudioFromScript: async () => ({
      blob: new dom.window.Blob(['x']),
      mimeType: 'audio/wav',
      usage: null,
      script: 'hi',
      modelName: 'm'
    }),
    getAudioDuration: async () => 1,
    calculateCostDetails: () => ({ usd: 0 }),
    createSectionRecord: (result) => ({ ...result, duration: 1, cost: { usd: 0 } }),
    updateHistorySectionRecord: () => {},
    showSectionPreview: () => {
      calls.showPreview += 1;
    },
    refreshHistoryTable: () => {
      calls.refresh += 1;
    },
    setGeneratingState: () => {},
    getSectionsFromRecord: (r) => r.sections || [],
    documentRef: dom.window.document,
    triggerBlobDownload: () => {
      calls.download += 1;
    },
    ...opts
  });

  return { controller, appState, calls };
}

function testHandleDownloadUsesTrigger() {
  const dom = createDom();
  const { controller, appState, calls } = createController(dom);
  appState.generatedSections = [{ blob: new dom.window.Blob(['x']), fileName: 'f.wav' }];
  controller.handleDownloadAudio();
  assert.equal(calls.download, 1, 'triggerBlobDownload should be called');
}

async function testHandleRegenerateUpdatesSection() {
  const dom = createDom();
  const { controller, appState } = createController(dom, {
    confirmFn: () => true,
    alertFn: () => {}
  });
  appState.generatedSections = [{ script: 'hi', blob: null }];
  await controller.handleRegenerateSection();
  assert.ok(appState.generatedSections[0].blob instanceof dom.window.Blob, 'regenerate should set blob');
}

async function run() {
  testHandleDownloadUsesTrigger();
  await testHandleRegenerateUpdatesSection();
  console.log('audio-controller.unit.js passed');
}

run();
