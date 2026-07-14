import React from 'react';

/**
 * Multi-dimensional SVG radar (spider) chart.
 * Compares current scan metrics against preset profiles for Human, ChatGPT, and Claude.
 * @param {Object} props
 * @param {Object} props.metrics - Object containing { perplexity, burstiness, lexicalRichness, flaggedWordsCount }
 * @param {number} props.aiProbability - Computed overall probability
 * @param {number} props.size - Canvas/SVG dimensions
 */
export default function RadarChart({ metrics, aiProbability, size = 300 }) {
  const center = size / 2;
  const radius = (size / 2) * 0.75;
  const numAxes = 5;
  const axesNames = [
    'Predictability', // Inverse of perplexity
    'Sentence Uniformity', // Inverse of burstiness
    'Vocabulary Density', // Lexical richness (TTR)
    'AI Buzzwords', // Flagged words
    'Formatting Repetitiveness' // Heuristic uniformity
  ];

  // Calculate coordinates for value on specific axis
  const getCoordinates = (index, value) => {
    // value expected between 0 and 100
    const val = Math.max(5, Math.min(100, value));
    const angle = (Math.PI * 2 / numAxes) * index - Math.PI / 2;
    const x = center + (radius * val / 100) * Math.cos(angle);
    const y = center + (radius * val / 100) * Math.sin(angle);
    return { x, y };
  };

  // Preset profiles for comparison
  const profiles = {
    human: [35, 30, 80, 10, 20],      // High vocab, low uniformity, low buzzwords
    chatgpt: [85, 80, 45, 75, 70],    // High predictability, high uniformity, high buzzwords
    claude: [70, 75, 55, 65, 60],     // Moderate/high indices
    // Current Scan
    current: [
      aiProbability, // Predictability rating
      Math.max(10, Math.min(95, metrics.uniformity || 50)),
      Math.max(10, Math.min(95, metrics.lexicalRichness || 40)),
      Math.max(10, Math.min(95, (metrics.flaggedWordsCount || 0) * 15)),
      Math.max(10, Math.min(95, metrics.repetition || 35))
    ]
  };

  // Convert array values to SVG polygon points list
  const getPolygonPoints = (values) => {
    return values.map((val, i) => {
      const { x, y } = getCoordinates(i, val);
      return `${x},${y}`;
    }).join(' ');
  };

  // Helper for background grids (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Background Grid Rings */}
        {gridLevels.map((lvl) => {
          const points = Array.from({ length: numAxes }).map((_, i) => {
            const { x, y } = getCoordinates(i, lvl);
            return `${x},${y}`;
          }).join(' ');
          
          return (
            <polygon
              key={lvl}
              points={points}
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axes Lines */}
        {Array.from({ length: numAxes }).map((_, i) => {
          const outer = getCoordinates(i, 100);
          const labelPos = getCoordinates(i, 115);
          
          // Determine text anchor adjustments for labels
          let textAnchor = 'middle';
          if (labelPos.x < center - 10) textAnchor = 'end';
          if (labelPos.x > center + 10) textAnchor = 'start';

          return (
            <g key={i}>
              <line
                x1={center}
                y1={center}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
              <text
                x={labelPos.x}
                y={labelPos.y + (labelPos.y > center ? 5 : -2)}
                fill="var(--text-secondary)"
                fontSize="0.75rem"
                fontWeight="500"
                fontFamily="var(--font-sans)"
                textAnchor={textAnchor}
              >
                {axesNames[i]}
              </text>
            </g>
          );
        })}

        {/* Human Benchmark Polygon */}
        <polygon
          points={getPolygonPoints(profiles.human)}
          fill="rgba(16, 185, 129, 0.04)"
          stroke="rgba(16, 185, 129, 0.25)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* ChatGPT Benchmark Polygon */}
        <polygon
          points={getPolygonPoints(profiles.chatgpt)}
          fill="rgba(6, 182, 212, 0.03)"
          stroke="rgba(6, 182, 212, 0.25)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* Current Scan Polygon */}
        <polygon
          points={getPolygonPoints(profiles.current)}
          fill="rgba(139, 92, 246, 0.25)"
          stroke="var(--accent-purple)"
          strokeWidth="2.5"
          style={{
            filter: 'drop-shadow(0 0 6px var(--accent-purple-glow))',
            transition: 'all 0.5s ease-in-out'
          }}
        />

        {/* Dynamic dots for current scan vertices */}
        {profiles.current.map((val, i) => {
          const { x, y } = getCoordinates(i, val);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="#fff"
              stroke="var(--accent-purple)"
              strokeWidth="2"
              style={{ transition: 'all 0.5s ease-in-out' }}
            />
          );
        })}
      </svg>

      {/* Legend Indicators */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        fontSize: '0.75rem',
        marginTop: '-10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', background: 'var(--accent-purple)', borderRadius: '2px' }} />
          <span style={{ color: 'var(--text-primary)' }}>Current Document</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', border: '1px dashed var(--color-human)', borderRadius: '2px' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Human Average</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', border: '1px dashed var(--accent-cyan)', borderRadius: '2px' }} />
          <span style={{ color: 'var(--text-secondary)' }}>AI Average</span>
        </div>
      </div>
    </div>
  );
}
