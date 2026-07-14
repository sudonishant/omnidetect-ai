/**
 * AI Inference Engine — ML-powered text classification via Hugging Face Inference API.
 * Uses RoBERTa-based models to detect AI-generated text with batch processing.
 */

const HF_API_BASE = 'https://api-inference.huggingface.co/models';

const MODELS = {
  standard: 'Hello-SimpleAI/chatgpt-detector-roberta',
  pro: 'openai-community/roberta-large-openai-detector'
};

/**
 * Classify a single text block as human or AI-generated.
 * @param {string} text - The text to classify
 * @param {boolean} [proMode=false] - Use the heavier pro model
 * @returns {Promise<{aiProbability: number|null, source: string, model: string}>}
 */
export async function classifySingleBlock(text, proMode = false) {
  const modelName = proMode ? MODELS.pro : MODELS.standard;
  const url = `${HF_API_BASE}/${modelName}`;

  // Truncate to ~500 words to stay within model token limits
  const truncatedText = text.split(/\s+/).slice(0, 500).join(' ');

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: truncatedText }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      // Model is loading — wait and retry
      if (response.status === 503) {
        const body = await response.json().catch(() => ({}));
        const waitTime = Math.min((body.estimated_time || 5) * 1000, 10000);
        console.log(`[AI Inference] Model loading, waiting ${waitTime / 1000}s before retry...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        console.warn(`[AI Inference] HF API error (${response.status}): ${errText}`);
        return { aiProbability: null, source: 'hf_error', model: modelName };
      }

      const data = await response.json();

      // HF returns [[{label, score}, {label, score}]]
      const predictions = Array.isArray(data[0]) ? data[0] : data;

      let aiProb = null;

      if (proMode) {
        // roberta-large-openai-detector: "Fake" = AI, "Real" = Human
        const fakeEntry = predictions.find(p => p.label === 'LABEL_0' || p.label?.toLowerCase() === 'fake');
        const realEntry = predictions.find(p => p.label === 'LABEL_1' || p.label?.toLowerCase() === 'real');
        if (fakeEntry) {
          aiProb = Math.round(fakeEntry.score * 10000) / 100;
        } else if (realEntry) {
          aiProb = Math.round((1 - realEntry.score) * 10000) / 100;
        }
      } else {
        // chatgpt-detector-roberta: LABEL_0 = Human, LABEL_1 = ChatGPT
        const aiEntry = predictions.find(p => p.label === 'LABEL_1' || p.label?.toLowerCase() === 'chatgpt');
        const humanEntry = predictions.find(p => p.label === 'LABEL_0' || p.label?.toLowerCase() === 'human');
        if (aiEntry) {
          aiProb = Math.round(aiEntry.score * 10000) / 100;
        } else if (humanEntry) {
          aiProb = Math.round((1 - humanEntry.score) * 10000) / 100;
        }
      }

      return {
        aiProbability: aiProb !== null ? aiProb : null,
        source: 'huggingface',
        model: modelName.split('/').pop()
      };

    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[AI Inference] Request timed out for model ${modelName}`);
      } else {
        console.warn(`[AI Inference] Network error: ${err.message}`);
      }
    }
  }

  return { aiProbability: null, source: 'hf_unavailable', model: modelName.split('/').pop() };
}

/**
 * Classify an array of text blocks with batching and progress tracking.
 * @param {Array} blocks - Array of block objects with text, exclude properties
 * @param {boolean} [proMode=false] - Use pro model
 * @param {Function|null} [onProgress=null] - Progress callback: ({current, total, stage})
 * @returns {Promise<Array>} - Blocks with aiProbability, source, model added
 */
export async function classifyBlocks(blocks, proMode = false, onProgress = null) {
  const processable = [];
  const result = blocks.map(block => ({ ...block }));

  // Identify non-excluded blocks
  result.forEach((block, idx) => {
    if (!block.exclude) {
      processable.push(idx);
    } else {
      block.aiProbability = null;
      block.source = 'excluded';
      block.model = null;
    }
  });

  const total = processable.length;
  console.log(`[AI Inference] Processing ${total} blocks (${blocks.length - total} excluded)...`);

  if (total === 0) return result;

  const BATCH_SIZE = 5;
  let processed = 0;

  for (let i = 0; i < processable.length; i += BATCH_SIZE) {
    const batch = processable.slice(i, i + BATCH_SIZE);

    // Process batch concurrently
    const batchPromises = batch.map(idx =>
      classifySingleBlock(result[idx].text, proMode)
    );

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach((res, j) => {
      const idx = batch[j];
      result[idx].aiProbability = res.aiProbability;
      result[idx].source = res.source;
      result[idx].model = res.model;
    });

    processed += batch.length;

    if (onProgress) {
      onProgress({
        current: processed,
        total,
        stage: 'inference',
        percent: Math.round((processed / total) * 100)
      });
    }

    // Rate limit: 200ms delay between batches
    if (i + BATCH_SIZE < processable.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`[AI Inference] Completed classification of ${total} blocks.`);
  return result;
}

/**
 * Calculate the overall AI Similarity Index (weighted average by word count).
 * @param {Array} scoredBlocks - Blocks with aiProbability and wordCount
 * @returns {number} - Weighted average 0-100
 */
export function calculateSimilarityIndex(scoredBlocks) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const block of scoredBlocks) {
    if (block.exclude || block.aiProbability === null || block.aiProbability === undefined) {
      continue;
    }
    const weight = block.wordCount || 1;
    weightedSum += block.aiProbability * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}
