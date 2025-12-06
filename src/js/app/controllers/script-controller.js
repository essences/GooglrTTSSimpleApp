import { SAMPLE_SCRIPT } from '../config/constants.js';
import { elements as defaultElements } from '../ui/dom-elements.js';

export class ScriptController {
  constructor({
    appState,
    openConfirmDialog,
    elementsRef = defaultElements,
    documentRef = typeof document !== 'undefined' ? document : null
  }) {
    this.appState = appState;
    this.openConfirmDialog = openConfirmDialog;
    this.listeners = [];
    this.elements = elementsRef;
    this.documentRef = documentRef;
  }

  addListener = (element, event, handler) => {
    if (!element) return;
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  };

  init = () => {
    this.addListener(this.elements.scriptTextarea, 'input', this.updateCharCount);
    this.addListener(this.elements.sampleScriptButton, 'click', this.handleSampleScriptRequest);

    const importTxtButton = this.documentRef.querySelector('[data-testid="import-txt-button"]');
    this.addListener(importTxtButton, 'click', this.handleImportTxt);
  };

  destroy = () => {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  };

  updateCharCount = () => {
    const text = this.elements.scriptTextarea.value;
    this.appState.currentScript = text;
    if (this.elements.charCount) {
      this.elements.charCount.textContent = text.length.toLocaleString();
    }
  };

  applyImportedText = (text) => {
    this.elements.scriptTextarea.value = text;
    this.updateCharCount();
    this.elements.scriptTextarea.focus();
    console.log('TXT ファイルを読み込みました');
  };

  handleImportTxt = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,text/plain';

    fileInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。');
        return;
      }

      if (!file.type.includes('text') && !file.name.endsWith('.txt')) {
        alert('テキストファイル (.txt) を選択してください。');
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          alert('ファイルの読み込みに失敗しました。');
          return;
        }

        const existing = this.elements.scriptTextarea.value.trim();
        if (existing.length > 0) {
          this.openConfirmDialog(
            `現在の原稿を "${file.name}" の内容で置き換えます。よろしいですか？`,
            () => this.applyImportedText(text),
            { confirmText: '読み込む', variant: 'primary' }
          );
        } else {
          this.applyImportedText(text);
        }
      };

      reader.onerror = () => {
        alert('ファイルの読み込み中にエラーが発生しました。');
      };

      reader.readAsText(file, 'UTF-8');
    });

    fileInput.click();
  };

  applySampleScript = () => {
    this.elements.scriptTextarea.value = SAMPLE_SCRIPT;
    this.updateCharCount();
    this.elements.scriptTextarea.focus();
  };

  handleSampleScriptRequest = () => {
    const existing = this.elements.scriptTextarea.value.trim();
    if (existing.length > 0 && existing !== SAMPLE_SCRIPT.trim()) {
      this.openConfirmDialog(
        '現在の原稿をサンプルスクリプトで置き換えます。よろしいですか？',
        this.applySampleScript,
        { confirmText: '読み込む', variant: 'primary' }
      );
      return;
    }
    this.applySampleScript();
  };
}

export function createScriptController(options) {
  return new ScriptController(options);
}
