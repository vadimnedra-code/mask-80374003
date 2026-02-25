import { useState } from 'react';
import { X, Copy, Check, Share2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InviteFriendDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const INVITE_URL = 'https://mask.international';
const INVITE_TEXT = 'Попробуй MASK — приватный мессенджер нового поколения со сквозным шифрованием и AI-ассистентом. Присоединяйся!';

export const InviteFriendDialog = ({ isOpen, onClose }: InviteFriendDialogProps) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${INVITE_TEXT}\n${INVITE_URL}`);
      setCopied(true);
      toast.success('Ссылка скопирована!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MASK Messenger', text: INVITE_TEXT, url: INVITE_URL });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const shareLinks = [
    {
      name: 'Telegram',
      color: 'bg-[#2AABEE]/10 text-[#2AABEE] hover:bg-[#2AABEE]/20',
      url: `https://t.me/share/url?url=${encodeURIComponent(INVITE_URL)}&text=${encodeURIComponent(INVITE_TEXT)}`,
    },
    {
      name: 'WhatsApp',
      color: 'bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20',
      url: `https://wa.me/?text=${encodeURIComponent(INVITE_TEXT + '\n' + INVITE_URL)}`,
    },
    {
      name: 'X (Twitter)',
      color: 'bg-foreground/5 text-foreground hover:bg-foreground/10',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(INVITE_TEXT)}&url=${encodeURIComponent(INVITE_URL)}`,
    },
    {
      name: 'Email',
      color: 'bg-primary/10 text-primary hover:bg-primary/20',
      url: `mailto:?subject=${encodeURIComponent('Попробуй MASK Messenger')}&body=${encodeURIComponent(INVITE_TEXT + '\n\n' + INVITE_URL)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-slide-in-bottom shadow-xl border border-border"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-semibold">Пригласить друга</h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Link preview */}
        <div className="bg-muted/50 rounded-xl p-4 mb-5 border border-border">
          <p className="text-sm text-muted-foreground mb-2">{INVITE_TEXT}</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary truncate flex-1">{INVITE_URL}</span>
            <button
              onClick={handleCopy}
              className="shrink-0 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Native share (mobile) */}
        {'share' in navigator && (
          <button
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 p-3 mb-4 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            <Share2 className="w-5 h-5" />
            Поделиться
          </button>
        )}

        {/* Social links */}
        <div className="grid grid-cols-2 gap-2">
          {shareLinks.map(link => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 p-3 rounded-xl font-medium text-sm transition-colors ${link.color}`}
            >
              <MessageCircle className="w-4 h-4" />
              {link.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
