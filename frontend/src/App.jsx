import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import FileDropzone from './components/UI/FileDropzone';
import Gauge from './components/UI/Gauge';
import ProgressTracker from './components/UI/ProgressTracker';
import ScanResultsPage from './components/ScanResultsPage';
import ImageDetector from './components/ImageDetector';
import AudioDetector from './components/AudioDetector';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // ELA image overlay state
  const [elaOpacity, setElaOpacity] = useState(0.5);

  const [inputMode, setInputMode] = useState('file');
  const [rawText, setRawText] = useState('');
  const [proMode, setProMode] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const socketRef = useRef(null);

  // Socket.IO connection
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;
    socket.on('scan:progress', (data) => setScanProgress(data));
    return () => socket.disconnect();
  }, []);

  const handleFileSelected = async (file) => {
    if (!file) {
      setResult(null);
      setFileType(null);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setLoading(true);
    setResult(null);

    // Determine type
    const mime = file.type || '';
    let apiEndpoint = '';
    let category = '';

    if (mime.startsWith('image/')) {
      apiEndpoint = 'http://localhost:5000/api/detect/image';
      category = 'image';
    } else if (mime.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
      apiEndpoint = 'http://localhost:5000/api/detect/audio';
      category = 'audio';
    } else {
      // Text/document files use the new unified scan endpoint
      apiEndpoint = 'http://localhost:5000/api/scan';
      category = 'scan';
    }

    setFileType(category);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('proMode', proMode);
    if (socketRef.current) formData.append('socketId', socketRef.current.id);
    setScanProgress(null);
    setScanResult(null);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server processing error');
      }

      const data = await response.json();
      if (category === 'scan') {
        setScanResult(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      alert(`Forensic scan failed: ${err.message}`);
      setResult(null);
      setFileType(null);
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setResult(null);
    setScanResult(null);
    setScanProgress(null);
    setFileType('scan');
    setSelectedFile({ name: 'Raw Text Input' });

    const formData = new FormData();
    formData.append('text', rawText);
    formData.append('proMode', proMode);
    if (socketRef.current) formData.append('socketId', socketRef.current.id);

    try {
      const response = await fetch('http://localhost:5000/api/scan', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server processing error');
      }
      const data = await response.json();
      setScanResult(data);
    } catch (err) {
      alert(`Forensic scan failed: ${err.message}`);
      setScanResult(null);
      setFileType(null);
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setScanResult(null);
    setScanProgress(null);
    setFileType(null);
    setSelectedFile(null);
    setRawText('');
  };

  // Helper: render parameters for text highlight rendering
  const renderHighlightedText = (text, flaggedWords) => {
    if (!flaggedWords || flaggedWords.length === 0) {
      return <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{text}</p>;
    }
    
    // Simple word highlighting fallback
    let words = text.split(/(\s+)/);
    return (
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
        {words.map((word, idx) => {
          const clean = word.toLowerCase().replace(/[^a-zA-Z]/g, '');
          const isFlagged = flaggedWords.some(fw => fw.word.toLowerCase() === clean);
          return isFlagged ? (
            <span key={idx} style={{ background: 'rgba(255, 69, 58, 0.25)', color: 'var(--color-ai)', padding: '2px 4px', borderRadius: '4px', fontWeight: 600 }}>
              {word}
            </span>
          ) : word;
        })}
      </p>
    );
  };

  // Helper to render DQT matrices
  const renderQuantizationTables = (tables) => {
    if (!tables || tables.length === 0) return null;
    return (
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Quantization Tables (DQT)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {tables.slice(0, 2).map((table, tIdx) => (
            <div key={tIdx} className="glass-card" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'block', marginBottom: '8px' }}>
                Table {table.id}: {table.type}
              </span>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '2px',
                background: 'rgba(0,0,0,0.2)',
                padding: '4px',
                borderRadius: '6px',
                border: '1px solid var(--border-glass)'
              }}>
                {table.matrix.map((val, cellIdx) => (
                  <div
                    key={cellIdx}
                    style={{
                      background: val > 40 ? 'rgba(255,69,58,0.15)' : (val > 15 ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.15)'),
                      color: val > 40 ? 'var(--color-ai)' : (val > 15 ? 'var(--color-mixed)' : 'var(--color-human)'),
                      padding: '3px 0',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {val}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} style={{ height: '8px' }} />;
      
      if (trimmed.startsWith('## ')) {
        return <h4 key={idx} style={{ color: '#fff', margin: '12px 0 6px 0', fontSize: '1rem', fontWeight: 700 }}>{trimmed.replace('## ', '')}</h4>;
      }
      if (trimmed.startsWith('# ')) {
        return <h3 key={idx} style={{ color: '#fff', margin: '12px 0 6px 0', fontSize: '1.1rem', fontWeight: 800 }}>{trimmed.replace('# ', '')}</h3>;
      }
      
      // Simple bold parse
      const parts = trimmed.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} style={{ margin: '4px 0', fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} style={{ color: 'var(--accent-cyan)' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', background: '#000' }}>
      
      {/* Immersive macOS Window Titlebar Header */}
      <header className="glass-panel" style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        height: 'var(--header-height)',
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(9, 9, 11, 0.8)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)'
      }}>
        {/* macOS Style Traffic Light Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', marginLeft: '12px', letterSpacing: '-0.01em' }}>
            OmniDetect AI Auditor
          </span>
        </div>

        {/* Secure Key Status Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-human)', display: 'inline-block', boxShadow: '0 0 8px var(--color-human)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Encrypted API Failover Active
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flexGrow: 1,
        maxWidth: scanResult ? '1200px' : '1000px',
        width: '100%',
        margin: '0 auto',
        padding: '30px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'max-width 0.3s'
      }}>
        
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '60px 0' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid rgba(255,255,255,0.05)',
              borderTopColor: 'var(--accent-cyan)',
              borderRadius: '50%',
              animation: 'shiver-effect 1.5s infinite linear',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-cyan)', opacity: 0.8 }} />
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {fileType === 'scan' ? 'Running ML inference & forensic audit...' : 'Analyzing file signatures & generating AI audit...'}
            </p>
            <ProgressTracker progress={scanProgress} isVisible={fileType === 'scan' && !!scanProgress} />
          </div>
        )}

        {!loading && !result && !scanResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Title / Description */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.04em' }}>
                Verify AI-Generated Assets
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                Drop any image, document (PDF/Word/Text), or audio recording. Our system parses binary markers and triggers rotated OpenRouter free models to audit authenticity.
              </p>
            </div>

            {/* Input Mode Selector & Pro Mode Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                <button 
                  onClick={() => setInputMode('file')}
                  style={{ background: inputMode === 'file' ? 'var(--accent-cyan)' : 'transparent', color: inputMode === 'file' ? '#000' : 'var(--text-secondary)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  Upload File
                </button>
                <button 
                  onClick={() => setInputMode('text')}
                  style={{ background: inputMode === 'text' ? 'var(--accent-cyan)' : 'transparent', color: inputMode === 'text' ? '#000' : 'var(--text-secondary)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  Paste Text
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: proMode ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: proMode ? 700 : 500 }}>
                  Pro Deep Audit
                </span>
                <button 
                  onClick={() => setProMode(!proMode)}
                  style={{ width: '40px', height: '22px', borderRadius: '12px', background: proMode ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: proMode ? '21px' : '3px', transition: 'left 0.3s' }} />
                </button>
              </div>
            </div>

            {/* Input Area */}
            {inputMode === 'file' ? (
              <div className="glass-panel" style={{ padding: '24px' }}>
                <FileDropzone
                  accept="image/*,audio/*,.pdf,.docx,.txt"
                  onFileSelected={handleFileSelected}
                  title="Drop your asset here"
                  subtitle="Supports PNG, JPG, WEBP, PDF, DOCX, TXT, MP3, WAV (Max 30MB)"
                />
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste your article, essay, or email text here to detect AI generation..."
                  style={{ width: '100%', minHeight: '180px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                />
                <button 
                  onClick={handleTextSubmit}
                  disabled={!rawText.trim()}
                  className="btn btn-primary" 
                  style={{ alignSelf: 'flex-end', opacity: !rawText.trim() ? 0.5 : 1 }}>
                  Scan Text
                </button>
              </div>
            )}
            
            {/* Audited elements showcase */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px', marginTop: '10px' }}>
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>🖼</span>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Visual Scans</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>JPEG ELA curves, metadata prompt structures, Sobel edges, clone checks.</p>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>📄</span>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Linguistic Scans</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Sentence perplexity, buzzword metrics, Shannon word entropy, document parsers.</p>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>🎙</span>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Acoustic Scans</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Format profile mapping, bitrate consistency, AI voice/music comments.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════ Scan Results (Text/Document ML Detection) ════════ */}
        {!loading && scanResult && (
          <ScanResultsPage scanResult={scanResult} onReset={handleReset} />
        )}

        {/* ════════ Legacy Report View (Image/Audio Forensics) ════════ */}
        {!loading && result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Top General Overview (Gauge + AI Audit explanation) */}
            <div className="detector-grid">
              {/* LEFT: Verdict & Gauge */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verification Result</span>
                  <h2 style={{ 
                    fontSize: '1.4rem', 
                    fontWeight: 800, 
                    marginTop: '4px',
                    color: result.aiProbability >= 70 ? 'var(--color-ai)' : (result.aiProbability <= 40 ? 'var(--color-human)' : 'var(--color-mixed)')
                  }}>
                    {result.verdict}
                  </h2>
                </div>
                
                <Gauge value={result.aiProbability} size={150} strokeWidth={11} title="AI Probability" />

                <button onClick={handleReset} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                  Verify Another File
                </button>
              </div>

              {/* RIGHT: OpenRouter AI deep explanation */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="12 2 2 7 12 12 22 7 12 2 12 2 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span style={{ fontSize: '1rem', letterSpacing: '-0.01em' }}>OpenRouter AI Deep Audit</span>
                </div>
                
                {result.aiAuditExplanation ? (
                  <div style={{
                    background: 'rgba(10, 132, 255, 0.03)',
                    border: '1px solid rgba(10, 132, 255, 0.18)',
                    borderRadius: '12px',
                    padding: '16px',
                    flexGrow: 1,
                    overflowY: 'auto',
                    maxHeight: '400px'
                  }}>
                    {renderMarkdown(result.aiAuditExplanation)}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    No deep explanation was generated. Verify that your encrypted API keys are configured and valid.
                  </div>
                )}

                {/* File Details inside explanation panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>File Name:</span>
                    <span style={{ color: '#fff', fontWeight: 600, wordBreak: 'break-all' }}>{result.fileName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>File Size:</span>
                    <span style={{ color: '#fff' }}>{(result.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  {result.imageInfo && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Resolution:</span>
                      <span style={{ color: '#fff' }}>{result.imageInfo.width}x{result.imageInfo.height} ({result.imageInfo.format})</span>
                    </div>
                  )}
                  {result.audioInfo && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Audio Profile:</span>
                      <span style={{ color: '#fff' }}>{result.audioInfo.sampleRate}Hz • {result.audioInfo.channels === 1 ? 'Mono' : 'Stereo'} ({result.audioInfo.format})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Detailed breakdown (visual, text or audio detailed components) */}
            {fileType === 'image' && (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Visual Forensic Map & Quantization</h3>
                
                {result.ela?.elaBase64 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Forensic Map Overlay (ELA/Heatmap)</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={elaOpacity}
                        onChange={(e) => setElaOpacity(parseFloat(e.target.value))}
                        style={{ width: '120px', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ position: 'relative', width: '100%', background: '#050508', borderRadius: '8px', overflow: 'hidden', aspectRatio: '16/10' }}>
                      <img src={URL.createObjectURL(selectedFile)} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute' }} alt="original" />
                      <img src={result.heatmap || result.ela.elaBase64} style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', opacity: elaOpacity, mixBlendMode: 'screen' }} alt="heatmap" />
                    </div>
                  </div>
                )}

                {result.metadataAnalysis?.quantizationTables && renderQuantizationTables(result.metadataAnalysis.quantizationTables)}
              </div>
            )}

            {fileType === 'text' && (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Interactive Document Text Inspector</h3>
                {result.metrics && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div className="glass-card">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Burstiness (Variance)</span>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{result.metrics.burstiness}</p>
                    </div>
                    <div className="glass-card">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Word Entropy</span>
                      <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{result.metrics.wordEntropy} bits</p>
                    </div>
                  </div>
                )}
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {renderHighlightedText(selectedFile.name.endsWith('.txt') ? result.fileName : 'Linguistic markers mapped directly inside report parameters.', result.flaggedWords)}
                </div>
              </div>
            )}

            {fileType === 'audio' && (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Acoustic Metadata Header Traces</h3>
                {result.metadataAnalysis?.tracesFound?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {result.metadataAnalysis.tracesFound.map((trace, idx) => (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--color-ai)', padding: '10px 14px', borderRadius: '0 8px 8px 0', fontSize: '0.85rem' }}>
                        <strong>{trace.tag}:</strong> {trace.desc} (Value: {trace.value})
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                    No ID3/Vorbis encoder deepfake tags detected. Heuristics active.
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '20px',
        borderTop: '1px solid var(--border-glass)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        OmniDetect AI Forensic Auditor • Secured Local & OpenRouter Free Failover Engines Active
      </footer>
    </div>
  );
}
