import React, { useState, useEffect } from 'react';

/**
 * Settings configuration dashboard.
 * Saves keys to secure, encrypted disk storage with auto 24h reset.
 */
export default function Settings({ settings, setSettings }) {
  const [keysInput, setKeysInput] = useState('');
  const [hasKeysSaved, setHasKeysSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Fetch status on load to verify key presence
  useEffect(() => {
    fetchKeyStatus();
  }, []);

  const fetchKeyStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings/key/status');
      if (response.ok) {
        const data = await response.json();
        setHasKeysSaved(data.hasKey);
      }
    } catch (err) {
      console.error('Failed to retrieve key status:', err);
    }
  };

  const handleSensitivityChange = (field, val) => {
    setSettings(prev => ({
      ...prev,
      [field]: parseFloat(val)
    }));
  };

  const saveSettings = async () => {
    if (!keysInput || keysInput.trim().length === 0) {
      setStatusMsg({ text: 'Please enter one or more OpenRouter API keys.', error: true });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    try {
      const response = await fetch('http://localhost:5000/api/settings/key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ openRouterKey: keysInput })
      });

      if (!response.ok) {
        throw new Error('Failed to save keys on server.');
      }

      const data = await response.json();
      setStatusMsg({ text: data.message || 'Keys encrypted and loaded successfully!', error: false });
      setKeysInput('');
      fetchKeyStatus();
    } catch (err) {
      setStatusMsg({ text: `Failed to configure keys: ${err.message}`, error: true });
    } finally {
      setIsSaving(false);
    }
  };

  const clearKeys = async () => {
    setIsSaving(true);
    try {
      await fetch('http://localhost:5000/api/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openRouterKey: '' })
      });
      setStatusMsg({ text: 'API Keys list cleared successfully.', error: false });
      fetchKeyStatus();
    } catch (err) {
      setStatusMsg({ text: `Clear keys failed: ${err.message}`, error: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Secure API Keys Configuration Panel */}
      <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Secure OpenRouter Key Configuration</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Configure your OpenRouter API keys to trigger the free Gemini model for deep forensic explanations.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            OpenRouter API Keys (Save one or more, separated by newlines)
          </label>
          
          <textarea
            value={keysInput}
            onChange={(e) => setKeysInput(e.target.value)}
            placeholder="Paste your sk-or-v1-... keys here (one key per line)"
            className="form-input"
            style={{ minHeight: '120px', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="btn btn-primary"
              style={{ flexGrow: 1 }}
            >
              {isSaving ? 'Encrypting...' : 'Encrypt & Save Keys'}
            </button>
            {hasKeysSaved && (
              <button
                onClick={clearKeys}
                disabled={isSaving}
                className="btn btn-secondary"
                style={{ color: 'var(--color-ai)', borderColor: 'rgba(255, 69, 58, 0.2)' }}
              >
                Clear Keys
              </button>
            )}
          </div>

          <div style={{ 
            marginTop: '10px', 
            padding: '12px', 
            borderRadius: '8px', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid var(--border-glass)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              color: hasKeysSaved ? 'var(--color-human)' : 'var(--text-muted)' 
            }}>
              {hasKeysSaved ? '✔ Keys Encrypted & Active (AES-256-CBC, Auto-Wipes in 24h)' : 'No Keys Configured'}
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            *API keys are encrypted in-memory and written on disk using standard AES-256-CBC blocks. Configured keys automatically expire and self-wipe from disk after 24 hours of creation for maximum safety.
          </span>
        </div>

        {statusMsg && (
          <div style={{
            fontSize: '0.85rem',
            padding: '10px 14px',
            borderRadius: '6px',
            background: statusMsg.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: statusMsg.error ? 'var(--color-ai)' : 'var(--color-human)',
            border: `1px solid ${statusMsg.error ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
          }}>
            {statusMsg.text}
          </div>
        )}
      </div>

      {/* Sensitivity calibration panel */}
      <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Forensic Sensitivity Control</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Calibrate detection thresholds and risk tolerances based on your scan requirements.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Linguistic Sensitivity Threshold</span>
            <span style={{ color: 'var(--accent-cyan)' }}>{Math.round(settings.sensitivity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.05"
            value={settings.sensitivity}
            onChange={(e) => handleSensitivityChange('sensitivity', e.target.value)}
            style={{
              width: '100%',
              accentColor: 'var(--accent-purple)',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.1)',
              height: '6px',
              borderRadius: '3px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Low (Avoid False Positives)</span>
            <span>Balanced</span>
            <span>High (Aggressive Flags)</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
            <span>Metadata Strictness Level</span>
            <span style={{ color: 'var(--accent-cyan)' }}>{Math.round(settings.metadataStrictness * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={settings.metadataStrictness}
            onChange={(e) => handleSensitivityChange('metadataStrictness', e.target.value)}
            style={{
              width: '100%',
              accentColor: 'var(--accent-purple)',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.1)',
              height: '6px',
              borderRadius: '3px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Standard Signatures Only</span>
            <span>Strict Binary Chunk Scan</span>
          </div>
        </div>
      </div>

    </div>
  );
}
