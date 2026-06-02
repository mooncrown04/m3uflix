import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface MeshGradientProps {
  color: string;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export const MeshGradient: React.FC<MeshGradientProps> = ({ 
  color, 
  className,
  intensity = 'medium'
}) => {
  const opacityValues = useMemo(() => {
    switch(intensity) {
      case 'low': return { bg: 0.1, circle: 0.15 };
      case 'high': return { bg: 0.3, circle: 0.4 };
      default: return { bg: 0.2, circle: 0.25 };
    }
  }, [intensity]);

  return (
    <div className={cn("fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-black", className)}>
      {/* Dynamic Background Base */}
      <motion.div 
        className="absolute inset-0 opacity-20"
        animate={{
          backgroundColor: color,
        }}
        transition={{ duration: 2 }}
        style={{
          filter: 'blur(100px)',
          opacity: opacityValues.bg
        }}
      />

      {/* Mesh Circles */}
      <motion.div
        className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] rounded-full opacity-20"
        animate={{
          backgroundColor: color,
          scale: [1, 1.3, 1],
          x: [0, 80, 0],
          y: [0, 40, 0],
          rotate: [0, 90, 0]
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          filter: 'blur(140px)',
          opacity: opacityValues.circle,
          mixBlendMode: 'screen'
        }}
      />

      <motion.div
        className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full opacity-10"
        animate={{
          backgroundColor: color, // We can derive a secondary color here but for now use same with different filters
          scale: [1.2, 0.8, 1.2],
          x: [0, -60, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5
        }}
        style={{
          filter: 'blur(120px) hue-rotate(30deg)',
          opacity: opacityValues.circle * 0.8,
          mixBlendMode: 'overlay'
        }}
      />

      <motion.div
        className="absolute -bottom-[20%] left-1/4 w-[50%] h-[50%] rounded-full opacity-15"
        animate={{
          backgroundColor: color,
          scale: [0.9, 1.2, 0.9],
          x: [0, 40, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 10
        }}
        style={{
          filter: 'blur(100px) hue-rotate(-30deg)',
          opacity: opacityValues.circle * 0.7,
          mixBlendMode: 'screen'
        }}
      />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full opacity-10"
        animate={{
          backgroundColor: color,
          scale: [0.8, 1.1, 0.8],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5
        }}
        style={{
          filter: 'blur(90px)'
        }}
      />

      {/* Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] contrast-150 brightness-150 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
