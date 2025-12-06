import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import '../setup-localstorage.js';
import { appState } from '../../src/js/app/state/app-state.js';

function createDom() {
  const dom = new JSDOM(
    `
    <select id="output-format" data-testid="output-format"><option value="wav">WAV</option><option value="wav+mp3">WAV+MP3</option></select>
    <select id="section-split" data-testid="section-split"><option value="auto">auto</option><option value="slide">slide</option></select>
    `,
    { url: 'http://localhost' }
  );
  return dom;
}

function setupListeners(dom) {
  const outputFormatSelect = dom.window.document.getElementById('output-format');
  outputFormatSelect.addEventListener('change', (event) => {
    appState.settings.outputFormat = event.target.value;
  });
  const sectionSplitSelect = dom.window.document.getElementById('section-split');
  sectionSplitSelect.addEventListener('change', (event) => {
    appState.settings.sectionSplit = event.target.value;
  });
}

function testOutputFormatChange() {
  const dom = createDom();
  setupListeners(dom);
  const select = dom.window.document.getElementById('output-format');
  select.value = 'wav+mp3';
  select.dispatchEvent(new dom.window.Event('change'));
  assert.equal(appState.settings.outputFormat, 'wav+mp3');
}

function testSectionSplitChange() {
  const dom = createDom();
  setupListeners(dom);
  const select = dom.window.document.getElementById('section-split');
  select.value = 'slide';
  select.dispatchEvent(new dom.window.Event('change'));
  assert.equal(appState.settings.sectionSplit, 'slide');
}

function run() {
  testOutputFormatChange();
  testSectionSplitChange();
  console.log('generation-settings.unit.js passed');
}

run();
