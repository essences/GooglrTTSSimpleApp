"""Mini server that proxies requests to Google Cloud Text-to-Speech Gemini Pro.
"""
from __future__ import annotations

import base64
import logging
import os
from typing import Any, Dict

from flask import Flask, jsonify, request
from google.cloud import texttospeech

PORT = int(os.environ.get("PRO_TTS_SERVER_PORT", "8788"))
DEFAULT_MODEL = "gemini-2.5-pro-tts"
DEFAULT_LANGUAGE = "ja-JP"
DEFAULT_AUDIO_ENCODING = texttospeech.AudioEncoding.MP3

app = Flask(__name__)
_client: texttospeech.TextToSpeechClient | None = None


def get_tts_client() -> texttospeech.TextToSpeechClient:
    global _client
    if _client is None:
        _client = texttospeech.TextToSpeechClient()
    return _client


def build_prompt_from_speakers(speaker_config: Dict[str, Any]) -> str:
    speaker_a = speaker_config.get("speakerA", {})
    speaker_b = speaker_config.get("speakerB", {})
    memo_a = speaker_a.get("style") or speaker_a.get("styleMemo")
    memo_b = speaker_b.get("style") or speaker_b.get("styleMemo")
    parts = []
    if memo_a:
        parts.append(f"Speaker A should sound like: {memo_a}")
    if memo_b:
        parts.append(f"Speaker B should sound like: {memo_b}")
    return " \n".join(parts) or "Please produce natural narration."


@app.get("/health")
def health() -> Any:
    return jsonify({"ok": True, "message": "Gemini Pro TTS server ready"})


@app.post("/api/pro-tts")
def handle_pro_tts() -> Any:
    payload = request.get_json(silent=True) or {}
    text = (payload.get("script") or "").strip()
    if not text:
        return jsonify({"success": False, "error": "script が空です"}), 400

    speaker_config = payload.get("speakerConfig") or {}
    prompt_text = (payload.get("prompt") or "").strip()
    if not prompt_text:
        prompt_text = build_prompt_from_speakers(speaker_config)

    language_code = payload.get("languageCode") or DEFAULT_LANGUAGE
    model_name = payload.get("model") or DEFAULT_MODEL
    audio_encoding_value = payload.get("audioEncoding")
    audio_encoding = DEFAULT_AUDIO_ENCODING
    if audio_encoding_value:
        try:
            audio_encoding = texttospeech.AudioEncoding[audio_encoding_value]
        except KeyError:
            pass

    voice_name = speaker_config.get("speakerA", {}).get("voice") or "Charon"

    try:
        client = get_tts_client()
        synthesis_input = texttospeech.SynthesisInput(text=text, prompt=prompt_text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
            model_name=model_name,
        )
        audio_config = texttospeech.AudioConfig(audio_encoding=audio_encoding)
        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
    except Exception as exc:
        logging.exception("Pro TTS synthesis failed")
        return jsonify({"success": False, "error": str(exc)}), 500

    audio_b64 = base64.b64encode(response.audio_content).decode("utf-8")
    return jsonify({
        "success": True,
        "audioBase64": audio_b64,
        "mimeType": _encoding_to_mime(audio_encoding),
        "modelName": model_name,
        "usage": None,
    })


def _encoding_to_mime(encoding: texttospeech.AudioEncoding) -> str:
    if encoding == texttospeech.AudioEncoding.MP3:
        return "audio/mpeg"
    if encoding == texttospeech.AudioEncoding.LINEAR16:
        return "audio/wav"
    return "audio/octet-stream"


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logging.info("Starting Gemini Pro TTS Python server on port %d", PORT)
    app.run(host="0.0.0.0", port=PORT)
