/**
 * E2EE Crypto utilities using 2key-ratchet (Signal Protocol implementation)
 * X3DH Key Agreement + Double Ratchet Algorithm
 */

import * as DKeyRatchet from '2key-ratchet';
import { Convert } from 'pvtsutils';

// Storage keys for IndexedDB
const DB_NAME = 'mask_e2ee';
const DB_VERSION = 1;
const STORE_IDENTITY = 'identity';

// Initialize WebCrypto polyfill for 2key-ratchet
if (typeof window !== 'undefined' && !window.crypto?.subtle) {
  console.warn('WebCrypto not available');
}

/**
 * Open IndexedDB for E2EE key storage
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_IDENTITY)) {
        db.createObjectStore(STORE_IDENTITY, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Store data in IndexedDB
 */
async function storeData(storeName: string, data: object): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get data from IndexedDB
 */
async function getData(storeName: string, key: string): Promise<{ identityJson: string; registrationId: number } | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Generate a unique registration ID
 */
function generateRegistrationId(): number {
  return Math.floor(Math.random() * 16380) + 1;
}

export interface E2EEIdentity {
  identity: DKeyRatchet.Identity;
  registrationId: number;
}

export interface EncryptedMessage {
  ciphertext: ArrayBuffer;
  isPreKeyMessage: boolean;
}

/**
 * Generate or load local identity
 */
export async function getOrCreateIdentity(userId: string): Promise<E2EEIdentity> {
  // Try to load existing identity
  const stored = await getData(STORE_IDENTITY, userId);
  
  if (stored?.identityJson) {
    try {
      const proto = JSON.parse(stored.identityJson);
      const identity = await DKeyRatchet.Identity.fromJSON(proto);
      return { identity, registrationId: stored.registrationId };
    } catch (e) {
      console.warn('Failed to deserialize identity, creating new one:', e);
    }
  }
  
  // Create new identity
  const registrationId = generateRegistrationId();
  const identity = await DKeyRatchet.Identity.create(
    registrationId,
    1, // Number of signed prekeys
    10, // Number of one-time prekeys
    true // extractable - important for serialization
  );
  
  // Store identity as JSON
  const identityJson = JSON.stringify(await identity.toJSON());
  await storeData(STORE_IDENTITY, {
    id: userId,
    identityJson,
    registrationId
  });
  
  return { identity, registrationId };
}

/**
 * Export identity's public keys for server storage
 */
export async function exportPublicIdentity(e2eeIdentity: E2EEIdentity): Promise<{
  identityKey: ArrayBuffer;
  signingKey: ArrayBuffer;
  registrationId: number;
}> {
  const { identity, registrationId } = e2eeIdentity;
  
  // Export public identity key using ECPublicKey.serialize()
  const identityKey = identity.exchangeKey.publicKey.serialize();
  
  // Export public signing key using ECPublicKey.serialize()
  const signingKey = identity.signingKey.publicKey.serialize();
  
  return { identityKey, signingKey, registrationId };
}

/**
 * Create PreKey bundle for server
 */
export async function createPreKeyBundle(e2eeIdentity: E2EEIdentity): Promise<ArrayBuffer> {
  const { identity, registrationId } = e2eeIdentity;
  
  const bundle = new DKeyRatchet.PreKeyBundleProtocol();
  await bundle.identity.fill(identity);
  bundle.registrationId = registrationId;
  
  // Add signed prekey
  const signedPreKey = identity.signedPreKeys[0];
  bundle.preKeySigned.id = 1;
  bundle.preKeySigned.key = signedPreKey.publicKey;
  await bundle.preKeySigned.sign(identity.signingKey.privateKey);
  
  // Add one-time prekey if available
  if (identity.preKeys.length > 0) {
    const preKey = identity.preKeys[0];
    bundle.preKey.id = 1;
    bundle.preKey.key = preKey.publicKey;
  }
  
  return bundle.exportProto();
}

/**
 * Import PreKey bundle from server
 */
export async function importPreKeyBundle(bundleData: ArrayBuffer): Promise<DKeyRatchet.PreKeyBundleProtocol> {
  return DKeyRatchet.PreKeyBundleProtocol.importProto(bundleData);
}

// In-memory session cache (sessions are recreated on page reload)
const sessionCache = new Map<string, DKeyRatchet.AsymmetricRatchet>();

/**
 * Get or create session with recipient
 */
export async function getOrCreateSession(
  e2eeIdentity: E2EEIdentity,
  recipientId: string,
  recipientBundle?: ArrayBuffer
): Promise<DKeyRatchet.AsymmetricRatchet | null> {
  const { identity } = e2eeIdentity;
  
  // Check cache first
  const cached = sessionCache.get(recipientId);
  if (cached) {
    return cached;
  }
  
  // Need bundle to create new session
  if (!recipientBundle) {
    return null;
  }
  
  // Create new session from bundle
  const bundle = await importPreKeyBundle(recipientBundle);
  const session = await DKeyRatchet.AsymmetricRatchet.create(identity, bundle);
  
  // Cache session
  sessionCache.set(recipientId, session);
  
  return session;
}

/**
 * Encrypt a message
 */
export async function encryptMessage(
  session: DKeyRatchet.AsymmetricRatchet,
  plaintext: string
): Promise<EncryptedMessage> {
  const plaintextBuffer = Convert.FromUtf8String(plaintext);
  const protocol = await session.encrypt(plaintextBuffer);
  const ciphertext = await protocol.exportProto();
  
  return {
    ciphertext,
    isPreKeyMessage: protocol instanceof DKeyRatchet.PreKeyMessageProtocol
  };
}

/**
 * Decrypt a message
 */
export async function decryptMessage(
  e2eeIdentity: E2EEIdentity,
  senderId: string,
  ciphertext: ArrayBuffer,
  isPreKeyMessage: boolean
): Promise<string> {
  const { identity } = e2eeIdentity;
  
  let session = sessionCache.get(senderId);
  let signedMessage: DKeyRatchet.MessageSignedProtocol;
  
  if (isPreKeyMessage) {
    // Parse as PreKeyMessage and create/update session
    const preKeyMessage = await DKeyRatchet.PreKeyMessageProtocol.importProto(ciphertext);
    session = await DKeyRatchet.AsymmetricRatchet.create(identity, preKeyMessage);
    signedMessage = preKeyMessage.signedMessage;
    
    // Cache updated session
    sessionCache.set(senderId, session);
  } else {
    if (!session) {
      throw new Error('No session found for sender');
    }
    signedMessage = await DKeyRatchet.MessageSignedProtocol.importProto(ciphertext);
  }
  
  const plaintextBuffer = await session.decrypt(signedMessage);
  
  return Convert.ToUtf8String(plaintextBuffer);
}

/**
 * Save session after encryption/decryption
 */
export async function saveSession(
  session: DKeyRatchet.AsymmetricRatchet,
  recipientId: string
): Promise<void> {
  sessionCache.set(recipientId, session);
}

/**
 * Delete session
 */
export async function deleteSession(recipientId: string): Promise<void> {
  sessionCache.delete(recipientId);
}

/**
 * Delete all local E2EE data (on logout)
 */
export async function clearAllE2EEData(): Promise<void> {
  sessionCache.clear();
  
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_IDENTITY], 'readwrite');
    tx.objectStore(STORE_IDENTITY).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Convert ArrayBuffer to base64 string for storage
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
