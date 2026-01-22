import { useEffect, useRef } from 'react';
import { useChats } from '@/hooks/useChats';

export const useDocumentTitle = () => {
  const { chats } = useChats();
  const originalTitleRef = useRef(document.title);

  useEffect(() => {
    // Calculate total unread count
    const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Mask`;
      
      // Update favicon with badge (optional enhancement)
      updateFaviconBadge(totalUnread);
    } else {
      document.title = 'Mask';
      resetFavicon();
    }

    return () => {
      document.title = originalTitleRef.current;
      resetFavicon();
    };
  }, [chats]);
};

// Helper to update favicon with unread badge
const updateFaviconBadge = (count: number) => {
  const canvas = document.createElement('canvas');
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;

  // Load original favicon
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Draw original favicon
    ctx.drawImage(img, 0, 0, size, size);
    
    // Draw badge circle
    const badgeSize = 14;
    const badgeX = size - badgeSize;
    const badgeY = 0;
    
    ctx.beginPath();
    ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    
    // Draw count text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayCount = count > 99 ? '99+' : count.toString();
    ctx.fillText(displayCount, badgeX + badgeSize / 2, badgeY + badgeSize / 2);
    
    // Update favicon
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
    link.rel = 'icon';
    link.href = canvas.toDataURL();
    document.head.appendChild(link);
  };
  
  img.src = '/favicon.png';
};

const resetFavicon = () => {
  const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (link) {
    link.href = '/favicon.png';
  }
};
