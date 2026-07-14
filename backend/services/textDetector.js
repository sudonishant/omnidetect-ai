// AI-typical transitions and overused linguistic markers
const TRANSITION_WORDS = [
  'furthermore', 'moreover', 'additionally', 'consequently', 'therefore', 
  'in summary', 'notably', 'foster', 'delve', 'testament', 'tapestry', 
  'meticulously', 'revolutionize', 'crucial', 'essential', 'showcase'
];

// First-person pronoun list (highly typical of human writing, rare in raw AI text)
const HUMAN_PRONOUNS = ['i', 'me', 'my', 'myself', 'we', 'our', 'us', 'ourselves'];

/**
 * Calculates transition word density (AI models write with high cohesive markers).
 */
function calculateTransitionDensity(words) {
  if (words.length === 0) return 0;
  let count = 0;
  words.forEach(w => {
    if (TRANSITION_WORDS.includes(w)) count++;
  });
  return count / words.length;
}

/**
 * Calculates human pronoun density (Humans write with first-person context).
 */
function calculatePronounDensity(words) {
  if (words.length === 0) return 0;
  let count = 0;
  words.forEach(w => {
    if (HUMAN_PRONOUNS.includes(w)) count++;
  });
  return count / words.length;
}

/**
 * Calculates passive voice patterns (e.g., "is created", "was developed").
 * AI writing overuses passive tense structures.
 */
function calculatePassiveVoiceIndex(text) {
  const passiveRegex = /\b(is|am|are|was|were|be|been|being)\b\s+\b([a-z]+ed|written|taken|seen|done|given|chosen|known|made|built|run|kept|held|spent)\b/gi;
  const matches = text.match(passiveRegex) || [];
  const wordsCount = text.split(/\s+/).length;
  return wordsCount > 0 ? matches.length / wordsCount : 0;
}

/**
 * Computes natural character bigram entropy.
 */
function calculateBigramEntropy(text) {
  const cleanText = text.toLowerCase().replace(/[^a-z\s]/g, '');
  if (cleanText.length < 50) return 4.0;

  const charCounts = {};
  const bigramCounts = {};

  for (let i = 0; i < cleanText.length - 1; i++) {
    const char1 = cleanText[i];
    const char2 = cleanText[i + 1];
    const bigram = char1 + char2;

    charCounts[char1] = (charCounts[char1] || 0) + 1;
    bigramCounts[bigram] = (bigramCounts[bigram] || 0) + 1;
  }

  let entropy = 0;
  const bigrams = Object.keys(bigramCounts);

  for (const bigram of bigrams) {
    const char1 = bigram[0];
    const countBigram = bigramCounts[bigram];
    const countChar1 = charCounts[char1];

    const pConditional = countBigram / countChar1;
    const pJoint = countBigram / (cleanText.length - 1);

    entropy -= pJoint * Math.log2(pConditional);
  }

  return entropy;
}

/**
 * Calculates sentence length variation (Burstiness CV).
 * Human coefficient of variation is >0.4; AI is highly uniform (<0.25).
 */
function calculateBurstinessCV(text) {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length <= 1) {
    return { cv: 0, sd: 0, mean: 0, count: sentences.length };
  }

  const wordCounts = sentences.map(s => s.split(/\s+/).length);
  const mean = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;

  const squaredDifferencesSum = wordCounts.reduce((sum, count) => {
    return sum + Math.pow(count - mean, 2);
  }, 0);

  const sd = Math.sqrt(squaredDifferencesSum / wordCounts.length);
  const cv = mean > 0 ? sd / mean : 0;

  return { cv, sd, mean, count: sentences.length };
}

/**
 * Computes Lexical Richness (Type-Token Ratio - TTR).
 */
function calculateLexicalRichness(text) {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length === 0) return 0;
  const uniqueWords = new Set(words);
  return uniqueWords.size / words.length;
}

/**
 * Calculates word length distribution entropy.
 * Human writing uses highly varied word lengths (combination of short/long).
 * AI writing keeps word lengths highly structured.
 */
function calculateWordLengthEntropy(words) {
  if (words.length === 0) return 0;
  const lengths = words.map(w => w.length);
  const freqs = {};
  
  lengths.forEach(l => freqs[l] = (freqs[l] || 0) + 1);
  
  let entropy = 0;
  Object.values(freqs).forEach(count => {
    const p = count / words.length;
    entropy -= p * Math.log2(p);
  });
  
  return entropy;
}

/**
 * Flags AI-typical keywords.
 */
function flagAiKeywords(text) {
  const matches = [];
  let scoreContribution = 0;

  const AI_KEYWORDS = {
    'delve': 'RLHF instruction alignment overused verb.',
    'testament': 'Summary essay cliché overused noun.',
    'tapestry': 'Generative text metaphorical cliché.',
    'furthermore': 'Paragraph logical connector.',
    'moreover': 'Paragraph logical connector.',
    'in conclusion': 'Formulaic transition ending.',
    'meticulously': 'Task completion descriptor adverb.',
    'revolutionize': 'Product description buzzword.',
    'beacon': 'Metaphorical summary cliché.',
    'foster': 'Collaborative instruction prompt overused verb.'
  };

  for (const keyword in AI_KEYWORDS) {
    const matchRegex = new RegExp(`\\b(${keyword})\\b`, 'gi');
    let occurrences = 0;
    while (matchRegex.exec(text) !== null) {
      occurrences++;
    }

    if (occurrences > 0) {
      matches.push({
        keyword,
        occurrences,
        explanation: AI_KEYWORDS[keyword],
        weight: keyword === 'delve' || keyword === 'tapestry' ? 2.0 : 1.0
      });
      scoreContribution += (keyword === 'delve' || keyword === 'tapestry' ? 2.0 : 1.0) * occurrences;
    }
  }

  return { matches, scoreContribution };
}

/**
 * Main advanced local text AI detector logic without external APIs.
 */
export function analyzeTextLocally(text) {
  if (!text || text.trim().length < 15) {
    return {
      aiProbability: 0,
      confidence: 0,
      metrics: {},
      flaggedWords: [],
      verdict: 'Too short to analyze'
    };
  }

  const cleanText = text.trim();
  const words = cleanText
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  const wordCount = words.length;

  const charEntropy = calculateBigramEntropy(cleanText);
  const burstiness = calculateBurstinessCV(cleanText);
  const richness = calculateLexicalRichness(cleanText);
  const { matches, scoreContribution } = flagAiKeywords(cleanText);
  
  const transDensity = calculateTransitionDensity(words);
  const pronounDensity = calculatePronounDensity(words);
  const passiveVoiceIndex = calculatePassiveVoiceIndex(cleanText);
  const wordLengthEntropy = calculateWordLengthEntropy(words);

  // 1. Perplexity Index (Predictability)
  // Human character transition entropy is >3.5 bits. AI writing is <3.2 bits.
  let perplexityScore = Math.max(0, Math.min(100, (3.8 - charEntropy) * 165));

  // 2. Burstiness Index (Coefficient of Variation)
  // Human sentence CV is usually >0.45. AI writing sentence CV is uniform (<0.22).
  let burstinessScore = Math.max(0, Math.min(100, (0.50 - burstiness.cv) * 220));

  // 3. Pronoun Index (First-person pronouns are human markers)
  // Pronoun density < 0.6% indicates AI. Pronoun density > 1.8% indicates Human.
  let pronounScore = Math.max(0, Math.min(100, (0.02 - pronounDensity) * 5000));

  // 4. Transition Density Index (AI overuses transitions)
  // Transition density > 3% indicates AI. Transition density < 1.2% indicates Human.
  let transitionScore = Math.max(0, Math.min(100, (transDensity - 0.01) * 3500));

  //  passive tense index
  let passiveScore = Math.max(0, Math.min(100, passiveVoiceIndex * 1500));

  // 5. Word Length Entropy (Word length variance)
  // Human word length entropy is usually >3.1. AI writing uses uniform word lengths (<2.8).
  let wordLengthScore = Math.max(0, Math.min(100, (3.2 - wordLengthEntropy) * 250));

  // 6. Keyword score
  let keywordScore = Math.min(100, (scoreContribution / (wordCount || 1)) * 800);

  // Weighted Forensic combination:
  // Perplexity (20%), Burstiness CV (20%), Pronouns (15%), Transitions (15%), Word Length (15%), Passive Tense (10%), Buzzwords (5%)
  let aiProbability = 
    (perplexityScore * 0.20) + 
    (burstinessScore * 0.20) + 
    (pronounScore * 0.15) + 
    (transitionScore * 0.15) + 
    (wordLengthScore * 0.15) + 
    (passiveScore * 0.10) +
    (keywordScore * 0.05);

  // Calibration damping for short content
  if (wordCount < 60) {
    aiProbability = (aiProbability * 0.70) + 15;
  }

  aiProbability = Math.round(Math.max(1, Math.min(99, aiProbability)));

  let verdict = 'Likely Human';
  if (aiProbability > 72) {
    verdict = 'Likely AI-Generated';
  } else if (aiProbability > 42) {
    verdict = 'Mixed / Suspect';
  }

  const confidence = Math.round(Math.min(98, Math.max(30, 25 + Math.log(wordCount + 1) * 13)));

  return {
    aiProbability,
    confidence,
    metrics: {
      perplexity: Math.round(charEntropy * 100) / 100,
      burstiness: Math.round(burstiness.sd * 100) / 100,
      burstinessCv: Math.round(burstiness.cv * 100) / 100,
      lexicalRichness: Math.round(richness * 100),
      pronounDensity: Math.round(pronounDensity * 1000) / 10, // display as %
      transDensity: Math.round(transDensity * 1000) / 10, // display as %
      passiveVoice: Math.round(passiveVoiceIndex * 1000) / 10, // display as %
      wordLengthEntropy: Math.round(wordLengthEntropy * 100) / 100,
      sentencesCount: burstiness.count,
      wordsCount: wordCount,
      charsCount: cleanText.length
    },
    flaggedWords: matches,
    verdict
  };
}

/**
 * Call the GPTZero API with the provided text.
 */
export async function analyzeWithGptZero(text, apiKey) {
  if (!apiKey) {
    throw new Error('GPTZero API key not provided');
  }

  try {
    const response = await fetch('https://api.gptzero.me/v2/predict/text', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ document: text })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GPTZero API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    
    const probabilities = data.documents?.[0] || {};
    const aiProbability = Math.round((probabilities.completely_generated_prob || 0) * 100);
    
    let verdict = 'Likely Human';
    if (aiProbability > 72) {
      verdict = 'Likely AI-Generated';
    } else if (aiProbability > 42) {
      verdict = 'Mixed / Suspect';
    }

    return {
      aiProbability,
      confidence: Math.round((probabilities.confidence || 0.9) * 100),
      metrics: {
        sentencesCount: probabilities.num_sentences || 0,
        wordsCount: text.split(/\s+/).length,
        averagePerplexity: Math.round((probabilities.average_generated_prob || 0) * 100),
        burstiness: Math.round((probabilities.burstiness || 0) * 100) / 100
      },
      verdict,
      rawGptZero: data
    };
  } catch (error) {
    console.error('GPTZero API request failed:', error);
    throw error;
  }
}
