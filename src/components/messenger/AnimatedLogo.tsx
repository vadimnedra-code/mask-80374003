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
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Solid black background */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Subtle golden glow behind logo */}
      <motion.div
        className="absolute inset-2 bg-amber-500/10 blur-xl"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Logo image */}
      <motion.img
        src={maskLogo}
        alt="МАСК"
        className={`absolute inset-0 ${sizeClasses[size]} object-cover z-10`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
        }}
        transition={{
          duration: 0.5,
          ease: 'easeOut',
        }}
      />
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 overflow-hidden z-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.1) 50%, transparent 100%)',
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
