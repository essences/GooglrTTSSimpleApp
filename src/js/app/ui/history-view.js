import { elements } from './dom-elements.js';
import { formatSpeakerInfo } from './formatters.js';
import { USD_TO_JPY } from '../config/constants.js';
import {
  aggregateSectionCost,
  formatCostDisplay,
  formatTokenCount
} from '../services/cost-utils.js';
import { triggerBlobDownload } from '../services/audio-utils.js';

function ensureHistoryBody() {
  if (!elements.historyTableBody) {
    console.warn('historyTableBody element is not cached.');
  }
  return elements.historyTableBody;
}

export function renderHistoryTable(history, getSectionsFromRecord) {
  const historyBody = ensureHistoryBody();
  if (!historyBody) return;

  historyBody.innerHTML = '';

  if (!Array.isArray(history) || history.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 7;
    emptyCell.textContent = '生成履歴がありません';
    emptyCell.className = 'empty-history';
    emptyRow.appendChild(emptyCell);
    historyBody.appendChild(emptyRow);
    return;
  }

  history.forEach((entry, index) => {
    const row = document.createElement('tr');
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
      ? { usd: entry.cost, jpy: entry.cost * USD_TO_JPY }
      : entry.cost || aggregateSectionCost(sections);

    const costText = costInfo
      ? `<span title="入力:${formatTokenCount(costInfo.inputTokens)} / 出力:${formatTokenCount(costInfo.outputTokens)}">${formatCostDisplay(costInfo)}</span>`
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

export function downloadHistoryDetails(record, getSectionsFromRecord) {
  if (!record) return;

  const sections = getSectionsFromRecord(record);

  const lines = [];
  lines.push(`Timestamp: ${new Date(record.timestamp).toLocaleString()}`);
  lines.push(`Model: ${record.modelName || '--'}`);
  lines.push('');
  lines.push('Speaker Settings:');
  lines.push(`  Speaker A: ${formatSpeakerInfo(record.speakers?.a)}`);
  lines.push(`  Speaker B: ${formatSpeakerInfo(record.speakers?.b)}`);
  lines.push('');
  lines.push(`Sections: ${sections.length}`);

  sections.forEach((section, index) => {
    const durationText = section.duration ? `${section.duration.toFixed(1)} sec` : '--';
    const costText = section.cost ? formatCostDisplay(section.cost) : '--';
    lines.push(`  [${String(index + 1).padStart(2, '0')}] Duration: ${durationText}, Cost: ${costText}`);
  });

  lines.push('');
  lines.push('Script:');
  lines.push(record.script || '(No script stored)');

  const textContent = lines.join('\n');
  const blob = new Blob([textContent], { type: 'text/plain' });
  const filename = `narration_${record.id}_info.txt`;
  triggerBlobDownload(blob, filename);
}
