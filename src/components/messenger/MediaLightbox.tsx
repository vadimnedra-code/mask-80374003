import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSignedMediaUrl } from '@/hooks/useSignedMediaUrl';

interface MediaLightboxProps {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaLightbox({ src, type, alt = 'Медиа', isOpen, onClose }: MediaLightboxProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageStatus, setImageStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [loadToken, setLoadToken] = useState(0);

  const { url: resolvedSrc, loading: resolvingUrl } = useSignedMediaUrl(src, { expiresIn: 60 * 60 });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setScale(1);
      setRotation(0);
      if (type === 'image') {
        // Force a fresh <img> instance after we switch to loading state to avoid cached-image race.
        setImageStatus('loading');
        setLoadToken((v) => v + 1);
      } else {
        setImageStatus('idle');
      }
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown, type, resolvedSrc]);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handleDownload = async () => {
    try {
      const response = await fetch(resolvedSrc ?? src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media-${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key="lightbox"
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
            {type === 'image' && (
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
        
        {/* Media container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 max-w-[95vw] max-h-[90vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {type === 'image' ? (
            <div className="relative flex items-center justify-center">
              {(imageStatus === 'loading' || resolvingUrl) && (
                <div className="absolute inset-0 flex items-center justify-center min-w-[200px] min-h-[200px]">
                  <div className="flex items-center gap-2 rounded-full bg-muted/60 px-4 py-2 text-sm text-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка…
                  </div>
                </div>
              )}

              {imageStatus === 'error' && (
                <div className="flex items-center justify-center p-6 min-w-[200px] min-h-[200px]">
                  <div className="max-w-sm rounded-xl border bg-card/80 backdrop-blur px-4 py-3 text-center">
                    <div className="text-sm font-medium text-foreground">Не удалось загрузить изображение</div>
                    <div className="mt-1 text-xs text-muted-foreground break-all">{src}</div>
                    <a
                      href={src}
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
                key={`${resolvedSrc ?? src}-${loadToken}`}
                src={resolvedSrc ?? src}
                alt={alt}
                onLoad={() => setImageStatus('loaded')}
                onError={() => setImageStatus('error')}
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out',
                  display: imageStatus === 'error' ? 'none' : 'block',
                  opacity: imageStatus === 'loaded' ? 1 : 0,
                }}
                className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
                draggable={false}
              />
            </div>
          ) : (
            <video
              src={resolvedSrc ?? src}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] rounded-lg"
              style={{ maxWidth: '90vw' }}
            />
          )}
        </motion.div>

        {/* Scale indicator for images */}
        {type === 'image' && scale !== 1 && imageStatus === 'loaded' && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-muted/70 rounded-full text-foreground text-sm">
            {Math.round(scale * 100)}%
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}