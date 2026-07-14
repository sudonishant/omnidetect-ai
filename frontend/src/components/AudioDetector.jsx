import React, { useState, useRef, useEffect } from 'react';
import FileDropzone from './UI/FileDropzone';
import Gauge from './UI/Gauge';

/**
 * Audio forensic module.
 * Features: Web Audio API frequency spectrometer, format tags checker.
 * @param {Object} props
 * @param {Object} props.settings - { sensitivity }
 * @param {Function} props.onScanLogged - Logging callback for central stats
 */
export default function AudioDetector({ settings, onScanLogged }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  const handleFileSelected = async (file) => {
    setSelectedFile(file);
    if (!file) {
      setResult(null);
      setAudioUrl(null);
      return;
    }

    setLoading(true);
    setResult(null);
    setIsPlaying(false);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/detect/audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server scan error');
      }

      const data = await response.json();
      setResult(data);
      onScanLogged(data.aiProbability >= 70 ? 'ai' : (data.aiProbability <= 40 ? 'human' : 'mixed'), 'audio');
    } catch (err) {
      alert(`Audio scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Set up Web Audio API analyzer on playback
  const setupAudioAnalyzer = () => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (err) {
      console.error('Failed to initialize Web Audio API analyzer:', err);
    }
  };

  // Spectrogram Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Draw static/idle waveform or spectrum if not playing
    const drawIdle = () => {
      ctx.fillStyle = '#06050b';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < height; j += 20) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }

      // Flat spectrum line
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height - 10);
      ctx.lineTo(width, height - 10);
      ctx.stroke();
    };

    const drawLive = () => {
      if (!analyserRef.current) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#06050b';
      ctx.fillRect(0, 0, width, height);

      // Draw grids
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      // Render vertical bars (spectrum visualizer)
      const barWidth = (width / bufferLength) * 1.3;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        const percent = val / 255;
        const barHeight = percent * height * 0.85;

        // Custom Gradient for each bar (Cyan to Violet glow)
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, 'var(--accent-purple)');
        gradient.addColorStop(0.5, 'var(--accent-cyan)');
        gradient.addColorStop(1, '#39ff14'); // Glowing neon green tips

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      // Add a simulated warning cutoff overlay line at high frequencies (brickwall filters)
      if (result && result.aiProbability > 70) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, height * 0.25);
        ctx.lineTo(width, height * 0.25);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'var(--color-ai)';
        ctx.font = '8px var(--font-sans)';
        ctx.fillText('CRITICAL BRICKWALL CUTOFF TRIGGERED', 10, height * 0.22);
      }

      animationRef.current = requestAnimationFrame(drawLive);
    };

    if (isPlaying) {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      drawLive();
    } else {
      drawIdle();
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, result]);

  const handlePlayState = (playing) => {
    setIsPlaying(playing);
    if (playing) {
      setupAudioAnalyzer();
    }
  };

  return (
    <div className="detector-grid">
      
      {/* LEFT: Audio Uploader & Player */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Acoustic Uploader</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Import voice recordings or songs to run deepfake audits.
          </p>
        </div>

        {/* Dropzone */}
        <FileDropzone
          accept="audio/*"
          onFileSelected={handleFileSelected}
          title="Upload Scan Audio"
          subtitle="Supports MP3, WAV, M4A, FLAC (Max 25MB)"
        />

        {/* Audio Player and visualizer */}
        {audioUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Live Spectrogram Visualizer
            </h3>
            
            {/* Visualizer Canvas */}
            <canvas
              ref={canvasRef}
              width="400"
              height="150"
              style={{
                width: '100%',
                height: '140px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: '#06050b'
              }}
            />

            {/* Audio Node */}
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              onPlay={() => handlePlayState(true)}
              onPause={() => handlePlayState(false)}
              onEnded={() => handlePlayState(false)}
              style={{
                width: '100%',
                accentColor: 'var(--accent-purple)'
              }}
            />
          </div>
        )}
      </div>

      {/* RIGHT: Forensic Scan Report */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Acoustic Audit Report</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Codec profiles, synthetic traces logs, and format verification.
          </p>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: '15px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" strokeDasharray="32" />
            </svg>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Parsing Vorbis & ID3 Headers...</p>
          </div>
        )}

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.4s ease' }}>
            
            {/* Verdict Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auditing System</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>Synthetic Sound Audit</h3>
              </div>
              <div style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.85rem',
                background: result.aiProbability >= 70 ? 'rgba(239, 68, 68, 0.15)' : (result.aiProbability <= 40 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
                color: result.aiProbability >= 70 ? 'var(--color-ai)' : (result.aiProbability <= 40 ? 'var(--color-human)' : 'var(--color-mixed)'),
                border: `1px solid ${result.aiProbability >= 70 ? 'rgba(239, 68, 68, 0.3)' : (result.aiProbability <= 40 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)')}`
              }}>
                {result.verdict}
              </div>
            </div>

            {/* AI Audit Explanation Card */}
            {result.aiAuditExplanation && (
              <div style={{
                background: 'rgba(10, 132, 255, 0.04)',
                border: '1px solid rgba(10, 132, 255, 0.25)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '0.85rem',
                lineHeight: '1.5',
                color: 'var(--text-primary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                  </svg>
                  <span>AI Deep Audit Summary</span>
                </div>
                <p style={{ margin: 0, fontStyle: 'italic' }}>"{result.aiAuditExplanation}"</p>
              </div>
            )}

            {/* Circular Gauge */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Gauge value={result.aiProbability} size={120} strokeWidth={9} title="AI Voice Clone" />
            </div>

            {/* Audio Profile properties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sample Rate</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {result.audioInfo?.sampleRate ? `${result.audioInfo.sampleRate} Hz` : 'Unknown'}
                </p>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Channels</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {result.audioInfo?.channels === 1 ? 'Mono (1 Ch)' : result.audioInfo?.channels === 2 ? 'Stereo (2 Ch)' : 'Unknown'}
                </p>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bitrate</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {result.audioInfo?.bitrate || 'Unknown'}
                </p>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Codec / Container</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px', textTransform: 'uppercase' }}>
                  {result.audioInfo?.format || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Metadata Trace logs */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Synthetic Acoustic Footprints
              </h3>
              {result.metadataAnalysis?.tracesFound?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.metadataAnalysis.tracesFound.map((trace, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderLeft: `3px solid ${trace.risk === 'Critical' ? 'var(--color-ai)' : (trace.risk === 'High' ? 'var(--color-mixed)' : 'var(--accent-cyan)')}`,
                      padding: '10px 14px',
                      borderRadius: '0 8px 8px 0',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: '#fff' }}>{trace.tag || 'Heuristic Indicator'}</strong>
                        <span style={{
                          color: trace.risk === 'Critical' ? 'var(--color-ai)' : (trace.risk === 'High' ? 'var(--color-mixed)' : 'var(--accent-cyan)'),
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>{trace.risk} Risk</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)' }}>{trace.desc}</p>
                      {trace.value && (
                        <code style={{ display: 'block', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Value: {trace.value}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  textAlign: 'center'
                }}>
                  No synthetic signatures or header anomalies located.
                </div>
              )}
            </div>

          </div>
        ) : (
          !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)', gap: '15px', padding: '40px 0' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <p style={{ fontSize: '0.9rem' }}>Awaiting audio input. Import a recording to analyze ID3 metadata and run live spectral charts.</p>
            </div>
          )
        )}
      </div>

    </div>
  );
}
