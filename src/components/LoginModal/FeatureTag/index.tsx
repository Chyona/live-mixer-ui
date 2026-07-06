import React, { useState } from 'react';

// 定义粒子类型
interface Particle {
  id: string;
  x: number;
  y: number;
  delay: number;
  duration: number;
}

// 定义特性标签组件的props类型
interface FeatureTagProps {
  icon: React.ReactNode;
  name: string;
  color: 'video' | 'wechat' | 'email' | 'accent';
  animation: 'pulse' | 'float' | 'rotate';
}

const FeatureTag: React.FC<FeatureTagProps> = ({ icon, name, color, animation }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  const handleMouseEnter = () => {
    // 创建粒子效果
    const newParticles = [];
    for (let i = 0; i < 8; i++) {
      newParticles.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 0.5 + Math.random() * 0.5,
      });
    }
    setParticles(newParticles);
  };

  const handleMouseLeave = () => {
    setTimeout(() => setParticles([]), 500);
  };

  return (
    <div
      className={`feature-tag ${color}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 粒子效果 */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="feature-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animation: `moveParticle ${particle.duration}s ${particle.delay}s forwards`,
          }}
        />
      ))}

      <div className={`feature-icon feature-${animation}`}>{icon}</div>
      <div className="feature-name">{name}</div>
    </div>
  );
};

export default FeatureTag;
