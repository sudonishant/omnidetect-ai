import { saveKey, getKeys } from '../services/keyManager.js';
import { auditImageWithAI } from '../services/openRouterService.js';

async function testRotation() {
  console.log('--- TESTING AUTOMATIC API KEY ROTATION & FALLBACKS ---');
  
  const obfuscatedKeys = [
    'c2stb3ItdjEtaW52YWxpZF9tb2NrX2tleV90aGF0X3Nob3VsZF9mYWlsX2ZpcnN0XzQwMQ==', // invalid key
    'c2stb3ItdjEtYmQ0MTRlMWQwYzY3MjM5MjQ3ZjNiZTcyMjUxMjcyODU2YTdmMWIwNWMzZjgyYzYzMzQ0MWRjZjBiMGRlMWE5Nw=='  // valid backup key
  ];
  const keysList = obfuscatedKeys.map(k => Buffer.from(k, 'base64').toString('utf8'));

  saveKey(keysList);
  console.log('✔ Stored encrypted key rotation list:', getKeys());

  const mockMetrics = {
    aiProbability: 99,
    imageInfo: { isScreenshot: false, width: 1024, height: 1024, format: 'jpeg' },
    ela: { elaMetrics: { averagePixelDiff: 8.5, noiseSd: 4.2 } },
    frequencyAnalysis: { spikes: 120 },
    geometryCheck: { boundarySharpnessScore: 65, doubleCompressionRatio: 0.85, medianBlurRatio: 0.25 }
  };

  console.log('⚡ Sending request. Key Index 0 should fail/rotate, Key Index 1 should succeed...');
  const explanation = await auditImageWithAI(mockMetrics);
  console.log('\nFinal AI Auditor Response:');
  console.log('=======================');
  console.log(explanation);
  console.log('=======================');
}

testRotation();
