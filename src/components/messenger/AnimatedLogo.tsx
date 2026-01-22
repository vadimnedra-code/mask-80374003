import { motion } from 'framer-motion';
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
    <div className={`relative bg-black ${sizeClasses[size]} ${className}`}>
      {/* Animated glow rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, hsl(142 70% 45% / 0.4), hsl(185 80% 45% / 0.4), hsl(270 70% 55% / 0.4), hsl(350 80% 55% / 0.4), hsl(38 92% 50% / 0.4), hsl(142 70% 45% / 0.4))',
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Secondary rotating ring */}
      <motion.div
        className="absolute inset-1 rounded-full"
        style={{
          background: 'conic-gradient(from 180deg, hsl(210 100% 50% / 0.3), hsl(142 70% 45% / 0.3), hsl(38 92% 50% / 0.3), hsl(350 80% 55% / 0.3), hsl(210 100% 50% / 0.3))',
        }}
        animate={{
          rotate: -360,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Blur glow effect */}
      <motion.div
        className="absolute inset-2 rounded-full blur-xl"
        style={{
          background: 'conic-gradient(from 90deg, hsl(142 70% 45% / 0.5), hsl(185 80% 45% / 0.5), hsl(270 70% 55% / 0.5), hsl(142 70% 45% / 0.5))',
        }}
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: {
            duration: 6,
            repeat: Infinity,
            ease: 'linear',
          },
          scale: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      />
      
      {/* Inner dark background */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Logo with pulse animation */}
      <motion.img
        src={maskLogo}
        alt="МАСК"
        className={`relative ${sizeClasses[size]} object-cover z-10`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
        }}
        transition={{
          duration: 0.6,
          ease: [0.34, 1.56, 0.64, 1],
        }}
      />
      
      {/* Shimmer effect overlay */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden z-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
            transform: 'skewX(-20deg)',
          }}
          animate={{
            x: ['-200%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 2,
            ease: 'easeInOut',
          }}
        />
      </motion.div>
    </div>
  );
};
