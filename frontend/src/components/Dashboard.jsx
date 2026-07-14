import React from 'react';

/**
 * Immersive central dashboard.
 * Renders stats, detection ratio distributions, and category shortcuts.
 * @param {Object} props
 * @param {Object} props.stats - { textScans, imageScans, audioScans, metadataScans, aiCount, humanCount }
 * @param {Function} props.setTab - Transition handler
 */
export default function Dashboard({ stats, setTab }) {
  const totalScans = stats.textScans + stats.imageScans + stats.audioScans + stats.metadataScans;
  const aiRatio = totalScans > 0 ? Math.round((stats.aiCount / totalScans) * 100) : 0;
  const humanRatio = totalScans > 0 ? Math.round((stats.humanCount / totalScans) * 100) : 0;
  const mixedRatio = totalScans > 0 ? 100 - aiRatio - humanRatio : 0;

  const categories = [
    {
      id: 'text',
      title: 'Linguistic Detector',
      desc: 'Analyze documents (PDF, DOCX, TXT) or raw copy for writing predictability, syntax burstiness, and GPTZero models.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      count: stats.textScans
    },
    {
      id: 'image',
      title: 'Visual Forensics',
      desc: 'Verify images (PNG, JPG, WEBP) utilizing JPEG Error Level Analysis (ELA) and custom binary prompt chunk parsing.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      ),
      count: stats.imageScans
    },
    {
      id: 'audio',
      title: 'Acoustic Deepfake Scan',
      desc: 'Audit audio format codecs and tags for synthetic generators (Suno, Udio, ElevenLabs) with spectral anomaly scanning.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      ),
      count: stats.audioScans
    },
    {
      id: 'metadata',
      title: 'Metadata Deep Scanner',
      desc: 'Parse and explore internal headers, properties, tags, and cryptographic hashes of any file format for AI signatures.',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
      count: stats.metadataScans
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '30px',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'var(--accent-purple-glow)',
          filter: 'blur(80px)',
          borderRadius: '50%'
        }} />
        
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '10px', background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          OmniDetect AI
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '650px', lineHeight: '1.6' }}>
          Multi-modal digital forensics suite. Seamlessly scan text, documents, images, audio files, and raw file metadata to detect AI generation traces, prompt injections, and deepfakes.
        </p>
      </div>

      {/* Grid of Statistics and Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Metric Cards Summary */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent-purple)' }}>●</span> Scan Activity Log
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{totalScans}</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>Total Scans</p>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-ai)' }}>{stats.aiCount}</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>AI Flagged</p>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-human)' }}>{stats.humanCount}</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>Human Verified</p>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-mixed)' }}>{totalScans - stats.aiCount - stats.humanCount}</span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>Mixed / Suspect</p>
            </div>
          </div>
        </div>

        {/* Dynamic ratio visualizer */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>●</span> Detection Ratio
          </h2>
          
          {totalScans > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', height: '100%' }}>
              {/* Stacked Percentage Bar */}
              <div style={{ height: '24px', width: '100%', borderRadius: '12px', overflow: 'hidden', display: 'flex', background: 'rgba(255, 255, 255, 0.05)' }}>
                {aiRatio > 0 && <div style={{ width: `${aiRatio}%`, background: 'var(--color-ai)', transition: 'width 0.5s' }} />}
                {humanRatio > 0 && <div style={{ width: `${humanRatio}%`, background: 'var(--color-human)', transition: 'width 0.5s' }} />}
                {mixedRatio > 0 && <div style={{ width: `${mixedRatio}%`, background: 'var(--color-mixed)', transition: 'width 0.5s' }} />}
              </div>

              {/* Ratios Breakdown Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', background: 'var(--color-ai)', borderRadius: '50%' }} />
                  <span>AI Gen: <strong>{aiRatio}%</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', background: 'var(--color-human)', borderRadius: '50%' }} />
                  <span>Human: <strong>{humanRatio}%</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', background: 'var(--color-mixed)', borderRadius: '50%' }} />
                  <span>Mixed: <strong>{mixedRatio}%</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '10px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="18" cy="18" r="3" />
                <path d="M18 20a6 6 0 0 0-12 0" />
                <circle cx="12" cy="10" r="4" />
              </svg>
              <p style={{ fontSize: '0.85rem' }}>Perform scans to visualize metadata distributions.</p>
            </div>
          )}
        </div>

      </div>

      {/* Grid of category tiles */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px' }}>Forensic Sub-Modules</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="glass-panel"
              onClick={() => setTab(cat.id)}
              style={{
                padding: '24px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '15px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--accent-purple)' }}>{cat.icon}</div>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                  {cat.count} scanned
                </span>
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  {cat.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {cat.desc}
                </p>
              </div>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '10px'
              }}>
                Launch Scan Module 
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
