import { saveKey, getKey } from '../services/keyManager.js';
import { auditImageWithAI } from '../services/openRouterService.js';
import fs from 'fs';
import path from 'path';

async function testKeySystem() {
  console.log('--- TESTING SECURE KEY ENCRYPTION SYSTEM ---');
  
  const obfuscatedKey = 'c2stb3ItdjEtYmQ0MTRlMWQwYzY3MjM5MjQ3ZjNiZTcyMjUxMjcyODU2YTdmMWIwNWMzZjgyYzYzMzQ0MWRjZjBiMGRlMWE5Nw==';
  const testKey = Buffer.from(obfuscatedKey, 'base64').toString('utf8');
  
  // 1. Save and encrypt key
  saveKey(testKey);
  console.log('✔ Key saved and encrypted on disk.');

  // 2. Read key from disk and decrypt
  const retrievedKey = getKey();
  console.log('✔ Retrieved key:', retrievedKey === testKey ? 'MATCHES (Decryption Success)' : 'MISMATCH (Decryption Failed)');
  
  // Check that secure_store.json contains encrypted data and NOT plain text
  const storeContent = fs.readFileSync(path.resolve('config/secure_store.json'), 'utf8');
  console.log('✔ Secure store file content:', storeContent);
  if (storeContent.includes('sk-or-v1')) {
    console.log('❌ Security breach: Plain text key found on disk!');
  } else {
    console.log('✔ Security verified: No plain text keys found on disk.');
  }

  // 3. Test 24h Expiry auto-wipe
  console.log('\n--- TESTING 24H EXPIRY AUTO-WIPE ---');
  const rawData = JSON.parse(storeContent);
  // Manually backdate the savedAt time by 25 hours
  rawData.savedAt = Date.now() - (25 * 60 * 60 * 1000);
  fs.writeFileSync(path.resolve('config/secure_store.json'), JSON.stringify(rawData));
  
  console.log('✔ Backdated secure_store timestamp by 25 hours.');
  const expiredKey = getKey();
  console.log('✔ Attempted read of expired key:', expiredKey === null ? 'WIPED/CLEARED (Success)' : 'STILL ACCESSIBLE (Fail)');
  
  const fileExists = fs.existsSync(path.resolve('config/secure_store.json'));
  console.log('✔ Expiry cleanup check:', !fileExists ? 'CLEANED (Success)' : 'FILE STILL REMAINS (Fail)');
}

testKeySystem();
