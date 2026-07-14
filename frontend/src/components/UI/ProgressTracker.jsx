import React from 'react';

export default function ProgressTracker({ progress, isVisible }) {
  if (!isVisible || !progress) return null;

  const { stage, percent = 0, message = '' } = progress;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border-glass)',
      borderRadius: '16px',
      padding: '24px',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      animation: 'fadeIn 0.3s ease'
    }}>
      {/* Progress bar */}
      <div style={{
        width: '100%',
        height: '6px',
        borderRadius: '3px',
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          borderRadius: '3px',
          background: 'linear-gradient(90deg, var(--accent-cyan), #6366f1)',
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 0 12px rgba(0, 200, 255, 0.4)'
        }} />
      </div>

      {/* Status text */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {stage !== 'complete' && stage !== 'error' && (
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--accent-cyan)',
              animation: 'pulse 1.5s infinite',
              display: 'inline-block'
            }} />
          )}
          {stage === 'complete' && '✓ '}
          {stage === 'error' && '✕ '}
          {message}
        </span>
        <span style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: percent === 100 ? 'var(--color-human)' : 'var(--accent-cyan)',
          fontFamily: 'var(--font-mono)'
        }}>
          {percent}%
        </span>
      </div>
    </div>
  );
}
