import { triggerBlobDownload } from '../services/audio-utils.js';

export function createAudioController({
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
  getSectionsFromRecord
}) {
  function handlePlayAudio() {
    const audioElement = document.getElementById('audio-element');
    if (!audioElement || !audioElement.src) {
      alert('再生する音声がありません。');
      return;
    }

    audioElement.play();

    const playButton = document.querySelector('[data-testid="play-button"]');
    const pauseButton = document.querySelector('[data-testid="pause-button"]');

    if (playButton) playButton.style.display = 'none';
    if (pauseButton) pauseButton.style.display = 'inline-block';
  }

  function handlePauseAudio() {
    const audioElement = document.getElementById('audio-element');
    if (audioElement) {
      audioElement.pause();
    }

    const playButton = document.querySelector('[data-testid="play-button"]');
    const pauseButton = document.querySelector('[data-testid="pause-button"]');

    if (playButton) playButton.style.display = 'inline-block';
    if (pauseButton) pauseButton.style.display = 'none';
  }

  function handleDownloadAudio() {
    const currentSection = appState.generatedSections[appState.currentSectionIndex];

    if (!currentSection || !currentSection.blob) {
      alert('ダウンロードする音声がありません。');
      return;
    }

    triggerBlobDownload(currentSection.blob, currentSection.fileName);
    console.log('音声をダウンロードしました:', currentSection.fileName);
  }

  function handleHistoryPlay(entryId) {
    const record = appState.history.find((item) => item.id === entryId);
    if (!record) return;

    const sections = getSectionsFromRecord(record);
    if (!sections.length) {
      alert('再生できるセクションが見つかりません。');
      return;
    }

    appState.generatedSections = sections.map((section) => ({ ...section }));
    appState.currentSectionIndex = 0;
    appState.activeHistoryId = record.id;
    showSectionPreview(appState.generatedSections[0], 1, appState.generatedSections.length);
    if (!appState.generatedSections[0].blob) {
      alert('この履歴には音声データが保存されていません。再生するには再生成を行ってください。');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleHistoryAudioDownload(entryId) {
    const record = appState.history.find((item) => item.id === entryId);
    if (!record) {
      alert('この履歴が見つかりません。');
      return;
    }

    const sections = getSectionsFromRecord(record);
    const targetSection = sections.find((section) => section.blob);
    if (!targetSection) {
      alert('この履歴の音声データは現在のセッションではダウンロードできません。');
      return;
    }

    triggerBlobDownload(targetSection.blob, targetSection.fileName || 'narration.wav');
  }

  async function handleRegenerateSection() {
    if (!Array.isArray(appState.generatedSections) || appState.generatedSections.length === 0) {
      alert('再生成できるセクションがありません。');
      return;
    }

    const targetIndex = appState.currentSectionIndex;
    const targetSection = appState.generatedSections[targetIndex];
    if (!targetSection) {
      alert('再生成対象のセクションが見つかりません。');
      return;
    }

    const confirmed = confirm('現在のセクションを再生成しますか？');
    if (!confirmed) return;

    try {
      setGeneratingState(true);
      const speakerConfig = getSpeakerConfiguration();
      const result = await generateAudioFromScript(targetSection.script, speakerConfig);
      const duration = await getAudioDuration(result.blob);
      const costInfo = calculateCostDetails(result.usage, result.script, duration, result.modelName);
      const updatedRecord = createSectionRecord(result, duration, costInfo);
      appState.generatedSections[targetIndex] = updatedRecord;
      showSectionPreview(updatedRecord, targetIndex + 1, appState.generatedSections.length);
      updateHistorySectionRecord(appState.activeHistoryId, targetIndex, updatedRecord);
      refreshHistoryTable();
      alert('セクションを再生成しました。');
    } catch (error) {
      console.error('セクションの再生成に失敗しました:', error);
      alert(`セクションの再生成に失敗しました: ${error.message || error}`);
    } finally {
      setGeneratingState(false);
    }
  }

  return {
    handlePlayAudio,
    handlePauseAudio,
    handleDownloadAudio,
    handleHistoryPlay,
    handleHistoryAudioDownload,
    handleRegenerateSection
  };
}
