import maskLogo from '@/assets/mask-logo.png';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AnimatedLogo = ({ size = 'md', className = '' }: AnimatedLogoProps) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <div className={`relative overflow-hidden rounded-none bg-logo ${sizeClasses[size]} ${className}`}>
      {/* Pure black square background */}
      <div className="absolute inset-0 bg-logo" />

      {/* Mask icon (no animation, covers edge pixels to avoid any border artifacts) */}
      <img
        src={maskLogo}
        alt="МАСК"
        className="absolute inset-0 h-full w-full rounded-none bg-logo object-cover block scale-[1.03]"
        draggable={false}
      />
    </div>
  );
};
