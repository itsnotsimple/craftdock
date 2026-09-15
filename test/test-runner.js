async function runTests() {
  console.log('--- 1. Testing PaperMC API ---');
  try {
    const res = await fetch('https://api.papermc.io/v2/projects/paper');
    const data = await res.json();
    console.log('PaperMC OK! Total versions:', data.versions.length, 'Latest:', data.versions[data.versions.length - 1]);
  } catch (err) {
    console.error('PaperMC failed:', err);
  }

  console.log('\n--- 2. Testing Mojang Manifest API ---');
  try {
    const res = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
    const data = await res.json();
    console.log('Mojang OK! Latest release:', data.latest.release);
  } catch (err) {
    console.error('Mojang failed:', err);
  }

  console.log('\n--- 3. Testing Fabric Meta API ---');
  try {
    const res = await fetch('https://meta.fabricmc.net/v2/versions/game');
    const data = await res.json();
    console.log('Fabric OK! Stable count:', data.filter(d => d.stable).length);
  } catch (err) {
    console.error('Fabric failed:', err);
  }

  console.log('\n--- 4. Testing RAM Advice Logic ---');
  function testRam(ram, players) {
    // Mimic the calculateRamAdvice logic
    if (ram <= 1 && players > 1) {
      return { status: 'danger', advice: `1 GB за ${players} играчи е критично малко! Ще замръзва и лагва.` };
    }
    if (ram === 2 && players <= 2) {
      return { status: 'optimal', advice: `2 GB за ${players} играчи е супер за чиста ванила.` };
    }
    if (ram >= 4 && ram <= 6) {
      return { status: 'optimal', advice: `${ram} GB за ${players} играчи е златната среда! Гладко 20 TPS.` };
    }
    if (ram >= 8) {
      return { status: 'beast', advice: `${ram} GB е звяр за тежки модове и много играчи!` };
    }
    return { status: 'warning', advice: 'Базово' };
  }

  console.log('Case 1 (1GB, 4 players):', testRam(1, 4));
  console.log('Case 2 (2GB, 2 players):', testRam(2, 2));
  console.log('Case 3 (4GB, 4 players):', testRam(4, 4));
  console.log('Case 4 (8GB, 4 players):', testRam(8, 4));
}

runTests();
