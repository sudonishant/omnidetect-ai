import React, { useState } from 'react';
import Gauge from './UI/Gauge';
import FilterPanel from './UI/FilterPanel';
import { humanizeTextWithAI } from '../services/openRouterService';
import { generateReport } from '../services/reportGenerator';
import { createHighlightedPdf } from '../services/pdfAnnotator';

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

export default function ScanResultsPage({ scanResult, onReset, originalFile }) {
  const [filters, setFilters] = useState({
    excludeQuotes: true,
    excludeReferences: true,
    excludeShort: true,
    sensitivityThreshold: 50
  });

  const [humanizingIndex, setHumanizingIndex] = useState(null);
  const [humanizedResults, setHumanizedResults] = useState({});
  const [comparisonBlock, setComparisonBlock] = useState(null);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const {
    scanId,
    fileName,
    aiSimilarityIndex,
    totalBlocks,
    flaggedBlocks,
    excludedBlocks,
    totalWords,
    verdict,
    cached,
    proMode,
    blocks = [],
    aiAuditExplanation
  } = scanResult;

  const handleHumanize = async (block) => {
    setHumanizingIndex(block.blockIndex);
    try {
      const data = await humanizeTextWithAI(block.text, proMode);
      setHumanizedResults(prev => ({
        ...prev,
        [block.blockIndex]: data
      }));
      setComparisonBlock(block);
    } catch (err) {
      alert(`Humanization failed: ${err.message}`);
    } finally {
      setHumanizingIndex(null);
    }
  };

  const downloadReportLocal = async () => {
    setIsDownloadingReport(true);
    try {
      const pdfBytes = await generateReport(scanResult);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.[^/.]+$/, "")}_forensic_report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Failed to generate PDF report: ${err.message}`);
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const downloadHighlightedPdfLocal = async () => {
    if (!originalFile || originalFile.type !== 'application/pdf') {
      alert('Highlighted PDF feature is only supported when scanning an original PDF document.');
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const arrayBuffer = await originalFile.arrayBuffer();
      const highlightedBytes = await createHighlightedPdf(arrayBuffer, blocks, {
        threshold: filters.sensitivityThreshold
      });
      const blob = new Blob([highlightedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName.replace(/\.[^/.]+$/, "")}_highlighted.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Failed to annotate PDF: ${err.message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Filter text blocks
  const visibleBlocks = blocks.map(block => {
    let exclude = block.exclude;
    let excludeReason = block.excludeReason;

    if (!filters.excludeQuotes && excludeReason === 'quote') {
      exclude = false;
      excludeReason = null;
    }
    if (!filters.excludeReferences && excludeReason === 'references') {
      exclude = false;
      excludeReason = null;
    }
    if (!filters.excludeShort && excludeReason === 'too_short') {
      exclude = false;
      excludeReason = null;
    }

    return {
      ...block,
      exclude,
      excludeReason
    };
  });

  // Flagged sentences (above threshold, not excluded)
  const flaggedVisible = visibleBlocks.filter(b =>
    !b.exclude &&
    b.aiProbability !== null &&
    b.aiProbability >= filters.sensitivityThreshold
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
            onClick={downloadReportLocal}
            disabled={isDownloadingReport}
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            {isDownloadingReport ? 'Generating...' : '⬇ Download Report'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={downloadHighlightedPdfLocal}
            disabled={isDownloadingPdf || !originalFile || originalFile.type !== 'application/pdf'}
            style={{ fontSize: '0.8rem', padding: '8px 16px', opacity: (originalFile && originalFile.type === 'application/pdf') ? 1 : 0.4 }}
          >
            {isDownloadingPdf ? 'Annotating...' : '⬇ Highlighted PDF'}
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
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                        via {block.model}
                      </span>
                    )}
                    
                    {/* AI Hatoo / Humanizer button */}
                    {isFlagged && !block.exclude && (
                      <button
                        onClick={() => {
                          if (humanizedResults[block.blockIndex]) {
                            setComparisonBlock(block);
                          } else {
                            handleHumanize(block);
                          }
                        }}
                        disabled={humanizingIndex !== null}
                        style={{
                          background: 'rgba(0, 200, 255, 0.1)',
                          border: '1px solid rgba(0, 200, 255, 0.3)',
                          borderRadius: '4px',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          cursor: 'pointer',
                          marginLeft: 'auto',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {humanizingIndex === block.blockIndex ? (
                          <>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '1px solid var(--accent-cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'shiver-effect 1s infinite linear' }} />
                            Removing AI...
                          </>
                        ) : humanizedResults[block.blockIndex] ? (
                          '✨ View Humanized'
                        ) : (
                          '✨ AI Hatoo'
                        )}
                      </button>
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
                      fontSize: '0.7rem', fontWeight: 700, color: getProbColor(block.aiProbability)
                    }}>
                      AI: {block.aiProbability.toFixed(1)}%
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#e4e4e7', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                    {block.text.length > 150 ? block.text.substring(0, 150) + '...' : block.text}
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => {
                        if (humanizedResults[block.blockIndex]) {
                          setComparisonBlock(block);
                        } else {
                          handleHumanize(block);
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.65rem', padding: '4px 10px', width: '100%' }}
                    >
                      {humanizedResults[block.blockIndex] ? '✨ View Humanized Comparison' : '✨ Humanize with AI'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════ BOTTOM PANEL: AI Forensic Explainer ════════ */}
      {aiAuditExplanation && (
        <div className="glass-panel" style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🔍</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Linguistic Forensic Audit</h3>
          </div>
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
            {renderMarkdown(aiAuditExplanation)}
          </div>
        </div>
      )}

      {/* Comparison Modal for Original vs Humanized */}
      {comparisonBlock && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '900px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border-glass)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>AI Bypass & Humanizer (Block #{comparisonBlock.blockIndex + 1})</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Rewritten to bypass classifiers and match natural human speech patterns.
                </p>
              </div>
              <button
                onClick={() => setComparisonBlock(null)}
                style={{
                  background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem',
                  cursor: 'pointer', opacity: 0.7, hover: { opacity: 1 }
                }}
              >
                ×
              </button>
            </div>

            {/* Comparison panels */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '24px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px'
            }}>
              {/* Original */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-ai)', textTransform: 'uppercase' }}>Original Block (AI: {comparisonBlock.aiProbability?.toFixed(1)}%)</span>
                <div style={{
                  flex: 1, padding: '16px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,69,58,0.15)', borderRadius: '8px',
                  fontSize: '0.85rem', lineHeight: '1.6', color: '#e4e4e7', whiteSpace: 'pre-wrap'
                }}>
                  {comparisonBlock.text}
                </div>
              </div>

              {/* Humanized */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-human)', textTransform: 'uppercase' }}>Humanized / Bypassed Text (AI: 0%)</span>
                <div style={{
                  flex: 1, padding: '16px', background: 'rgba(48,209,88,0.03)',
                  border: '1px solid rgba(48,209,88,0.2)', borderRadius: '8px',
                  fontSize: '0.85rem', lineHeight: '1.6', color: '#fff', whiteSpace: 'pre-wrap',
                  position: 'relative'
                }}>
                  {humanizedResults[comparisonBlock.blockIndex]?.text}
                </div>
              </div>
            </div>

            {/* Footer with copy button */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--border-glass)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Method: {humanizedResults[comparisonBlock.blockIndex]?.method}
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setComparisonBlock(null)}
                  style={{ fontSize: '0.75rem', padding: '6px 14px' }}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(humanizedResults[comparisonBlock.blockIndex]?.text || '');
                    alert('Copied humanized text to clipboard!');
                  }}
                  style={{ fontSize: '0.75rem', padding: '6px 14px' }}
                >
                  📋 Copy Humanized Text
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
