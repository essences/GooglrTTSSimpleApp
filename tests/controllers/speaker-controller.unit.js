import { strict as assert } from 'node:assert';
import { JSDOM } from 'jsdom';
import { createSpeakerController } from '../../src/js/app/controllers/speaker-controller.js';

function createDom() {
  const dom = new JSDOM(
    `
    <input id="speaker-a-name" />
    <select id="speaker-a-voice"><option value="A1">A1</option></select>
    <input id="speaker-a-style" />
    <input id="speaker-b-name" />
    <select id="speaker-b-voice"><option value="B1">B1</option></select>
    <input id="speaker-b-style" />
    `,
    { url: 'http://localhost' }
  );
  return dom;
}

function createController(dom) {
  const appState = {
    speakers: {
      a: { name: '', voice: '', style: '' },
      b: { name: '', voice: '', style: '' }
    }
  };
  const calls = { save: 0 };
  const controller = createSpeakerController({
    appState,
    saveSpeakerSettingsToStorage: () => {
      calls.save += 1;
    },
    documentRef: dom.window.document
  });
  return { controller, appState, calls, dom };
}

function testGetSpeakerConfiguration() {
  const dom = createDom();
  const { controller, appState } = createController(dom);
  const doc = dom.window.document;
  doc.getElementById('speaker-a-name').value = 'Alice';
  doc.getElementById('speaker-a-voice').value = 'A1';
  doc.getElementById('speaker-a-style').value = 'calm';
  doc.getElementById('speaker-b-name').value = 'Bob';
  doc.getElementById('speaker-b-voice').value = 'B1';
  doc.getElementById('speaker-b-style').value = 'fast';
  const config = controller.getSpeakerConfiguration();
  assert.equal(config.speakerA.name, 'Alice');
  assert.equal(appState.speakers.b.voice, 'B1');
}

function testRegisterInputListenersPersists() {
  const dom = createDom();
  const { controller, calls, dom: d } = createController(dom);
  controller.registerInputListeners();
  const input = d.window.document.getElementById('speaker-a-name');
  input.value = 'Changed';
  input.dispatchEvent(new d.window.Event('input'));
  assert.equal(calls.save, 1, 'save should be called when input changes');
}

function run() {
  testGetSpeakerConfiguration();
  testRegisterInputListenersPersists();
  console.log('speaker-controller.unit.js passed');
}

run();
