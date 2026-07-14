import { analyzeImage } from '../services/imageDetector.js';
import fs from 'fs';

async function testFile(path, filename, label) {
  try {
    const buffer = fs.readFileSync(path);
    const result = await analyzeImage(buffer, filename);
    console.log(`${label}:`);
    console.log('  AI Probability:', result.aiProbability + '%');
    console.log('  Verdict:', result.verdict);
    console.log('  Is Screenshot:', result.imageInfo?.isScreenshot);
  } catch (err) {
    console.error(`${label} test error:`, err.message);
  }
}

async function runTests() {
  console.log('--- TESTING UPDATED SHADOW-SAFE SCREENSHOT BYPASS ---');
  
  // 1. Wifi-Thermal-Spatial-Mapper screenshot (973 KB)
  await testFile(
    '/home/nishant/.gemini/antigravity/brain/df699e98-4032-414a-ad7f-50f90192e460/media__1784048589119.png',
    'Screenshot_2026-07-13_17_12_22.png',
    'Wifi-Thermal Screen'
  );

  // 2. Hacker image (72 KB)
  await testFile(
    '/home/nishant/.gemini/antigravity/brain/df699e98-4032-414a-ad7f-50f90192e460/media__1784048989539.jpg',
    'hacker.jpg',
    'Hacker Photo'
  );

  // 3. Elephant Photographic AI Render
  await testFile(
    '/home/nishant/.gemini/antigravity/brain/df699e98-4032-414a-ad7f-50f90192e460/media__1784045985792.jpg',
    'elephant.jpg',
    'Elephant AI Photo'
  );
}

runTests();
