import { strict as assert } from 'node:assert';
import { StorageService } from '../../src/js/app/services/storage-service.js';
import { createDefaultSpeakers } from '../../src/js/app/state/app-state.js';

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    dump: () => store
  };
}

function testApiKeyPersist() {
  const mockStorage = createMockStorage();
  const service = new StorageService({ storage: mockStorage });
  service.storeApiKey('abc');
  assert.equal(service.loadStoredApiKey(), 'abc');
  service.clearStoredApiKey();
  assert.equal(service.loadStoredApiKey(), null);
}

function testSpeakerSaveLoad() {
  const mockStorage = createMockStorage();
  const service = new StorageService({ storage: mockStorage });
  const speakers = {
    a: { name: 'Alice', voice: 'A', style: 'calm' },
    b: { name: 'Bob', voice: 'B', style: 'fast' }
  };
  service.saveSpeakerSettingsToStorage(speakers);
  const loaded = service.loadSpeakerSettingsFromStorage();
  assert.deepEqual(loaded, speakers);
}

function testSpeakerLoadFallback() {
  const mockStorage = createMockStorage();
  const service = new StorageService({ storage: mockStorage });
  const loaded = service.loadSpeakerSettingsFromStorage();
  assert.deepEqual(loaded, createDefaultSpeakers());
}

function testHistorySaveLoad() {
  const mockStorage = createMockStorage();
  const service = new StorageService({ storage: mockStorage });
  const history = [
    {
      id: 'run1',
      script: 'hello',
      timestamp: '2025-01-01T00:00:00.000Z',
      speakers: { a: { name: 'A' }, b: { name: 'B' } },
      modelName: 'm',
      sections: [
        { id: 's1', script: 'hi', timestamp: '2025-01-01T00:00:00.000Z', speakers: { a: { name: 'A' } }, mimeType: 'audio/wav' }
      ]
    }
  ];
  service.saveHistoryMetadata(history);
  const loaded = service.loadHistoryMetadata();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'run1');
  assert.equal(loaded[0].sections.length, 1);
}

function run() {
  testApiKeyPersist();
  testSpeakerSaveLoad();
  testSpeakerLoadFallback();
  testHistorySaveLoad();
  console.log('storage-service.unit.js passed');
}

run();
