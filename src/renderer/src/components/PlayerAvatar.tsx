import React, { useState } from 'react';
import defaultSteveIcon from '../assets/minecraft/icons/steve.png';

interface PlayerAvatarProps {
  name: string;
  size?: number; // 24, 32, 48, 64
  className?: string;
  alt?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  name,
  size = 32,
  className = 'w-7 h-7 rounded-lg',
  alt,
}) => {
  const [attempt, setAttempt] = useState(0);

  // Clean name: if it's empty or looks like a bare UUID, handle gracefully
  const cleanName = (name || '').trim();

  // Waterfall of avatar sources:
  // 0: Minotar 2D Helm (flat front face + hat overlay)
  // 1: mc-heads 2D Head (flat front face)
  // 2: Cravatar EU Helm (European mirror)
  // 3+: Local bundled Steve icon fallback (100% offline guaranteed)
  const getAvatarUrl = (): string => {
    if (!cleanName || attempt >= 3) {
      return defaultSteveIcon;
    }

    const encoded = encodeURIComponent(cleanName);
    switch (attempt) {
      case 0:
        return `https://minotar.net/helm/${encoded}/${size}.png`;
      case 1:
        return `https://mc-heads.net/head/${encoded}/${size}`;
      case 2:
        return `https://cravatar.eu/helmavatar/${encoded}/${size}.png`;
      default:
        return defaultSteveIcon;
    }
  };

  const handleError = () => {
    setAttempt((prev) => prev + 1);
  };

  return (
    <img
      src={getAvatarUrl()}
      alt={alt || cleanName || 'Player'}
      onError={handleError}
      className={`object-cover bg-slate-800 shrink-0 select-none ${className}`}
      style={{ imageRendering: 'pixelated' }}
      loading="lazy"
    />
  );
};
