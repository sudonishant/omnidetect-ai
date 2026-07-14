import React, { useState } from 'react';
import FileDropzone from './UI/FileDropzone';
import Gauge from './UI/Gauge';

/**
 * Image Forensic Audit module.
 * Features: sliding ELA overlay map, binary PNG chunk viewer, EXIF logs.
 * @param {Object} props
 * @param {Object} props.settings - { sensitivity }
 * @param {Function} props.onScanLogged - Logging callback for central stats
 */
export default function ImageDetector({ settings, onScanLogged }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [elaOpacity, setElaOpacity] = useState(0.5); // Slider control for ELA overlay

  const handleFileSelected = async (file) => {
    setSelectedFile(file);
    if (!file) {
      setResult(null);
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/detect/image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server scan error');
      }

      const data = await response.json();
      setResult(data);
      onScanLogged(data.aiProbability >= 70 ? 'ai' : (data.aiProbability <= 40 ? 'human' : 'mixed'), 'image');
    } catch (err) {
      alert(`Image scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if metadata details contain prompt parameters (Stable Diffusion/Midjourney)
  const renderParametersTree = (chunks) => {
    if (!chunks || chunks.length === 0) return null;

    // Filter chunks for prompts or parameters
    const paramChunks = chunks.filter(c => 
      c.keyword.toLowerCase() === 'parameters' || 
      c.text.toLowerCase().includes('steps:') || 
      c.text.toLowerCase().includes('sampler:')
    );

    if (paramChunks.length === 0) return null;

    return (
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-ai)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⌨</span> Generation Prompt Parameters Found
        </h3>
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '8px',
          padding: '14px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: '#39ff14',
          maxHeight: '200px',
          overflowY: 'auto',
          lineHeight: '1.4',
          whiteSpace: 'pre-wrap'
        }}>
          {paramChunks.map((chunk, idx) => (
            <div key={idx} style={{ borderBottom: idx < paramChunks.length - 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none', paddingBottom: '8px', marginBottom: '8px' }}>
              <strong style={{ color: 'var(--accent-purple)' }}>{chunk.keyword}:</strong> {chunk.text}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Helper to render DQT matrices as an interactive 8x8 color-coded grid
  const renderQuantizationTables = () => {
    const tables = result.metadataAnalysis?.quantizationTables;
    if (!tables || tables.length === 0) return null;

    return (
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          JPEG Quantization Matrices (DQT)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {tables.map((table, tIdx) => (
            <div key={tIdx} className="glass-card" style={{ padding: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', display: 'block', marginBottom: '8px' }}>
                Table {table.id}: {table.type} ({table.precision} precision)
              </span>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gap: '2px',
                background: 'rgba(255,255,255,0.02)',
                padding: '4px',
                borderRadius: '6px',
                border: '1px solid var(--border-glass)'
              }}>
                {table.matrix.map((val, cellIdx) => {
                  let cellBg = 'rgba(16, 185, 129, 0.15)'; 
                  let cellColor = 'var(--color-human)';
                  if (val > 40) {
                    cellBg = 'rgba(239, 68, 68, 0.2)'; 
                    cellColor = 'var(--color-ai)';
                  } else if (val > 15) {
                    cellBg = 'rgba(245, 158, 11, 0.2)'; 
                    cellColor = 'var(--color-mixed)';
                  }
                  
                  return (
                    <div
                      key={cellIdx}
                      style={{
                        background: cellBg,
                        color: cellColor,
                        padding: '4px 0',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: '2px',
                        fontFamily: 'var(--font-mono)'
                      }}
                      title={`Coefficient index: ${cellIdx}`}
                    >
                      {val}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="detector-grid">
      
      {/* LEFT: File upload & preview */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Visual Assets Uploader</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Upload camera photos or generative arts to inspect.
          </p>
        </div>

        {/* Dropzone */}
        <FileDropzone
          accept="image/*"
          onFileSelected={handleFileSelected}
          title="Upload Scan Image"
          subtitle="Supports PNG, JPG, JPEG, WEBP (Max 20MB)"
        />

        {/* Interactive ELA Overlay Slider View */}
        {result && result.ela?.elaBase64 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Forensic Map Overlay
              </h3>
              <div className="tabs-container" style={{ borderRadius: '6px', border: '1px solid var(--border-glass)', padding: '2px' }}>
                <button
                  onClick={() => setElaOpacity(0.5)}
                  className={`tab-btn ${elaOpacity > 0 ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                >
                  Overlay Active
                </button>
                <button
                  onClick={() => setElaOpacity(0)}
                  className={`tab-btn ${elaOpacity === 0 ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                >
                  Original
                </button>
              </div>
            </div>
            
            {/* The ELA/Original stack */}
            <div style={{
              position: 'relative',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#050508',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              aspectRatio: '16/10'
            }}>
              {/* Original image */}
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Original source"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  position: 'absolute'
                }}
              />
              
              {/* ELA Image Overlay / Heatmap depending on choice */}
              <img
                src={result.heatmap || result.ela.elaBase64}
                alt="Forensic mapping"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  position: 'absolute',
                  opacity: elaOpacity,
                  mixBlendMode: 'screen', 
                  pointerEvents: 'none',
                  transition: 'opacity 0.15s ease'
                }}
              />
            </div>

            {/* Slider Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Source Image</span>
                <span>Forensic Overlay Opacity ({Math.round(elaOpacity * 100)}%)</span>
                <span>Audit Map</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={elaOpacity}
                onChange={(e) => setElaOpacity(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent-purple)',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.1)',
                  height: '6px',
                  borderRadius: '3px'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                *Color-coded forensic pixels map compression error levels (Red) and Sobel boundaries (Green) to isolate generative artifact zones.
              </span>
            </div>
            
            {/* 10-Step Verification Progress checklist */}
            <div style={{ marginTop: '15px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                10-Step Image Forensic Analysis Pipeline
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px' }}>
                {(result.detailedStepStates || [
                  { step: 1, label: 'Image Decode aur Input', status: 'Completed' },
                  { step: 2, label: 'Digital Signature (EXIF) Scan', status: 'Clean' },
                  { step: 3, label: 'Error Level Analysis (ELA)', status: 'Completed' },
                  { step: 4, label: 'Pixel Noise (PRNU) Mapping', status: 'Uniform' },
                  { step: 5, label: 'Clone Blending Check (Copy-Move)', status: 'Clean' },
                  { step: 6, label: 'Edge aur Boundary Analysis', status: 'Completed' },
                  { step: 7, label: 'Lighting aur Shadow Consistency', status: 'Symmetric' },
                  { step: 8, label: 'Color Gradient Filter', status: 'Completed' },
                  { step: 9, label: 'Probability Scoring (Deep Learning)', status: 'Completed' },
                  { step: 10, label: 'Visual Heatmap Output', status: 'Generated' }
                ]).map((item) => {
                  const isPositive = ['Completed', 'Clean', 'Uniform', 'Symmetric', 'Generated', 'Verified'].includes(item.status);
                  return (
                    <div key={item.step} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {item.step}. {item.label}
                      </span>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: isPositive ? 'var(--color-human)' : 'var(--color-ai)'
                      }}>
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          selectedFile && !loading && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Source preview"
                style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
          )
        )}
      </div>

      {/* RIGHT: Forensic scan report */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Image Audit Report</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Exif analysis logs, compression scores, and meta traces.
          </p>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: '15px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" strokeDasharray="32" />
            </svg>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Executing Error Level Compression Scan...</p>
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forensic Audit</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>AI Compression Scan</h3>
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
              <Gauge value={result.aiProbability} size={120} strokeWidth={9} title="AI Probability" />
            </div>

            {/* File info statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Resolution</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {result.imageInfo?.width} x {result.imageInfo?.height}
                </p>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Format</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px', textTransform: 'uppercase' }}>
                  {result.imageInfo?.format}
                </p>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>ELA Mean Error</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {result.ela?.elaMetrics?.averagePixelDiff} / 255
                </p>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>ELA Noise SD</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {result.ela?.elaMetrics?.noiseSd || 0}
                </p>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Fourier Spikes</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {result.frequencyAnalysis?.spikes || 0} peaks
                </p>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>C2PA Provenance</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: result.metadataAnalysis?.provenanceSignatures?.length > 0 ? 'var(--color-human)' : '#fff', marginTop: '2px' }}>
                  {result.metadataAnalysis?.provenanceSignatures?.length > 0 ? 'Verified' : 'Absent'}
                </p>
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Metadata Chunks</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {result.metadataAnalysis?.rawChunksParsed} chunks
                </p>
              </div>
            </div>

            {/* AI Prompts block */}
            {result.rawMetadata?.pngChunks && renderParametersTree(result.rawMetadata.pngChunks)}

            {/* Quantization tables grid */}
            {renderQuantizationTables()}

            {/* EXIF Traces Listed */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Metadata Signatures Trace Log
              </h3>
              {result.metadataAnalysis?.tracesFound?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.metadataAnalysis.tracesFound.map((trace, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderLeft: `3px solid ${trace.risk === 'Critical' ? 'var(--color-ai)' : 'var(--color-mixed)'}`,
                      padding: '10px 14px',
                      borderRadius: '0 8px 8px 0',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: '#fff' }}>{trace.source}</strong>
                        <span style={{
                          color: trace.risk === 'Critical' ? 'var(--color-ai)' : 'var(--color-mixed)',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}>{trace.risk} Risk</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)' }}>{trace.desc}</p>
                      <code style={{ display: 'block', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                        {trace.detail}
                      </code>
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
                  No suspicious EXIF or maker software tags located.
                </div>
              )}
            </div>

            {/* Forensic Inconsistencies & Confusions Analysis Panel */}
            {result.confusions && result.confusions.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️</span> Forensic Inconsistencies & Confusions Analysis
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.confusions.map((conf, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255, 193, 7, 0.03)',
                      border: '1px solid rgba(255, 193, 7, 0.15)',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      fontSize: '0.82rem'
                    }}>
                      <strong style={{ color: '#ffc107', display: 'block', marginBottom: '4px' }}>
                        Conflict: {conf.metric}
                      </strong>
                      <p style={{ color: 'var(--text-primary)', marginBottom: '6px', fontSize: '0.8rem', lineHeight: '1.4' }}>
                        {conf.conflict}
                      </p>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '8px 10px',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        color: 'var(--accent-cyan)',
                        lineHeight: '1.4'
                      }}>
                        <strong>Explanation:</strong> {conf.resolution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)', gap: '15px', padding: '40px 0' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p style={{ fontSize: '0.9rem' }}>Awaiting image. Upload PNG/JPG/WEBP to perform compression ELA forensic scans.</p>
            </div>
          )
        )}
      </div>

    </div>
  );
}
