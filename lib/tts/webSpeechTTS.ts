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

/**
 * Preferred quality keywords for neural/natural/high-definition smooth voices.
 */
const SMOOTH_VOICE_KEYWORDS = [
  "natural",
  "neural",
  "online",
  "google",
  "siri",
  "premium",
  "enhanced",
  "deep",
  "studio",
  "calm",
];

function scoreVoiceQuality(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;

  // 1. Natural / Neural cloud voices sound dramatically more human and smooth
  if (name.includes("natural") || name.includes("neural")) score += 100;
  if (name.includes("online")) score += 50;
  if (name.includes("google")) score += 40;
  if (name.includes("premium") || name.includes("enhanced")) score += 30;

  // 2. Specific smooth voices for English
  if (
    name.includes("guy") ||
    name.includes("aria") ||
    name.includes("jenny") ||
    name.includes("ryan") ||
    name.includes("sonia") ||
    name.includes("george") ||
    name.includes("hazel") ||
    name.includes("susan")
  ) {
    score += 25;
  }

  // 3. Specific smooth voices for Arabic & Urdu
  if (
    name.includes("shakir") ||
    name.includes("salma") ||
    name.includes("hamed") ||
    name.includes("naayf") ||
    name.includes("tariq") ||
    name.includes("asad") ||
    name.includes("uzma") ||
    name.includes("gul")
  ) {
    score += 25;
  }

  // 4. Deprioritize old robotic legacy synthesizer desktop voices if natural ones exist
  if (name.includes("desktop") && !name.includes("natural")) {
    score -= 10;
  }

  return score;
}

/**
 * Return all voices available in the user's browser, sorted by naturalness and quality.
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  const synth = getSynth();
  if (!synth) return [];
  const voices = synth.getVoices();
  return [...voices].sort((a, b) => scoreVoiceQuality(b) - scoreVoiceQuality(a));
}

/**
 * Return voices filtered by BCP-47 language prefix, sorted so smooth/natural voices come first.
 * e.g. getLangVoices("ur") → all voices whose lang starts with "ur"
 */
export function getLangVoices(lang: TtsLang): SpeechSynthesisVoice[] {
  const prefix = LANG_BCP47[lang].toLowerCase();
  const voices = getAvailableVoices().filter((v) =>
    v.lang.toLowerCase().startsWith(prefix)
  );
  return voices.sort((a, b) => scoreVoiceQuality(b) - scoreVoiceQuality(a));
}

/**
 * Pick the best voice for a given language from the available browser voices.
 * Prioritizes natural/neural/smooth high-fidelity voices over robotic legacy synthesizers.
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

  // 2. Voices are already sorted by natural/neural quality score
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

    // Rate tuning: default to slightly calmer, more measured pacing (0.92x of standard rate)
    // which prevents rushed unnatural cadence when reading sacred Quranic tafsir text
    utt.rate = rate * 0.95;

    // Pitch: slightly warmer/calmer tone
    utt.pitch = 0.98;

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
