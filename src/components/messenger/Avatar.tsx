import { cn } from '@/lib/utils';

interface AvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const statusSizeClasses = {
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-4 h-4 border-2',
};

export const Avatar = ({ src, alt, size = 'md', status, className }: AvatarProps) => {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <img
        src={src}
        alt={alt}
        className={cn(
          sizeClasses[size],
          'rounded-full object-cover bg-muted ring-2 ring-background'
        )}
      />
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-background',
            statusSizeClasses[size],
            status === 'online' && 'status-online',
            status === 'offline' && 'status-offline',
            status === 'away' && 'bg-amber-400'
          )}
        />
      )}
    </div>
  );
};
