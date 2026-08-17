/**
 * Browser Web Speech API wrapper — input/output modality only.
 * The AI brain remains /api/coach (Gemini). Not a third-party chatbot.
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
  onResult: (transcript: string) => void;
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
  rec.interimResults = false;
  rec.continuous = false;
  let stopped = false;

  rec.onresult = (ev) => {
    let text = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const row = ev.results[i];
      if (row?.isFinal) text += row[0]?.transcript || '';
    }
    const transcript = text.trim();
    if (transcript) handlers.onResult(transcript);
  };
  rec.onerror = (ev) => {
    if (ev.error === 'no-speech') handlers.onError('Ovoz eshitilmadi. Yana urinib ko‘ring.');
    else if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
      handlers.onError('Mikrofon ruxsati berilmadi. Brauzer sozlamasidan ruxsat bering.');
    } else if (ev.error !== 'aborted') {
      handlers.onError('Ovozni tushunib bo‘lmadi.');
    }
  };
  rec.onend = () => {
    if (!stopped) handlers.onEnd();
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
      handlers.onEnd();
    },
  };
}

export function speak(text: string): void {
  if (!isSpeechSynthesisSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.slice(0, 600));
  utter.lang = 'uz-UZ';
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis?.cancel();
}
