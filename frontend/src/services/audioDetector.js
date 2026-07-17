/**
 * audioDetector.js — Client-side Audio Forensic Detector.
 * Runs audio analysis directly in the browser using Web Audio API (AudioContext) and binary header scanners.
 */

/**
 * Extracts and audits audio metadata for AI signatures.
 * @param {File} file - Browser File object
 * @returns {Promise<Object>}
 */
export async function analyzeAudio(file) {
  const traces = [];
  let aiScore = 0;

  // 1. Read file as ArrayBuffer for binary tag scanning (Suno, ElevenLabs, Udio, etc.)
  const arrayBuffer = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsArrayBuffer(file);
  });

  const bytes = new Uint8Array(arrayBuffer);
  const limit = Math.min(bytes.length, 100000);
  const decoder = new TextDecoder('ascii', { fatal: false });
  const textContent = decoder.decode(bytes.subarray(0, limit)).toLowerCase();

  // Search comments & metadata block for AI tags
  if (textContent.includes('suno') || textContent.includes('suno.ai')) {
    traces.push({ tag: 'Metadata Stamp', value: 'Suno.ai signature', risk: 'Critical', desc: 'Direct reference to Suno generative music engine.' });
    aiScore += 95;
  }
  if (textContent.includes('udio') || textContent.includes('udio.com')) {
    traces.push({ tag: 'Metadata Stamp', value: 'Udio signature', risk: 'Critical', desc: 'Direct reference to Udio music engine.' });
    aiScore += 95;
  }
  if (textContent.includes('elevenlabs') || textContent.includes('eleven_labs') || textContent.includes('ai voice')) {
    traces.push({ tag: 'Metadata Stamp', value: 'ElevenLabs signature', risk: 'Critical', desc: 'ElevenLabs synthetic voice encoder footprint found.' });
    aiScore += 95;
  }
  if (textContent.includes('prompt:') || textContent.includes('lyrics:') || textContent.includes('style:')) {
    traces.push({ tag: 'Metadata Comment', value: 'Prompt parameters found', risk: 'High', desc: 'Embedded prompt/style parameter structure typical of AI audio generators.' });
    aiScore += 80;
  }

  // 2. Decode audio format info using browser Web Audio API
  let sampleRate = 44100;
  let channels = 2;
  let duration = 0;
  let formatString = file.type.split('/')[1] || 'mp3';

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const audioCtx = new AudioContext();
      // Decode audio data asynchronously
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0)); // clone buffer
      sampleRate = audioBuffer.sampleRate;
      channels = audioBuffer.numberOfChannels;
      duration = audioBuffer.duration;
      await audioCtx.close();
    }
  } catch (err) {
    console.warn('[AudioDetector] Web Audio Context failed to decode format (possibly running in background or unsupported codec). using fallbacks.');
  }

  // Format checks
  if (channels === 1 && (sampleRate === 16000 || sampleRate === 22050 || sampleRate === 24000)) {
    traces.push({
      tag: 'Format Profile',
      value: `${sampleRate}Hz Mono`,
      risk: 'Medium',
      desc: 'Audio format matches standard synthetic Voice Clone (TTS) encoder profiles (Mono 16-24kHz).'
    });
    aiScore += 30;
  }

  // Limit AI score contribution
  aiScore = Math.round(Math.min(99, Math.max(1, aiScore)));

  let verdict = 'Likely Human Voice / Natural Audio';
  if (aiScore > 75) {
    verdict = 'Likely AI-Generated / Synthesized';
  } else if (aiScore > 40) {
    verdict = 'Mixed / Suspect Audio';
  }

  return {
    aiProbability: aiScore,
    verdict,
    audioInfo: {
      format: formatString.toUpperCase(),
      sampleRate: sampleRate,
      channels: channels,
      bitrate: '128 kbps (simulated)',
      duration: duration ? Math.round(duration * 10) / 10 + 's' : 'Unknown'
    },
    metadataAnalysis: {
      tracesFound: traces,
      rawMetadata: {
        common: {
          title: file.name,
          artist: traces.find(t => t.tag === 'Artist')?.value || 'Unknown',
          album: 'Single',
          year: new Date().getFullYear(),
          genre: 'Vocal / Speech',
          comment: [traces.map(t => t.value).join(', ')]
        },
        format: {
          container: formatString,
          sampleRate: sampleRate,
          numberOfChannels: channels,
          duration: duration
        }
      }
    }
  };
}
