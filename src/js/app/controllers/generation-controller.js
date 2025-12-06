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

export class GenerationController {
  constructor({ appState, getSpeakerConfiguration }) {
    this.appState = appState;
    this.getSpeakerConfiguration = getSpeakerConfiguration;
    this.geminiClient = getGeminiClient();
    this.listeners = [];
  }

  addListener = (element, event, handler) => {
    if (!element) return;
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  };

  init = () => {
    this.addListener(elements.generateButton, 'click', this.handleGenerateAudio);

    const previewVoiceAButton = document.querySelector('[data-testid="preview-voice-a"]');
    const previewVoiceBButton = document.querySelector('[data-testid="preview-voice-b"]');
    this.addListener(previewVoiceAButton, 'click', () => this.handlePreviewVoice('a'));
    this.addListener(previewVoiceBButton, 'click', () => this.handlePreviewVoice('b'));
  };

  destroy = () => {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  };

  updateProgressIndicator = (percent) => {
    const fill = document.getElementById('progress-bar-fill');
    if (fill) {
      const clamped = Math.max(0, Math.min(100, percent || 0));
      fill.style.width = `${clamped}%`;
    }
  };

  setProgressStatusText = (text = '', { isError = false } = {}) => {
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
  };

  setGeneratingState = (isGenerating) => {
    if (elements.generateButton) {
      elements.generateButton.disabled = isGenerating;
      elements.generateButton.textContent = isGenerating ? '生成中...' : '音声を生成する';
    }

    const progressBar = document.querySelector('[data-testid="progress-bar"]');
    if (progressBar) {
      progressBar.style.display = isGenerating ? 'block' : 'none';
    }

    if (!isGenerating) {
      this.updateProgressIndicator(0);
    }

    if (elements.scriptTextarea) {
      elements.scriptTextarea.disabled = isGenerating;
    }
  };

  validateGenerationInputs = () => {
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
  };

  updateModelSafetyNotice = () => {
    const notice = document.getElementById('model-warning');
    if (!notice) return;

    const isPro = PRO_TTS_MODELS.has(this.appState.settings.selectedModel);
    notice.style.display = isPro ? 'block' : 'none';
  };

  updateModelCostDisplay = () => {
    const display = document.getElementById('model-cost-display');
    if (!display) return;

    const pricing = MODEL_PRICING[this.appState.settings.selectedModel];
    if (!pricing) {
      display.textContent = '料金情報がありません';
      return;
    }

    const inputUsd = pricing.inputUsdPerMillion;
    const outputUsd = pricing.outputUsdPerMillion;
    const inputJpy = Math.round(inputUsd * USD_TO_JPY).toLocaleString('ja-JP');
    const outputJpy = Math.round(outputUsd * USD_TO_JPY).toLocaleString('ja-JP');

    display.textContent = `入力: $${inputUsd.toFixed(2)} (約${inputJpy}円) /100万テキストトークン、出力: $${outputUsd.toFixed(2)} (約${outputJpy}円) /100万音声トークン`;

    this.updateModelSafetyNotice();
  };

  generateAudioViaServer = async (script, speakerConfig) => {
    if (!this.appState.apiKey) {
      throw new Error('APIキーが設定されていません。設定からキーを入力してください。');
    }

    this.setProgressStatusText('Gemini 2.5 Pro TTS を呼び出しています...');

    let response;
    try {
      response = await fetch(PRO_TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: this.appState.apiKey,
          script,
          speakerConfig,
          generationConfig: {
            temperature: this.appState.settings.temperature
          },
          model: this.appState.settings.selectedModel
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
      modelName: data.modelName || this.appState.settings.selectedModel,
      usage: data.usage || null
    };
  };

  generateAudioFromScript = async (script, speakerConfig) => {
    if (PRO_TTS_MODELS.has(this.appState.settings.selectedModel)) {
      return this.generateAudioViaServer(script, speakerConfig);
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

      const result = await this.geminiClient.generateMultiSpeaker({
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
      const result = await this.geminiClient.generateSingleSpeaker({
        text: script,
        voiceName,
        generationConfig: {
          temperature: this.appState.settings.temperature
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
      modelName: this.appState.settings.selectedModel,
      usage: usageMetadata
    };
  };

  generateSectionWithRetries = async (
    sectionText,
    speakerConfig,
    sectionNumber,
    totalSections,
    maxRetries = MAX_SECTION_RETRIES
  ) => {
    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
      const attemptLabel = `${sectionNumber}/${totalSections} (試行${attempt + 1})`;
      try {
        this.setProgressStatusText(`セクション ${attemptLabel} を生成中...`);
        const result = await this.generateAudioFromScript(sectionText, speakerConfig);
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
        console.warn(
          `セクション ${sectionNumber}/${totalSections} の生成に失敗。${waitSeconds}s 後に再試行 (${attempt}/${maxRetries + 1})`,
          error
        );
        this.setProgressStatusText(
          `セクション ${sectionNumber}/${totalSections} の生成に失敗。${waitSeconds}秒後に再試行 (${attempt}/${maxRetries + 1})`,
          { isError: true }
        );
        await delay(waitMs);
      }
    }

    const errorMessage = lastError instanceof Error ? lastError.message : '不明なエラー';
    throw new Error(
      `セクション ${sectionNumber}/${totalSections} の生成に失敗しました (${maxRetries + 1}回試行)。${errorMessage}`
    );
  };

  displayGeneratedSections = async (sectionRecords, fullScript) => {
    if (!Array.isArray(sectionRecords) || sectionRecords.length === 0) {
      alert('生成結果がありませんでした。');
      return;
    }

    this.appState.generatedSections = sectionRecords;
    this.appState.currentSectionIndex = 0;

    showSectionPreview(sectionRecords[0], 1, sectionRecords.length);

    const historyRecord = createHistoryRunRecord(
      sectionRecords,
      fullScript,
      this.appState.settings.selectedModel
    );
    this.appState.activeHistoryId = historyRecord.id;
    addHistoryEntry(this.appState.history, historyRecord);
    renderHistoryTable(this.appState.history, getSectionsFromRecord);
    showGenerationCompleteMessage();
  };

  handleGenerateAudio = async () => {
    console.log('音声生成を開始します...');

    try {
      const validationError = this.validateGenerationInputs();
      if (validationError) {
        alert(validationError);
        return;
      }

      const speakerConfig = this.getSpeakerConfiguration();
      const script = this.appState.currentScript;

      const sectionsToGenerate = splitScriptIntoSections(script);
      if (sectionsToGenerate.length === 0) {
        alert('生成対象の原稿が見つかりません。');
        return;
      }

      this.setGeneratingState(true);
      this.updateProgressIndicator(0);
      this.setProgressStatusText(`セクション 1/${sectionsToGenerate.length} の準備を開始します...`);

      const generatedSections = [];

      for (let index = 0; index < sectionsToGenerate.length; index += 1) {
        const sectionText = sectionsToGenerate[index];
        const sectionRecord = await this.generateSectionWithRetries(
          sectionText,
          speakerConfig,
          index + 1,
          sectionsToGenerate.length
        );
        generatedSections.push(sectionRecord);

        const progressPercent = Math.round(((index + 1) / sectionsToGenerate.length) * 100);
        this.updateProgressIndicator(progressPercent);
        this.setProgressStatusText(
          `セクション ${index + 1}/${sectionsToGenerate.length} の生成が完了しました (${progressPercent}%)`
        );
      }

      await this.displayGeneratedSections(generatedSections, script);
      this.setProgressStatusText('全セクションの生成が完了しました。');
    } catch (error) {
      console.error('音声生成エラー:', error);
      this.setProgressStatusText('音声生成でエラーが発生しました。', { isError: true });
      alert(`音声生成に失敗しました: ${error.message}`);
    } finally {
      this.setGeneratingState(false);
    }
  };

  handlePreviewVoice = async (speaker) => {
    if (!this.appState.apiKey) {
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
      const result = await this.geminiClient.generateSingleSpeaker({
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
  };
}

export function createGenerationController(options) {
  return new GenerationController(options);
}
