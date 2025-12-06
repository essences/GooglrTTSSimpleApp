export class SpeakerController {
  constructor({ appState, saveSpeakerSettingsToStorage, documentRef = typeof document !== 'undefined' ? document : null }) {
    this.appState = appState;
    this.saveSpeakerSettingsToStorage = saveSpeakerSettingsToStorage;
    this.listeners = [];
    this.documentRef = documentRef;
  }

  addListener = (element, event, handler) => {
    if (!element) return;
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  };

  init = () => {
    this.applySettingsToInputs();
    this.registerInputListeners();
  };

  destroy = () => {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  };

  getSpeakerConfiguration = () => {
    const speakerAName = this.documentRef.getElementById('speaker-a-name').value.trim();
    const speakerAVoice = this.documentRef.getElementById('speaker-a-voice').value;
    const speakerAStyle = this.documentRef.getElementById('speaker-a-style').value.trim();

    const speakerBName = this.documentRef.getElementById('speaker-b-name').value.trim();
    const speakerBVoice = this.documentRef.getElementById('speaker-b-voice').value;
    const speakerBStyle = this.documentRef.getElementById('speaker-b-style').value.trim();

    this.appState.speakers.a = {
      name: speakerAName,
      voice: speakerAVoice,
      style: speakerAStyle
    };

    this.appState.speakers.b = {
      name: speakerBName,
      voice: speakerBVoice,
      style: speakerBStyle
    };

    return {
      speakerA: this.appState.speakers.a,
      speakerB: this.appState.speakers.b
    };
  };

  applySettingsToInputs = () => {
    const aName = this.documentRef.getElementById('speaker-a-name');
    const aVoice = this.documentRef.getElementById('speaker-a-voice');
    const aStyle = this.documentRef.getElementById('speaker-a-style');
    const bName = this.documentRef.getElementById('speaker-b-name');
    const bVoice = this.documentRef.getElementById('speaker-b-voice');
    const bStyle = this.documentRef.getElementById('speaker-b-style');

    if (aName) aName.value = this.appState.speakers.a.name;
    if (aVoice) aVoice.value = this.appState.speakers.a.voice;
    if (aStyle) aStyle.value = this.appState.speakers.a.style;
    if (bName) bName.value = this.appState.speakers.b.name;
    if (bVoice) bVoice.value = this.appState.speakers.b.voice;
    if (bStyle) bStyle.value = this.appState.speakers.b.style;
  };

  persistSpeakerSettings = () => {
    this.saveSpeakerSettingsToStorage(this.appState.speakers);
  };

  registerInputListeners = () => {
    const mappings = [
      { id: 'speaker-a-name', key: 'a', field: 'name', event: 'input' },
      { id: 'speaker-a-voice', key: 'a', field: 'voice', event: 'change' },
      { id: 'speaker-a-style', key: 'a', field: 'style', event: 'input' },
      { id: 'speaker-b-name', key: 'b', field: 'name', event: 'input' },
      { id: 'speaker-b-voice', key: 'b', field: 'voice', event: 'change' },
      { id: 'speaker-b-style', key: 'b', field: 'style', event: 'input' }
    ];

    mappings.forEach(({ id, key, field, event }) => {
      const element = this.documentRef.getElementById(id);
      this.addListener(element, event, () => {
        const value = field === 'voice' ? element.value : element.value.trim();
        this.appState.speakers[key][field] = value;
        this.persistSpeakerSettings();
      });
    });
  };
}

export function createSpeakerController(options) {
  return new SpeakerController(options);
}
