/**
 * keyManager.js — Client-side secure API key manager.
 * Encrypts and decrypts OpenRouter keys inside browser localStorage using Web Crypto API (AES-GCM).
 * Implements auto-wipe after 24 hours.
 */

const PASSWORD = 'omnidetect_local_secret_key_salt_2026';

async function getEncryptionKey() {
  const enc = new TextEncoder();
  const rawKey = enc.encode(PASSWORD);
  const hash = await window.crypto.subtle.digest('SHA-256', rawKey);
  return await window.crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(text) {
  try {
    const key = await getEncryptionKey();
    const enc = new TextEncoder();
    const encoded = enc.encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return JSON.stringify({
      iv: ivHex,
      data: encryptedHex,
      savedAt: Date.now()
    });
  } catch (err) {
    console.error('[KeyManager] Encryption failed:', err);
    return null;
  }
}

export async function decryptText(encryptedString) {
  if (!encryptedString) return null;
  try {
    const { iv, data, savedAt } = JSON.parse(encryptedString);
    if (!iv || !data) return null;
    
    // Auto-wipe check (24 hour expiration)
    const EXPIRE_LIMIT = 24 * 60 * 60 * 1000;
    if (Date.now() - savedAt > EXPIRE_LIMIT) {
      console.log('[KeyManager] API keys expired after 24 hours. Auto-wiping.');
      localStorage.removeItem('omnidetect_secure_keys');
      return null;
    }
    
    const key = await getEncryptionKey();
    const ivBytes = new Uint8Array(iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const dataBytes = new Uint8Array(data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      dataBytes
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.error('[KeyManager] Decryption failed:', err);
    return null;
  }
}

/**
 * Saves keys to localStorage in encrypted state.
 */
export async function saveKeys(apiKeysInput) {
  if (!apiKeysInput) {
    localStorage.removeItem('omnidetect_secure_keys');
    return;
  }

  let keysArray = [];
  if (Array.isArray(apiKeysInput)) {
    keysArray = apiKeysInput;
  } else if (typeof apiKeysInput === 'string') {
    keysArray = apiKeysInput
      .split(/[\n,\s;]+/)
      .map(k => k.trim())
      .filter(k => k.startsWith('sk-or-v1-'));
  }

  if (keysArray.length === 0) {
    localStorage.removeItem('omnidetect_secure_keys');
    return;
  }

  const encryptedString = await encryptText(JSON.stringify(keysArray));
  if (encryptedString) {
    localStorage.setItem('omnidetect_secure_keys', encryptedString);
  }
}

/**
 * Returns all decrypted active API keys.
 */
export async function getKeys() {
  const stored = localStorage.getItem('omnidetect_secure_keys');
  if (!stored) return [];
  try {
    const decrypted = await decryptText(stored);
    if (!decrypted) return [];
    return JSON.parse(decrypted);
  } catch (err) {
    return [];
  }
}

/**
 * Returns first available API key.
 */
export async function getKey() {
  const keys = await getKeys();
  return keys.length > 0 ? keys[0] : null;
}
