import { strict as assert } from 'node:assert';
import { GenerationController } from '../../src/js/app/controllers/generation-controller.js';

function createMockTts() {
  const calls = { single: [], multi: [] };
  return {
    calls,
    service: {
      generateSingleSpeaker: async (payload) => {
        calls.single.push(payload);
        return {
          blob: new Blob([]),
          mimeType: 'audio/wav',
          usage: null
        };
      },
      generateMultiSpeaker: async (payload) => {
        calls.multi.push(payload);
        return {
          blob: new Blob([]),
          mimeType: 'audio/wav',
          usage: null
        };
      }
    }
  };
}

async function testSingleSpeakerFallsBack() {
  const mock = createMockTts();
  const appState = {
    apiKey: 'dummy',
    currentScript: '',
    settings: { selectedModel: 'gemini-2.5-flash-preview-tts', temperature: 0.6, safetyProfile: 'strict' }
  };
  const getSpeakerConfiguration = () => ({
    speakerA: { name: 'Alice', voice: 'A-voice', style: '' },
    speakerB: { name: 'Bob', voice: 'B-voice', style: '' }
  });
  const controller = new GenerationController({ appState, getSpeakerConfiguration, ttsService: mock.service });
  const speakerConfig = { speakerA: { name: 'Solo', voice: 'A-voice', style: '' }, speakerB: {} };
  const result = await controller.generateAudioFromScript('Hello world', speakerConfig);
  assert.ok(result.blob, 'should return blob');
  assert.equal(mock.calls.single.length, 1, 'single speaker should be called');
  assert.equal(mock.calls.multi.length, 0, 'multi speaker should not be called');
  assert.equal(mock.calls.single[0].text, 'Hello world');
}

async function testMultiSpeakerUsesPlaceholders() {
  const mock = createMockTts();
  const appState = {
    apiKey: 'dummy',
    currentScript: '',
    settings: { selectedModel: 'gemini-2.5-flash-preview-tts', temperature: 0.6, safetyProfile: 'strict' }
  };
  const getSpeakerConfiguration = () => ({
    speakerA: { name: 'Alice', voice: 'A-voice', style: '' },
    speakerB: { name: 'Bob', voice: 'B-voice', style: '' }
  });
  const controller = new GenerationController({ appState, getSpeakerConfiguration, ttsService: mock.service });
  const script = 'Alice: Hi\nBob: Hello';
  const result = await controller.generateAudioFromScript(script, controller.getSpeakerConfiguration());
  assert.ok(result.blob, 'should return blob');
  assert.equal(mock.calls.multi.length, 1, 'multi speaker should be called');
  const prompt = mock.calls.multi[0].prompt;
  assert.match(prompt, /<speaker name="speaker_a">Alice:/, 'should include speaker_a placeholder');
  assert.match(prompt, /<speaker name="speaker_b">Bob:/, 'should include speaker_b placeholder');
  assert.equal(mock.calls.multi[0].generationConfig?.safetyProfile, 'strict');
}

async function run() {
  await testSingleSpeakerFallsBack();
  await testMultiSpeakerUsesPlaceholders();
  console.log('generation-controller.unit.js passed');
}

run();
