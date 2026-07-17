import React, { useState, useEffect, useRef } from 'react';
import FileDropzone from './components/UI/FileDropzone';
import Gauge from './components/UI/Gauge';
import ScanResultsPage from './components/ScanResultsPage';
import Settings from './components/Settings';

// Client-side Forensic Services
import { extractTextFromFile } from './services/documentParser';
import { processTextIntoBlocks } from './services/textPipeline';
import { classifyBlocks, calculateSimilarityIndex } from './services/aiInferenceEngine';
import { analyzeTextLocally } from './services/textDetector';
import { auditTextWithAI } from './services/openRouterService';
import { analyzeImage } from './services/imageDetector';
import { analyzeAudio } from './services/audioDetector';
import { findScanByHash, saveScanResult } from './services/database';

export default function App() {
  const [currentTab, setCurrentTab] = useState('scan'); // 'scan' | 'settings'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // ELA image overlay state
  const [elaOpacity, setElaOpacity] = useState(0.5);

  const [inputMode, setInputMode] = useState('file');
  const [rawText, setRawText] = useState('');
  const [proMode, setProMode] = useState(false);
  const [fastCheck, setFastCheck] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const [settings, setSettings] = useState({
    sensitivity: 0.5,
    metadataStrictness: 0.5
  });

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
    setScanResult(null);

    const mime = file.type || '';
    let category = '';

    if (mime.startsWith('image/')) {
      category = 'image';
      setFileType('image');
      try {
        const imageResult = await analyzeImage(file);
        setResult(imageResult);
      } catch (err) {
        alert(`Image forensic scan failed: ${err.message}`);
        setFileType(null);
        setSelectedFile(null);
      } finally {
        setLoading(false);
      }
    } else if (mime.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav')) {
      category = 'audio';
      setFileType('audio');
      try {
        const audioResult = await analyzeAudio(file);
        setResult(audioResult);
      } catch (err) {
        alert(`Audio forensic scan failed: ${err.message}`);
        setFileType(null);
        setSelectedFile(null);
      } finally {
        setLoading(false);
      }
    } else {
      category = 'scan';
      setFileType('scan');
      setScanProgress({ stage: 'parsing', current: 0, total: 100, percent: 5, message: `Parsing ${file.name}...` });
      
      try {
        const { text, isPdf } = await extractTextFromFile(file);

        // Hash content to check cache
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        const cachedScan = findScanByHash(hashHex);
        if (cachedScan) {
          console.log('[App] Cache hit in local storage for text scan.');
          const parsed = JSON.parse(cachedScan.result_json);
          parsed.cached = true;
          setScanResult(parsed);
          setLoading(false);
          return;
        }

        setScanProgress({ stage: 'extracting', current: 0, total: 100, percent: 15, message: 'Preprocessing text blocks...' });
        const processed = processTextIntoBlocks(text);

        const progressCallback = (p) => {
          setScanProgress({
            stage: 'inference',
            current: p.current,
            total: p.total,
            percent: 25 + Math.round(p.percent * 0.6),
            message: `Classifying block ${p.current} of ${p.total}...`
          });
        };
        
        const scoredBlocks = await classifyBlocks(processed.blocks, proMode, fastCheck, progressCallback);
        const similarity = calculateSimilarityIndex(scoredBlocks);

        setScanProgress({ stage: 'audit', current: 90, total: 100, percent: 90, message: 'Running linguistic metrics...' });
        const localMetrics = analyzeTextLocally(text);

        let explanation = null;
        if (!fastCheck) {
          setScanProgress({ stage: 'audit', current: 95, total: 100, percent: 95, message: 'Requesting AI Deep Audit explanation...' });
          explanation = await auditTextWithAI(text, {
            wordsCount: localMetrics.wordsCount,
            aiProbability: similarity,
            flaggedWordsCount: localMetrics.flaggedWordsCount
          }, proMode);
        }

        const finalResult = {
          scanId: 'scan_' + Math.random().toString(36).substring(2, 11),
          fileName: file.name,
          fileType: file.type,
          fileHashSha256: hashHex,
          aiSimilarityIndex: similarity,
          blocks: scoredBlocks,
          totalBlocks: processed.totalBlocks,
          flaggedBlocks: scoredBlocks.filter(b => !b.exclude && b.aiProbability !== null && b.aiProbability >= 50).length,
          excludedBlocks: processed.excludedBlocks,
          totalWords: processed.totalWords,
          aiAuditExplanation: explanation,
          cached: false,
          proMode,
          timestamp: new Date().toISOString()
        };

        saveScanResult(finalResult);
        setScanResult(finalResult);
      } catch (err) {
        alert(`Forensic scan failed: ${err.message}`);
        setScanResult(null);
        setFileType(null);
        setSelectedFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTextSubmit = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setResult(null);
    setScanResult(null);
    setScanProgress({ stage: 'parsing', current: 0, total: 100, percent: 5, message: 'Processing text...' });
    setFileType('scan');
    setSelectedFile({ name: 'Raw Text Input' });

    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawText));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const cachedScan = findScanByHash(hashHex);
      if (cachedScan) {
        console.log('[App] Cache hit in local storage for text scan.');
        const parsed = JSON.parse(cachedScan.result_json);
        parsed.cached = true;
        setScanResult(parsed);
        setLoading(false);
        return;
      }

      setScanProgress({ stage: 'extracting', current: 0, total: 100, percent: 15, message: 'Preprocessing text blocks...' });
      const processed = processTextIntoBlocks(rawText);

      const progressCallback = (p) => {
        setScanProgress({
          stage: 'inference',
          current: p.current,
          total: p.total,
          percent: 30 + Math.round(p.percent * 0.5),
          message: `Classifying block ${p.current} of ${p.total}...`
        });
      };
      
      const scoredBlocks = await classifyBlocks(processed.blocks, proMode, fastCheck, progressCallback);
      const similarity = calculateSimilarityIndex(scoredBlocks);

      setScanProgress({ stage: 'audit', current: 90, total: 100, percent: 85, message: 'Running linguistic metrics...' });
      const localMetrics = analyzeTextLocally(rawText);

      let explanation = null;
      if (!fastCheck) {
        setScanProgress({ stage: 'audit', current: 95, total: 100, percent: 92, message: 'Requesting AI Deep Audit explanation...' });
        explanation = await auditTextWithAI(rawText, {
          wordsCount: localMetrics.wordsCount,
          aiProbability: similarity,
          flaggedWordsCount: localMetrics.flaggedWordsCount
        }, proMode);
      }

      const finalResult = {
        scanId: 'scan_' + Math.random().toString(36).substring(2, 11),
        fileName: 'Raw Text Input',
        fileType: 'text/plain',
        fileHashSha256: hashHex,
        aiSimilarityIndex: similarity,
        blocks: scoredBlocks,
        totalBlocks: processed.totalBlocks,
        flaggedBlocks: scoredBlocks.filter(b => !b.exclude && b.aiProbability !== null && b.aiProbability >= 50).length,
        excludedBlocks: processed.excludedBlocks,
        totalWords: processed.totalWords,
        aiAuditExplanation: explanation,
        cached: false,
        proMode,
        timestamp: new Date().toISOString()
      };

      saveScanResult(finalResult);
      setScanResult(finalResult);
    } catch (err) {
      alert(`Forensic scan failed: ${err.message}`);
      setScanResult(null);
      setFileType(null);
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
    setFastCheck(false);
    setProMode(false);
  };

  const renderHighlightedText = (text, flaggedWords) => {
    if (!flaggedWords || flaggedWords.length === 0) {
      return <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{text}</p>;
    }
    
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
      
      {/* Immersive Titlebar Header */}
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
            OmniDetect AI Auditor (Client-Side)
          </span>
        </div>

        {/* Navigation tabs */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={() => { setCurrentTab('scan'); handleReset(); }}
            style={{
              background: currentTab === 'scan' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: currentTab === 'scan' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '6px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            🔍 Scanner
          </button>
          <button
            onClick={() => { setCurrentTab('settings'); }}
            style={{
              background: currentTab === 'settings' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: currentTab === 'settings' ? '#fff' : 'var(--text-secondary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '6px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            ⚙ Settings
          </button>
        </div>

        {/* Secure Key Status Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-human)', display: 'inline-block', boxShadow: '0 0 8px var(--color-human)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Client-Side Failover Active
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flexGrow: 1,
        maxWidth: (scanResult || result) ? '1200px' : '1000px',
        width: '100%',
        margin: '0 auto',
        padding: '30px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        transition: 'max-width 0.3s'
      }}>
        
        {currentTab === 'settings' ? (
          <Settings settings={settings} setSettings={setSettings} />
        ) : (
          <>
            {loading && (() => {
              const displayPercent = scanProgress ? (scanProgress.percent || 0) : 0;
              const displayMessage = scanProgress ? scanProgress.message : 'Processing asset...';
              const displayStage = scanProgress ? scanProgress.stage : 'parsing';

              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: '60px 20px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
                  {/* Spinner */}
                  <div style={{
                    width: '60px', height: '60px',
                    border: '3px solid rgba(255,255,255,0.05)',
                    borderTopColor: 'var(--accent-cyan)',
                    borderRadius: '50%',
                    animation: 'shiver-effect 1s infinite linear',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-cyan)', opacity: 0.8 }} />
                  </div>

                  {/* Big percentage number */}
                  <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', lineHeight: 1 }}>
                    {displayPercent}%
                  </div>

                  {/* Stage message */}
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                    {displayMessage}
                  </p>

                  {/* Full-width progress bar */}
                  <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${displayPercent}%`,
                      height: '100%',
                      borderRadius: '4px',
                      background: 'linear-gradient(90deg, var(--accent-cyan), #6366f1, #a855f7)',
                      transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 0 16px rgba(0, 200, 255, 0.5)'
                    }} />
                  </div>

                  {/* Stage badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                    {['parsing', 'extracting', 'inference', 'audit', 'saving', 'complete'].map(stage => {
                      const currentStage = displayStage;
                      const stageOrder = ['parsing', 'extracting', 'inference', 'audit', 'saving', 'complete'];
                      const currentIdx = stageOrder.indexOf(currentStage);
                      const thisIdx = stageOrder.indexOf(stage);
                      const isDone = currentIdx > thisIdx;
                      const isCurrent = currentStage === stage;
                      return (
                        <span key={stage} style={{
                          fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px',
                          borderRadius: '6px',
                          background: isDone ? 'rgba(48,209,88,0.15)' : isCurrent ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.04)',
                          color: isDone ? 'var(--color-human)' : isCurrent ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          border: `1px solid ${isDone ? 'rgba(48,209,88,0.3)' : isCurrent ? 'rgba(0,200,255,0.3)' : 'var(--border-glass)'}`,
                          textTransform: 'capitalize'
                        }}>
                          {isDone ? '✓ ' : isCurrent ? '● ' : ''}{stage}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {!loading && !result && !scanResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Title / Description */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.04em' }}>
                    Verify AI-Generated Assets
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                    Drop any image, document (PDF/Word/Text), or audio recording. Our system parses binary markers and triggers local mathematical models in your browser.
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Fast Check Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: fastCheck ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: fastCheck ? 700 : 500 }}>
                        Fast Check ⚡
                      </span>
                      <button 
                        onClick={() => {
                          setFastCheck(!fastCheck);
                          if (!fastCheck) setProMode(false);
                        }}
                        style={{ width: '40px', height: '22px', borderRadius: '12px', background: fastCheck ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: fastCheck ? '21px' : '3px', transition: 'left 0.3s' }} />
                      </button>
                    </div>

                    {/* Pro Deep Audit Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: proMode ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: proMode ? 700 : 500 }}>
                        Pro Deep Audit
                      </span>
                      <button 
                        onClick={() => {
                          setProMode(!proMode);
                          if (!proMode) setFastCheck(false);
                        }}
                        style={{ width: '40px', height: '22px', borderRadius: '12px', background: proMode ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: proMode ? '21px' : '3px', transition: 'left 0.3s' }} />
                      </button>
                    </div>
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
              <ScanResultsPage scanResult={scanResult} onReset={handleReset} originalFile={selectedFile} />
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
                        No deep explanation was generated. Verify that your encrypted API keys are configured and active.
                      </div>
                    )}

                    {/* File Details inside explanation panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>File Name:</span>
                        <span style={{ color: '#fff', fontWeight: 600, wordBreak: 'break-all' }}>{selectedFile?.name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>File Size:</span>
                        <span style={{ color: '#fff' }}>{((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB</span>
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
          </>
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
