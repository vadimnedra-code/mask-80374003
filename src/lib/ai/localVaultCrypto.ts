/**
 * PIN-based encryption for AI Local Vault
 * Uses Web Crypto API with PBKDF2 key derivation
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;

/**
 * Derives an AES-GCM key from a PIN using PBKDF2
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinData as unknown as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data with a PIN
 * Returns base64-encoded string containing salt + iv + ciphertext
 */
export async function encryptWithPIN(data: string, pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(data);

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(pin, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
    key,
    plaintext as unknown as ArrayBuffer
  );

  // Combine salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data with a PIN
 * Throws if PIN is incorrect
 */
export async function decryptWithPIN(encryptedData: string, pin: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  );

  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(pin, salt);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
      key,
      ciphertext as unknown as ArrayBuffer
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('Invalid PIN');
  }
}

/**
 * Verifies if a PIN is correct by trying to decrypt test data
 */
export async function verifyPIN(encryptedTest: string, pin: string): Promise<boolean> {
  try {
    await decryptWithPIN(encryptedTest, pin);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates a test encryption to verify PIN later
 */
export async function createPINVerifier(pin: string): Promise<string> {
  return encryptWithPIN('MASK_VAULT_VERIFY', pin);
}
