import React from 'react';

const toggleStyle = (active) => ({
  width: '40px', height: '22px', borderRadius: '12px',
  background: active ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
  border: 'none', cursor: 'pointer', position: 'relative',
  transition: 'background 0.3s', flexShrink: 0
});

const dotStyle = (active) => ({
  width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
  position: 'absolute', top: '3px',
  left: active ? '21px' : '3px',
  transition: 'left 0.3s'
});

function Toggle({ label, active, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        fontSize: '0.8rem',
        color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 400,
        whiteSpace: 'nowrap'
      }}>
        {label}
      </span>
      <button onClick={() => onChange(!active)} style={toggleStyle(active)}>
        <div style={dotStyle(active)} />
      </button>
    </div>
  );
}

export default function FilterPanel({ filters, onFilterChange }) {
  const update = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '20px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border-glass)',
      borderRadius: '12px',
      padding: '12px 18px',
      backdropFilter: 'blur(12px)'
    }}>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Filters
      </span>

      <Toggle label="Exclude Quotes" active={filters.excludeQuotes} onChange={(v) => update('excludeQuotes', v)} />
      <Toggle label="Exclude References" active={filters.excludeReferences} onChange={(v) => update('excludeReferences', v)} />
      <Toggle label="Exclude Short" active={filters.excludeShort} onChange={(v) => update('excludeShort', v)} />

      {/* Sensitivity threshold slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          Threshold:
        </span>
        <input
          type="range"
          min="30"
          max="95"
          value={filters.sensitivityThreshold}
          onChange={(e) => update('sensitivityThreshold', parseInt(e.target.value))}
          style={{
            width: '100px',
            accentColor: 'var(--accent-cyan)',
            cursor: 'pointer'
          }}
        />
        <span style={{
          fontSize: '0.8rem', fontWeight: 700,
          color: 'var(--accent-cyan)',
          fontFamily: 'var(--font-mono)',
          minWidth: '32px'
        }}>
          {filters.sensitivityThreshold}%
        </span>
      </div>
    </div>
  );
}
