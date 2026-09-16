import { RamAdvice, ServerSoftware } from '../types';
import { Language } from '../i18n/translations';

export function getRecommendedRam(targetPlayers: number, software: ServerSoftware = 'paper'): number {
  const isModded = software === 'fabric' || software === 'purpur';
  const baseRam = isModded ? 3 : 2; // base OS + JVM overhead
  const perPlayer = isModded ? 0.8 : 0.6; // RAM per active exploring player in GB
  
  const calculated = Math.round(baseRam + (targetPlayers * perPlayer));

  // Realistic thresholds
  if (targetPlayers <= 2) return 3;
  if (targetPlayers <= 4) return 5;
  if (targetPlayers <= 8) return 8;
  if (targetPlayers <= 12) return 10;
  if (targetPlayers <= 16) return 12;
  return Math.min(32, Math.max(12, calculated));
}

export function calculateRamAdvice(
  ramGb: number,
  targetPlayers: number,
  software: ServerSoftware = 'paper',
  systemTotalRamGb = 16,
  systemFreeRamGb = 8,
  language: Language = 'en'
): RamAdvice {
  const isOverSystemLimit = ramGb > systemTotalRamGb - 2;
  const recommended = getRecommendedRam(targetPlayers, software);
  const isBg = language === 'bg';

  // 1 GB RAM evaluation
  if (ramGb <= 1) {
    return {
      status: 'danger',
      title: isBg ? 'Ужасно малко RAM! (Критичен лаг)' : 'Extremely Low RAM! (Critical Lag)',
      description: isBg
        ? `1 GB е пълна пародия за ${targetPlayers} ${targetPlayers === 1 ? 'играч' : 'играчи'} (точно както безплатните хостове)! Сървърът ще замръзва и ще крашва при зареждане на чанкове. За ${targetPlayers} играчи ти трябват поне ${Math.max(3, recommended - 2)} GB (Препоръчително: ${recommended} GB).`
        : `1 GB is barely sufficient for ${targetPlayers} player${targetPlayers === 1 ? '' : 's'} (just like cheap free hosts)! The server will freeze and crash when loading chunks. For ${targetPlayers} players you need at least ${Math.max(3, recommended - 2)} GB (Recommended: ${recommended} GB).`,
      supportedPlayers: isBg ? 'Едва 1 човек без модове' : 'Barely 1 player without mods',
      recommendedUse: isBg ? 'Само за бърз тест' : 'Only for quick testing',
      isOverSystemLimit,
    };
  }

  // 2 - 3 GB RAM evaluation
  if (ramGb <= 3) {
    if (targetPlayers >= 6) {
      return {
        status: 'danger',
        title: isBg ? `Критично малко за ${targetPlayers} играчи!` : `Critically low for ${targetPlayers} players!`,
        description: isBg
          ? `${ramGb} GB за ${targetPlayers} човека ще срине TPS под 10. Сървърът ще изостава, стрелите и мобовете ще се телепортират. За ${targetPlayers} души препоръчваме поне ${recommended} GB!`
          : `${ramGb} GB for ${targetPlayers} players will drop TPS below 10. The server will lag, arrows and mobs will glitch. For ${targetPlayers} players we recommend at least ${recommended} GB!`,
        supportedPlayers: isBg ? 'Максимум 2-3 играчи' : 'Max 2-3 players',
        recommendedUse: isBg ? 'Малък co-op с 1 приятел' : 'Small co-op with 1 friend',
        isOverSystemLimit,
      };
    }
    if (targetPlayers >= 4) {
      return {
        status: 'warning',
        title: isBg ? 'На ръба (Ще има спад на кадри)' : 'On the edge (TPS stuttering)',
        description: isBg
          ? `${ramGb} GB за ${targetPlayers} човека е твърде малко за свободна игра. Ако някой лети с Elytra или отиде в Nether, сървърът ще замръзне. Вдигни на ${recommended} GB за спокойна игра.`
          : `${ramGb} GB for ${targetPlayers} players is too tight for exploration. If someone flies with Elytra or visits the Nether, ticks will stall. Bump to ${recommended} GB for smooth play.`,
        supportedPlayers: isBg ? '2 - 3 играчи' : '2 - 3 players',
        recommendedUse: isBg ? 'Vanilla ко-оп наблизо' : 'Vanilla close-range co-op',
        isOverSystemLimit,
      };
    }
    return {
      status: 'optimal',
      title: isBg ? 'Добре за 2-ма авери' : 'Great for 2 Friends',
      description: isBg
        ? `${ramGb} GB е напълно достатъчно за 1-2 души на чиста Vanilla или Paper карта при стандартна дистанция.`
        : `${ramGb} GB is plenty for 1-2 players on pure Vanilla or Paper with standard view distance.`,
      supportedPlayers: isBg ? '1 - 2 играчи' : '1 - 2 players',
      recommendedUse: isBg ? 'Спокойно оцеляване по двойки' : 'Cozy duo survival',
      isOverSystemLimit,
    };
  }

  // 4 - 6 GB RAM evaluation
  if (ramGb >= 4 && ramGb <= 6) {
    if (targetPlayers >= 8) {
      return {
        status: 'warning',
        title: isBg ? `Недостатъчно за ${targetPlayers} човека! (TPS ще пада)` : `Insufficient for ${targetPlayers} players! (TPS drop)`,
        description: isBg
          ? `За 8+ човека ${ramGb} GB ще започне да лагва, щом играчите се разпръснат по света или строят ферми. За 8 играчи са нужни поне 8 GB за гарантирани 20 TPS.`
          : `For 8+ players ${ramGb} GB will start lagging once players scatter across the world or build farms. For 8 players at least 8 GB is needed for steady 20 TPS.`,
        supportedPlayers: isBg ? 'До 4-5 играчи' : 'Up to 4-5 players',
        recommendedUse: isBg ? 'До 4 приятели с умерени плъгини' : 'Up to 4 friends with light plugins',
        isOverSystemLimit,
      };
    }
    return {
      status: 'optimal',
      title: isBg ? 'Златната среда за малка компания!' : 'Sweet Spot for Small Groups!',
      description: isBg
        ? `${ramGb} GB за ${targetPlayers} играчи осигурява гладък геймплей с 20 TPS, стабилен рендер и свобода за Redstone ферми и плъгини (Essentials, Skins, Auth).`
        : `${ramGb} GB for ${targetPlayers} players provides silky-smooth 20 TPS gameplay, stable rendering, and headroom for Redstone farms & plugins (Essentials, Skins, Auth).`,
      supportedPlayers: isBg ? '3 - 5 играчи' : '3 - 5 players',
      recommendedUse: isBg ? 'Гладко оцеляване за цялата тайфа + плъгини' : 'Smooth survival for friends + plugins',
      isOverSystemLimit,
    };
  }

  // 7 - 9 GB RAM evaluation
  if (ramGb >= 7 && ramGb <= 9) {
    if (targetPlayers > 15) {
      return {
        status: 'warning',
        title: isBg ? `Препоръчваме повече RAM за ${targetPlayers} играчи` : `More RAM recommended for ${targetPlayers} players`,
        description: isBg
          ? `За голяма група от ${targetPlayers} души заделете 10-12 GB, за да няма забавяне при синхронизация на чанковете.`
          : `For a large group of ${targetPlayers} players allocate 10-12 GB to ensure no chunk loading delays.`,
        supportedPlayers: isBg ? '8 - 12 играчи' : '8 - 12 players',
        recommendedUse: isBg ? 'Голям SMP сървър' : 'Large SMP server',
        isOverSystemLimit,
      };
    }
    return {
      status: 'optimal',
      title: isBg ? `Идеално за ${targetPlayers} играчи!` : `Perfect for ${targetPlayers} Players!`,
      description: isBg
        ? `${ramGb} GB е точно препоръчаният капацитет за ${targetPlayers} човека. Позволява висока видимост (12-16 чанка), паралелни светове (Nether, End) и модове без никакъв лаг.`
        : `${ramGb} GB is the recommended capacity for ${targetPlayers} players. Enables high view distance (12-16 chunks), parallel dimensions (Nether, End), and mods with zero lag.`,
      supportedPlayers: isBg ? '6 - 10 играчи' : '6 - 10 players',
      recommendedUse: isBg ? 'Голямо SMP с аверите, висока видимост или Fabric модове' : 'Big SMP with friends, high render distance, or Fabric mods',
      isOverSystemLimit,
    };
  }

  // 10 - 14 GB RAM evaluation
  if (ramGb >= 10 && ramGb <= 14) {
    return {
      status: 'beast',
      title: isBg ? 'Звяр производителност!' : 'Beast Performance!',
      description: isBg
        ? `${ramGb} GB е професионален хост ресурс. Идеално за 10-20+ играчи, тежки Modpacks (All The Mods, Better MC, Cobblemon) или сървър с много плъгини и мини-игри.`
        : `${ramGb} GB is professional host capacity. Ideal for 10-20+ players, heavy modpacks (All The Mods, Better MC, Cobblemon) or multi-plugin minigame setups.`,
      supportedPlayers: isBg ? '12 - 25 играчи' : '12 - 25 players',
      recommendedUse: isBg ? 'Тежки модпакове, мащабни общности, градски проекти' : 'Heavy modpacks, big communities, community servers',
      isOverSystemLimit,
    };
  }

  // 15+ GB RAM evaluation
  return {
    status: 'beast',
    title: isBg ? 'Максимален Мега-Хост' : 'Maximum Mega-Host',
    description: isBg
      ? `${ramGb} GB осигурява безумна мощ за десетки играчи едновременно, огромни модпакове и екстремни генератори на светове.`
      : `${ramGb} GB provides insane power for dozens of concurrent players, mega modpacks, and extreme terrain generation.`,
    supportedPlayers: isBg ? '25+ играчи / Mega Modpacks' : '25+ players / Mega Modpacks',
    recommendedUse: isBg ? 'Огромен публичен сървър или масивен модпак' : 'Huge community server or massive modpack',
    isOverSystemLimit,
  };
}
