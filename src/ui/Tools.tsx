import { useRef } from 'react';
import { transcriptionToA2LRC, Transcription } from '../tools/transcriptionToLrc';

export function Tools() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTransformClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const transcription: Transcription = JSON.parse(text);
      
      // Validate structure
      if (!transcription.segments || !Array.isArray(transcription.segments)) {
        throw new Error('Invalid transcription format: missing segments array');
      }

      const lrcContent = transcriptionToA2LRC(transcription);
      
      if (!lrcContent) {
        alert('No word-level timing data found in the transcription. Make sure the JSON contains segments with word timestamps.');
        return;
      }

      // Download the LRC file
      const blob = new Blob([lrcContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace(/\.json$/i, '') + '.lrc';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error processing transcription:', err);
      alert('Failed to process transcription file. Please ensure it is a valid JSON file with the expected format.');
    }

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="tools-section">
      <h2>Tools</h2>
      <div className="tool-item">
        <button className="tool-button" onClick={handleTransformClick}>
          Transform Transcription to LRC
        </button>
        <span className="tool-hint">Convert JSON transcription to A2 LRC format</span>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
