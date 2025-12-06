export function formatSpeakerInfo(info) {
  if (!info) return '--';
  return `${info.name || '(未設定)'} / Voice: ${info.voice || '--'} / Style: ${info.style || '--'}`;
}
