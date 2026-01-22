import { useEffect, useCallback, forwardRef, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MediaLightboxProps {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MediaLightbox = forwardRef<HTMLDivElement, MediaLightboxProps>(
  ({ src, type, alt = 'Медиа', isOpen, onClose }, ref) => {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);

    // Close on Escape key
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    }, [onClose]);

    useEffect(() => {
      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        // Reset transformations when opening
        setScale(1);
        setRotation(0);
      }
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [isOpen, handleKeyDown]);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    
    const handleDownload = async () => {
      try {
        const response = await fetch(src);
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

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={onClose}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/95" />
            
            {/* Top toolbar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center gap-2">
                {type === 'image' && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      title="Увеличить"
                    >
                      <ZoomIn className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      title="Уменьшить"
                    >
                      <ZoomOut className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRotate(); }}
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      title="Повернуть"
                    >
                      <RotateCw className="w-5 h-5 text-white" />
                    </button>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Скачать"
                >
                  <Download className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  title="Закрыть"
                >
                  <X className="w-5 h-5 text-white" />
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
                <img
                  src={src}
                  alt={alt}
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
                  draggable={false}
                />
              ) : (
                <video
                  src={src}
                  controls
                  autoPlay
                  className="max-w-full max-h-[85vh] rounded-lg"
                  style={{ maxWidth: '90vw' }}
                />
              )}
            </motion.div>

            {/* Scale indicator for images */}
            {type === 'image' && scale !== 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 bg-black/70 rounded-full text-white text-sm">
                {Math.round(scale * 100)}%
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

MediaLightbox.displayName = 'MediaLightbox';