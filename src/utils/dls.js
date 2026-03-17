// ─── DLS Resource Table (Standard Edition) ───────────────────────────────────
// Rows  = overs remaining (index 0 = 0 overs left, index 50 = 50 overs left)
// Cols  = wickets lost   (0 through 9)
// Value = % of total resources remaining

const DLS_TABLE = {
  // overs_remaining: [wkts0, wkts1, wkts2, wkts3, wkts4, wkts5, wkts6, wkts7, wkts8, wkts9]
   0: [0,    0,    0,    0,    0,    0,    0,    0,    0,    0   ],
   1: [3.6,  3.5,  3.3,  3.1,  2.7,  2.3,  1.7,  1.2,  0.7,  0.3 ],
   2: [7.0,  6.8,  6.4,  5.9,  5.2,  4.4,  3.3,  2.3,  1.4,  0.6 ],
   3: [10.3, 10.0, 9.4,  8.6,  7.6,  6.4,  4.9,  3.4,  2.1,  0.9 ],
   4: [13.4, 13.0, 12.3, 11.3, 9.9,  8.3,  6.4,  4.5,  2.8,  1.2 ],
   5: [16.4, 15.9, 15.1, 13.8, 12.2, 10.2, 7.8,  5.6,  3.5,  1.5 ],
   6: [19.3, 18.7, 17.7, 16.3, 14.3, 12.0, 9.2,  6.6,  4.1,  1.8 ],
   7: [22.0, 21.4, 20.3, 18.6, 16.4, 13.7, 10.5, 7.6,  4.7,  2.1 ],
   8: [24.6, 23.9, 22.7, 20.8, 18.4, 15.4, 11.8, 8.5,  5.3,  2.4 ],
   9: [27.1, 26.3, 25.0, 23.0, 20.3, 17.0, 13.1, 9.5,  5.9,  2.7 ],
  10: [29.4, 28.6, 27.2, 25.0, 22.1, 18.5, 14.3, 10.4, 6.5,  3.0 ],
  11: [31.7, 30.8, 29.3, 27.0, 23.9, 20.0, 15.5, 11.3, 7.1,  3.2 ],
  12: [33.9, 33.0, 31.4, 28.9, 25.6, 21.5, 16.7, 12.2, 7.7,  3.5 ],
  13: [36.0, 35.0, 33.4, 30.8, 27.3, 22.9, 17.8, 13.1, 8.3,  3.8 ],
  14: [38.0, 37.0, 35.3, 32.6, 28.9, 24.3, 18.9, 14.0, 8.9,  4.1 ],
  15: [40.0, 38.9, 37.1, 34.3, 30.5, 25.7, 20.0, 14.9, 9.5,  4.4 ],
  16: [41.9, 40.8, 38.9, 36.0, 32.0, 27.0, 21.1, 15.7, 10.0, 4.7 ],
  17: [43.7, 42.6, 40.7, 37.7, 33.5, 28.3, 22.1, 16.5, 10.6, 4.9 ],
  18: [45.5, 44.3, 42.4, 39.3, 35.0, 29.6, 23.2, 17.3, 11.1, 5.2 ],
  19: [47.2, 46.0, 44.1, 40.9, 36.4, 30.8, 24.2, 18.1, 11.6, 5.5 ],
  20: [48.8, 47.6, 45.7, 42.4, 37.8, 32.1, 25.2, 18.9, 12.2, 5.8 ],
  25: [56.0, 54.8, 52.7, 49.1, 44.0, 37.6, 29.8, 22.5, 14.7, 7.1 ],
  30: [62.5, 61.2, 59.1, 55.3, 49.9, 42.9, 34.3, 26.2, 17.2, 8.4 ],
  35: [68.2, 66.9, 64.8, 61.0, 55.2, 47.8, 38.5, 29.7, 19.7, 9.8 ],
  40: [73.3, 72.0, 70.0, 66.2, 60.3, 52.5, 42.6, 33.1, 22.2, 11.2],
  45: [77.9, 76.7, 74.7, 71.0, 65.0, 57.0, 46.5, 36.5, 24.7, 12.7],
  50: [100,  93.4, 85.1, 74.9, 64.3, 53.6, 43.0, 32.5, 22.0, 11.9],
};

/**
 * Interpolate resource % from the table for any overs/wickets combo
 */
function getResource(oversRemaining, wicketsLost) {
  const wkt = Math.min(Math.max(wicketsLost, 0), 9);
  const overs = Math.max(Math.round(oversRemaining), 0);

  // Find nearest keys
  const keys = Object.keys(DLS_TABLE).map(Number).sort((a, b) => a - b);
  const lower = keys.filter(k => k <= overs).pop() ?? 0;
  const upper = keys.filter(k => k >= overs)[0] ?? lower;

  if (lower === upper) return DLS_TABLE[lower][wkt];

  // Linear interpolation between two known overs rows
  const t = (overs - lower) / (upper - lower);
  return DLS_TABLE[lower][wkt] + t * (DLS_TABLE[upper][wkt] - DLS_TABLE[lower][wkt]);
}

/**
 * Main DLS calculation
 *
 * @param {object} p
 * @param {number} p.team1Score       - Runs scored by team 1
 * @param {number} p.totalOvers       - Scheduled overs per side
 * @param {number} p.team1OversLost   - Overs lost in team 1's innings (0 if unaffected)
 * @param {number} p.team2OversAvail  - Overs available to team 2 after interruption
 * @param {number} p.team2WicketsLost - Wickets already lost when play stopped (team 2)
 * @param {number} p.team2OversPlayed - Overs already bowled when play stopped (team 2)
 * @returns {{ revisedTarget: number, team2Resources: number, team1Resources: number }}
 */
export function calculateDLS({ team1Score, totalOvers, team1OversLost = 0, team2OversAvail, team2WicketsLost = 0, team2OversPlayed = 0 }) {
  // G50 — average 1st-innings score used when R2 > R1 (standard: 245 for 50-over, scaled)
  const G50 = 245 * (totalOvers / 50);

  // Resources for team 1
  const t1Start = getResource(totalOvers, 0);
  const t1Lost  = team1OversLost > 0 ? getResource(team1OversLost, 0) : 0;
  const R1 = t1Start - t1Lost;

  // Resources for team 2
  // If mid-innings interruption: resources used so far + resources remaining after stoppage
  const r2Used   = getResource(totalOvers - team2OversPlayed, team2WicketsLost)
                 - getResource(team2OversAvail - team2OversPlayed, team2WicketsLost);
  const r2Future = getResource(team2OversAvail - team2OversPlayed, team2WicketsLost);
  const R2 = r2Used + r2Future;

  let revisedTarget;
  if (R2 <= R1) {
    revisedTarget = Math.round(team1Score * (R2 / R1)) + 1;
  } else {
    revisedTarget = Math.round(team1Score + G50 * ((R2 - R1) / 100)) + 1;
  }

  return {
    revisedTarget,
    team1Resources: parseFloat(R1.toFixed(1)),
    team2Resources: parseFloat(R2.toFixed(1)),
  };
}
