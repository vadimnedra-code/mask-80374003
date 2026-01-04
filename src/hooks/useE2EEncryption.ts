/**
 * Hook for End-to-End Encryption using Signal Protocol
 * Manages identity keys, sessions, and message encryption/decryption
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  getOrCreateIdentity,
  exportPublicIdentity,
  createPreKeyBundle,
  getOrCreateSession,
  encryptMessage,
  decryptMessage,
  saveSession,
  clearAllE2EEData,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  E2EEIdentity
} from '@/lib/e2ee/crypto';
import type * as DKeyRatchet from '2key-ratchet';

interface UseE2EEncryptionReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Initialize E2EE for current user
  initialize: () => Promise<void>;
  
  // Encrypt message for recipient
  encrypt: (recipientId: string, plaintext: string) => Promise<{
    encryptedContent: string;
    isPreKeyMessage: boolean;
  } | null>;
  
  // Decrypt message from sender
  decrypt: (senderId: string, encryptedContent: string, isPreKeyMessage: boolean) => Promise<string | null>;
  
  // Check if recipient has E2EE enabled
  hasE2EEKeys: (userId: string) => Promise<boolean>;
  
  // Clear all E2EE data (on logout)
  clearKeys: () => Promise<void>;
}

export const useE2EEncryption = (): UseE2EEncryptionReturn => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const identityRef = useRef<E2EEIdentity | null>(null);
  const sessionsRef = useRef<Map<string, DKeyRatchet.AsymmetricRatchet>>(new Map());

  /**
   * Upload keys to server
   */
  const uploadKeysToServer = useCallback(async (identity: E2EEIdentity): Promise<void> => {
    if (!user) return;

    const publicIdentity = await exportPublicIdentity(identity);
    const bundleData = await createPreKeyBundle(identity);

    // Upsert identity keys
    const { error: identityError } = await supabase
      .from('e2ee_identity_keys')
      .upsert({
        user_id: user.id,
        identity_key: arrayBufferToBase64(publicIdentity.identityKey),
        signing_key: arrayBufferToBase64(publicIdentity.signingKey),
        registration_id: publicIdentity.registrationId
      }, { onConflict: 'user_id' });

    if (identityError) {
      console.error('Failed to upload identity keys:', identityError);
      throw new Error('Failed to upload identity keys');
    }

    // Upsert prekey bundle
    const { error: bundleError } = await supabase
      .from('e2ee_prekey_bundles')
      .upsert({
        user_id: user.id,
        bundle: arrayBufferToBase64(bundleData)
      }, { onConflict: 'user_id' });

    if (bundleError) {
      console.error('Failed to upload prekey bundle:', bundleError);
      throw new Error('Failed to upload prekey bundle');
    }
  }, [user]);

  /**
   * Initialize E2EE for current user
   */
  const initialize = useCallback(async (): Promise<void> => {
    if (!user || isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get or create local identity
      const identity = await getOrCreateIdentity(user.id);
      identityRef.current = identity;
      
      // Upload keys to server
      await uploadKeysToServer(identity);
      
      setIsInitialized(true);
      console.log('E2EE initialized successfully');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to initialize E2EE';
      setError(errorMessage);
      console.error('E2EE initialization error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user, isInitialized, uploadKeysToServer]);

  /**
   * Get recipient's prekey bundle from server
   */
  const getRecipientBundle = useCallback(async (recipientId: string): Promise<ArrayBuffer | null> => {
    const { data, error } = await supabase
      .from('e2ee_prekey_bundles')
      .select('bundle')
      .eq('user_id', recipientId)
      .maybeSingle();

    if (error || !data?.bundle) {
      console.warn('Failed to get recipient bundle:', error);
      return null;
    }

    // Handle both string and bytea (Uint8Array) formats
    if (typeof data.bundle === 'string') {
      return base64ToArrayBuffer(data.bundle);
    }
    
    // If it's already an array/Uint8Array from bytea
    const bundle = data.bundle as unknown;
    if (bundle instanceof Uint8Array) {
      return new Uint8Array(bundle).buffer as ArrayBuffer;
    }
    if (Array.isArray(bundle)) {
      return new Uint8Array(bundle).buffer as ArrayBuffer;
    }

    return null;
  }, []);

  /**
   * Encrypt message for recipient
   */
  const encrypt = useCallback(async (
    recipientId: string,
    plaintext: string
  ): Promise<{ encryptedContent: string; isPreKeyMessage: boolean } | null> => {
    if (!identityRef.current) {
      console.warn('E2EE not initialized');
      return null;
    }

    try {
      // Get or create session
      let session = sessionsRef.current.get(recipientId);
      
      if (!session) {
        const recipientBundle = await getRecipientBundle(recipientId);
        session = await getOrCreateSession(
          identityRef.current,
          recipientId,
          recipientBundle ?? undefined
        );
        
        if (!session) {
          console.warn('Could not create session with recipient');
          return null;
        }
        
        sessionsRef.current.set(recipientId, session);
      }

      // Encrypt the message
      const encrypted = await encryptMessage(session, plaintext);
      
      // Save session state
      await saveSession(session, recipientId);

      return {
        encryptedContent: arrayBufferToBase64(encrypted.ciphertext),
        isPreKeyMessage: encrypted.isPreKeyMessage
      };
    } catch (e) {
      console.error('Encryption error:', e);
      return null;
    }
  }, [getRecipientBundle]);

  /**
   * Decrypt message from sender
   */
  const decrypt = useCallback(async (
    senderId: string,
    encryptedContent: string,
    isPreKeyMessage: boolean
  ): Promise<string | null> => {
    if (!identityRef.current) {
      console.warn('E2EE not initialized');
      return null;
    }

    try {
      const ciphertext = base64ToArrayBuffer(encryptedContent);
      const plaintext = await decryptMessage(
        identityRef.current,
        senderId,
        ciphertext,
        isPreKeyMessage
      );
      
      return plaintext;
    } catch (e) {
      console.error('Decryption error:', e);
      return null;
    }
  }, []);

  /**
   * Check if user has E2EE keys
   */
  const hasE2EEKeys = useCallback(async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('e2ee_prekey_bundles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    return !error && !!data;
  }, []);

  /**
   * Clear all E2EE data
   */
  const clearKeys = useCallback(async (): Promise<void> => {
    await clearAllE2EEData();
    identityRef.current = null;
    sessionsRef.current.clear();
    setIsInitialized(false);
  }, []);

  // Auto-initialize when user is available
  useEffect(() => {
    if (user && !isInitialized && !isLoading) {
      initialize();
    }
  }, [user, isInitialized, isLoading, initialize]);

  // Clear on logout
  useEffect(() => {
    if (!user && isInitialized) {
      clearKeys();
    }
  }, [user, isInitialized, clearKeys]);

  return {
    isInitialized,
    isLoading,
    error,
    initialize,
    encrypt,
    decrypt,
    hasE2EEKeys,
    clearKeys
  };
};
