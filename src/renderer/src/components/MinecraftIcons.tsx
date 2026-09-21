import React from 'react';
import { CardIcon } from '../types';

// Authentic Minecraft Assets downloaded directly from official game dumps and Mojang CDN
import grassIcon from '../assets/minecraft/icons/grass.png';
import diamondIcon from '../assets/minecraft/icons/diamond.png';
import swordIcon from '../assets/minecraft/icons/sword.png';
import pickaxeIcon from '../assets/minecraft/icons/pickaxe.png';
import creeperIcon from '../assets/minecraft/icons/creeper.png';
import tntIcon from '../assets/minecraft/icons/tnt.png';
import netherStarIcon from '../assets/minecraft/icons/nether_star.png';
import enderPearlIcon from '../assets/minecraft/icons/ender_pearl.png';
import steveIcon from '../assets/minecraft/icons/steve.png';
import defaultIcon from '../assets/minecraft/icons/default.png';

export const MINECRAFT_ICON_ASSETS: Record<string, string> = {
  default: defaultIcon,
  grass: grassIcon,
  diamond: diamondIcon,
  sword: swordIcon,
  pickaxe: pickaxeIcon,
  creeper: creeperIcon,
  tnt: tntIcon,
  nether_star: netherStarIcon,
  ender_pearl: enderPearlIcon,
  steve: steveIcon,
};

interface MinecraftIconProps {
  className?: string;
  size?: number;
  alt?: string;
}

const BaseMinecraftIcon: React.FC<MinecraftIconProps & { src: string; fallbackAlt: string }> = ({
  src,
  fallbackAlt,
  className = 'w-6 h-6',
  size = 24,
  alt,
}) => (
  <img
    src={src}
    alt={alt || fallbackAlt}
    width={size}
    height={size}
    className={`${className} select-none pointer-events-none object-contain drop-shadow-sm`}
    style={{
      width: size,
      height: size,
      imageRendering: 'pixelated',
    }}
    loading="lazy"
    draggable={false}
  />
);

// Named component exports for backward compatibility
export const GrassBlockIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={grassIcon} fallbackAlt="Grass Block" {...props} />
);

export const DiamondIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={diamondIcon} fallbackAlt="Diamond" {...props} />
);

export const DiamondSwordIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={swordIcon} fallbackAlt="Diamond Sword" {...props} />
);

export const DiamondPickaxeIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={pickaxeIcon} fallbackAlt="Diamond Pickaxe" {...props} />
);

export const CreeperIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={creeperIcon} fallbackAlt="Creeper Head" {...props} />
);

export const TntIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={tntIcon} fallbackAlt="TNT Block" {...props} />
);

export const NetherStarIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={netherStarIcon} fallbackAlt="Nether Star" {...props} />
);

export const EnderPearlIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={enderPearlIcon} fallbackAlt="Ender Pearl" {...props} />
);

export const SteveIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={steveIcon} fallbackAlt="Steve Head" {...props} />
);

export const DefaultServerIcon: React.FC<MinecraftIconProps> = (props) => (
  <BaseMinecraftIcon src={defaultIcon} fallbackAlt="Server Icon" {...props} />
);

// Unified Icon Renderer
export interface MinecraftCardIconProps {
  icon?: CardIcon;
  customIconUrl?: string | null;
  className?: string;
  size?: number;
}

export const MinecraftCardIcon: React.FC<MinecraftCardIconProps> = ({
  icon = 'default',
  customIconUrl,
  className = 'w-6 h-6',
  size = 24,
}) => {
  if (icon === 'custom' && customIconUrl) {
    return (
      <img
        src={customIconUrl}
        alt="Custom Server Icon"
        className={`${className} object-cover rounded-md shadow-xs`}
        style={{ width: size, height: size, imageRendering: 'pixelated' }}
        draggable={false}
      />
    );
  }

  const assetSrc = MINECRAFT_ICON_ASSETS[icon] || (customIconUrl ? null : defaultIcon);

  if (assetSrc) {
    return (
      <img
        src={assetSrc}
        alt={icon}
        className={`${className} select-none pointer-events-none object-contain transition-transform group-hover:scale-105`}
        style={{
          width: size,
          height: size,
          imageRendering: 'pixelated',
        }}
        draggable={false}
      />
    );
  }

  if (customIconUrl) {
    return (
      <img
        src={customIconUrl}
        alt="Custom Server Icon"
        className={`${className} object-cover rounded-md shadow-xs`}
        style={{ width: size, height: size, imageRendering: 'pixelated' }}
        draggable={false}
      />
    );
  }

  return (
    <img
      src={defaultIcon}
      alt="Default Icon"
      className={`${className} select-none pointer-events-none object-contain`}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
      }}
      draggable={false}
    />
  );
};
