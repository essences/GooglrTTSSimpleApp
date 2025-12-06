import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import { HistoryView } from '../../src/js/app/ui/history-view.js';

function createDom() {
  const dom = new JSDOM(`<table><tbody id="history-body"></tbody></table>`, { url: 'http://localhost' });
  return dom;
}

function createHistoryView(dom, overrides = {}) {
  const tableBody = dom.window.document.querySelector('#history-body');
  const fakeCost = (cost) => `$${cost?.usd ?? 0}`;
  const fakeTokens = (value) => (value ?? 0).toString();
  let downloadCalled = false;
  let downloadName = '';

  const view = new HistoryView({
    tableBody,
    formatSpeaker: () => 'speaker',
    formatCost: fakeCost,
    formatTokens: fakeTokens,
    aggregateCost: (sections) =>
      sections.reduce(
        (acc, s) => ({
          usd: acc.usd + (s.cost?.usd ?? 0),
          inputTokens: acc.inputTokens + (s.cost?.inputTokens ?? 0),
          outputTokens: acc.outputTokens + (s.cost?.outputTokens ?? 0)
        }),
        { usd: 0, inputTokens: 0, outputTokens: 0 }
      ),
    triggerDownload: (_blob, filename) => {
      downloadCalled = true;
      downloadName = filename;
    },
    usdToJpy: 100,
    documentRef: dom.window.document,
    ...overrides
  });

  return { view, tableBody, getDownloadState: () => ({ downloadCalled, downloadName }) };
}

function testEmptyHistory() {
  const dom = createDom();
  const { view, tableBody } = createHistoryView(dom);
  view.render([], () => []);
  const emptyCell = tableBody.querySelector('.empty-history');
  assert.ok(emptyCell, 'should render empty history placeholder');
  assert.equal(emptyCell.textContent, '生成履歴がありません');
}

function testRenderRowAndButtons() {
  const dom = createDom();
  const { view, tableBody } = createHistoryView(dom);
  const history = [
    {
      id: 'abc',
      timestamp: '2025-01-01T00:00:00.000Z',
      cost: { usd: 1, inputTokens: 10, outputTokens: 20 },
      scriptSnippet: 'hello'
    }
  ];
  const sections = [{ blob: null, duration: 1.5, cost: { usd: 1, inputTokens: 10, outputTokens: 20 }, mimeType: 'audio/wav' }];
  view.render(history, () => sections);
  const rows = tableBody.querySelectorAll('tr');
  assert.equal(rows.length, 1, 'should render one row');
  const rowHtml = rows[0].innerHTML;
  assert.match(rowHtml, /Play/, 'row should contain play action');
}

function testDownloadDetailsUsesInjectedHandler() {
  const dom = createDom();
  const { view, getDownloadState } = createHistoryView(dom);
  const record = {
    id: 'abc',
    timestamp: '2025-01-01T00:00:00.000Z',
    modelName: 'model',
    speakers: { a: {}, b: {} },
    script: 'text'
  };
  view.downloadDetails(record, () => []);
  const { downloadCalled, downloadName } = getDownloadState();
  assert.ok(downloadCalled, 'triggerDownload should be called');
  assert.ok(downloadName.includes('abc'), 'filename should include record id');
}

function run() {
  testEmptyHistory();
  testRenderRowAndButtons();
  testDownloadDetailsUsesInjectedHandler();
  console.log('history-view.unit.js passed');
}

run();
