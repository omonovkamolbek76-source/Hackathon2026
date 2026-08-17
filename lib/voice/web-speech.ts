/**
 * Browser Web Speech API wrapper — input/output modality only.
 * The AI brain remains /api/coach (Gemini). Not a third-party chatbot.
 *
 * Recording is push-to-talk until the user STOPS the mic. Transcript is
 * accumulated and handed to the caller; this module never sends a message.
 */

type RecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function recognitionCtor(): (new () => RecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionInstance;
    webkitSpeechRecognition?: new () => RecognitionInstance;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(recognitionCtor());
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';
}

export function startListening(handlers: {
  onTranscript: (fullText: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): { stop: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError('Brauzeringiz ovozli kiritishni qo‘llab-quvvatlamaydi (Chrome tavsiya etiladi).');
    handlers.onEnd();
    return { stop() {} };
  }

  const rec = new Ctor();
  rec.lang = 'uz-UZ';
  rec.interimResults = true;
  rec.continuous = true;
  let stopped = false;
  const finals: string[] = [];

  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const row = ev.results[i];
      const piece = (row[0]?.transcript || '').trim();
      if (!piece) continue;
      if (row.isFinal) finals.push(piece);
      else interim += (interim ? ' ' : '') + piece;
    }
    const full = [...finals, interim].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (full) handlers.onTranscript(full);
  };
  rec.onerror = (ev) => {
    if (ev.error === 'no-speech') return; // silence while still holding the mic — keep listening
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
      handlers.onError('Mikrofon ruxsati berilmadi. Brauzer sozlamasidan ruxsat bering.');
    } else if (ev.error !== 'aborted') {
      handlers.onError('Ovozni tushunib bo‘lmadi. Yana urinib ko‘ring.');
    }
  };
  rec.onend = () => {
    if (stopped) {
      handlers.onEnd();
      return;
    }
    // Chrome ends the session after a pause; restart until the user taps stop.
    try {
      rec.start();
    } catch {
      handlers.onEnd();
    }
  };

  try {
    rec.start();
  } catch {
    handlers.onError('Mikrofonni ishga tushirib bo‘lmadi.');
    handlers.onEnd();
  }

  return {
    stop() {
      stopped = true;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}

export function speak(text: string): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.slice(0, 2000));
  utter.lang = 'uz-UZ';
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis?.cancel();
}
