/**
 * @fileoverview SQLite database service for OmniDetect AI.
 * Provides persistent storage for scan results using better-sqlite3.
 * @module services/database
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/** @type {string} Current file path resolved from import.meta.url */
const __filename = fileURLToPath(import.meta.url);

/** @type {string} Current directory path */
const __dirname = path.dirname(__filename);

/** @type {string} Absolute path to the SQLite database file */
const DB_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'omnidetect.db');

/**
 * The active better-sqlite3 database instance.
 * Initialized eagerly at module load time.
 * @type {import('better-sqlite3').Database}
 */
let db;

/**
 * Initializes the SQLite database connection and creates required tables/indexes.
 * Ensures the `data/` directory exists before opening the database file.
 *
 * @returns {import('better-sqlite3').Database} The initialized database instance.
 * @throws {Error} If the database cannot be opened or tables cannot be created.
 */
function initDatabase() {
  // Ensure the data directory exists
  fs.mkdirSync(DB_DIR, { recursive: true });

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Create the scans table if it does not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      file_hash_sha256 TEXT NOT NULL,
      file_name TEXT,
      file_type TEXT,
      ai_similarity_index REAL,
      total_blocks INTEGER,
      flagged_blocks INTEGER,
      excluded_blocks INTEGER,
      result_json TEXT,
      highlighted_pdf_path TEXT,
      report_pdf_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_file_hash ON scans(file_hash_sha256);
  `);

  console.log(`[Database] Initialized at ${DB_PATH}`);
  return db;
}

/**
 * Finds a scan record by its SHA-256 file hash.
 * Useful for detecting duplicate uploads and returning cached results.
 *
 * @param {string} sha256Hash - The SHA-256 hash of the uploaded file.
 * @returns {object|undefined} The scan row object, or undefined if not found.
 */
function findScanByHash(sha256Hash) {
  const stmt = db.prepare('SELECT * FROM scans WHERE file_hash_sha256 = ?');
  return stmt.get(sha256Hash);
}

/**
 * Persists a new scan result into the database.
 *
 * @param {object} scanData - The scan data to save.
 * @param {string} scanData.id - Unique scan identifier (UUID).
 * @param {string} scanData.fileHashSha256 - SHA-256 hash of the scanned file.
 * @param {string} [scanData.fileName] - Original file name.
 * @param {string} [scanData.fileType] - MIME type or extension of the file.
 * @param {number} [scanData.aiSimilarityIndex] - Computed AI similarity score (0–100).
 * @param {number} [scanData.totalBlocks] - Total number of text blocks extracted.
 * @param {number} [scanData.flaggedBlocks] - Number of blocks flagged as AI-generated.
 * @param {number} [scanData.excludedBlocks] - Number of blocks excluded from analysis.
 * @param {object} [scanData.resultJson] - Full result payload (will be JSON-stringified).
 * @param {string} [scanData.highlightedPdfPath] - Path to the highlighted PDF output.
 * @param {string} [scanData.reportPdfPath] - Path to the generated report PDF.
 * @returns {import('better-sqlite3').RunResult} The result of the INSERT operation.
 */
function saveScanResult(scanData) {
  const stmt = db.prepare(`
    INSERT INTO scans (
      id, file_hash_sha256, file_name, file_type,
      ai_similarity_index, total_blocks, flagged_blocks, excluded_blocks,
      result_json, highlighted_pdf_path, report_pdf_path
    ) VALUES (
      @id, @fileHashSha256, @fileName, @fileType,
      @aiSimilarityIndex, @totalBlocks, @flaggedBlocks, @excludedBlocks,
      @resultJson, @highlightedPdfPath, @reportPdfPath
    )
  `);

  return stmt.run({
    id: scanData.id,
    fileHashSha256: scanData.fileHashSha256,
    fileName: scanData.fileName ?? null,
    fileType: scanData.fileType ?? null,
    aiSimilarityIndex: scanData.aiSimilarityIndex ?? null,
    totalBlocks: scanData.totalBlocks ?? null,
    flaggedBlocks: scanData.flaggedBlocks ?? null,
    excludedBlocks: scanData.excludedBlocks ?? null,
    resultJson: scanData.resultJson ? JSON.stringify(scanData.resultJson) : null,
    highlightedPdfPath: scanData.highlightedPdfPath ?? null,
    reportPdfPath: scanData.reportPdfPath ?? null,
  });
}

/**
 * Retrieves a scan record by its unique scan ID.
 *
 * @param {string} scanId - The unique identifier of the scan.
 * @returns {object|undefined} The scan row object, or undefined if not found.
 */
function getScanById(scanId) {
  const stmt = db.prepare('SELECT * FROM scans WHERE id = ?');
  return stmt.get(scanId);
}

/**
 * Updates the highlighted PDF and report PDF file paths for a given scan.
 * Called after post-processing generates the annotated and report PDFs.
 *
 * @param {string} scanId - The unique identifier of the scan to update.
 * @param {string} highlightedPdfPath - Absolute or relative path to the highlighted PDF.
 * @param {string} reportPdfPath - Absolute or relative path to the report PDF.
 * @returns {import('better-sqlite3').RunResult} The result of the UPDATE operation.
 */
function updateScanPaths(scanId, highlightedPdfPath, reportPdfPath) {
  const stmt = db.prepare(`
    UPDATE scans
    SET highlighted_pdf_path = ?, report_pdf_path = ?
    WHERE id = ?
  `);
  return stmt.run(highlightedPdfPath, reportPdfPath, scanId);
}

// --- Eager initialization at module load ---
initDatabase();

export {
  db,
  initDatabase,
  findScanByHash,
  saveScanResult,
  getScanById,
  updateScanPaths,
};
