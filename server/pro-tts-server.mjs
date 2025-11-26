import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const PORT = process.env.PORT || 8787;
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, message: 'Pro TTS mini server is running.' });
});

app.post('/api/pro-tts', async (req, res) => {
  const { apiKey, script, speakerConfig, generationConfig = {}, model = 'gemini-2.5-pro-tts' } = req.body || {};

  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'apiKey が必要です。' });
  }
  if (!script || typeof script !== 'string') {
    return res.status(400).json({ success: false, error: 'script が必要です。' });
  }
  if (!speakerConfig) {
    return res.status(400).json({ success: false, error: 'speakerConfig が必要です。' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelClient = genAI.getGenerativeModel({ model });

    const segments = parseSpeakerSegments(script);
    const keyedSegments = assignSpeakerKeysToSegments(segments, speakerConfig);
    const hasSpeakerA = keyedSegments.some((segment) => segment.speakerKey === 'speaker_a');
    const hasSpeakerB = keyedSegments.some((segment) => segment.speakerKey === 'speaker_b');
    const hasMultipleSpeakers = hasSpeakerA && hasSpeakerB;

    const request = {
      contents: [{ role: 'user', parts: [{ text: '' }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        ...(generationConfig || {})
      }
    };

    if (hasMultipleSpeakers) {
      const speakerAName = speakerConfig.speakerA?.name || 'Speaker A';
      const speakerBName = speakerConfig.speakerB?.name || 'Speaker B';
      const multiSpeakerScript = keyedSegments
        .map((segment) => {
          const placeholder = segment.speakerKey === 'speaker_b' ? 'speaker_b' : 'speaker_a';
          const spokenName = segment.speakerKey === 'speaker_b' ? speakerBName : speakerAName;
          return `<speaker name="${placeholder}">${spokenName}: ${segment.text}</speaker>`;
        })
        .join('\n');

      request.contents[0].parts[0].text = multiSpeakerScript;
      request.generationConfig = {
        ...request.generationConfig,
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'speaker_a',
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: speakerConfig.speakerA?.voice || 'Kore'
                  }
                }
              },
              {
                speaker: 'speaker_b',
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: speakerConfig.speakerB?.voice || 'Puck'
                  }
                }
              }
            ]
          }
        }
      };
    } else {
      const text = script.trim();
      request.contents[0].parts[0].text = text;
      request.generationConfig = {
        ...request.generationConfig,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: speakerConfig.speakerA?.voice || 'Kore'
            }
          }
        }
      };
    }

    const result = await modelClient.generateContent(request);
    const audioPayload = extractAudioPayload(result.response);

    return res.json({
      success: true,
      audioBase64: audioPayload.audioBase64,
      mimeType: audioPayload.mimeType,
      usage: result.response?.usageMetadata ?? null,
      modelName: model
    });
  } catch (error) {
    console.error('Pro TTS server error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Pro TTS の呼び出しに失敗しました。'
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Pro TTS mini server is running on http://localhost:${PORT}`);
});

function parseSpeakerSegments(script) {
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

function normalizeSpeakerLabel(label) {
  if (!label) return '';
  return label.trim().replace(/[\s\u3000]+/g, ' ').toLowerCase();
}

function assignSpeakerKeysToSegments(segments, speakerConfig) {
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

function extractAudioPayload(response) {
  const candidates = response?.candidates || [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'audio/wav';
        let buffer = Buffer.from(part.inlineData.data, 'base64');
        let normalizedMimeType = mimeType;
        if (mimeType.toLowerCase().includes('audio/l16')) {
          const sampleRateMatch = mimeType.match(/rate=(\d+)/i);
          const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
          buffer = convertPcm16ToWav(buffer, sampleRate);
          normalizedMimeType = 'audio/wav';
        }
        return {
          audioBase64: buffer.toString('base64'),
          mimeType: normalizedMimeType
        };
      }
    }
  }
  throw new Error('レスポンスに音声データが含まれていません。');
}

function convertPcm16ToWav(pcmBuffer, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}
