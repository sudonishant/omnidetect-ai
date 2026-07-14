import React, { useState } from 'react';
import { BACKEND_URL } from '../config';
import Gauge from './UI/Gauge';
import FilterPanel from './UI/FilterPanel';

/**
 * Render markdown-like text with headers and bold.
 */
function renderMarkdown(text) {
  if (!text) return null;
  return text.split('\n').map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} style={{ height: '6px' }} />;
    if (trimmed.startsWith('## ')) {
      return <h4 key={idx} style={{ color: '#fff', margin: '10px 0 4px 0', fontSize: '0.95rem', fontWeight: 700 }}>{trimmed.replace('## ', '')}</h4>;
    }
    if (trimmed.startsWith('# ')) {
      return <h3 key={idx} style={{ color: '#fff', margin: '10px 0 4px 0', fontSize: '1.05rem', fontWeight: 800 }}>{trimmed.replace('# ', '')}</h3>;
    }
    const parts = trimmed.split(/(\*\*.*?\*\*)/g);
    return (
      <p key={idx} style={{ margin: '3px 0', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} style={{ color: 'var(--accent-cyan)' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
      </p>
    );
  });
}

/**
 * Get color for AI probability.
 */
function getProbColor(prob) {
  if (prob >= 70) return 'var(--color-ai)';
  if (prob >= 50) return 'var(--color-mixed)';
  return 'var(--color-human)';
}

export default function ScanResultsPage({ scanResult, onReset }) {
  const [filters, setFilters] = useState({
    excludeQuotes: true,
    excludeReferences: true,
    excludeShort: true,
    sensitivityThreshold: 50
  });

  if (!scanResult) return null;

  const {
    scanId, fileName, aiSimilarityIndex, verdict,
    blocks = [], totalBlocks, flaggedBlocks, excludedBlocks,
    totalWords, aiAuditExplanation, cached, proMode
  } = scanResult;

  // Apply client-side filters to blocks for display
  const visibleBlocks = blocks.filter(block => {
    if (filters.excludeQuotes && block.excludeReason === 'quote') return false;
    if (filters.excludeReferences && block.excludeReason === 'references') return false;
    if (filters.excludeShort && block.excludeReason === 'too_short') return false;
    return true;
  });

  const flaggedVisible = visibleBlocks.filter(b =>
    !b.exclude && b.aiProbability !== null && b.aiProbability >= filters.sensitivityThreshold
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ════════ TOP BAR ════════ */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '20px'
      }}>
        {/* Gauge */}
        <Gauge value={Math.round(aiSimilarityIndex)} size={110} strokeWidth={10} title="AI Index" />

        {/* File info & stats */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <h2 style={{
              fontSize: '1.2rem', fontWeight: 800, margin: 0,
              color: aiSimilarityIndex >= 70 ? 'var(--color-ai)' : (aiSimilarityIndex >= 40 ? 'var(--color-mixed)' : 'var(--color-human)')
            }}>
              {verdict}
            </h2>
            {cached && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px',
                borderRadius: '6px', background: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>CACHED</span>
            )}
            {proMode && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px',
                borderRadius: '6px', background: 'rgba(0, 200, 255, 0.15)',
                color: 'var(--accent-cyan)', border: '1px solid rgba(0, 200, 255, 0.3)'
              }}>PRO MODE</span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
            {fileName}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              { label: 'Blocks', value: totalBlocks, color: '#fff' },
              { label: 'Flagged', value: flaggedBlocks, color: 'var(--color-ai)' },
              { label: 'Excluded', value: excludedBlocks, color: 'var(--text-secondary)' },
              { label: 'Words', value: totalWords?.toLocaleString(), color: 'var(--accent-cyan)' }
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                borderRadius: '8px', padding: '6px 12px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Download buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          <button
            className="btn btn-primary"
            onClick={() => window.open(`${BACKEND_URL}/api/scan/${scanId}/download/report`, '_blank')}
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            ⬇ Download Report
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => window.open(`${BACKEND_URL}/api/scan/${scanId}/download/highlighted`, '_blank')}
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            ⬇ Highlighted PDF
          </button>
          <button
            className="btn btn-secondary"
            onClick={onReset}
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            ↻ Scan Another
          </button>
        </div>
      </div>

      {/* ════════ FILTER BAR ════════ */}
      <FilterPanel filters={filters} onFilterChange={setFilters} />

      {/* ════════ MAIN CONTENT: Side-by-Side ════════ */}
      <div className="detector-grid">

        {/* LEFT: Text with inline highlights */}
        <div className="glass-panel" style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Document Analysis
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visibleBlocks.map((block, idx) => {
              const prob = block.aiProbability;
              const isFlagged = !block.exclude && prob !== null && prob >= filters.sensitivityThreshold;
              const bgColor = block.exclude
                ? 'rgba(255,255,255,0.02)'
                : isFlagged
                  ? prob > 90
                    ? 'rgba(0, 255, 255, 0.08)'
                    : prob > 70
                      ? 'rgba(255, 165, 0, 0.08)'
                      : 'rgba(255, 255, 0, 0.06)'
                  : 'rgba(48, 209, 88, 0.04)';

              const borderColor = block.exclude
                ? 'var(--border-glass)'
                : isFlagged
                  ? prob > 90
                    ? 'rgba(0, 255, 255, 0.3)'
                    : prob > 70
                      ? 'rgba(255, 165, 0, 0.3)'
                      : 'rgba(255, 255, 0, 0.25)'
                  : 'rgba(48, 209, 88, 0.15)';

              return (
                <div key={idx} style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  borderLeft: `3px solid ${block.exclude ? 'var(--text-secondary)' : (isFlagged ? getProbColor(prob) : 'var(--color-human)')}`
                }}>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: block.exclude ? 'var(--text-secondary)' : '#e4e4e7', margin: 0 }}>
                    {block.text}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                      background: 'rgba(0,200,255,0.1)', color: 'var(--accent-cyan)'
                    }}>
                      #{block.blockIndex + 1}
                    </span>
                    {block.exclude ? (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)'
                      }}>
                        Excluded: {block.excludeReason}
                      </span>
                    ) : prob !== null ? (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                        background: isFlagged ? 'rgba(255,69,58,0.15)' : 'rgba(48,209,88,0.1)',
                        color: getProbColor(prob)
                      }}>
                        AI: {prob.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)'
                      }}>
                        Pending
                      </span>
                    )}
                    {block.model && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                        via {block.model}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Flagged sentences list */}
        <div className="glass-panel" style={{ padding: '20px', maxHeight: '600px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Flagged Blocks ({flaggedVisible.length})
          </h3>
          {flaggedVisible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <span style={{ fontSize: '2rem' }}>✅</span>
              <p style={{ color: 'var(--color-human)', fontSize: '0.9rem', fontWeight: 600, marginTop: '10px' }}>
                No blocks flagged above {filters.sensitivityThreshold}% threshold
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {flaggedVisible
                .sort((a, b) => (b.aiProbability || 0) - (a.aiProbability || 0))
                .map((block, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  borderLeft: `3px solid ${getProbColor(block.aiProbability)}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                      background: 'rgba(0,200,255,0.1)', color: 'var(--accent-cyan)'
                    }}>
                      Block #{block.blockIndex + 1}
                    </span>
                    <span style={{
                      fontSize: '0.85rem', fontWeight: 800,
                      color: getProbColor(block.aiProbability)
                    }}>
                      {block.aiProbability?.toFixed(1)}%
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', lineHeight: '1.5', color: '#e4e4e7', margin: 0 }}>
                    {block.text.substring(0, 150)}{block.text.length > 150 ? '...' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════ AI AUDIT SECTION ════════ */}
      {aiAuditExplanation && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {proMode ? 'Pro Deep Audit Report' : 'AI Deep Audit Summary'}
            </span>
          </div>
          <div style={{
            background: 'rgba(10, 132, 255, 0.03)',
            border: '1px solid rgba(10, 132, 255, 0.18)',
            borderRadius: '12px',
            padding: '16px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {renderMarkdown(aiAuditExplanation)}
          </div>
        </div>
      )}
    </div>
  );
}
