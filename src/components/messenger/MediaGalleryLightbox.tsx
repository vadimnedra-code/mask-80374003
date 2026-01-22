import { useEffect, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Loader2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useSignedMediaUrl } from '@/hooks/useSignedMediaUrl';
import { cn } from '@/lib/utils';

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
}

interface MediaGalleryLightboxProps {
  mediaItems: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

// Inner component that handles a single media item with signed URL
function MediaContent({ 
  item, 
  scale, 
  rotation, 
  onLoad, 
  onError 
}: { 
  item: MediaItem; 
  scale: number; 
  rotation: number;
  onLoad: () => void;
  onError: () => void;
}) {
  const { url: signedUrl, loading: signingUrl } = useSignedMediaUrl(item.url);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  // Reset status when item changes
  useEffect(() => {
    setStatus('loading');
  }, [item.id]);

  const handleLoad = () => {
    setStatus('loaded');
    onLoad();
  };

  const handleError = () => {
    setStatus('error');
    onError();
  };

  if (item.type === 'video') {
    return (
      <video
        key={item.id}
        src={signedUrl ?? item.url}
        controls
        autoPlay
        className="max-w-full max-h-[85vh] rounded-lg"
        style={{ maxWidth: '90vw' }}
      />
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      {(status === 'loading' || signingUrl) && (
        <div className="absolute inset-0 flex items-center justify-center min-w-[200px] min-h-[200px]">
          <div className="flex items-center gap-2 rounded-full bg-muted/60 px-4 py-2 text-sm text-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка…
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-center p-6 min-w-[200px] min-h-[200px]">
          <div className="max-w-sm rounded-xl border bg-card/80 backdrop-blur px-4 py-3 text-center">
            <div className="text-sm font-medium text-foreground">Не удалось загрузить</div>
            <a
              href={signedUrl ?? item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
              Открыть в новой вкладке
            </a>
          </div>
        </div>
      )}

      <img
        key={item.id}
        src={signedUrl ?? item.url}
        alt="Медиа"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          transition: 'transform 0.2s ease-out',
          display: status === 'error' ? 'none' : 'block',
          opacity: status === 'loaded' ? 1 : 0,
        }}
        className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
        draggable={false}
      />
    </div>
  );
}

export function MediaGalleryLightbox({ 
  mediaItems, 
  initialIndex, 
  isOpen, 
  onClose 
}: MediaGalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [direction, setDirection] = useState(0);

  const currentItem = mediaItems[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < mediaItems.length - 1;

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setRotation(0);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && hasPrev) {
      setDirection(-1);
      setCurrentIndex(i => i - 1);
      setScale(1);
      setRotation(0);
    } else if (e.key === 'ArrowRight' && hasNext) {
      setDirection(1);
      setCurrentIndex(i => i + 1);
      setScale(1);
      setRotation(0);
    }
  }, [onClose, hasPrev, hasNext]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = async () => {
    if (!currentItem) return;
    try {
      const response = await fetch(currentItem.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media-${Date.now()}.${currentItem.type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const goPrev = () => {
    if (hasPrev) {
      setDirection(-1);
      setCurrentIndex(i => i - 1);
      setScale(1);
      setRotation(0);
    }
  };

  const goNext = () => {
    if (hasNext) {
      setDirection(1);
      setCurrentIndex(i => i + 1);
      setScale(1);
      setRotation(0);
    }
  };

  // Swipe handling
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const velocity = 0.5;
    
    if (info.offset.x > threshold || info.velocity.x > velocity) {
      // Swiped right - go to previous
      if (hasPrev) {
        goPrev();
      }
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      // Swiped left - go to next
      if (hasNext) {
        goNext();
      }
    }
  };

  if (!isOpen || !currentItem) return null;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/95" />
      
      {/* Top toolbar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-background/70 to-transparent">
        <div className="flex items-center gap-2">
          {currentItem.type === 'image' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                className="p-2.5 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors"
                title="Увеличить"
              >
                <ZoomIn className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                className="p-2.5 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors"
                title="Уменьшить"
              >
                <ZoomOut className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleRotate(); }}
                className="p-2.5 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors"
                title="Повернуть"
              >
                <RotateCw className="w-5 h-5 text-foreground" />
              </button>
            </>
          )}
        </div>
        
        {/* Counter */}
        <div className="absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-muted/40 text-foreground text-sm">
          {currentIndex + 1} / {mediaItems.length}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="p-2.5 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors"
            title="Скачать"
          >
            <Download className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors"
            title="Закрыть"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors"
          title="Предыдущее"
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors"
          title="Следующее"
        >
          <ChevronRight className="w-6 h-6 text-foreground" />
        </button>
      )}
      
      {/* Media container with swipe */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentItem.id}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          drag={scale === 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="relative z-10 max-w-[95vw] max-h-[90vh] flex items-center justify-center cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <MediaContent 
            item={currentItem} 
            scale={scale} 
            rotation={rotation}
            onLoad={() => {}}
            onError={() => {}}
          />
        </motion.div>
      </AnimatePresence>

      {/* Scale indicator for images */}
      {currentItem.type === 'image' && scale !== 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-muted/70 rounded-full text-foreground text-sm">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Dots indicator */}
      {mediaItems.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {mediaItems.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
                setScale(1);
                setRotation(0);
              }}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                idx === currentIndex 
                  ? 'bg-foreground w-4' 
                  : 'bg-foreground/40 hover:bg-foreground/60'
              )}
            />
          ))}
        </div>
      )}
    </motion.div>
  );

  return createPortal(content, document.body);
}
