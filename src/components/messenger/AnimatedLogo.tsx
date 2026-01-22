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
    <div 
      className={`relative overflow-hidden ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: '#000000' }}
    >
      {/* Subtle golden glow behind logo */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', filter: 'blur(20px)' }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Logo image with black background fallback */}
      <motion.div
        className="absolute inset-0 z-10"
        style={{ backgroundColor: '#000000' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <img
          src={maskLogo}
          alt="МАСК"
          className="w-full h-full object-cover"
          style={{ backgroundColor: '#000000' }}
        />
      </motion.div>
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 overflow-hidden z-20 pointer-events-none"
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.08) 50%, transparent 100%)',
            transform: 'skewX(-20deg)',
          }}
          animate={{
            x: ['-200%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          }}
        />
      </motion.div>
    </div>
  );
};
