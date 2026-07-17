import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractTextFromBuffer } from './services/documentParser.js';
import { analyzeTextLocally, analyzeWithGptZero } from './services/textDetector.js';
import { analyzeImage } from './services/imageDetector.js';
import { analyzeAudio } from './services/audioDetector.js';
import { saveKey, getKey } from './services/keyManager.js';
import { auditImageWithAI, auditTextWithAI, auditAudioWithAI, humanizeTextWithAI } from './services/openRouterService.js';
import { processTextIntoBlocks } from './services/textPipeline.js';
import { classifyBlocks, calculateSimilarityIndex } from './services/aiInferenceEngine.js';
import { createHighlightedPdf } from './services/pdfAnnotator.js';
import { generateReport } from './services/reportGenerator.js';
import { findScanByHash, saveScanResult, getScanById, updateScanPaths } from './services/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = new SocketIO(server, { cors: { origin: '*' } });

// Ensure output directories exist
const OUTPUT_DIR = path.join(__dirname, 'data', 'outputs');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024 // 30 MB file limit
  }
});

/**
 * Settings Keys Endpoints (OpenRouter API Key)
 */
app.post('/api/settings/key', (req, res) => {
  const { openRouterKey } = req.body;
  try {
    saveKey(openRouterKey);
    res.json({ success: true, message: 'OpenRouter key encrypted and saved successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/key/status', (req, res) => {
  const key = getKey();
  res.json({ hasKey: !!key });
});

/**
 * Text and Document Detection Endpoint
 */
app.post('/api/detect/text', upload.single('file'), async (req, res) => {
  try {
    let textToAnalyze = '';
    let fileName = 'Direct Input';
    let fileType = 'text/plain';

    // If file is uploaded, extract its text content
    if (req.file) {
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
      textToAnalyze = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
    } else if (req.body.text) {
      textToAnalyze = req.body.text;
    } else {
      return res.status(400).json({ error: 'No text or file provided' });
    }

    if (!textToAnalyze || textToAnalyze.trim().length === 0) {
      return res.status(400).json({ error: 'Extracted text content is empty' });
    }

    const gptZeroKey = req.headers['x-gptzero-key'] || req.body.gptZeroKey;
    
    // Process text locally
    const localResult = analyzeTextLocally(textToAnalyze);
    let finalResult = {
      ...localResult,
      fileName,
      fileType,
      engine: 'Local Heuristics Engine'
    };

    // If GPTZero API key is provided, perform online audit
    if (gptZeroKey && gptZeroKey.trim().length > 0) {
      try {
        const gptZeroResult = await analyzeWithGptZero(textToAnalyze, gptZeroKey);
        finalResult = {
          ...finalResult,
          gptZero: gptZeroResult,
          aiProbability: gptZeroResult.aiProbability, // Prefer API probability
          verdict: gptZeroResult.verdict,
          engine: 'GPTZero Hybrid Engine'
        };
      } catch (gptErr) {
        console.error('GPTZero hybrid scan failed, falling back to local:', gptErr.message);
        finalResult.error = `GPTZero API scan failed: ${gptErr.message}. Fallback to local metrics.`;
      }
    }

    const openRouterKey = getKey();
    const proMode = req.body.proMode === 'true' || req.body.proMode === true;
    
    if (openRouterKey) {
      try {
        finalResult.aiAuditExplanation = await auditTextWithAI(textToAnalyze, finalResult, proMode);
      } catch (orErr) {
        console.error('OpenRouter text audit failed:', orErr.message);
      }
    }

    // Add highlighted terms directly into response for frontend rendering
    res.json(finalResult);
  } catch (error) {
    console.error('Text detection error:', error);
    res.status(500).json({ error: error.message || 'Error processing text detection' });
  }
});

/**
 * Image Detection Endpoint
 */
app.post('/api/detect/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const imageResult = await analyzeImage(req.file.buffer, req.file.originalname);
    
    // Add file metadata
    imageResult.fileName = req.file.originalname;
    imageResult.fileSize = req.file.size;
    imageResult.fileType = req.file.mimetype;
    
    // Add cryptographic hashes
    imageResult.hashSha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    imageResult.hashMd5 = crypto.createHash('md5').update(req.file.buffer).digest('hex');

    const openRouterKey = getKey();
    const proMode = req.body.proMode === 'true' || req.body.proMode === true;
    
    if (openRouterKey) {
      try {
        imageResult.aiAuditExplanation = await auditImageWithAI(imageResult, proMode);
      } catch (orErr) {
        console.error('OpenRouter image audit failed:', orErr.message);
      }
    }

    res.json(imageResult);
  } catch (error) {
    console.error('Image detection error:', error);
    res.status(500).json({ error: error.message || 'Error processing image detection' });
  }
});

/**
 * Audio Detection Endpoint
 */
app.post('/api/detect/audio', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const audioResult = await analyzeAudio(req.file.buffer, req.file.mimetype);
    
    // Add file details
    audioResult.fileName = req.file.originalname;
    audioResult.fileSize = req.file.size;
    audioResult.fileType = req.file.mimetype;
    
    audioResult.hashSha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    audioResult.hashMd5 = crypto.createHash('md5').update(req.file.buffer).digest('hex');

    const openRouterKey = getKey();
    const proMode = req.body.proMode === 'true' || req.body.proMode === true;

    if (openRouterKey) {
      try {
        audioResult.aiAuditExplanation = await auditAudioWithAI(audioResult, proMode);
      } catch (orErr) {
        console.error('OpenRouter audio audit failed:', orErr.message);
      }
    }

    res.json(audioResult);
  } catch (error) {
    console.error('Audio detection error:', error);
    res.status(500).json({ error: error.message || 'Error processing audio detection' });
  }
});

/**
 * Generic Forensic Metadata Deep Scanner Endpoint
 */
app.post('/api/detect/metadata', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const buffer = req.file.buffer;
    const name = req.file.originalname;
    const type = req.file.mimetype;
    const size = req.file.size;

    const hashSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const hashMd5 = crypto.createHash('md5').update(buffer).digest('hex');

    const suspectTerms = ['stable diffusion', 'midjourney', 'dall-e', 'dalle', 'openai', 'chatgpt', 'suno', 'udio', 'elevenlabs', 'generator', 'prompt', 'steps:', 'cfg scale:'];
    const suspectMatches = [];

    // Local extraction strategies depending on type
    let extractedProps = {};

    // Check if image
    if (type.startsWith('image/')) {
      try {
        const imageInfo = await analyzeImage(buffer);
        extractedProps = imageInfo.rawMetadata || {};
      } catch (err) {
        extractedProps = { error: `Could not parse image tags: ${err.message}` };
      }
    } else if (type.startsWith('audio/')) {
      try {
        const audioInfo = await analyzeAudio(buffer, type);
        extractedProps = audioInfo.metadataAnalysis.rawMetadata || {};
      } catch (err) {
        extractedProps = { error: `Could not parse audio metadata: ${err.message}` };
      }
    } else {
      // General file metadata parsing
      // Extract string representations and scan for text chunks
      const sampleText = buffer.slice(0, 10000).toString('ascii').replace(/[^\x20-\x7E]/g, ' ');
      extractedProps = {
        scanRange: 'First 10,000 bytes sampled',
        formatNote: 'Direct binary structures parsed. View flagged matches for anomalies.'
      };
    }

    // Search properties recursively for suspect AI terms
    const stringifiedProps = JSON.stringify(extractedProps).toLowerCase();
    for (const term of suspectTerms) {
      if (stringifiedProps.includes(term)) {
        suspectMatches.push(term);
      }
    }

    res.json({
      fileName: name,
      fileSize: size,
      fileType: type,
      hashSha256,
      hashMd5,
      extractedProperties: extractedProps,
      suspectMatches,
      aiTraceFound: suspectMatches.length > 0
    });
  } catch (error) {
    console.error('Metadata scanner error:', error);
    res.status(500).json({ error: error.message || 'Error executing metadata scan' });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 * UNIFIED SCAN ENDPOINT — Production AI Text Detection
 * ═══════════════════════════════════════════════════════
 */
app.post('/api/scan', upload.single('file'), async (req, res) => {
  const socketId = req.body.socketId || req.headers['x-socket-id'];
  const socket = socketId ? io.sockets.sockets.get(socketId) : null;
  const proMode = req.body.proMode === 'true' || req.body.proMode === true;
  const fastCheck = req.body.fastCheck === 'true' || req.body.fastCheck === true;

  const emitProgress = (data) => {
    if (socket) socket.emit('scan:progress', data);
  };

  try {
    // ── Step 1: Extract raw text ──
    let rawText = '';
    let fileName = 'Raw Text Input';
    let fileType = 'text/plain';
    let fileBuffer = null;
    let isPdf = false;

    emitProgress({ stage: 'parsing', percent: 5, message: 'Parsing document...' });

    if (req.file) {
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
      fileBuffer = req.file.buffer;
      isPdf = fileType === 'application/pdf';
      rawText = await extractTextFromBuffer(req.file.buffer, fileType);
    } else if (req.body.text) {
      rawText = req.body.text;
    } else {
      return res.status(400).json({ error: 'No file or text provided' });
    }

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Extracted text content is empty' });
    }

    // ── Step 2: Check SHA-256 cache ──
    const contentHash = crypto.createHash('sha256').update(rawText).digest('hex');
    const cachedScan = findScanByHash(contentHash);
    if (cachedScan && cachedScan.result_json) {
      console.log(`[Scan] Cache hit for hash ${contentHash.substring(0, 12)}...`);
      emitProgress({ stage: 'complete', percent: 100, message: 'Cached result found!' });
      const cachedResult = JSON.parse(cachedScan.result_json);
      cachedResult.cached = true;
      cachedResult.scanId = cachedScan.id;
      return res.json(cachedResult);
    }

    emitProgress({ stage: 'extracting', percent: 15, message: 'Extracting text blocks...' });

    // ── Step 3: Process into blocks ──
    const excludeQuotes = req.body.excludeQuotes !== 'false';
    const excludeReferences = req.body.excludeReferences !== 'false';
    const excludeShort = req.body.excludeShort !== 'false';

    const pipelineResult = processTextIntoBlocks(rawText, {
      excludeQuotes,
      excludeReferences,
      excludeShort
    });

    // ── Step 4: AI Inference (Hugging Face / OpenRouter / Fast Check) ──
    const scoredBlocks = await classifyBlocks(
      pipelineResult.blocks,
      proMode,
      fastCheck,
      (progress) => {
        const pct = 25 + Math.round((progress.current / progress.total) * 55);
        emitProgress({ stage: 'inference', percent: pct, message: `Analyzing block ${progress.current}/${progress.total}...` });
      }
    );

    // ── Step 5: Calculate aggregate scores ──
    const aiSimilarityIndex = calculateSimilarityIndex(scoredBlocks);
    const flaggedBlocks = scoredBlocks.filter(b => !b.exclude && b.aiProbability !== null && b.aiProbability >= 50).length;

    // Also run local heuristic for additional metrics
    const localMetrics = analyzeTextLocally(rawText);

    emitProgress({ stage: 'audit', percent: 85, message: 'Running AI Deep Audit...' });

    // ── Step 6: OpenRouter AI Audit (optional, bypassed on fast check) ──
    let aiAuditExplanation = null;
    if (!fastCheck) {
      const openRouterKey = getKey();
      if (openRouterKey) {
        try {
          aiAuditExplanation = await auditTextWithAI(rawText, { ...localMetrics, aiProbability: aiSimilarityIndex }, proMode);
        } catch (err) {
          console.warn('[Scan] OpenRouter audit failed:', err.message);
        }
      }
    }

    // ── Step 7: Build response ──
    const scanId = uuidv4();
    const timestamp = new Date().toISOString();

    let verdict = 'Likely Human';
    if (aiSimilarityIndex >= 70) verdict = 'Likely AI-Generated';
    else if (aiSimilarityIndex >= 40) verdict = 'Mixed / Suspect';

    const scanResult = {
      scanId,
      fileName,
      fileType,
      aiSimilarityIndex,
      verdict,
      blocks: scoredBlocks,
      totalBlocks: pipelineResult.totalBlocks,
      flaggedBlocks,
      excludedBlocks: pipelineResult.excludedBlocks,
      totalWords: pipelineResult.totalWords,
      localMetrics: {
        burstiness: localMetrics.burstiness,
        avgWordLength: localMetrics.avgWordLength,
        sentiment: localMetrics.sentiment,
        flaggedWords: localMetrics.flaggedWords
      },
      aiAuditExplanation,
      proMode,
      fastCheck,
      cached: false,
      timestamp
    };

    emitProgress({ stage: 'saving', percent: 92, message: 'Saving results & generating PDFs...' });

    // ── Step 8: Save to database ──
    try {
      saveScanResult({
        id: scanId,
        fileHashSha256: contentHash,
        fileName,
        fileType,
        aiSimilarityIndex,
        totalBlocks: pipelineResult.totalBlocks,
        flaggedBlocks,
        excludedBlocks: pipelineResult.excludedBlocks,
        resultJson: scanResult
      });
    } catch (dbErr) {
      console.warn('[Scan] Database save failed:', dbErr.message);
    }

    // ── Step 9: Generate PDFs in background ──
    (async () => {
      try {
        // Report PDF
        const reportBytes = await generateReport(scanResult);
        const reportPath = path.join(OUTPUT_DIR, `${scanId}_report.pdf`);
        fs.writeFileSync(reportPath, reportBytes);

        // Highlighted PDF (only if uploaded file was PDF)
        let highlightedPath = null;
        if (isPdf && fileBuffer) {
          try {
            const highlightedBytes = await createHighlightedPdf(fileBuffer, scoredBlocks);
            highlightedPath = path.join(OUTPUT_DIR, `${scanId}_highlighted.pdf`);
            fs.writeFileSync(highlightedPath, highlightedBytes);
          } catch (hlErr) {
            console.warn('[Scan] Highlighted PDF generation failed:', hlErr.message);
          }
        }

        updateScanPaths(scanId, highlightedPath, reportPath);
        console.log(`[Scan] PDFs generated for scan ${scanId}`);
      } catch (pdfErr) {
        console.error('[Scan] PDF generation error:', pdfErr.message);
      }
    })();

    emitProgress({ stage: 'complete', percent: 100, message: 'Scan complete!' });
    res.json(scanResult);
  } catch (error) {
    console.error('[Scan] Error:', error);
    emitProgress({ stage: 'error', percent: 0, message: error.message });
    res.status(500).json({ error: error.message || 'Scan processing failed' });
  }
});

/**
 * Endpoint to Humanize/Bypass AI-generated text.
 */
app.post('/api/humanize', async (req, res) => {
  const { text, proMode } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text content is empty' });
  }

  try {
    const result = await humanizeTextWithAI(text, proMode === 'true' || proMode === true);
    res.json(result);
  } catch (err) {
    console.error('[Humanizer] Error:', err);
    res.status(500).json({ error: err.message || 'Humanization failed' });
  }
});

/**
 * Download endpoint for scan PDFs
 */
app.get('/api/scan/:scanId/download/:type', (req, res) => {
  const { scanId, type } = req.params;
  const scan = getScanById(scanId);

  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  let filePath = null;
  let downloadName = '';

  if (type === 'report') {
    filePath = scan.report_pdf_path;
    downloadName = `OmniDetect_Report_${scanId.substring(0, 8)}.pdf`;
  } else if (type === 'highlighted') {
    filePath = scan.highlighted_pdf_path;
    downloadName = `OmniDetect_Highlighted_${scanId.substring(0, 8)}.pdf`;
  } else {
    return res.status(400).json({ error: 'Invalid download type. Use "report" or "highlighted".' });
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: `${type} PDF not yet generated or not available.` });
  }

  res.download(filePath, downloadName);
});

/**
 * Get scan result by ID
 */
app.get('/api/scan/:scanId', (req, res) => {
  const scan = getScanById(req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });

  const result = scan.result_json ? JSON.parse(scan.result_json) : {};
  result.scanId = scan.id;
  res.json(result);
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

// Start listening (use server instead of app for Socket.IO)
server.listen(PORT, () => {
  console.log(`[OmniDetect AI] Backend server running on http://localhost:${PORT}`);
  console.log(`[OmniDetect AI] WebSocket ready for real-time progress`);
});
