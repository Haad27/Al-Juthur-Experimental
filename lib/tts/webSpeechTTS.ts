/**
 * lib/tts/webSpeechTTS.ts
 *
 * Thin wrapper around the browser's SpeechSynthesis API.
 * Supports:
 *  - Queuing multi-language segments (voice switching between Arabic / Urdu / English)
 *  - Pause / Resume / Stop controls
 *  - Per-language voice selection
 *  - Progress callbacks (currentSegmentIndex)
 */

import type { TtsSegment } from "./tafsirTextExtractor";
import type { TtsLang } from "./langUtils";
import { LANG_BCP47 } from "./langUtils";

// Guard: server-side rendering has no speech synthesis
function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

// ── Voice loading ────────────────────────────────────────────────────────────

let _voicesReady = false;
let _voiceReadyCallbacks: Array<() => void> = [];

function ensureVoicesLoaded(cb: () => void) {
  const synth = getSynth();
  if (!synth) return;

  if (_voicesReady || synth.getVoices().length > 0) {
    _voicesReady = true;
    cb();
    return;
  }

  _voiceReadyCallbacks.push(cb);
  synth.addEventListener(
    "voiceschanged",
    () => {
      _voicesReady = true;
      _voiceReadyCallbacks.forEach((fn) => fn());
      _voiceReadyCallbacks = [];
    },
    { once: true }
  );
}

/** Return all voices available in the user's browser */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  const synth = getSynth();
  if (!synth) return [];
  return synth.getVoices();
}

/**
 * Return voices filtered by BCP-47 language prefix.
 * e.g. getLangVoices("ur") → all voices whose lang starts with "ur"
 */
export function getLangVoices(lang: TtsLang): SpeechSynthesisVoice[] {
  const prefix = LANG_BCP47[lang].toLowerCase();
  return getAvailableVoices().filter((v) =>
    v.lang.toLowerCase().startsWith(prefix)
  );
}

/**
 * Pick the best voice for a given language from the available browser voices.
 * Prefers local voices over remote/online ones.
 */
export function pickBestVoice(
  lang: TtsLang,
  preferredName?: string
): SpeechSynthesisVoice | null {
  const voices = getLangVoices(lang);
  if (voices.length === 0) return null;

  // 1. Try exact preferred name
  if (preferredName) {
    const match = voices.find((v) => v.name === preferredName);
    if (match) return match;
  }

  // 2. Prefer local (not online) voices
  const local = voices.filter((v) => v.localService);
  if (local.length > 0) return local[0];

  return voices[0];
}

// ── Playback engine ──────────────────────────────────────────────────────────

export type TtsStatus = "idle" | "playing" | "paused" | "ended";

export interface TtsPlaybackOptions {
  segments: TtsSegment[];
  voicePrefs: Partial<Record<TtsLang, string>>; // lang → voice.name
  rate?: number; // default 1
  onSegmentStart?: (index: number) => void;
  onStatusChange?: (status: TtsStatus) => void;
  onEnd?: () => void;
}

let _currentUtterances: SpeechSynthesisUtterance[] = [];
let _currentSegmentIndex = -1;
let _opts: TtsPlaybackOptions | null = null;
let _status: TtsStatus = "idle";
let _keepAliveTimer: any = null;

function startKeepAlive() {
  stopKeepAlive();
  _keepAliveTimer = setInterval(() => {
    const synth = getSynth();
    if (synth && synth.speaking && !synth.paused) {
      synth.pause();
      synth.resume();
    }
  }, 10000);
}

function stopKeepAlive() {
  if (_keepAliveTimer) {
    clearInterval(_keepAliveTimer);
    _keepAliveTimer = null;
  }
}

function setStatus(s: TtsStatus) {
  _status = s;
  _opts?.onStatusChange?.(s);
}

/** Cancel any ongoing speech and reset internal state. */
export function ttsStop() {
  stopKeepAlive();
  const synth = getSynth();
  if (synth) {
    synth.cancel();
  }
  _currentUtterances = [];
  _currentSegmentIndex = -1;
  _opts = null;
  setStatus("idle");
}

/** Pause ongoing speech. */
export function ttsPause() {
  const synth = getSynth();
  if (!synth || _status !== "playing") return;
  synth.pause();
  setStatus("paused");
}

/** Resume paused speech. */
export function ttsResume() {
  const synth = getSynth();
  if (!synth || _status !== "paused") return;
  synth.resume();
  setStatus("playing");
}

export function ttsGetStatus(): TtsStatus {
  return _status;
}

/**
 * Start playing an array of TtsSegments with voice-switching.
 * Cancels any existing playback first.
 */
export function ttsPlay(options: TtsPlaybackOptions) {
  const synth = getSynth();
  if (!synth) return;

  // Stop existing playback
  ttsStop();
  _opts = options;

  ensureVoicesLoaded(() => {
    _speakSegments(options);
  });
}

function _speakSegments(options: TtsPlaybackOptions) {
  const synth = getSynth();
  if (!synth) return;

  const { segments, voicePrefs, rate = 1, onSegmentStart, onEnd } = options;

  if (segments.length === 0) {
    stopKeepAlive();
    setStatus("ended");
    onEnd?.();
    return;
  }

  setStatus("playing");
  startKeepAlive();

  // Chain utterances: when utterance N ends, utter N+1
  const speakAt = (idx: number) => {
    if (idx >= segments.length) {
      stopKeepAlive();
      _currentSegmentIndex = -1;
      setStatus("ended");
      onEnd?.();
      return;
    }

    const seg = segments[idx];
    const utt = new SpeechSynthesisUtterance(seg.text);

    // Voice selection
    const preferredName = voicePrefs[seg.lang];
    const voice = pickBestVoice(seg.lang, preferredName);
    if (voice) {
      utt.voice = voice;
      utt.lang = voice.lang;
    } else {
      // Fallback: set BCP-47 tag so the browser tries to find any matching voice
      utt.lang = LANG_BCP47[seg.lang];
    }

    utt.rate = rate;

    utt.onstart = () => {
      _currentSegmentIndex = idx;
      onSegmentStart?.(idx);
    };

    utt.onend = () => {
      speakAt(idx + 1);
    };

    utt.onerror = (e) => {
      // Silently skip errored utterances (e.g. empty string)
      if (e.error !== "interrupted") {
        speakAt(idx + 1);
      }
    };

    _currentUtterances.push(utt);
    synth.speak(utt);
  };

  speakAt(0);
}
