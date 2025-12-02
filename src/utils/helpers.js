export const formatOvers = (legalBalls) => {
  const safeBalls = legalBalls || 0;
  const completedOvers = Math.floor(safeBalls / 6);
  const balls = safeBalls % 6;
  return `${completedOvers}.${balls}`;
};

export const calculateRunRate = (runs, legalBalls) => {
  if (!legalBalls || legalBalls === 0) return 0;
  const overs = legalBalls / 6;
  return (runs / overs).toFixed(2);
};

export const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : '??';

export const calculateMOM = (battingStats, bowlingStats) => {
  let bestPlayer = { name: '', points: -1 };
  const allPlayers = new Set([...Object.keys(battingStats || {}), ...Object.keys(bowlingStats || {})]);
  
  allPlayers.forEach(player => {
     let points = 0;
     if (battingStats[player]) {
       points += (battingStats[player].runs || 0) * 1; 
       points += (battingStats[player].fours || 0) * 1; 
       points += (battingStats[player].sixes || 0) * 2; 
       if ((battingStats[player].runs || 0) >= 50) points += 10; 
       if ((battingStats[player].runs || 0) >= 100) points += 20; 
     }
     if (bowlingStats[player]) {
       points += (bowlingStats[player].wickets || 0) * 25; 
       if ((bowlingStats[player].wickets || 0) >= 3) points += 10; 
     }
     if (points > bestPlayer.points) {
       bestPlayer = { name: player, points };
     }
  });
  return bestPlayer.name;
};