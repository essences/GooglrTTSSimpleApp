export function parseSpeakerSegments(script) {
  const lines = script.split(/\r?\n/);
  const segments = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const match = trimmed.match(/^(?:\[[^\]]+\]\s*)*([^\s:：]+)\s*[:：]\s*(.+)$/);
    if (match) {
      segments.push({
        speaker: match[1],
        text: match[2]
      });
    }
  });

  return segments;
}

export function normalizeSpeakersRecord(rawSpeakers) {
  const normalizeEntry = (entry) => {
    if (!entry) return null;
    return {
      name: entry.name || '',
      voice: entry.voice || entry.voicePreset || '',
      style: entry.style || entry.styleMemo || ''
    };
  };

  const speakerA = rawSpeakers?.a || rawSpeakers?.speakerA || null;
  const speakerB = rawSpeakers?.b || rawSpeakers?.speakerB || null;

  return {
    a: normalizeEntry(speakerA),
    b: normalizeEntry(speakerB)
  };
}

export function normalizeSpeakerLabel(label) {
  if (!label) return '';
  return label.trim().replace(/[\s\u3000]+/g, ' ').toLowerCase();
}

export function assignSpeakerKeysToSegments(segments, speakerConfig) {
  const normalizedA = normalizeSpeakerLabel(speakerConfig?.speakerA?.name);
  const normalizedB = normalizeSpeakerLabel(speakerConfig?.speakerB?.name);

  return segments.map((segment) => {
    const normalizedSegmentName = normalizeSpeakerLabel(segment.speaker);
    let speakerKey = null;

    if (normalizedA && normalizedSegmentName === normalizedA) {
      speakerKey = 'speaker_a';
    } else if (normalizedB && normalizedSegmentName === normalizedB) {
      speakerKey = 'speaker_b';
    }

    return {
      ...segment,
      speakerKey
    };
  });
}

export function splitScriptIntoSections(script, maxChars = 800) {
  const normalized = script.replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const manualSections = normalized
    .split(/\n-{3,}\n/g)
    .map((section) => section.trim())
    .filter(Boolean);
  if (manualSections.length > 1) {
    return manualSections;
  }

  const blankLineSections = normalized
    .split(/\n\s*\n+/g)
    .map((section) => section.trim())
    .filter(Boolean);
  if (blankLineSections.length > 1) {
    return blankLineSections;
  }

  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const sections = [];
  let remaining = normalized;

  while (remaining.length > maxChars) {
    const splitIndex = findSectionBreakPoint(remaining, maxChars);
    sections.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining) {
    sections.push(remaining.trim());
  }

  return sections;
}

export function findSectionBreakPoint(text, maxChars) {
  const breakCandidates = [
    text.lastIndexOf('\n', maxChars),
    text.lastIndexOf('。', maxChars),
    text.lastIndexOf('？', maxChars),
    text.lastIndexOf('！', maxChars),
    text.lastIndexOf('.', maxChars),
    text.lastIndexOf('?', maxChars),
    text.lastIndexOf('!', maxChars)
  ].filter((index) => index >= Math.floor(maxChars * 0.4));

  if (breakCandidates.length > 0) {
    return Math.max(...breakCandidates) + 1;
  }

  return maxChars;
}
