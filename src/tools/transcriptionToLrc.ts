// Transcription JSON interfaces

export interface Transcription {
  segments: Segment[];
}

export interface Segment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words?: Word[];
}

export interface Word {
  start: number;
  end: number;
  word: string;
  probability: number;
}

// A2 LRC mapper

function formatTimestamp(seconds: number): string {
  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const ss = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  const xx = Math.floor((seconds % 1) * 100)
    .toString()
    .padStart(2, "0");

  return `${mm}:${ss}.${xx}`;
}

/**
 * Maps a transcription JSON object to an A2 LRC formatted string.
 *
 * Rules:
 * - Uses word-level timestamps
 * - Preserves original timing exactly
 * - Emits one LRC line per segment
 * - Skips segments without word timing data
 */
export function transcriptionToA2LRC(transcription: Transcription): string {
  const lines: string[] = [];

  for (const segment of transcription.segments) {
    if (!segment.words || segment.words.length === 0) continue;

    const firstWord = segment.words[0];
    const lineTimestamp = formatTimestamp(firstWord.start);

    const wordEntries = segment.words.map((w) => {
      const ts = formatTimestamp(w.start);
      const text = w.word.trim();
      return `<${ts}>${text}`;
    });

    lines.push(`[${lineTimestamp}]${wordEntries.join(" ")}`);
  }

  return lines.join("\n");
}
