import React from 'react';
import { motion } from 'motion/react';
import { MeshGradient } from '../Effects/MeshGradient';

interface AmbientBackgroundProps {
  ambientColor: string;
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ ambientColor }) => {
  return (
    <>
      {/* Mesh Gradient Background */}
      <MeshGradient color={ambientColor} intensity="medium" />
      
      {/* Dynamic Ambient Overlay - Extra depth */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ backgroundColor: ambientColor }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="absolute inset-0 opacity-10 blur-[180px] scale-150"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black pointer-events-none" />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-none" />
      </div>
    </>
  );
};

export default React.memo(AmbientBackground);
