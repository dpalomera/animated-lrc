import { Line, LyricsTimeline, Syllable } from '../timeline/types';

// Parse timestamp in format [mm:ss.xx] or <mm:ss.xx>
function parseTimestamp(ts: string): number {
  const match = ts.match(/(\d+):(\d+)\.(\d+)/);
  if (!match) return 0;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const centiseconds = parseInt(match[3].padEnd(2, '0').slice(0, 2), 10);
  return minutes * 60 + seconds + centiseconds / 100;
}

// Parse A2 LRC format with syllable-level timing
// Format: [00:12.00]He<00:12.10>llo<00:12.30> world
export function parseA2LRC(lrcText: string): LyricsTimeline {
  const lines: Line[] = [];
  const rawLines = lrcText.split('\n').filter(line => line.trim());

  for (const rawLine of rawLines) {
    // Skip metadata lines like [ti:Title]
    if (/^\[[a-z]+:/.test(rawLine)) continue;

    // Match line start timestamp [mm:ss.xx]
    const lineMatch = rawLine.match(/^\[(\d+:\d+\.\d+)\](.*)$/);
    if (!lineMatch) continue;

    const lineStart = parseTimestamp(lineMatch[1]);
    const content = lineMatch[2];

    // Parse syllables with inline timestamps
    const syllables: Syllable[] = [];
    let currentPos = 0;
    let currentTime = lineStart;

    // Split by inline timestamps <mm:ss.xx>
    const parts = content.split(/(<\d+:\d+\.\d+>)/);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      // Check if this is a timestamp
      const tsMatch = part.match(/^<(\d+:\d+\.\d+)>$/);
      if (tsMatch) {
        currentTime = parseTimestamp(tsMatch[1]);
      } else if (part.trim() || part === ' ') {
        // This is text content
        const syllableStart = currentTime;
        
        // Look ahead for next timestamp to determine end time
        let syllableEnd = syllableStart + 0.5; // Default duration
        for (let j = i + 1; j < parts.length; j++) {
          const nextTsMatch = parts[j].match(/^<(\d+:\d+\.\d+)>$/);
          if (nextTsMatch) {
            syllableEnd = parseTimestamp(nextTsMatch[1]);
            break;
          }
        }

        if (part) {
          syllables.push({
            text: part,
            start: syllableStart,
            end: syllableEnd,
          });
          currentPos += part.length;
        }
      }
    }

    // If no syllables were parsed (simple LRC), treat whole line as one syllable
    if (syllables.length === 0 && content.trim()) {
      syllables.push({
        text: content,
        start: lineStart,
        end: lineStart + 3, // Default 3 second duration
      });
    }

    if (syllables.length > 0) {
      const lineEnd = syllables[syllables.length - 1].end;
      const fullText = syllables.map(s => s.text).join('');

      lines.push({
        text: fullText,
        start: lineStart,
        end: lineEnd,
        centerTime: lineStart, // Line centers when it starts
        syllables,
      });
    }
  }

  // Sort lines by start time
  lines.sort((a, b) => a.start - b.start);

  // Calculate duration
  const duration = lines.length > 0 
    ? Math.max(...lines.map(l => l.end)) + 2 
    : 0;

  return { lines, duration };
}

// Generate sample LRC for testing
export function generateSampleLRC(): string {
  return `[ti:Sample Song]
[ar:Artist Name]
[00:00.00]
[00:02.00]Wel<00:02.30>come<00:02.60> to<00:02.80> the<00:03.00> show
[00:04.00]Let's<00:04.30> sing<00:04.60> a<00:04.80> song<00:05.20> to<00:05.40>night
[00:06.00]Feel<00:06.30> the<00:06.50> rhy<00:06.80>thm<00:07.10> in<00:07.30> your<00:07.60> heart
[00:08.00]Let<00:08.30> the<00:08.50> mu<00:08.80>sic<00:09.10> start
[00:10.00]
[00:12.00]Ev<00:12.30>ery<00:12.60> word<00:12.90> we<00:13.10> sing
[00:14.00]Ev<00:14.30>ery<00:14.60> note<00:14.90> we<00:15.10> bring
[00:16.00]Makes<00:16.30> the<00:16.50> world<00:16.80> a<00:17.00> bet<00:17.30>ter<00:17.60> place
[00:18.00]With<00:18.30> a<00:18.50> smile<00:18.80> on<00:19.00> your<00:19.30> face
[00:20.00]`;
}
