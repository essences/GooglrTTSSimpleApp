import { elements } from './dom-elements.js';
import { formatCostDisplay } from '../services/cost-utils.js';

export class SectionPreview {
  constructor({
    elementsRef = elements,
    formatCost = formatCostDisplay,
    documentRef = document,
    urlRef = typeof URL !== 'undefined' ? URL : null
  } = {}) {
    this.elements = elementsRef;
    this.formatCost = formatCost;
    this.documentRef = documentRef;
    this.urlRef = urlRef;
  }

  #updateSectionNavigationState(currentIndex, totalCount) {
    const prevButton = this.documentRef.querySelector('[data-testid="prev-section-button"]');
    const nextButton = this.documentRef.querySelector('[data-testid="next-section-button"]');

    if (prevButton) {
      prevButton.disabled = currentIndex <= 1;
    }
    if (nextButton) {
      nextButton.disabled = currentIndex >= totalCount;
    }
  }

  showSectionPreview(record, currentIndex, totalCount) {
    const sectionPreview = this.documentRef.querySelector('[data-testid="section-preview"]');
    if (sectionPreview) {
      sectionPreview.style.display = 'block';
    }

    if (this.elements.slideCurrent) {
      this.elements.slideCurrent.textContent = String(currentIndex).padStart(2, '0');
    }
    if (this.elements.slideTotal) {
      this.elements.slideTotal.textContent = String(totalCount).padStart(2, '0');
    }
    this.#updateSectionNavigationState(currentIndex, totalCount);

    const sectionCost = this.documentRef.getElementById('section-cost');
    if (sectionCost) {
      if (record.cost) {
        const durationText = record.duration ? `${record.duration.toFixed(1)}秒` : '--';
        sectionCost.textContent = `コスト: ${this.formatCost(record.cost)} / ${durationText}`;
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

    const audioElement = this.documentRef.getElementById('audio-element');
    if (audioElement) {
      if (audioElement.dataset.previewUrl && this.urlRef?.revokeObjectURL) {
        this.urlRef.revokeObjectURL(audioElement.dataset.previewUrl);
      }

      if (record.blob && this.urlRef?.createObjectURL) {
        const previewUrl = this.urlRef.createObjectURL(record.blob);
        audioElement.dataset.previewUrl = previewUrl;
        audioElement.src = previewUrl;
        audioElement.load();
      } else {
        audioElement.dataset.previewUrl = '';
        audioElement.removeAttribute('src');
        audioElement.load();
      }
    }

    const playButton = this.documentRef.querySelector('[data-testid="play-button"]');
    const pauseButton = this.documentRef.querySelector('[data-testid="pause-button"]');
    const downloadButton = this.documentRef.querySelector('[data-testid="download-button"]');

    const hasAudio = Boolean(record.blob);
    if (playButton) playButton.disabled = !hasAudio;
    if (pauseButton) pauseButton.disabled = !hasAudio;
    if (downloadButton) downloadButton.disabled = !hasAudio;
  }

  showSectionByIndex(appState, index) {
    if (!Array.isArray(appState.generatedSections) || appState.generatedSections.length === 0) {
      return;
    }
    if (index < 0 || index >= appState.generatedSections.length) {
      return;
    }
    appState.currentSectionIndex = index;
    const record = appState.generatedSections[index];
    this.showSectionPreview(record, index + 1, appState.generatedSections.length);
  }

  showGenerationCompleteMessage() {
    const completeMessage = this.documentRef.querySelector('[data-testid="generation-complete"]');
    if (!completeMessage) return;

    completeMessage.style.display = 'block';
    setTimeout(() => {
      completeMessage.style.display = 'none';
    }, 3000);
  }
}

const defaultSectionPreview = typeof document !== 'undefined' ? new SectionPreview() : null;

export function showSectionPreview(record, currentIndex, totalCount) {
  if (defaultSectionPreview) {
    defaultSectionPreview.showSectionPreview(record, currentIndex, totalCount);
  }
}

export function showSectionByIndex(appState, index) {
  if (defaultSectionPreview) {
    defaultSectionPreview.showSectionByIndex(appState, index);
  }
}

export function showGenerationCompleteMessage() {
  if (defaultSectionPreview) {
    defaultSectionPreview.showGenerationCompleteMessage();
  }
}

export { defaultSectionPreview as sectionPreview };
