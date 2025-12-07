import { DEFAULT_SPEAKERS } from '../config/constants.js';

export const createDefaultSpeakers = () => JSON.parse(JSON.stringify(DEFAULT_SPEAKERS));

export const createInitialSettings = () => ({
  selectedModel: 'gemini-2.5-flash-preview-tts',
  outputFormat: 'wav',
  temperature: 0.6,
  sectionSplit: 'auto',
  safetyProfile: 'default'
});

export const appState = {
  apiKey: null,
  currentScript: '',
  speakers: createDefaultSpeakers(),
  settings: createInitialSettings(),
  history: [],
  generatedSections: [],
  currentSectionIndex: 0,
  activeHistoryId: null,
  progressLog: []
};

export const resetGeneratedSections = () => {
  appState.generatedSections = [];
  appState.currentSectionIndex = 0;
};

export const updateSpeakers = (updater) => {
  appState.speakers = updater(createDefaultSpeakers(), appState.speakers);
};

export const setApiKey = (apiKey) => {
  appState.apiKey = apiKey;
};
