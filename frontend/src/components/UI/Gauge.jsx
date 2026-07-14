import React from 'react';

/**
 * Animated SVG circular gauge.
 * Color-codes based on risk thresholds: Red (high AI), Yellow (mixed), Green (low AI).
 * @param {Object} props
 * @param {number} props.value - Percentage value (0 - 100)
 * @param {number} props.size - Pixel dimensions
 * @param {number} props.strokeWidth - Circle thickness
 * @param {string} props.title - Label display
 */
export default function Gauge({ value = 0, size = 120, strokeWidth = 10, title }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  // Color selection based on threshold
  let strokeColor = 'var(--color-human)';
  let glowColor = 'var(--color-human-glow)';
  
  if (value >= 70) {
    strokeColor = 'var(--color-ai)';
    glowColor = 'var(--color-ai-glow)';
  } else if (value >= 40) {
    strokeColor = 'var(--color-mixed)';
    glowColor = 'var(--color-mixed-glow)';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.8s ease-in-out',
              filter: `drop-shadow(0 0 4px ${glowColor})`
            }}
          />
        </svg>
        {/* Percentage Label */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)'
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{value}%</span>
          {title && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>}
        </div>
      </div>
    </div>
  );
}
