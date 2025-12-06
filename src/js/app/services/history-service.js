import { saveHistoryMetadata as defaultSaveHistoryMetadata } from './storage-service.js';
import { aggregateSectionCost as defaultAggregateSectionCost } from './cost-utils.js';
import { normalizeSpeakersRecord as defaultNormalizeSpeakersRecord } from './script-utils.js';

export class HistoryService {
  constructor({
    saveHistoryMetadata = defaultSaveHistoryMetadata,
    aggregateSectionCost = defaultAggregateSectionCost,
    normalizeSpeakersRecord = defaultNormalizeSpeakersRecord,
    uuidFn = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `section_${Date.now()}`)
  } = {}) {
    this.saveHistoryMetadata = saveHistoryMetadata;
    this.aggregateSectionCost = aggregateSectionCost;
    this.normalizeSpeakersRecord = normalizeSpeakersRecord;
    this.uuidFn = uuidFn;
  }

  addHistoryEntry(history, record) {
    const clonedSections = Array.isArray(record.sections)
      ? record.sections.map((section) => ({ ...section }))
      : null;

    history.unshift({
      ...record,
      sections: clonedSections
    });

    this.saveHistoryMetadata(history);
  }

  updateHistorySectionRecord(history, historyId, sectionIndex, updatedRecord) {
    const historyEntry = history.find((entry) => entry.id === historyId);
    if (!historyEntry || !Array.isArray(historyEntry.sections)) {
      return;
    }

    historyEntry.sections[sectionIndex] = { ...updatedRecord };
    historyEntry.duration = historyEntry.sections.reduce((sum, section) => sum + (section.duration || 0), 0);
    historyEntry.cost = this.aggregateSectionCost(historyEntry.sections) || null;
    historyEntry.sectionCount = historyEntry.sections.length;

    this.saveHistoryMetadata(history);
  }

  createHistoryRunRecord(sections, fullScript, fallbackModelName) {
    const timestamp = new Date().toISOString();
    const safeTimestamp = timestamp.replace(/[:.]/g, '-').substring(0, 19);
    const totalDuration = sections.reduce((sum, section) => sum + (section.duration || 0), 0);
    const aggregatedCost = this.aggregateSectionCost(sections);
    const modelName = sections[0]?.modelName || fallbackModelName;
    const primarySection = sections[0] || {};

    return {
      id: `run_${safeTimestamp}`,
      timestamp,
      script: fullScript,
      scriptSnippet: fullScript?.substring(0, 120) ?? '',
      modelName,
      speakers: this.normalizeSpeakersRecord(sections[0]?.speakers),
      sectionCount: sections.length,
      duration: totalDuration,
      cost: aggregatedCost,
      mimeType: primarySection.mimeType,
      fileName: primarySection.fileName,
      sections
    };
  }

  createSectionRecord(result, duration = 0, costInfo = null) {
    const timestamp = result.timestamp || new Date().toISOString();
    const safeTimestamp = timestamp.replace(/[:.]/g, '-').substring(0, 19);

    return {
      id: this.uuidFn(),
      script: result.script,
      scriptSnippet: result.script?.substring(0, 80) ?? '',
      timestamp,
      speakers: this.normalizeSpeakersRecord(result.speakers),
      mimeType: result.mimeType,
      blob: result.blob,
      fileName: `narration_${safeTimestamp}.wav`,
      modelName: result.modelName,
      duration,
      cost: costInfo
    };
  }

  getSectionsFromRecord(record) {
    if (Array.isArray(record?.sections) && record.sections.length > 0) {
      return record.sections;
    }
    return record ? [record] : [];
  }
}

const defaultHistoryService = new HistoryService();

export const addHistoryEntry = (history, record) => defaultHistoryService.addHistoryEntry(history, record);
export const updateHistorySectionRecord = (history, historyId, sectionIndex, updatedRecord) =>
  defaultHistoryService.updateHistorySectionRecord(history, historyId, sectionIndex, updatedRecord);
export const createHistoryRunRecord = (sections, fullScript, fallbackModelName) =>
  defaultHistoryService.createHistoryRunRecord(sections, fullScript, fallbackModelName);
export const createSectionRecord = (result, duration = 0, costInfo = null) =>
  defaultHistoryService.createSectionRecord(result, duration, costInfo);
export const getSectionsFromRecord = (record) => defaultHistoryService.getSectionsFromRecord(record);
