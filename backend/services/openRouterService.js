import { getKeys } from './keyManager.js';

/**
 * Audits image visual forensics using OpenRouter Free Models router with key rotation.
 */
export async function auditImageWithAI(metrics, proMode = false) {
  const apiKeys = getKeys();
  if (apiKeys.length === 0) return null;

  let prompt = '';
  let modelToUse = 'openrouter/free';

  if (proMode) {
    modelToUse = 'google/gemini-2.5-pro-exp:free'; // Powerful free model for detailed reporting
    prompt = `You are an elite digital forensics examiner. Perform a Deep Audit on this image using these mathematical metrics:
- AI Probability: ${metrics.aiProbability}%
- Resolution: ${metrics.imageInfo?.width}x${metrics.imageInfo?.height} (${metrics.imageInfo?.format})
- ELA Mean Error: ${metrics.ela?.elaMetrics?.averagePixelDiff} | ELA Noise SD: ${metrics.ela?.elaMetrics?.noiseSd}
- Fourier Spikes: ${metrics.frequencyAnalysis?.spikes} peaks
- Boundary Sharpness: ${metrics.geometryCheck?.boundarySharpnessScore}
- Double Compression: ${metrics.geometryCheck?.doubleCompressionRatio > 0.62 ? 'Yes' : 'No'} | Local Median Blur: ${metrics.geometryCheck?.medianBlurRatio > 0.18 ? 'Yes' : 'No'}

Generate a comprehensive forensic Markdown report with EXACTLY these 3 sections (use ## headers):
## 1. Where AI Was Used
Identify which parts or characteristics of the image show artificial generation (e.g., unnatural noise, flat backgrounds, abnormal ELA).
## 2. Detection Methodology
Explain how the mathematical flaws (ELA, Fourier spikes, blur ratios) exposed the manipulation.
## 3. Predicted AI Model
State which AI model likely generated this (e.g. Midjourney, DALL-E 3, Stable Diffusion, etc.) based on the specific artifact signatures.`;
  } else {
    prompt = `You are an expert digital forensics examiner. Review these mathematical image forensic metrics and write a professional 3-sentence summary confirming if the image is likely AI-generated, edited/spliced, or a real digital screenshot:
- AI Probability: ${metrics.aiProbability}%
- Is Web Screenshot: ${metrics.imageInfo?.isScreenshot}
- Resolution: ${metrics.imageInfo?.width}x${metrics.imageInfo?.height}
- Format: ${metrics.imageInfo?.format}
- ELA Mean Error: ${metrics.ela?.elaMetrics?.averagePixelDiff}
- ELA Noise SD: ${metrics.ela?.elaMetrics?.noiseSd}
- Fourier Spikes: ${metrics.frequencyAnalysis?.spikes} peaks
- Boundary Sharpness: ${metrics.geometryCheck?.boundarySharpnessScore}
- Double Compression: ${metrics.geometryCheck?.doubleCompressionRatio > 0.62 ? 'Yes' : 'No'}
- Local Median Blur: ${metrics.geometryCheck?.medianBlurRatio > 0.18 ? 'Yes' : 'No'}

Respond only with the 3-sentence summary in a professional, objective tone. Do not mention "as an AI" or any fluff.`;
  }

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    try {
      console.log(`[OpenRouter Auditor] Sending image audit request with Key Index ${i}... (ProMode: ${proMode})`);
      const response = await globalThis.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'OmniDetect AI'
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (response.status === 429 || response.status === 401 || response.status === 403) {
        console.warn(`[OpenRouter Rotation] Key Index ${i} returned status ${response.status}. Rotating to backup...`);
        continue; 
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[OpenRouter Rotation] Key Index ${i} failed: ${errText}. Rotating to backup...`);
        continue;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || 'No feedback received from AI Auditor.';
    } catch (err) {
      console.warn(`[OpenRouter Rotation] Key Index ${i} experienced network error: ${err.message}. Rotating to backup...`);
    }
  }

  return 'AI Audit skipped: All available API keys were rate limited or failed to connect.';
}

/**
 * Audits document linguistic forensics using OpenRouter Free Models router with key rotation.
 */
export async function auditTextWithAI(text, metrics, proMode = false) {
  const apiKeys = getKeys();
  if (apiKeys.length === 0) return null;

  let prompt = '';
  let modelToUse = 'openrouter/free';

  if (proMode) {
    modelToUse = 'google/gemini-2.5-pro-exp:free';
    prompt = `You are an elite forensic linguist. Perform a Deep Audit on this text sample.
Text Sample: "${text.substring(0, 1500)}"
Metrics: Total Words: ${metrics.wordsCount} | AI Probability: ${metrics.aiProbability}% | Flagged Buzzwords: ${metrics.flaggedWordsCount || 0} | Avg Word Length: ${metrics.avgWordLength} | Burstiness: ${metrics.burstiness || 'Unknown'}

Generate a comprehensive forensic Markdown report with EXACTLY these 3 sections (use ## headers):
## 1. Where AI Was Used
Identify specific phrasing, unnatural transitions, mechanical structures, or flagged buzzwords that indicate AI generation.
## 2. Detection Methodology
Explain the linguistic flaws (e.g. low burstiness, predictability, low Shannon entropy) that exposed it.
## 3. Predicted AI Model
State which AI model likely generated this (e.g. ChatGPT/GPT-4, Claude 3, Gemini, etc.) and explain why based on its signature writing style and vocabulary.`;
  } else {
    prompt = `You are a forensic linguist. Review the text and its metrics to write a professional 3-sentence audit summary confirming if it is likely human-written, generated by ChatGPT/AI, or mixed:
- Text Sample (first 100 chars): "${text.substring(0, 100)}..."
- Total Words: ${metrics.wordsCount}
- AI Probability: ${metrics.aiProbability}%
- Flagged Buzzwords count: ${metrics.flaggedWordsCount || 0}
- Average Word Length: ${metrics.avgWordLength}
- Sentiment: ${metrics.sentiment}

Respond only with the 3-sentence summary in a professional, objective tone. Do not mention "as an AI" or any fluff.`;
  }

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    try {
      console.log(`[OpenRouter Auditor] Sending text audit request with Key Index ${i}... (ProMode: ${proMode})`);
      const response = await globalThis.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'OmniDetect AI'
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (response.status === 429 || response.status === 401 || response.status === 403) {
        console.warn(`[OpenRouter Rotation] Key Index ${i} returned status ${response.status}. Rotating to backup...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[OpenRouter Rotation] Key Index ${i} failed: ${errText}. Rotating to backup...`);
        continue;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || 'No feedback received from AI Auditor.';
    } catch (err) {
      console.warn(`[OpenRouter Rotation] Key Index ${i} experienced network error: ${err.message}. Rotating to backup...`);
    }
  }

  return 'Linguistic AI Audit skipped: All available API keys were rate limited or failed to connect.';
}

/**
 * Audits audio metadata/heuristics using OpenRouter Free Models router with key rotation.
 */
export async function auditAudioWithAI(metrics, proMode = false) {
  const apiKeys = getKeys();
  if (apiKeys.length === 0) return null;

  let prompt = '';
  let modelToUse = 'openrouter/free';

  if (proMode) {
    modelToUse = 'google/gemini-2.5-pro-exp:free';
    prompt = `You are an elite audio forensic analyst. Perform a Deep Audit on these audio metadata metrics.
Metrics:
- AI Probability: ${metrics.aiProbability}%
- Format Container: ${metrics.audioInfo?.format} | Sample Rate: ${metrics.audioInfo?.sampleRate}Hz | Channels: ${metrics.audioInfo?.channels} | Bitrate: ${metrics.audioInfo?.bitrate}
- Traces Found: ${JSON.stringify(metrics.metadataAnalysis?.tracesFound || [])}

Generate a comprehensive forensic Markdown report with EXACTLY these 3 sections (use ## headers):
## 1. Where AI Was Used
Identify which parts of the audio profile (e.g. mono channels, weird sample rates, ID3 tags) indicate synthesis.
## 2. Detection Methodology
Explain how the heuristic traces or encoding anomalies exposed it as an AI generation instead of a natural microphone recording.
## 3. Predicted AI Model
State which AI model likely generated this (e.g. Suno AI, Udio, ElevenLabs, VALL-E, etc.) based on the specific codec, bitrate, and metadata tags found.`;
  } else {
    prompt = `You are an expert audio forensic analyst. Review these audio metadata metrics and write a professional 3-sentence summary confirming if the audio file is likely synthesized/AI-generated (TTS voice clone, AI music) or a real human recording:
- AI Probability: ${metrics.aiProbability}%
- Format Container: ${metrics.audioInfo?.format}
- Sample Rate: ${metrics.audioInfo?.sampleRate}Hz
- Channels: ${metrics.audioInfo?.channels}
- Bitrate: ${metrics.audioInfo?.bitrate}
- Duration: ${metrics.audioInfo?.duration}
- Traces Found: ${JSON.stringify(metrics.metadataAnalysis?.tracesFound || [])}

Respond only with the 3-sentence summary in a professional, objective tone. Do not mention "as an AI" or any fluff.`;
  }

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    try {
      console.log(`[OpenRouter Auditor] Sending audio audit request with Key Index ${i}... (ProMode: ${proMode})`);
      const response = await globalThis.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'OmniDetect AI'
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      if (response.status === 429 || response.status === 401 || response.status === 403) {
        console.warn(`[OpenRouter Rotation] Key Index ${i} returned status ${response.status}. Rotating to backup...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[OpenRouter Rotation] Key Index ${i} failed: ${errText}. Rotating to backup...`);
        continue;
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || 'No feedback received from AI Auditor.';
    } catch (err) {
      console.warn(`[OpenRouter Rotation] Key Index ${i} experienced network error: ${err.message}. Rotating to backup...`);
    }
  }

  return 'Audio AI Audit skipped: All available API keys were rate limited or failed to connect.';
}
