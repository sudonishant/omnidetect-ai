import { saveKey, getKeys } from '../services/keyManager.js';
import { auditImageWithAI } from '../services/openRouterService.js';

async function testRotation() {
  console.log('--- TESTING AUTOMATIC API KEY ROTATION & FALLBACKS ---');
  
  // Storing an invalid key first, followed by a valid backup key
  const keysList = [
    'sk-or-v1-invalid_mock_key_that_should_fail_first_401',
    'sk-or-v1-mock_backup_key_for_testing_purposes_only_not_active' // mock key
  ];

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
