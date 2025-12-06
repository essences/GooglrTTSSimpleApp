import { strict as assert } from 'node:assert';
import { HistoryService } from '../../src/js/app/services/history-service.js';

function createMockSave() {
  const calls = [];
  return {
    fn: (history) => calls.push(history.map((h) => h.id)),
    calls
  };
}

function testAddHistoryEntrySaves() {
  const saveMock = createMockSave();
  const service = new HistoryService({
    saveHistoryMetadata: saveMock.fn,
    aggregateSectionCost: () => null,
    normalizeSpeakersRecord: (s) => s,
    uuidFn: () => 'uuid-1'
  });
  const history = [];
  const record = { id: 'run1', sections: [{ id: 'sec1' }] };
  service.addHistoryEntry(history, record);
  assert.equal(history.length, 1);
  assert.deepEqual(saveMock.calls[0], ['run1']);
}

function testUpdateHistorySectionRecord() {
  const saveMock = createMockSave();
  const service = new HistoryService({
    saveHistoryMetadata: saveMock.fn,
    aggregateSectionCost: (sections) => ({ usd: sections.length }),
    normalizeSpeakersRecord: (s) => s,
    uuidFn: () => 'uuid-1'
  });
  const history = [
    {
      id: 'run1',
      sections: [{ id: 's1', duration: 1 }, { id: 's2', duration: 2 }],
      duration: 3,
      cost: null,
      sectionCount: 2
    }
  ];
  service.updateHistorySectionRecord(history, 'run1', 0, { id: 's1', duration: 4 });
  assert.equal(history[0].sections[0].duration, 4);
  assert.equal(history[0].duration, 6);
  assert.deepEqual(history[0].cost, { usd: 2 });
  assert.deepEqual(saveMock.calls[0], ['run1']);
}

function testCreateRecords() {
  const service = new HistoryService({
    saveHistoryMetadata: () => {},
    aggregateSectionCost: (sections) => ({ usd: sections.length }),
    normalizeSpeakersRecord: (s) => s,
    uuidFn: () => 'uuid-custom'
  });
  const sections = [{ modelName: 'm', duration: 1, speakers: { a: {} } }];
  const run = service.createHistoryRunRecord(sections, 'script', 'fallback');
  assert.ok(run.id.startsWith('run_'));
  const section = service.createSectionRecord({ script: 'hi', speakers: {}, mimeType: 'audio/wav', modelName: 'm' });
  assert.equal(section.id, 'uuid-custom');
}

function run() {
  testAddHistoryEntrySaves();
  testUpdateHistorySectionRecord();
  testCreateRecords();
  console.log('history-service.unit.js passed');
}

run();
