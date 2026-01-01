// SRT to LRC converter

export interface SrtEntry {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

function parseSrtTimestamp(timestamp: string): number {
  // SRT format: HH:MM:SS,mmm (e.g., 00:01:23,456)
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const milliseconds = parseInt(match[4], 10);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function formatLrcTimestamp(seconds: number): string {
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

export function parseSrt(srtContent: string): SrtEntry[] {
  const entries: SrtEntry[] = [];
  
  // Normalize line endings and split into blocks
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\n+/).filter(block => block.trim());

  for (const block of blocks) {
    const lines = block.split('\n').filter(line => line.trim());
    if (lines.length < 3) continue;

    // First line is the index
    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    // Second line is the timestamp
    const timestampMatch = lines[1].match(
      /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timestampMatch) continue;

    const startTime = parseSrtTimestamp(timestampMatch[1]);
    const endTime = parseSrtTimestamp(timestampMatch[2]);

    // Remaining lines are the subtitle text
    const text = lines.slice(2).join(' ').trim();

    entries.push({ index, startTime, endTime, text });
  }

  return entries;
}

/**
 * Converts SRT subtitle content to LRC format.
 * Uses the start time of each subtitle entry as the LRC timestamp.
 */
export function srtToLrc(srtContent: string): string {
  const entries = parseSrt(srtContent);
  
  if (entries.length === 0) {
    return '';
  }

  const lines = entries.map(entry => {
    const timestamp = formatLrcTimestamp(entry.startTime);
    return `[${timestamp}]${entry.text}`;
  });

  return lines.join('\n');
}
