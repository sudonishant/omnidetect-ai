/**
 * Text Pipeline — Structured block extraction with academic exclusion filters.
 * Splits raw text into paragraph blocks and applies iThenticate-style filters.
 */

const REFERENCE_HEADERS = [
  'references', 'bibliography', 'works cited', 'sources', 'endnotes',
  'literature cited', 'citations', 'reference list'
];

/**
 * Split text into individual sentences using punctuation boundaries.
 * @param {string} text
 * @returns {string[]}
 */
export function splitIntoSentences(text) {
  if (!text || text.trim().length === 0) return [];
  // Split on sentence-ending punctuation followed by space or end-of-string
  const sentences = text
    .replace(/([.!?])\s+/g, '$1|||SPLIT|||')
    .split('|||SPLIT|||')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  return sentences;
}

/**
 * Count words in a text string.
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Check if a block is enclosed in quotation marks.
 * @param {string} text
 * @returns {boolean}
 */
function isQuotedBlock(text) {
  const trimmed = text.trim();
  // Check standard quotes "", curly quotes \u201C\u201D, single quotes ''
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('\u201C') && trimmed.endsWith('\u201D')) ||
      (trimmed.startsWith('\u2018') && trimmed.endsWith('\u2019')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 2)) {
    return true;
  }
  return false;
}

/**
 * Check if a block starts with a bibliography/references header.
 * @param {string} text
 * @returns {boolean}
 */
function isReferenceHeader(text) {
  const firstLine = text.split('\n')[0].trim().toLowerCase();
  // Remove trailing colon or period
  const cleaned = firstLine.replace(/[:.\s]+$/, '');
  return REFERENCE_HEADERS.includes(cleaned);
}

/**
 * Process raw text into structured blocks with academic exclusion filters.
 * @param {string} rawText - The full document text
 * @param {object} options - Filter options
 * @param {boolean} [options.excludeQuotes=true] - Exclude quoted blocks
 * @param {boolean} [options.excludeReferences=true] - Exclude bibliography sections
 * @param {boolean} [options.excludeShort=true] - Exclude blocks with too few words
 * @param {number} [options.minWordCount=10] - Minimum word count threshold
 * @returns {{ blocks: Array, totalBlocks: number, excludedBlocks: number, totalWords: number }}
 */
export function processTextIntoBlocks(rawText, options = {}) {
  const {
    excludeQuotes = true,
    excludeReferences = true,
    excludeShort = true,
    minWordCount = 10
  } = options;

  if (!rawText || rawText.trim().length === 0) {
    return { blocks: [], totalBlocks: 0, excludedBlocks: 0, totalWords: 0 };
  }

  // Step 1: Split by double newlines (paragraph boundaries)
  const rawBlocks = rawText
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(block => block.length > 0);

  // If no paragraph breaks found, split by single newlines or treat as one block
  let paragraphs = rawBlocks;
  if (paragraphs.length <= 1 && rawText.length > 500) {
    // Try splitting by sentences for long single-paragraph text
    paragraphs = splitIntoSentences(rawText)
      .reduce((acc, sentence, idx) => {
        // Group every 3 sentences into a block
        const groupIdx = Math.floor(idx / 3);
        if (!acc[groupIdx]) acc[groupIdx] = [];
        acc[groupIdx].push(sentence);
        return acc;
      }, [])
      .map(group => group.join(' '));
  }

  // Step 2: Process each block
  let referencesSectionFound = false;
  let totalWords = 0;
  let excludedCount = 0;

  const blocks = paragraphs.map((text, index) => {
    // Normalize
    const normalizedText = text
      .replace(/\s+/g, ' ')
      .replace(/\r\n/g, '\n')
      .trim();

    const wordCount = countWords(normalizedText);
    totalWords += wordCount;

    let exclude = false;
    let excludeReason = null;

    // Check bibliography header (once found, all subsequent blocks are excluded)
    if (excludeReferences && !referencesSectionFound && isReferenceHeader(normalizedText)) {
      referencesSectionFound = true;
      exclude = true;
      excludeReason = 'references';
    } else if (referencesSectionFound && excludeReferences) {
      exclude = true;
      excludeReason = 'references';
    }

    // Check quotes (only if not already excluded)
    if (!exclude && excludeQuotes && isQuotedBlock(normalizedText)) {
      exclude = true;
      excludeReason = 'quote';
    }

    // Check length (only if not already excluded)
    if (!exclude && excludeShort && wordCount < minWordCount) {
      exclude = true;
      excludeReason = 'too_short';
    }

    if (exclude) excludedCount++;

    return {
      text: normalizedText,
      blockIndex: index,
      wordCount,
      exclude,
      excludeReason
    };
  });

  return {
    blocks,
    totalBlocks: blocks.length,
    excludedBlocks: excludedCount,
    totalWords
  };
}
