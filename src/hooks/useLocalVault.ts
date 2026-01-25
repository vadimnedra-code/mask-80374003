import { useState, useCallback, useEffect } from 'react';
import { 
  getMeta, 
  setMeta, 
  saveMessage, 
  getAllMessages, 
  clearAllMessages,
  isVaultInitialized,
  deleteVault,
  getMessageCount
} from '@/lib/ai/localVaultDB';
import {
  encryptWithPIN,
  decryptWithPIN,
  verifyPIN,
  createPINVerifier
} from '@/lib/ai/localVaultCrypto';
import type { AIMessage } from '@/hooks/useAIChat';

export type VaultStatus = 'locked' | 'unlocked' | 'uninitialized' | 'loading';

export const useLocalVault = () => {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [pin, setPin] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);

  // Check vault status on mount
  useEffect(() => {
    checkVaultStatus();
  }, []);

  const checkVaultStatus = useCallback(async () => {
    setStatus('loading');
    const initialized = await isVaultInitialized();
    setStatus(initialized ? 'locked' : 'uninitialized');
    
    if (initialized) {
      const count = await getMessageCount();
      setMessageCount(count);
    }
  }, []);

  // Initialize vault with new PIN
  const initializeVault = useCallback(async (newPin: string): Promise<boolean> => {
    try {
      const verifier = await createPINVerifier(newPin);
      await setMeta('pin_verifier', verifier);
      setPin(newPin);
      setStatus('unlocked');
      return true;
    } catch (error) {
      console.error('Failed to initialize vault:', error);
      return false;
    }
  }, []);

  // Unlock vault with PIN
  const unlockVault = useCallback(async (inputPin: string): Promise<boolean> => {
    try {
      const verifier = await getMeta('pin_verifier');
      if (!verifier) return false;

      const isValid = await verifyPIN(verifier, inputPin);
      if (isValid) {
        setPin(inputPin);
        setStatus('unlocked');
        const count = await getMessageCount();
        setMessageCount(count);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unlock vault:', error);
      return false;
    }
  }, []);

  // Lock vault
  const lockVault = useCallback(() => {
    setPin(null);
    setStatus('locked');
  }, []);

  // Save message to vault (encrypted)
  const saveToVault = useCallback(async (message: AIMessage): Promise<boolean> => {
    if (!pin || status !== 'unlocked') return false;

    try {
      const encryptedContent = await encryptWithPIN(message.content, pin);
      await saveMessage({
        id: message.id,
        role: message.role,
        content: encryptedContent,
        createdAt: message.createdAt.toISOString(),
      });
      setMessageCount(prev => prev + 1);
      return true;
    } catch (error) {
      console.error('Failed to save to vault:', error);
      return false;
    }
  }, [pin, status]);

  // Load all messages from vault (decrypted)
  const loadFromVault = useCallback(async (): Promise<AIMessage[]> => {
    if (!pin || status !== 'unlocked') return [];

    try {
      const encrypted = await getAllMessages();
      const decrypted: AIMessage[] = [];

      for (const msg of encrypted) {
        try {
          const content = await decryptWithPIN(msg.content, pin);
          decrypted.push({
            id: msg.id,
            role: msg.role,
            content,
            createdAt: new Date(msg.createdAt),
          });
        } catch {
          // Skip corrupted messages
          console.warn('Failed to decrypt message:', msg.id);
        }
      }

      return decrypted;
    } catch (error) {
      console.error('Failed to load from vault:', error);
      return [];
    }
  }, [pin, status]);

  // Clear all messages in vault
  const clearVault = useCallback(async (): Promise<boolean> => {
    if (status !== 'unlocked') return false;

    try {
      await clearAllMessages();
      setMessageCount(0);
      return true;
    } catch (error) {
      console.error('Failed to clear vault:', error);
      return false;
    }
  }, [status]);

  // Delete entire vault (requires re-initialization)
  const destroyVault = useCallback(async (): Promise<boolean> => {
    try {
      await deleteVault();
      setPin(null);
      setStatus('uninitialized');
      setMessageCount(0);
      return true;
    } catch (error) {
      console.error('Failed to destroy vault:', error);
      return false;
    }
  }, []);

  // Change PIN
  const changePIN = useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    if (status !== 'unlocked') return false;

    try {
      // Verify old PIN
      const verifier = await getMeta('pin_verifier');
      if (!verifier || !await verifyPIN(verifier, oldPin)) {
        return false;
      }

      // Re-encrypt all messages with new PIN
      const messages = await loadFromVault();
      await clearAllMessages();

      setPin(newPin);
      
      for (const msg of messages) {
        const encryptedContent = await encryptWithPIN(msg.content, newPin);
        await saveMessage({
          id: msg.id,
          role: msg.role,
          content: encryptedContent,
          createdAt: msg.createdAt.toISOString(),
        });
      }

      // Update verifier
      const newVerifier = await createPINVerifier(newPin);
      await setMeta('pin_verifier', newVerifier);

      return true;
    } catch (error) {
      console.error('Failed to change PIN:', error);
      return false;
    }
  }, [status, loadFromVault]);

  return {
    status,
    messageCount,
    isUnlocked: status === 'unlocked',
    isInitialized: status !== 'uninitialized',
    initializeVault,
    unlockVault,
    lockVault,
    saveToVault,
    loadFromVault,
    clearVault,
    destroyVault,
    changePIN,
  };
};
