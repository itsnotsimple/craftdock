import { RamAdvice, ServerSoftware } from '../types';

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
  systemFreeRamGb = 8
): RamAdvice {
  const isOverSystemLimit = ramGb > systemTotalRamGb - 2;
  const recommended = getRecommendedRam(targetPlayers, software);
  const isModded = software === 'fabric';

  // 1 GB RAM evaluation
  if (ramGb <= 1) {
    return {
      status: 'danger',
      title: 'Ужасно малко RAM! (Критичен лаг)',
      description: `1 GB е пълна пародия за ${targetPlayers} ${targetPlayers === 1 ? 'играч' : 'играчи'} (точно както безплатните хостове)! Сървърът ще замръзва и ще крашва при зареждане на чанкове. За ${targetPlayers} играчи ти трябват поне ${Math.max(3, recommended - 2)} GB (Препоръчително: ${recommended} GB).`,
      supportedPlayers: 'Едва 1 човек без модове',
      recommendedUse: 'Само за бърз тест',
      isOverSystemLimit,
    };
  }

  // 2 - 3 GB RAM evaluation
  if (ramGb <= 3) {
    if (targetPlayers >= 6) {
      return {
        status: 'danger',
        title: `Критично малко за ${targetPlayers} играчи! ⚠️`,
        description: `${ramGb} GB за ${targetPlayers} човека ще срине TPS под 10. Сървърът ще изостава, стрелите и мобовете ще се телепортират. За ${targetPlayers} души препоръчваме поне ${recommended} GB!`,
        supportedPlayers: 'Максимум 2-3 играчи',
        recommendedUse: 'Малък co-op с 1 приятел',
        isOverSystemLimit,
      };
    }
    if (targetPlayers >= 4) {
      return {
        status: 'warning',
        title: 'На ръба (Ще има спад на кадри)',
        description: `${ramGb} GB за ${targetPlayers} човека е твърде малко за свободна игра. Ако някой лети с Elytra или отиде в Nether, сървърът ще замръзне. Вдигни на ${recommended} GB за спокойна игра.`,
        supportedPlayers: '2 - 3 играчи',
        recommendedUse: 'Vanilla ко-оп наблизо',
        isOverSystemLimit,
      };
    }
    return {
      status: 'optimal',
      title: 'Добре за 2-ма авери 👍',
      description: `${ramGb} GB е напълно достатъчно за 1-2 души на чиста Vanilla или Paper карта при стандартна дистанция.`,
      supportedPlayers: '1 - 2 играчи',
      recommendedUse: 'Спокойно оцеляване по двойки',
      isOverSystemLimit,
    };
  }

  // 4 - 6 GB RAM evaluation
  if (ramGb >= 4 && ramGb <= 6) {
    if (targetPlayers >= 8) {
      return {
        status: 'warning',
        title: `Недостатъчно за ${targetPlayers} човека! (TPS ще пада)`,
        description: `За 8+ човека ${ramGb} GB ще започне да лагва, щом играчите се разпръснат по света или строят ферми. За 8 играчи са нужни поне 8 GB за гарантирани 20 TPS.`,
        supportedPlayers: 'До 4-5 играчи',
        recommendedUse: 'До 4 приятели с умерени плъгини',
        isOverSystemLimit,
      };
    }
    return {
      status: 'optimal',
      title: 'Златната среда за малка компания! 🟢',
      description: `${ramGb} GB за ${targetPlayers} играчи осигурява гладък геймплей с 20 TPS, стабилен рендер и свобода за Redstone ферми и плъгини (Essentials, Skins, Auth).`,
      supportedPlayers: '3 - 5 играчи',
      recommendedUse: 'Гладко оцеляване за цялата тайфа + плъгини',
      isOverSystemLimit,
    };
  }

  // 7 - 9 GB RAM evaluation
  if (ramGb >= 7 && ramGb <= 9) {
    if (targetPlayers > 15) {
      return {
        status: 'warning',
        title: `Препоръчваме повече RAM за ${targetPlayers} играчи`,
        description: `За голяма група от ${targetPlayers} души заделете 10-12 GB, за да няма забавяне при синхронизация на чанковете.`,
        supportedPlayers: '8 - 12 играчи',
        recommendedUse: 'Голям SMP сървър',
        isOverSystemLimit,
      };
    }
    return {
      status: 'optimal',
      title: `Идеално за ${targetPlayers} играчи! 🚀`,
      description: `${ramGb} GB е точно препоръчаният капацитет за ${targetPlayers} човека. Позволява висока видимост (12-16 чанка), паралелни светове (Nether, End) и модове без никакъв лаг.`,
      supportedPlayers: '6 - 10 играчи',
      recommendedUse: 'Голямо SMP с аверите, висока видимост или Fabric модове',
      isOverSystemLimit,
    };
  }

  // 10 - 14 GB RAM evaluation
  if (ramGb >= 10 && ramGb <= 14) {
    return {
      status: 'beast',
      title: 'Звяр производителност! 👑',
      description: `${ramGb} GB е професионален хост ресурс. Идеално за 10-20+ играчи, тежки Modpacks (All The Mods, Better MC, Cobblemon) или сървър с много плъгини и мини-игри.`,
      supportedPlayers: '12 - 25 играчи',
      recommendedUse: 'Тежки модпакове, мащабни общности, градски проекти',
      isOverSystemLimit,
    };
  }

  // 15+ GB RAM evaluation
  return {
    status: 'beast',
    title: 'Максимален Мега-Хост ⚡',
    description: `${ramGb} GB осигурява безумна мощ за десетки играчи едновременно, огромни модпакове и екстремни генератори на светове.`,
    supportedPlayers: '25+ играчи / Mega Modpacks',
    recommendedUse: 'Огромен публичен сървър или масивен модпак',
    isOverSystemLimit,
  };
}
