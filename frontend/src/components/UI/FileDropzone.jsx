import React, { useState, useRef } from 'react';

/**
 * Reusable animated file drag and drop zone.
 * @param {Object} props
 * @param {string} props.accept - Allowed file formats/mimetypes
 * @param {Function} props.onFileSelected - Callback (File)
 * @param {string} props.title - Action label
 * @param {string} props.subtitle - Size and type constraints
 * @param {React.ReactNode} props.icon - Custom SVG icon
 */
export default function FileDropzone({ accept, onFileSelected, title, subtitle, icon }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      onFileSelected(file);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onFileSelected(file);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    onFileSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
      style={{
        width: '100%',
        padding: '30px 20px',
        border: '2px dashed var(--border-glass)',
        borderRadius: '12px',
        background: isDragActive ? 'rgba(139, 92, 246, 0.05)' : 'rgba(0, 0, 0, 0.15)',
        borderColor: isDragActive ? 'var(--accent-purple)' : 'var(--border-glass)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        textAlign: 'center',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isDragActive ? '0 0 15px var(--accent-purple-glow)' : 'none',
        position: 'relative'
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      
      {selectedFile ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
          {/* File Selected View */}
          <div style={{
            background: 'var(--accent-purple-glow)',
            color: '#fff',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', wordBreak: 'break-all' }}>
            {selectedFile.name}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || 'Unknown Type'}
          </span>
          <button
            onClick={clearSelection}
            style={{
              marginTop: '10px',
              padding: '4px 12px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--color-ai)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Remove File
          </button>
        </div>
      ) : (
        <>
          {/* Default View */}
          <div style={{ color: isDragActive ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>
            {icon || (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </div>
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
              {title || 'Drag and drop your file here'}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              or click to browse local files
            </p>
          </div>
          {subtitle && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {subtitle}
            </span>
          )}
        </>
      )}
    </div>
  );
}
