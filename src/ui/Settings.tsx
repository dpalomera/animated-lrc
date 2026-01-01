import { useAppStore } from '../state/store';

export function Settings() {
  const { settings, setSettings } = useAppStore();

  return (
    <div className="settings">
      <h3>⚙️ Settings</h3>
      
      <div className="settings-group">
        <label>
          Resolution:
          <select
            value={`${settings.width}x${settings.height}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              setSettings({ width: w, height: h });
            }}
          >
            <option value="1280x720">720p (1280×720)</option>
            <option value="1920x1080">1080p (1920×1080)</option>
            <option value="2560x1440">1440p (2560×1440)</option>
            <option value="3840x2160">4K (3840×2160)</option>
          </select>
        </label>
      </div>

      <div className="settings-group">
        <label>
          FPS:
          <select
            value={settings.fps}
            onChange={(e) => setSettings({ fps: parseInt(e.target.value) })}
          >
            <option value="24">24</option>
            <option value="30">30</option>
            <option value="60">60</option>
          </select>
        </label>
      </div>

      <div className="settings-group">
        <label>
          Font Size:
          <input
            type="range"
            min={24}
            max={96}
            value={settings.fontSize}
            onChange={(e) => setSettings({ fontSize: parseInt(e.target.value) })}
          />
          <span>{settings.fontSize}px</span>
        </label>
      </div>

      <div className="settings-group">
        <label>
          Line Height:
          <input
            type="range"
            min={40}
            max={150}
            value={settings.lineHeight}
            onChange={(e) => setSettings({ lineHeight: parseInt(e.target.value) })}
          />
          <span>{settings.lineHeight}px</span>
        </label>
      </div>

      <div className="settings-group">
        <label>
          Highlight Color:
          <input
            type="color"
            value={`#${settings.highlightColor.toString(16).padStart(6, '0')}`}
            onChange={(e) => setSettings({ highlightColor: parseInt(e.target.value.slice(1), 16) })}
          />
        </label>
      </div>

      <div className="settings-group">
        <label>
          Base Color:
          <input
            type="color"
            value={`#${settings.baseColor.toString(16).padStart(6, '0')}`}
            onChange={(e) => setSettings({ baseColor: parseInt(e.target.value.slice(1), 16) })}
          />
        </label>
      </div>

      <div className="settings-group">
        <label>
          Timing Offset:
          <input
            type="number"
            value={settings.offsetMs}
            onChange={(e) => setSettings({ offsetMs: parseInt(e.target.value) || 0 })}
            step={10}
            style={{ width: '80px' }}
          />
          <span>ms</span>
        </label>
        <small className="settings-hint">Negative = lyrics earlier, Positive = lyrics later</small>
      </div>
    </div>
  );
}
