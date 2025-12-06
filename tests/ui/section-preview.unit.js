import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import { SectionPreview } from '../../src/js/app/ui/section-preview.js';

function createDom() {
  const dom = new JSDOM(
    `
    <div data-testid="section-preview" style="display:none"></div>
    <span id="slide-current"></span>
    <span id="slide-total"></span>
    <div id="section-cost"></div>
    <button data-testid="prev-section-button"></button>
    <button data-testid="next-section-button"></button>
    <audio id="audio-element"></audio>
    <button data-testid="play-button"></button>
    <button data-testid="pause-button"></button>
    <button data-testid="download-button"></button>
    `,
    { url: 'http://localhost' }
  );
  // Stub audio load to avoid jsdom Not implemented errors
  dom.window.HTMLMediaElement.prototype.load = function load() {};
  return dom;
}

function createPreview(dom, overrides = {}) {
  const elementsRef = {
    slideCurrent: dom.window.document.getElementById('slide-current'),
    slideTotal: dom.window.document.getElementById('slide-total')
  };
  const preview = new SectionPreview({
    elementsRef,
    formatCost: (cost) => `COST-${cost?.usd ?? '0'}`,
    documentRef: dom.window.document,
    urlRef: {
      createObjectURL: () => 'mock://audio',
      revokeObjectURL: () => {}
    },
    ...overrides
  });
  return preview;
}

function testRenderWithAudio() {
  const dom = createDom();
  const preview = createPreview(dom);
  const blob = new dom.window.Blob(['test'], { type: 'audio/wav' });
  const record = { cost: { usd: 2 }, duration: 1.2, blob };

  preview.showSectionPreview(record, 1, 3);

  const sectionPreview = dom.window.document.querySelector('[data-testid="section-preview"]');
  assert.equal(sectionPreview.style.display, 'block', 'section preview should be shown');
  assert.equal(dom.window.document.getElementById('slide-current').textContent, '01');
  assert.equal(dom.window.document.getElementById('slide-total').textContent, '03');

  const costText = dom.window.document.getElementById('section-cost').textContent;
  assert.ok(costText.includes('COST-2'), 'cost formatter should be used');

  const playButton = dom.window.document.querySelector('[data-testid="play-button"]');
  const downloadButton = dom.window.document.querySelector('[data-testid="download-button"]');
  assert.equal(playButton.disabled, false, 'play should be enabled when blob exists');
  assert.equal(downloadButton.disabled, false, 'download should be enabled when blob exists');
}

function testRenderWithoutAudioDisablesControls() {
  const dom = createDom();
  const preview = createPreview(dom);
  const record = { cost: null, duration: null, blob: null };

  preview.showSectionPreview(record, 2, 2);

  const playButton = dom.window.document.querySelector('[data-testid="play-button"]');
  const downloadButton = dom.window.document.querySelector('[data-testid="download-button"]');
  assert.equal(playButton.disabled, true, 'play should be disabled without blob');
  assert.equal(downloadButton.disabled, true, 'download should be disabled without blob');
}

function testShowSectionByIndex() {
  const dom = createDom();
  const preview = createPreview(dom);
  const blob = new dom.window.Blob(['x'], { type: 'audio/wav' });
  const appState = {
    generatedSections: [{ blob }, { blob }],
    currentSectionIndex: 0
  };
  preview.showSectionByIndex(appState, 1);
  assert.equal(appState.currentSectionIndex, 1, 'currentSectionIndex should update');
}

function run() {
  testRenderWithAudio();
  testRenderWithoutAudioDisablesControls();
  testShowSectionByIndex();
  console.log('section-preview.unit.js passed');
}

run();
