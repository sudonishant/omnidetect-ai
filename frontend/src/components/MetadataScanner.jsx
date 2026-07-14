import React, { useState } from 'react';
import FileDropzone from './UI/FileDropzone';

/**
 * Metadata Deep Forensic Scanner.
 * Extracts raw tags, prints key-value lists, and lets the user search and filter.
 * @param {Object} props
 * @param {Function} props.onScanLogged - Logging callback
 */
export default function MetadataScanner({ onScanLogged }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFileSelected = async (file) => {
    if (!file) {
      setResult(null);
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/detect/metadata', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server scan error');
      }

      const data = await response.json();
      setResult(data);
      onScanLogged(data.aiTraceFound ? 'ai' : 'human', 'metadata');
    } catch (err) {
      alert(`Metadata scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper to filter and render key-value parameters recursively
  const renderMetadataFields = (obj, query = '', path = '') => {
    if (!obj || typeof obj !== 'object') return null;

    const queryLower = query.toLowerCase().trim();
    const rows = [];

    const recurse = (currentObj, currentPath) => {
      for (const key in currentObj) {
        if (!Object.prototype.hasOwnProperty.call(currentObj, key)) continue;

        const val = currentObj[key];
        const newPath = currentPath ? `${currentPath} ➔ ${key}` : key;

        if (val && typeof val === 'object' && !Array.isArray(val)) {
          recurse(val, newPath);
        } else {
          const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
          
          // Apply search filter match on key or value
          if (!queryLower || newPath.toLowerCase().includes(queryLower) || displayVal.toLowerCase().includes(queryLower)) {
            rows.push(
              <tr key={newPath} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{
                  padding: '10px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: 'var(--accent-cyan)',
                  wordBreak: 'break-all',
                  verticalAlign: 'top',
                  width: '40%'
                }}>
                  {newPath}
                </td>
                <td style={{
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  wordBreak: 'break-all',
                  verticalAlign: 'top'
                }}>
                  {displayVal}
                </td>
              </tr>
            );
          }
        }
      }
    };

    recurse(obj, path);

    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {query ? 'No matching fields found for your search query.' : 'No metadata tags found in this file.'}
          </td>
        </tr>
      );
    }

    return rows;
  };

  return (
    <div className="detector-grid">
      
      {/* LEFT: File Selection & Flags */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Deep Inspect Scanner</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Upload *any* file format (ZIP, PDF, EXE, PNG, etc.) to scan binary headers.
          </p>
        </div>

        {/* Dropzone */}
        <FileDropzone
          accept="*"
          onFileSelected={handleFileSelected}
          title="Upload File to Scan"
          subtitle="Supports all formats (Max 30MB)"
        />

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', animation: 'fadeIn 0.4s ease' }}>
            
            {/* File info card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>File Forensics</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div>Name: <strong style={{ color: '#fff' }}>{result.fileName}</strong></div>
                <div>Size: <strong>{(result.fileSize / 1024).toFixed(1)} KB</strong></div>
                <div>Mime: <strong>{result.fileType || 'Unknown'}</strong></div>
              </div>
            </div>

            {/* Cryptographic Hashes */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Cryptographic Hashes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                <div>
                  <span style={{ color: 'var(--accent-purple)' }}>SHA-256:</span>
                  <code style={{ display: 'block', wordBreak: 'break-all', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {result.hashSha256}
                  </code>
                </div>
                <div>
                  <span style={{ color: 'var(--accent-purple)' }}>MD5:</span>
                  <code style={{ display: 'block', wordBreak: 'break-all', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {result.hashMd5}
                  </code>
                </div>
              </div>
            </div>

            {/* Risk Indicator Panel */}
            <div style={{
              padding: '14px',
              borderRadius: '8px',
              background: result.aiTraceFound ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${result.aiTraceFound ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
              color: result.aiTraceFound ? 'var(--color-ai)' : 'var(--color-human)',
              fontSize: '0.85rem'
            }}>
              {result.aiTraceFound ? (
                <div>
                  <strong>⚠ Suspicious AI footprint located!</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    This file contains explicit signatures matching typical generation software or model parameters.
                  </p>
                </div>
              ) : (
                <div>
                  <strong>✔ Metadata Clean</strong>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    No automated generative software stamps or AI signatures located in headers.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* RIGHT: JSON property lists with Search bar */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Metadata Tags Explorer</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Search, filter, and inspect structural key-value tags.
          </p>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, gap: '15px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" strokeDasharray="32" />
            </svg>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Extracting Binary Tag Headers...</p>
          </div>
        )}

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, animation: 'fadeIn 0.4s ease' }}>
            
            {/* Search filter input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags or values (e.g. Software, Creator, comment)..."
                className="form-input"
                style={{ paddingLeft: '38px', fontSize: '0.85rem' }}
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Suspect Tag Banner */}
            {result.suspectMatches?.length > 0 && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '8px',
                padding: '10px 14px'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ai)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flagged Signatures Found</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {result.suspectMatches.map((m, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(239,68,68,0.15)',
                      color: 'var(--color-ai)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                      border: '1px solid rgba(239,68,68,0.2)'
                    }}>{m}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Value Table list */}
            <div style={{
              flexGrow: 1,
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              background: 'rgba(0, 0, 0, 0.15)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tag Pathway</th>
                    <th style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {renderMetadataFields(result.extractedProperties, searchQuery)}
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)', gap: '15px', padding: '40px 0' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p style={{ fontSize: '0.9rem' }}>Awaiting file. Select any file format to inspect binary chunk logs.</p>
            </div>
          )
        )}
      </div>

    </div>
  );
}
