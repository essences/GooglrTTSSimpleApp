import { saveHistoryMetadata } from './storage-service.js';
import { aggregateSectionCost } from './cost-utils.js';
import { normalizeSpeakersRecord } from './script-utils.js';

export function addHistoryEntry(history, record) {
  const clonedSections = Array.isArray(record.sections)
    ? record.sections.map((section) => ({ ...section }))
    : null;

  history.unshift({
    ...record,
    sections: clonedSections
  });

  saveHistoryMetadata(history);
}

export function updateHistorySectionRecord(history, historyId, sectionIndex, updatedRecord) {
  const historyEntry = history.find((entry) => entry.id === historyId);
  if (!historyEntry || !Array.isArray(historyEntry.sections)) {
    return;
  }

  historyEntry.sections[sectionIndex] = { ...updatedRecord };
  historyEntry.duration = historyEntry.sections.reduce((sum, section) => sum + (section.duration || 0), 0);
  historyEntry.cost = aggregateSectionCost(historyEntry.sections) || null;
  historyEntry.sectionCount = historyEntry.sections.length;

  saveHistoryMetadata(history);
}

export function createHistoryRunRecord(sections, fullScript, fallbackModelName) {
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, '-').substring(0, 19);
  const totalDuration = sections.reduce((sum, section) => sum + (section.duration || 0), 0);
  const aggregatedCost = aggregateSectionCost(sections);
  const modelName = sections[0]?.modelName || fallbackModelName;
  const primarySection = sections[0] || {};

  return {
    id: `run_${safeTimestamp}`,
    timestamp,
    script: fullScript,
    scriptSnippet: fullScript?.substring(0, 120) ?? '',
    modelName,
    speakers: normalizeSpeakersRecord(sections[0]?.speakers),
    sectionCount: sections.length,
    duration: totalDuration,
    cost: aggregatedCost,
    mimeType: primarySection.mimeType,
    fileName: primarySection.fileName,
    sections
  };
}

export function createSectionRecord(result, duration = 0, costInfo = null) {
  const timestamp = result.timestamp || new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, '-').substring(0, 19);

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `section_${Date.now()}`,
    script: result.script,
    scriptSnippet: result.script?.substring(0, 80) ?? '',
    timestamp,
    speakers: normalizeSpeakersRecord(result.speakers),
    mimeType: result.mimeType,
    blob: result.blob,
    fileName: `narration_${safeTimestamp}.wav`,
    modelName: result.modelName,
    duration,
    cost: costInfo
  };
}

export function getSectionsFromRecord(record) {
  if (Array.isArray(record?.sections) && record.sections.length > 0) {
    return record.sections;
  }
  return record ? [record] : [];
}
