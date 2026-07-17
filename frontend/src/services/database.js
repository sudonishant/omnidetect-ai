/**
 * database.js — Client-side scan history database.
 * Stores all scan history inside browser localStorage under the key 'omnidetect_scans'.
 * Stores generated PDF base64 contents directly in the record so they can be downloaded offline!
 */

const STORAGE_KEY = 'omnidetect_scans';

function getScans() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveScans(scans) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
}

export function initDatabase() {
  console.log('[Database] Browser LocalStorage DB ready.');
  return true;
}

export function findScanByHash(sha256Hash) {
  const scans = getScans();
  return scans.find(s => s.file_hash_sha256 === sha256Hash) || null;
}

export function saveScanResult(scanData) {
  const scans = getScans();
  
  // Format matching the SQLite DB row structure
  const dbRecord = {
    id: scanData.id,
    file_hash_sha256: scanData.fileHashSha256 || '',
    file_name: scanData.fileName || '',
    file_type: scanData.fileType || '',
    ai_similarity_index: scanData.aiSimilarityIndex || 0,
    total_blocks: scanData.totalBlocks || 0,
    flagged_blocks: scanData.flaggedBlocks || 0,
    excluded_blocks: scanData.excludedBlocks || 0,
    result_json: JSON.stringify(scanData),
    highlighted_pdf_path: null, // Stores base64 or blob URL in browser
    report_pdf_path: null,      // Stores base64 or blob URL in browser
    created_at: new Date().toISOString()
  };

  // Filter out any duplicates
  const filtered = scans.filter(s => s.id !== dbRecord.id);
  filtered.push(dbRecord);
  saveScans(filtered);
  console.log('[Database] Saved scan record to localStorage:', dbRecord.id);
}

export function getScanById(scanId) {
  const scans = getScans();
  return scans.find(s => s.id === scanId) || null;
}

export function updateScanPaths(scanId, highlightedPdfBase64, reportPdfBase64) {
  const scans = getScans();
  const index = scans.findIndex(s => s.id === scanId);
  if (index !== -1) {
    scans[index].highlighted_pdf_path = highlightedPdfBase64;
    scans[index].report_pdf_path = reportPdfBase64;
    saveScans(scans);
    console.log('[Database] Updated PDF attachments in local storage for:', scanId);
  }
}
