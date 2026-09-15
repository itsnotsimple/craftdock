// Let's test the logic directly:
function testRam(ram, players) {
  const isModded = false;
  const baseRam = 2;
  const perPlayer = 0.6;
  const rec = Math.round(baseRam + players * perPlayer);
  const recommended = players <= 2 ? 3 : players <= 4 ? 5 : players <= 8 ? 8 : players <= 12 ? 10 : players <= 16 ? 12 : rec;

  let status = 'optimal';
  if (ram <= 1) status = 'danger';
  else if (ram <= 3 && players >= 4) status = 'danger';
  else if (ram <= 6 && players >= 8) status = 'warning';
  else if (ram >= 7 && ram <= 9) status = 'optimal';
  else if (ram >= 10) status = 'beast';

  return { ram, players, recommended, status };
}

console.log('8 players with 5 GB RAM:', testRam(5, 8));
console.log('8 players with 8 GB RAM:', testRam(8, 8));
console.log('2 players with 3 GB RAM:', testRam(3, 2));
console.log('4 players with 5 GB RAM:', testRam(5, 4));
console.log('20 players with 14 GB RAM:', testRam(14, 20));
