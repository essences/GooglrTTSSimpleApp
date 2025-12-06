import { triggerBlobDownload as defaultTriggerBlobDownload } from '../services/audio-utils.js';

export class AudioController {
  constructor({
    appState,
    getSpeakerConfiguration,
    generateAudioFromScript,
    getAudioDuration,
    calculateCostDetails,
    createSectionRecord,
    updateHistorySectionRecord,
    showSectionPreview,
    refreshHistoryTable,
    setGeneratingState,
    getSectionsFromRecord,
    documentRef = typeof document !== 'undefined' ? document : null,
    triggerBlobDownload = defaultTriggerBlobDownload,
    confirmFn = typeof confirm !== 'undefined' ? confirm : () => true,
    alertFn = typeof alert !== 'undefined' ? alert : () => {}
  }) {
    this.appState = appState;
    this.getSpeakerConfiguration = getSpeakerConfiguration;
    this.generateAudioFromScript = generateAudioFromScript;
    this.getAudioDuration = getAudioDuration;
    this.calculateCostDetails = calculateCostDetails;
    this.createSectionRecord = createSectionRecord;
    this.updateHistorySectionRecord = updateHistorySectionRecord;
    this.showSectionPreview = showSectionPreview;
    this.refreshHistoryTable = refreshHistoryTable;
    this.setGeneratingState = setGeneratingState;
    this.getSectionsFromRecord = getSectionsFromRecord;
    this.documentRef = documentRef;
    this.triggerBlobDownload = triggerBlobDownload;
    this.confirmFn = confirmFn;
    this.alertFn = alertFn;
  }

  handlePlayAudio = () => {
    const audioElement = this.documentRef.getElementById('audio-element');
    if (!audioElement || !audioElement.src) {
      alert('再生する音声がありません。');
      return;
    }

    audioElement.play();

    const playButton = this.documentRef.querySelector('[data-testid="play-button"]');
    const pauseButton = this.documentRef.querySelector('[data-testid="pause-button"]');

    if (playButton) playButton.style.display = 'none';
    if (pauseButton) pauseButton.style.display = 'inline-block';
  };

  handlePauseAudio = () => {
    const audioElement = this.documentRef.getElementById('audio-element');
    if (audioElement) {
      audioElement.pause();
    }

    const playButton = this.documentRef.querySelector('[data-testid="play-button"]');
    const pauseButton = this.documentRef.querySelector('[data-testid="pause-button"]');

    if (playButton) playButton.style.display = 'inline-block';
    if (pauseButton) pauseButton.style.display = 'none';
  };

  handleDownloadAudio = () => {
    const currentSection = this.appState.generatedSections[this.appState.currentSectionIndex];

    if (!currentSection || !currentSection.blob) {
      this.alertFn('ダウンロードする音声がありません。');
      return;
    }

    this.triggerBlobDownload(currentSection.blob, currentSection.fileName);
    console.log('音声をダウンロードしました:', currentSection.fileName);
  };

  handleHistoryPlay = (entryId) => {
    const record = this.appState.history.find((item) => item.id === entryId);
    if (!record) return;

    const sections = this.getSectionsFromRecord(record);
    if (!sections.length) {
      this.alertFn('再生できるセクションが見つかりません。');
      return;
    }

    this.appState.generatedSections = sections.map((section) => ({ ...section }));
    this.appState.currentSectionIndex = 0;
    this.appState.activeHistoryId = record.id;
    this.showSectionPreview(this.appState.generatedSections[0], 1, this.appState.generatedSections.length);
    if (!this.appState.generatedSections[0].blob) {
      this.alertFn('この履歴には音声データが保存されていません。再生するには再生成を行ってください。');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  handleHistoryAudioDownload = (entryId) => {
    const record = this.appState.history.find((item) => item.id === entryId);
    if (!record) {
      this.alertFn('この履歴が見つかりません。');
      return;
    }

    const sections = this.getSectionsFromRecord(record);
    const targetSection = sections.find((section) => section.blob);
    if (!targetSection) {
      this.alertFn('この履歴の音声データは現在のセッションではダウンロードできません。');
      return;
    }

    this.triggerBlobDownload(targetSection.blob, targetSection.fileName || 'narration.wav');
  };

  handleRegenerateSection = async () => {
    if (!Array.isArray(this.appState.generatedSections) || this.appState.generatedSections.length === 0) {
      this.alertFn('再生成できるセクションがありません。');
      return;
    }

    const targetIndex = this.appState.currentSectionIndex;
    const targetSection = this.appState.generatedSections[targetIndex];
    if (!targetSection) {
      this.alertFn('再生成対象のセクションが見つかりません。');
      return;
    }

    const confirmed = this.confirmFn('現在のセクションを再生成しますか？');
    if (!confirmed) return;

    try {
      this.setGeneratingState(true);
      const speakerConfig = this.getSpeakerConfiguration();
      const result = await this.generateAudioFromScript(targetSection.script, speakerConfig);
      const duration = await this.getAudioDuration(result.blob);
      const costInfo = this.calculateCostDetails(result.usage, result.script, duration, result.modelName);
      const updatedRecord = this.createSectionRecord(result, duration, costInfo);
      this.appState.generatedSections[targetIndex] = updatedRecord;
      this.showSectionPreview(updatedRecord, targetIndex + 1, this.appState.generatedSections.length);
      this.updateHistorySectionRecord(this.appState.activeHistoryId, targetIndex, updatedRecord);
      this.refreshHistoryTable();
      this.alertFn('セクションを再生成しました。');
    } catch (error) {
      console.error('セクションの再生成に失敗しました:', error);
      this.alertFn(`セクションの再生成に失敗しました: ${error.message || error}`);
    } finally {
      this.setGeneratingState(false);
    }
  };
}

export function createAudioController(options) {
  return new AudioController(options);
}
