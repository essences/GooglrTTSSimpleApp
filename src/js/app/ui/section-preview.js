import { elements } from './dom-elements.js';
import { formatCostDisplay } from '../services/cost-utils.js';

function updateSectionNavigationState(currentIndex, totalCount) {
  const prevButton = document.querySelector('[data-testid="prev-section-button"]');
  const nextButton = document.querySelector('[data-testid="next-section-button"]');

  if (prevButton) {
    prevButton.disabled = currentIndex <= 1;
  }
  if (nextButton) {
    nextButton.disabled = currentIndex >= totalCount;
  }
}

export function showSectionPreview(record, currentIndex, totalCount) {
  const sectionPreview = document.querySelector('[data-testid="section-preview"]');
  if (sectionPreview) {
    sectionPreview.style.display = 'block';
  }

  if (elements.slideCurrent) {
    elements.slideCurrent.textContent = String(currentIndex).padStart(2, '0');
  }
  if (elements.slideTotal) {
    elements.slideTotal.textContent = String(totalCount).padStart(2, '0');
  }
  updateSectionNavigationState(currentIndex, totalCount);

  const sectionCost = document.getElementById('section-cost');
  if (sectionCost) {
    if (record.cost) {
      const durationText = record.duration ? `${record.duration.toFixed(1)}秒` : '--';
      sectionCost.textContent = `コスト: ${formatCostDisplay(record.cost)} / ${durationText}`;
      if (record.cost.inputTokens !== undefined && record.cost.outputTokens !== undefined) {
        sectionCost.title = `入力トークン: ${record.cost.inputTokens.toLocaleString()} / 出力トークン: ${record.cost.outputTokens.toLocaleString()}`;
      } else {
        sectionCost.title = '';
      }
    } else {
      sectionCost.textContent = '';
      sectionCost.title = '';
    }
  }

  const audioElement = document.getElementById('audio-element');
  if (audioElement) {
    if (audioElement.dataset.previewUrl) {
      URL.revokeObjectURL(audioElement.dataset.previewUrl);
    }

    if (record.blob) {
      const previewUrl = URL.createObjectURL(record.blob);
      audioElement.dataset.previewUrl = previewUrl;
      audioElement.src = previewUrl;
      audioElement.load();
    } else {
      audioElement.dataset.previewUrl = '';
      audioElement.removeAttribute('src');
      audioElement.load();
    }
  }

  const playButton = document.querySelector('[data-testid="play-button"]');
  const pauseButton = document.querySelector('[data-testid="pause-button"]');
  const downloadButton = document.querySelector('[data-testid="download-button"]');

  const hasAudio = Boolean(record.blob);
  if (playButton) playButton.disabled = !hasAudio;
  if (pauseButton) pauseButton.disabled = !hasAudio;
  if (downloadButton) downloadButton.disabled = !hasAudio;
}

export function showSectionByIndex(appState, index) {
  if (!Array.isArray(appState.generatedSections) || appState.generatedSections.length === 0) {
    return;
  }
  if (index < 0 || index >= appState.generatedSections.length) {
    return;
  }
  appState.currentSectionIndex = index;
  const record = appState.generatedSections[index];
  showSectionPreview(record, index + 1, appState.generatedSections.length);
}

export function showGenerationCompleteMessage() {
  const completeMessage = document.querySelector('[data-testid="generation-complete"]');
  if (!completeMessage) return;

  completeMessage.style.display = 'block';
  setTimeout(() => {
    completeMessage.style.display = 'none';
  }, 3000);
}
