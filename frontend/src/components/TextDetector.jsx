import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../config';
import FileDropzone from './UI/FileDropzone';
import Gauge from './UI/Gauge';
import RadarChart from './UI/RadarChart';

/**
 * Text and Document Forensic Scanning module.
 * Side-by-side: left text input editor, right forensic report.
 * @param {Object} props
 * @param {string} props.gptZeroKey - API configuration key
 * @param {Object} props.settings - { sensitivity }
 * @param {Function} props.onScanLogged - Logging callback for central stats
 */
export default function TextDetector({ gptZeroKey, settings, onScanLogged }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Auto-scan if file is uploaded
  const handleFileSelected = async (file) => {
    if (!file) return;

    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    if (gptZeroKey) {
      formData.append('gptZeroKey', gptZeroKey);
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/detect/text`, {
        method: 'POST',
        headers: {
          'x-gptzero-key': gptZeroKey || ''
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server scan error');
      }

      const data = await response.json();
      setResult(data);
      setText(data.metrics?.wordsCount > 0 ? 'File successfully imported. Document text analyzed in report panel.' : '');
      
      // Log Scan
      onScanLogged(data.aiProbability >= 70 ? 'ai' : (data.aiProbability <= 40 ? 'human' : 'mixed'), 'text');
    } catch (err) {
      alert(`Text document scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Scan manually typed text
  const handleScanText = async () => {
    if (!text || text.trim().length < 20) {
      alert('Please enter at least 20 characters to run an AI detection audit.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/detect/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gptzero-key': gptZeroKey || ''
        },
        body: JSON.stringify({ text, gptZeroKey })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server scan error');
      }

      const data = await response.json();
      setResult(data);
      onScanLogged(data.aiProbability >= 70 ? 'ai' : (data.aiProbability <= 40 ? 'human' : 'mixed'), 'text');
    } catch (err) {
      alert(`Text scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Highlights AI buzzwords with interactive tooltips inside a text block
  const renderHighlightedText = () => {
    if (!result || !result.flaggedWords || result.flaggedWords.length === 0) {
      return <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-primary)' }}>{text || 'No text analyzed.'}</p>;
    }

    let rawText = text || 'Document content analyzed. Check metadata log for raw properties.';
    if (rawText.length > 5000) {
      rawText = rawText.substring(0, 5000) + '... [Truncated in viewer for performance]';
    }

    // Build a map of flagged words for regex replacements
    const sortedWords = [...result.flaggedWords].sort((a, b) => b.keyword.length - a.keyword.length);
    
    // We escape HTML characters first to prevent XSS and formatting breakages
    let escapedText = rawText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Replace terms with special placeholder markers that we can parse as components
    const tokens = [];
    sortedWords.forEach((wordInfo, idx) => {
      const kw = wordInfo.keyword;
      const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
      
      escapedText = escapedText.replace(regex, (match) => {
        const tokenPlaceholder = `__FLAGGED_TOKEN_${idx}_${Math.random().toString(36).substr(2, 5)}__`;
        tokens.push({
          placeholder: tokenPlaceholder,
          matchText: match,
          info: wordInfo
        });
        return tokenPlaceholder;
      });
    });

    // Reconstruct the text as an array of React elements
    let parts = [escapedText];
    tokens.forEach((token) => {
      const newParts = [];
      parts.forEach((part) => {
        if (typeof part === 'string' && part.includes(token.placeholder)) {
          const splitList = part.split(token.placeholder);
          splitList.forEach((subPart, i) => {
            if (i > 0) {
              newParts.push(
                <span
                  key={token.placeholder + '_' + i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTooltip(activeTooltip === token.placeholder ? null : token.placeholder);
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.18)',
                    borderBottom: '2px dotted var(--color-ai)',
                    color: 'var(--color-ai)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '0 2px',
                    borderRadius: '2px',
                    display: 'inline-block'
                  }}
                >
                  {token.matchText}
                  {activeTooltip === token.placeholder && (
                    <span style={{
                      position: 'absolute',
                      bottom: '125%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-glass)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      width: '240px',
                      zIndex: 999,
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 400,
                      lineHeight: '1.4',
                      pointerEvents: 'auto',
                      textAlign: 'left'
                    }}>
                      <strong style={{ color: 'var(--color-ai)', display: 'block', marginBottom: '4px', textTransform: 'capitalize' }}>
                        "{token.matchText}" Overuse
                      </strong>
                      {token.info.explanation}
                      <span style={{ display: 'block', marginTop: '6px', color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>
                        Occurrences: {token.info.occurrences}
                      </span>
                    </span>
                  )}
                </span>
              );
            }
            if (subPart) {
              newParts.push(subPart);
            }
          });
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return (
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', color: 'var(--text-primary)' }}>
        {parts}
      </div>
    );
  };

  // Close active tooltip when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveTooltip(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div className="detector-grid">
      
      {/* LEFT: Text Editor / Document Import */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Linguistic Input Pane</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Type your text directly or drop document reports below.
          </p>
        </div>

        {/* File Dropzone */}
        <FileDropzone
          accept=".pdf,.docx,.txt"
          onFileSelected={handleFileSelected}
          title="Import Document Report"
          subtitle="Supports PDF, DOCX, TXT (Max 15MB)"
        />

        {/* Text Area */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Raw Content Input</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text contents here to run structural perplexity and vocabulary analysis..."
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '260px',
              flexGrow: 1,
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '14px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-glass)'}
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleScanText}
          disabled={loading || text.trim().length < 20}
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px' }}
        >
          {loading ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}>
                <circle cx="12" cy="12" r="10" strokeDasharray="32" />
              </svg>
              Executing Forensic Verification...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Scan Text Profile
            </>
          )}
        </button>
      </div>

      {/* RIGHT: Forensic Scan Report */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Forensic Audit Report</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time verification results and structural details.
          </p>
        </div>

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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis Engine</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{result.engine}</h3>
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

            {/* Gauge Displays */}
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '15px' }}>
              <Gauge value={result.aiProbability} size={110} strokeWidth={8} title="AI Probability" />
              <Gauge value={result.confidence} size={110} strokeWidth={8} title="Confidence" />
            </div>

            {/* Radar Spider Chart / Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
              <RadarChart
                aiProbability={result.aiProbability}
                metrics={{
                  perplexity: result.metrics?.perplexity,
                  burstiness: result.metrics?.burstiness,
                  lexicalRichness: result.metrics?.lexicalRichness,
                  flaggedWordsCount: result.flaggedWords?.length || 0,
                  uniformity: result.metrics?.burstiness ? Math.max(10, 100 - (result.metrics.burstiness * 10)) : 50,
                  repetition: result.metrics?.lexicalRichness ? Math.max(10, 100 - result.metrics.lexicalRichness) : 40
                }}
              />
            </div>

            {/* Document stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '12px 16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Word Count</span>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{result.metrics?.wordsCount}</p>
              </div>
              <div className="glass-card" style={{ padding: '12px 16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sentence Burstiness</span>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{result.metrics?.burstiness} (SD)</p>
              </div>
              <div className="glass-card" style={{ padding: '12px 16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Shannon Word Entropy</span>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{result.metrics?.wordEntropy || 0} bits</p>
              </div>
              <div className="glass-card" style={{ padding: '12px 16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Phrase Repetition Rate</span>
                <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {Math.round(((result.metrics?.bigramRep || 0) + (result.metrics?.trigramRep || 0)) / 2)}%
                </p>
              </div>
            </div>

            {/* Highlighted text container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Interactive Highlight Explorer</span>
                {result.flaggedWords?.length > 0 && (
                  <span style={{ color: 'var(--color-ai)', fontSize: '0.8rem' }}>
                    {result.flaggedWords.length} AI markers detected (click to view details)
                  </span>
                )}
              </span>
              <div style={{
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                padding: '16px',
                maxHeight: '220px',
                overflowY: 'auto',
                fontSize: '0.9rem'
              }}>
                {renderHighlightedText()}
              </div>
            </div>

          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)', gap: '15px', padding: '40px 0' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p style={{ fontSize: '0.9rem' }}>Awaiting input context. Import file or type content to begin forensic audit.</p>
          </div>
        )}
      </div>

    </div>
  );
}
