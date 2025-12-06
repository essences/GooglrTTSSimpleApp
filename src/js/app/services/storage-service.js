import {
  STORAGE_KEY_API_KEY,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_SPEAKERS,
  USD_TO_JPY
} from '../config/constants.js';
import { createDefaultSpeakers } from '../state/app-state.js';
import { normalizeSpeakersRecord } from './script-utils.js';
import { aggregateSectionCost } from './cost-utils.js';

export const loadStoredApiKey = () => localStorage.getItem(STORAGE_KEY_API_KEY);

export const storeApiKey = (apiKey) => {
  localStorage.setItem(STORAGE_KEY_API_KEY, apiKey);
};

export const clearStoredApiKey = () => {
  localStorage.removeItem(STORAGE_KEY_API_KEY);
};

export const loadSpeakerSettingsFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SPEAKERS);
    if (!stored) {
      return createDefaultSpeakers();
    }
    const defaults = createDefaultSpeakers();
    const parsed = JSON.parse(stored);
    if (parsed?.a && parsed?.b) {
      return {
        a: {
          name: parsed.a.name || defaults.a.name,
          voice: parsed.a.voice || defaults.a.voice,
          style: parsed.a.style || defaults.a.style
        },
        b: {
          name: parsed.b.name || defaults.b.name,
          voice: parsed.b.voice || defaults.b.voice,
          style: parsed.b.style || defaults.b.style
        }
      };
    }
    return createDefaultSpeakers();
  } catch (error) {
    console.warn('スピーカー設定の読み込みに失敗しました。デフォルトを使用します。', error);
    return createDefaultSpeakers();
  }
};

export const saveSpeakerSettingsToStorage = (speakers) => {
  try {
    localStorage.setItem(STORAGE_KEY_SPEAKERS, JSON.stringify(speakers));
  } catch (error) {
    console.warn('スピーカー設定の保存に失敗しました', error);
  }
};

const serializeSectionForStorage = (section) => ({
  id: section.id,
  script: section.script,
  scriptSnippet: section.scriptSnippet,
  timestamp: section.timestamp,
  speakers: section.speakers,
  mimeType: section.mimeType,
  fileName: section.fileName,
  modelName: section.modelName,
  duration: section.duration,
  cost: section.cost
});

const serializeHistoryEntry = (entry) => {
  const sections = Array.isArray(entry.sections)
    ? entry.sections.map(serializeSectionForStorage)
    : null;

  const firstSection = Array.isArray(entry.sections) ? entry.sections[0] : null;

  return {
    id: entry.id,
    script: entry.script,
    timestamp: entry.timestamp,
    scriptSnippet: entry.scriptSnippet,
    mimeType: entry.mimeType || firstSection?.mimeType,
    fileName: entry.fileName || firstSection?.fileName,
    speakers: normalizeSpeakersRecord(entry.speakers),
    modelName: entry.modelName,
    duration: entry.duration,
    cost: entry.cost,
    sectionCount: entry.sectionCount || (sections?.length ?? 1),
    sections
  };
};

export const saveHistoryMetadata = (history) => {
  try {
    const historyMetadata = history.map(serializeHistoryEntry);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyMetadata));
    console.log('履歴を localStorage に保存しました');
  } catch (error) {
    console.error('履歴の保存に失敗しました:', error);
  }
};

export const loadHistoryMetadata = () => {
  try {
    const storedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!storedHistory) {
      console.log('保存された履歴はありません');
      return [];
    }

    const historyMetadata = JSON.parse(storedHistory);
    if (!Array.isArray(historyMetadata)) {
      console.warn('履歴データの形式が不正です');
      return [];
    }

    return historyMetadata.map((meta) => {
      const normalizedCost = typeof meta.cost === 'number'
        ? { usd: meta.cost, jpy: meta.cost * USD_TO_JPY }
        : meta.cost || null;

      const normalizedSections = Array.isArray(meta.sections)
        ? meta.sections.map((section) => ({
            ...section,
            blob: null,
            speakers: normalizeSpeakersRecord(section.speakers)
          }))
        : null;

      const sections = normalizedSections || [];
      const aggregatedCost = normalizedCost || aggregateSectionCost(sections);

      return {
        ...meta,
        blob: null,
        cost: aggregatedCost,
        sections,
        sectionCount: meta.sectionCount || (sections?.length ?? 1),
        speakers: normalizeSpeakersRecord(meta.speakers)
      };
    });
  } catch (error) {
    console.error('履歴の読み込みに失敗しました:', error);
    return [];
  }
};
