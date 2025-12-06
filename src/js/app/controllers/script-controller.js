import { SAMPLE_SCRIPT } from '../config/constants.js';
import { elements } from '../ui/dom-elements.js';

export function createScriptController({ appState, openConfirmDialog }) {
  function updateCharCount() {
    const text = elements.scriptTextarea.value;
    appState.currentScript = text;
    if (elements.charCount) {
      elements.charCount.textContent = text.length.toLocaleString();
    }
  }

  function applyImportedText(text) {
    elements.scriptTextarea.value = text;
    updateCharCount();
    elements.scriptTextarea.focus();
    console.log('TXT ファイルを読み込みました');
  }

  function handleImportTxt() {
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

        const existing = elements.scriptTextarea.value.trim();
        if (existing.length > 0) {
          openConfirmDialog(
            `現在の原稿を "${file.name}" の内容で置き換えます。よろしいですか？`,
            () => applyImportedText(text),
            { confirmText: '読み込む', variant: 'primary' }
          );
        } else {
          applyImportedText(text);
        }
      };

      reader.onerror = () => {
        alert('ファイルの読み込み中にエラーが発生しました。');
      };

      reader.readAsText(file, 'UTF-8');
    });

    fileInput.click();
  }

  function applySampleScript() {
    elements.scriptTextarea.value = SAMPLE_SCRIPT;
    updateCharCount();
    elements.scriptTextarea.focus();
  }

  function handleSampleScriptRequest() {
    const existing = elements.scriptTextarea.value.trim();
    if (existing.length > 0 && existing !== SAMPLE_SCRIPT.trim()) {
      openConfirmDialog(
        '現在の原稿をサンプルスクリプトで置き換えます。よろしいですか？',
        applySampleScript,
        { confirmText: '読み込む', variant: 'primary' }
      );
      return;
    }
    applySampleScript();
  }

  return {
    updateCharCount,
    handleImportTxt,
    handleSampleScriptRequest
  };
}
