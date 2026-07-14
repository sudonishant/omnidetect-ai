import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.resolve('config/secure_store.json');
const KEY_PATH = path.resolve('config/store.key');

const ensureDir = () => {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const getSecretKey = () => {
  ensureDir();
  if (fs.existsSync(KEY_PATH)) {
    return fs.readFileSync(KEY_PATH);
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_PATH, key);
  return key;
};

export function encrypt(text) {
  const key = getSecretKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    savedAt: Date.now()
  };
}

export function decrypt(encryptedObj) {
  if (!encryptedObj || !encryptedObj.encryptedData || !encryptedObj.iv) return null;
  
  // 24 hours = 24 * 60 * 60 * 1000 milliseconds
  const EXPIRE_LIMIT = 24 * 60 * 60 * 1000;
  if (Date.now() - encryptedObj.savedAt > EXPIRE_LIMIT) {
    saveKey(''); // Auto wipe/clear expired store
    return null;
  }

  try {
    const key = getSecretKey();
    const iv = Buffer.from(encryptedObj.iv, 'hex');
    const encryptedText = Buffer.from(encryptedObj.encryptedData, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return null;
  }
}

/**
 * Saves one or multiple API keys.
 * Inputs are cleaned, trimmed, split, and stored as an encrypted JSON array.
 */
export function saveKey(apiKeysInput) {
  ensureDir();
  if (!apiKeysInput) {
    if (fs.existsSync(STORE_PATH)) {
      fs.unlinkSync(STORE_PATH);
    }
    return;
  }

  let keysArray = [];
  if (Array.isArray(apiKeysInput)) {
    keysArray = apiKeysInput;
  } else if (typeof apiKeysInput === 'string') {
    // Split by newlines, commas, or semicolons
    keysArray = apiKeysInput
      .split(/[\n,\s;]+/)
      .map(k => k.trim())
      .filter(k => k.startsWith('sk-or-v1-'));
  }

  if (keysArray.length === 0) {
    if (fs.existsSync(STORE_PATH)) {
      fs.unlinkSync(STORE_PATH);
    }
    return;
  }

  const encrypted = encrypt(JSON.stringify(keysArray));
  fs.writeFileSync(STORE_PATH, JSON.stringify(encrypted));
}

/**
 * Returns all saved decrypted keys.
 */
export function getKeys() {
  // Fallback to secure environment variable if provided in cloud hosting (Vercel/Render/Railway)
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY
      .split(/[\n,\s;]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);
  }

  ensureDir();
  if (!fs.existsSync(STORE_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    const decryptedJson = decrypt(data);
    if (!decryptedJson) return [];
    return JSON.parse(decryptedJson);
  } catch (err) {
    return [];
  }
}

/**
 * Returns the first key (compatibility fallback).
 */
export function getKey() {
  const keys = getKeys();
  return keys.length > 0 ? keys[0] : null;
}
