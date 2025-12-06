import {
  VOICE_PREVIEW_TEXT,
  MAX_SECTION_RETRIES,
  RETRY_DELAY_BASE_MS,
  PRO_TTS_ENDPOINT,
  MODEL_PRICING,
  PRO_TTS_MODELS,
  USD_TO_JPY
} from '../config/constants.js';
import {
  splitScriptIntoSections,
  parseSpeakerSegments,
  assignSpeakerKeysToSegments,
  normalizeSpeakersRecord
} from '../services/script-utils.js';
import { calculateCostDetails } from '../services/cost-utils.js';
import { getAudioDuration, base64ToBlob } from '../services/audio-utils.js';
import { delay } from '../services/async-utils.js';
import { getGeminiClient } from '../services/gemini-service.js';
import {
  addHistoryEntry,
  createHistoryRunRecord,
  createSectionRecord,
  getSectionsFromRecord
} from '../services/history-service.js';
import { renderHistoryTable } from '../ui/history-view.js';
import { showSectionPreview, showGenerationCompleteMessage } from '../ui/section-preview.js';
import { elements } from '../ui/dom-elements.js';

const geminiClient = getGeminiClient();

export function createGenerationController({ appState, getSpeakerConfiguration }) {
  function updateProgressIndicator(percent) {
    const fill = document.getElementById('progress-bar-fill');
    if (fill) {
      const clamped = Math.max(0, Math.min(100, percent || 0));
      fill.style.width = `${clamped}%`;
    }
  }

  function setProgressStatusText(text = '', { isError = false } = {}) {
    const statusElement = elements.progressStatus;
    if (!statusElement) return;

    if (text) {
      statusElement.textContent = text;
      statusElement.style.display = 'block';
      statusElement.classList.toggle('error', Boolean(isError));
    } else {
      statusElement.textContent = '';
      statusElement.style.display = 'none';
      statusElement.classList.remove('error');
    }
  }

  function setGeneratingState(isGenerating) {
    if (elements.generateButton) {
      elements.generateButton.disabled = isGenerating;
      elements.generateButton.textContent = isGenerating ? '生成中...' : '音声を生成する';
    }

    const progressBar = document.querySelector('[data-testid="progress-bar"]');
    if (progressBar) {
      progressBar.style.display = isGenerating ? 'block' : 'none';
    }

    if (!isGenerating) {
      updateProgressIndicator(0);
    }

    if (elements.scriptTextarea) {
      elements.scriptTextarea.disabled = isGenerating;
    }
  }

  function validateGenerationInputs() {
    const script = elements.scriptTextarea.value.trim();

    if (!script) {
      return '原稿を入力してください。';
    }

    if (script.length < 5) {
      return '原稿が短すぎます。もう少し長い文章を入力してください。';
    }

    const speakerAName = document.getElementById('speaker-a-name').value.trim();
    const speakerBName = document.getElementById('speaker-b-name').value.trim();

    const hasMultipleSpeakers = script.includes(':');

    if (hasMultipleSpeakers) {
      if (!speakerAName || !speakerBName) {
        return '複数話者の原稿には、Speaker A と Speaker B の両方の名前タグが必要です。';
      }

      if (speakerAName.toLowerCase() === speakerBName.toLowerCase()) {
        return 'Speaker A と Speaker B の名前タグは異なる名前にしてください。';
      }

      const scriptLower = script.toLowerCase();
      const speakerAInScript = scriptLower.includes(`${speakerAName.toLowerCase()}:`);
      const speakerBInScript = scriptLower.includes(`${speakerBName.toLowerCase()}:`);

      if (!speakerAInScript && !speakerBInScript) {
        return `原稿に "${speakerAName}" または "${speakerBName}" が見つかりません。名前タグを確認してください。`;
      }

      const namePattern = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF_-]+$/;

      if (!namePattern.test(speakerAName)) {
        return `Speaker A の名前タグ "${speakerAName}" に使用できない文字が含まれています。`;
      }

      if (!namePattern.test(speakerBName)) {
        return `Speaker B の名前タグ "${speakerBName}" に使用できない文字が含まれています。`;
      }
    }

    return null;
  }

  function updateModelSafetyNotice() {
    const notice = document.getElementById('model-warning');
    if (!notice) return;

    const isPro = PRO_TTS_MODELS.has(appState.settings.selectedModel);
    notice.style.display = isPro ? 'block' : 'none';
  }

  function updateModelCostDisplay() {
    const display = document.getElementById('model-cost-display');
    if (!display) return;

    const pricing = MODEL_PRICING[appState.settings.selectedModel];
    if (!pricing) {
      display.textContent = '料金情報がありません';
      return;
    }

    const inputUsd = pricing.inputUsdPerMillion;
    const outputUsd = pricing.outputUsdPerMillion;
    const inputJpy = Math.round(inputUsd * USD_TO_JPY).toLocaleString('ja-JP');
    const outputJpy = Math.round(outputUsd * USD_TO_JPY).toLocaleString('ja-JP');

    display.textContent = `入力: $${inputUsd.toFixed(2)} (約${inputJpy}円) /100万テキストトークン、出力: $${outputUsd.toFixed(2)} (約${outputJpy}円) /100万音声トークン`;

    updateModelSafetyNotice();
  }

  async function generateAudioViaServer(script, speakerConfig) {
    if (!appState.apiKey) {
      throw new Error('APIキーが設定されていません。設定からキーを入力してください。');
    }

    setProgressStatusText('Gemini 2.5 Pro TTS を呼び出しています...');

    let response;
    try {
      response = await fetch(PRO_TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: appState.apiKey,
          script,
          speakerConfig,
          generationConfig: {
            temperature: appState.settings.temperature
          },
          model: appState.settings.selectedModel
        })
      });
    } catch (networkError) {
      throw new Error(`Pro TTS サーバーへの接続に失敗しました: ${networkError.message}`);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || `Pro TTS サーバーエラー (${response.status})`);
    }

    const audioBlob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
    return {
      blob: audioBlob,
      mimeType: data.mimeType || 'audio/wav',
      script,
      timestamp: new Date().toISOString(),
      speakers: normalizeSpeakersRecord(speakerConfig),
      modelName: data.modelName || appState.settings.selectedModel,
      usage: data.usage || null
    };
  }

  async function generateAudioFromScript(script, speakerConfig) {
    if (PRO_TTS_MODELS.has(appState.settings.selectedModel)) {
      return generateAudioViaServer(script, speakerConfig);
    }

    const segments = parseSpeakerSegments(script);
    const keyedSegments = assignSpeakerKeysToSegments(segments, speakerConfig);
    const speakerANameRaw = speakerConfig.speakerA?.name?.trim();
    const speakerBNameRaw = speakerConfig.speakerB?.name?.trim();
    const hasSpeakerA = keyedSegments.some((seg) => seg.speakerKey === 'speaker_a');
    const hasSpeakerB = keyedSegments.some((seg) => seg.speakerKey === 'speaker_b');
    const hasMultipleSpeakers = Boolean(
      hasSpeakerA && hasSpeakerB && speakerANameRaw && speakerBNameRaw
    );

    let audioBlob;
    let mimeType;
    let usageMetadata;

    if (hasMultipleSpeakers) {
      const speakerAName = speakerANameRaw || 'Speaker A';
      const speakerBName = speakerBNameRaw || 'Speaker B';

      const multiSpeakerScript = keyedSegments
        .map((seg) => {
          const isSpeakerB = seg.speakerKey === 'speaker_b';
          const placeholder = isSpeakerB ? 'speaker_b' : 'speaker_a';
          const spokenName = isSpeakerB ? speakerBName : speakerAName;
          return `<speaker name="${placeholder}">${spokenName}: ${seg.text}</speaker>`;
        })
        .join('\n');

      const result = await geminiClient.generateMultiSpeaker({
        prompt: multiSpeakerScript,
        speakerConfigs: [
          {
            speaker: 'speaker_a',
            voiceName: speakerConfig.speakerA.voice
          },
          {
            speaker: 'speaker_b',
            voiceName: speakerConfig.speakerB.voice
          }
        ]
      });
      audioBlob = result.blob;
      mimeType = result.mimeType;
      usageMetadata = result.usage;
    } else {
      const voiceName = speakerConfig.speakerA.voice || 'Kore';
      const result = await geminiClient.generateSingleSpeaker({
        text: script,
        voiceName,
        generationConfig: {
          temperature: appState.settings.temperature
        }
      });
      audioBlob = result.blob;
      mimeType = result.mimeType;
      usageMetadata = result.usage;
    }

    return {
      blob: audioBlob,
      mimeType,
      script,
      timestamp: new Date().toISOString(),
      speakers: normalizeSpeakersRecord(speakerConfig),
      modelName: appState.settings.selectedModel,
      usage: usageMetadata
    };
  }

  async function generateSectionWithRetries(sectionText, speakerConfig, sectionNumber, totalSections, maxRetries = MAX_SECTION_RETRIES) {
    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      const attemptLabel = `${sectionNumber}/${totalSections} (試行${attempt + 1})`;
      try {
        setProgressStatusText(`セクション ${attemptLabel} を生成中...`);
        const result = await generateAudioFromScript(sectionText, speakerConfig);
        const duration = await getAudioDuration(result.blob);
        const costInfo = calculateCostDetails(result.usage, result.script, duration, result.modelName);
        return createSectionRecord(result, duration, costInfo);
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt > maxRetries) {
          break;
        }
        const waitMs = RETRY_DELAY_BASE_MS * attempt;
        const waitSeconds = (waitMs / 1000).toFixed(1);
        console.warn(`セクション ${sectionNumber}/${totalSections} の生成に失敗。${waitSeconds}s 後に再試行 (${attempt}/${maxRetries + 1})`, error);
        setProgressStatusText(`セクション ${sectionNumber}/${totalSections} の生成に失敗。${waitSeconds}秒後に再試行 (${attempt}/${maxRetries + 1})`, { isError: true });
        await delay(waitMs);
      }
    }

    const errorMessage = lastError instanceof Error ? lastError.message : '不明なエラー';
    throw new Error(`セクション ${sectionNumber}/${totalSections} の生成に失敗しました (${maxRetries + 1}回試行)。${errorMessage}`);
  }

  async function displayGeneratedSections(sectionRecords, fullScript) {
    if (!Array.isArray(sectionRecords) || sectionRecords.length === 0) {
      alert('生成結果がありませんでした。');
      return;
    }

    appState.generatedSections = sectionRecords;
    appState.currentSectionIndex = 0;

    showSectionPreview(sectionRecords[0], 1, sectionRecords.length);

    const historyRecord = createHistoryRunRecord(
      sectionRecords,
      fullScript,
      appState.settings.selectedModel
    );
    appState.activeHistoryId = historyRecord.id;
    addHistoryEntry(appState.history, historyRecord);
    renderHistoryTable(appState.history, getSectionsFromRecord);
    showGenerationCompleteMessage();
  }

  async function handleGenerateAudio() {
    console.log('音声生成を開始します...');

    try {
      const validationError = validateGenerationInputs();
      if (validationError) {
        alert(validationError);
        return;
      }

      const speakerConfig = getSpeakerConfiguration();
      const script = appState.currentScript;

      const sectionsToGenerate = splitScriptIntoSections(script);
      if (sectionsToGenerate.length === 0) {
        alert('生成対象の原稿が見つかりません。');
        return;
      }

      setGeneratingState(true);
      updateProgressIndicator(0);
      setProgressStatusText(`セクション 1/${sectionsToGenerate.length} の準備を開始します...`);

      const generatedSections = [];

      for (let index = 0; index < sectionsToGenerate.length; index += 1) {
        const sectionText = sectionsToGenerate[index];
        const sectionRecord = await generateSectionWithRetries(
          sectionText,
          speakerConfig,
          index + 1,
          sectionsToGenerate.length
        );
        generatedSections.push(sectionRecord);

        const progressPercent = Math.round(((index + 1) / sectionsToGenerate.length) * 100);
        updateProgressIndicator(progressPercent);
        setProgressStatusText(`セクション ${index + 1}/${sectionsToGenerate.length} の生成が完了しました (${progressPercent}%)`);
      }

      await displayGeneratedSections(generatedSections, script);
      setProgressStatusText('全セクションの生成が完了しました。');
    } catch (error) {
      console.error('音声生成エラー:', error);
      setProgressStatusText('音声生成でエラーが発生しました。', { isError: true });
      alert(`音声生成に失敗しました: ${error.message}`);
    } finally {
      setGeneratingState(false);
    }
  }

  async function handlePreviewVoice(speaker) {
    if (!appState.apiKey) {
      alert('APIキーが設定されていません。設定メニューからAPIキーを入力してください。');
      return;
    }

    const voiceSelectId = `speaker-${speaker}-voice`;
    const voiceSelect = document.getElementById(voiceSelectId);

    if (!voiceSelect) {
      console.error(`Voice select element not found: ${voiceSelectId}`);
      return;
    }

    const selectedVoice = voiceSelect.value;
    const previewButton = document.querySelector(`[data-testid="preview-voice-${speaker}"]`);
    const originalButtonText = previewButton ? previewButton.textContent : '▶ 試聴';

    if (previewButton) {
      previewButton.disabled = true;
      previewButton.textContent = '生成中...';
    }

    try {
      const result = await geminiClient.generateSingleSpeaker({
        text: VOICE_PREVIEW_TEXT,
        voiceName: selectedVoice,
        languageCode: 'ja-JP'
      });

      const audioBlob = result.blob;
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
      });

      await audio.play();
    } catch (error) {
      console.error('音声プリセット試聴エラー:', error);
      alert(`試聴音声の生成に失敗しました: ${error.message}`);
    } finally {
      if (previewButton) {
        previewButton.disabled = false;
        previewButton.textContent = originalButtonText;
      }
    }
  }

  return {
    handleGenerateAudio,
    handlePreviewVoice,
    setGeneratingState,
    generateAudioFromScript,
    updateModelCostDisplay
  };
}
