/**
 * Offline message queue — saves messages to IndexedDB when offline,
 * automatically sends them when connection restores.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DB_NAME = 'mask-offline-queue';
const STORE_NAME = 'pending-messages';
const DB_VERSION = 1;

export interface QueuedMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'voice' | 'file';
  media_url: string | null;
  is_encrypted: boolean;
  encrypted_content: string | null;
  created_at: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addToQueue(msg: QueuedMessage): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(msg);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllQueued(): Promise<QueuedMessage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const useOfflineQueue = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const flushingRef = useRef(false);

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Flush queue when we come back online
  const flushQueue = useCallback(async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;

    try {
      const queued = await getAllQueued();
      if (queued.length === 0) {
        setPendingCount(0);
        return;
      }

      let sent = 0;
      for (const msg of queued) {
        const { error } = await supabase
          .from('messages')
          .insert({
            chat_id: msg.chat_id,
            sender_id: msg.sender_id,
            content: msg.content,
            message_type: msg.message_type,
            media_url: msg.media_url,
            is_encrypted: msg.is_encrypted,
            encrypted_content: msg.encrypted_content,
          });

        if (!error) {
          await removeFromQueue(msg.id);
          sent++;
        } else {
          console.error('[OfflineQueue] Failed to send queued message:', error);
          break; // Stop on first error to preserve order
        }
      }

      const remaining = await getAllQueued();
      setPendingCount(remaining.length);

      if (sent > 0) {
        toast.success(`Отправлено ${sent} сообщ. из очереди`);
      }
    } finally {
      flushingRef.current = false;
    }
  }, []);

  // Auto-flush when going online
  useEffect(() => {
    if (isOnline) {
      flushQueue();
    }
  }, [isOnline, flushQueue]);

  // Refresh pending count on mount
  useEffect(() => {
    getAllQueued().then(q => setPendingCount(q.length));
  }, []);

  const enqueue = useCallback(async (msg: QueuedMessage) => {
    await addToQueue(msg);
    setPendingCount(prev => prev + 1);
    toast.info('Нет сети — сообщение будет отправлено позже', { duration: 2000 });
  }, []);

  return { isOnline, pendingCount, enqueue, flushQueue };
};
