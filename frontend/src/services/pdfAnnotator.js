/**
 * PDF Annotator — Draws color-coded highlight rectangles on flagged text blocks.
 * Uses pdf-lib for pure JavaScript PDF manipulation.
 */
import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Get the highlight color and opacity based on AI probability.
 * @param {number} probability - AI probability (0-100)
 * @returns {{ color: object, opacity: number, label: string }}
 */
export function getHighlightColor(probability) {
  if (probability > 90) {
    return { color: rgb(0, 1, 1), opacity: 0.3, label: 'cyan' };       // Cyan — very high
  } else if (probability > 70) {
    return { color: rgb(1, 0.65, 0), opacity: 0.25, label: 'orange' };  // Orange — high
  } else {
    return { color: rgb(1, 1, 0), opacity: 0.2, label: 'yellow' };      // Yellow — moderate
  }
}

/**
 * Create a highlighted version of the uploaded PDF with colored rectangles
 * drawn over flagged text blocks.
 * @param {Buffer|Uint8Array} originalPdfBuffer - The original PDF file buffer
 * @param {Array} scoredBlocks - Array of blocks with aiProbability and optional bbox
 * @param {object} [options={}] - Options like threshold
 * @returns {Promise<Uint8Array>} - The highlighted PDF bytes
 */
export async function createHighlightedPdf(originalPdfBuffer, scoredBlocks, options = {}) {
  const { threshold = 50 } = options;

  try {
    const pdfDoc = await PDFDocument.load(originalPdfBuffer, {
      ignoreEncryption: true
    });

    const pages = pdfDoc.getPages();
    let highlightsDrawn = 0;

    for (const block of scoredBlocks) {
      // Skip excluded blocks and those below threshold
      if (block.exclude) continue;
      if (block.aiProbability === null || block.aiProbability === undefined) continue;
      if (block.aiProbability < threshold) continue;

      // Skip blocks without bounding box coordinates
      if (!block.bbox || block.bbox.x0 === undefined) continue;

      const pageIndex = (block.pageNumber || 1) - 1; // Convert to 0-indexed
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { color, opacity } = getHighlightColor(block.aiProbability);

      const x = block.bbox.x0;
      const y = block.bbox.y0;
      const width = block.bbox.x1 - block.bbox.x0;
      const height = block.bbox.y1 - block.bbox.y0;

      // Draw semi-transparent rectangle over the flagged area
      page.drawRectangle({
        x,
        y,
        width,
        height,
        color,
        opacity,
        borderWidth: 0
      });

      highlightsDrawn++;
    }

    console.log(`[PDFAnnotator] Drew ${highlightsDrawn} highlights on ${pages.length} pages.`);

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (err) {
    console.error(`[PDFAnnotator] Error creating highlighted PDF: ${err.message}`);
    throw err;
  }
}
