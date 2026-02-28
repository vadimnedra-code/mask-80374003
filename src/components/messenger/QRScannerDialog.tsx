import { useState, useEffect, useRef } from 'react';
import { X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

export const QRScannerDialog = ({ isOpen, onClose, onScan }: QRScannerDialogProps) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const scannerId = 'qr-scanner-region';
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
            onClose();
          },
          () => {}
        );
      } catch (err) {
        setError('Не удалось получить доступ к камере. Проверьте разрешения.');
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timeout);
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-card rounded-2xl p-5 shadow-xl flex flex-col items-center gap-4 max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Сканировать QR-код
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          id="qr-scanner-region"
          ref={containerRef}
          className="w-full rounded-xl overflow-hidden bg-black aspect-square"
        />

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Наведите камеру на QR-код хеш-кода контакта
        </p>

        <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>
          Отмена
        </Button>
      </div>
    </div>
  );
};
