import { elements } from './dom-elements.js';
import { formatSpeakerInfo } from './formatters.js';
import { USD_TO_JPY } from '../config/constants.js';
import {
  aggregateSectionCost,
  formatCostDisplay,
  formatTokenCount
} from '../services/cost-utils.js';
import { triggerBlobDownload } from '../services/audio-utils.js';

export class HistoryView {
  constructor({
    tableBody,
    formatSpeaker = formatSpeakerInfo,
    formatCost = formatCostDisplay,
    formatTokens = formatTokenCount,
    aggregateCost = aggregateSectionCost,
    triggerDownload = triggerBlobDownload,
    usdToJpy = USD_TO_JPY,
    documentRef = document
  } = {}) {
    this.tableBody = tableBody || elements.historyTableBody;
    this.formatSpeaker = formatSpeaker;
    this.formatCost = formatCost;
    this.formatTokens = formatTokens;
    this.aggregateCost = aggregateCost;
    this.triggerDownload = triggerDownload;
    this.usdToJpy = usdToJpy;
    this.documentRef = documentRef;
  }

  #ensureHistoryBody() {
    if (!this.tableBody) {
      console.warn('historyTableBody element is not cached.');
    }
    return this.tableBody;
  }

  render(history, getSectionsFromRecord) {
    const historyBody = this.#ensureHistoryBody();
    if (!historyBody) return;

    historyBody.innerHTML = '';

    if (!Array.isArray(history) || history.length === 0) {
      const emptyRow = this.documentRef.createElement('tr');
      const emptyCell = this.documentRef.createElement('td');
      emptyCell.colSpan = 7;
      emptyCell.textContent = '生成履歴がありません';
      emptyCell.className = 'empty-history';
      emptyRow.appendChild(emptyCell);
      historyBody.appendChild(emptyRow);
      return;
    }

    history.forEach((entry, index) => {
      const row = this.documentRef.createElement('tr');
      const sections = getSectionsFromRecord(entry);
      const sectionCount = entry.sectionCount || sections.length;
      const hasBlob = sections.some((section) => section.blob);

      const playButtonHtml = hasBlob
        ? `<button class="btn btn-small" data-history-play="${entry.id}">▶ Play</button>`
        : '<button class="btn btn-small" disabled title="このセッションでは音声データがありません">▶ Play</button>';

      const downloadAudioButton = hasBlob
        ? `<button class="btn btn-small" data-history-audio="${entry.id}">⬇ Audio</button>`
        : '<button class="btn btn-small" disabled title="このセッションでは音声データがありません">⬇ Audio</button>';

      const downloadInfoButton = `<button class="btn btn-small" data-history-download="${entry.id}">⬇ Info</button>`;

      const totalDuration = entry.duration || sections.reduce((sum, section) => sum + (section.duration || 0), 0);
      const durationText = totalDuration ? `${totalDuration.toFixed(1)}秒` : '--';
      const costInfo = typeof entry.cost === 'number'
        ? { usd: entry.cost, jpy: entry.cost * this.usdToJpy }
        : entry.cost || this.aggregateCost(sections);

      const costText = costInfo
        ? `<span title="入力:${this.formatTokens(costInfo.inputTokens)} / 出力:${this.formatTokens(costInfo.outputTokens)}">${this.formatCost(costInfo)}</span>`
        : '--';

      const primarySection = sections[0] || {};
      const formatLabel = sectionCount > 1 ? 'MULTI' : (primarySection.mimeType?.toUpperCase() || 'audio/wav');

      row.innerHTML = `
        <td>${String(index + 1).padStart(2, '0')}</td>
        <td>${new Date(entry.timestamp).toLocaleString()}</td>
        <td title="${entry.scriptSnippet || ''}">${sectionCount} セクション</td>
        <td>${formatLabel}</td>
        <td>${durationText}</td>
        <td>${costText}</td>
        <td>${playButtonHtml} ${downloadAudioButton} ${downloadInfoButton}</td>
      `;

      historyBody.appendChild(row);
    });
  }

  downloadDetails(record, getSectionsFromRecord) {
    if (!record) return;

    const sections = getSectionsFromRecord(record);

    const lines = [];
    lines.push(`Timestamp: ${new Date(record.timestamp).toLocaleString()}`);
    lines.push(`Model: ${record.modelName || '--'}`);
    lines.push('');
    lines.push('Speaker Settings:');
    lines.push(`  Speaker A: ${this.formatSpeaker(record.speakers?.a)}`);
    lines.push(`  Speaker B: ${this.formatSpeaker(record.speakers?.b)}`);
    lines.push('');
    lines.push(`Sections: ${sections.length}`);

    sections.forEach((section, index) => {
      const durationText = section.duration ? `${section.duration.toFixed(1)} sec` : '--';
      const costText = section.cost ? this.formatCost(section.cost) : '--';
      lines.push(`  [${String(index + 1).padStart(2, '0')}] Duration: ${durationText}, Cost: ${costText}`);
    });

    lines.push('');
    lines.push('Script:');
    lines.push(record.script || '(No script stored)');

    const textContent = lines.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const filename = `narration_${record.id}_info.txt`;
    this.triggerDownload(blob, filename);
  }
}

const defaultHistoryView = typeof document !== 'undefined' ? new HistoryView() : null;

export function renderHistoryTable(history, getSectionsFromRecord) {
  if (defaultHistoryView) {
    defaultHistoryView.render(history, getSectionsFromRecord);
  }
}

export function downloadHistoryDetails(record, getSectionsFromRecord) {
  if (defaultHistoryView) {
    defaultHistoryView.downloadDetails(record, getSectionsFromRecord);
  }
}

export { defaultHistoryView as historyView };
