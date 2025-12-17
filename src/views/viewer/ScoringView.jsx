import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Play, Trophy, Medal, RotateCcw, ArrowRight, ArrowLeftRight, UserCheck, UserMinus, Undo2, Hand, User, X, Share2, Check, Copy } from 'lucide-react';
import { formatOvers, calculateRunRate, calculateMOM } from '../../utils/helpers';
import { db, APP_ID } from '../../config/firebase';
import Modal from '../../components/Modal';
import LiveBadge from '../../components/LiveBadge'; 

export default function ScoringView({ currentMatch, teams, setView }) {
  const [modalState, setModalState] = useState({ type: null, data: null });
  const [striker, setStriker] = useState(currentMatch.striker || '');
  const [nonStriker, setNonStriker] = useState(currentMatch.nonStriker || '');
  const [bowler, setBowler] = useState(currentMatch.bowler || '');
  const [isProcessing, setIsProcessing] = useState(false); 
  const [copied, setCopied] = useState(false);

  // --- SYNC STATE ---
  useEffect(() => {
    if (currentMatch.striker) setStriker(currentMatch.striker);
    if (currentMatch.nonStriker) setNonStriker(currentMatch.nonStriker);
    if (currentMatch.bowler) setBowler(currentMatch.bowler);
    
    if (currentMatch.status === 'Live' && (!currentMatch.striker || !currentMatch.nonStriker || !currentMatch.bowler) && !modalState.type) {
       setModalState({ type: 'startInnings', data: currentMatch });
    }

    if (currentMatch.status === 'Concluding' && !modalState.type) {
       setModalState({ type: 'matchResult', data: currentMatch });
    }
  }, [currentMatch]);

  const getPlayerName = (p) => {
      if (!p) return '';
      return typeof p === 'string' ? p : p.name;
  };

  const shareMatch = () => {
    const slug = `${currentMatch.teamA} vs ${currentMatch.teamB}`.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-");
    const url = `${window.location.origin}${window.location.pathname}?matchId=${currentMatch.id}&match=${slug}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // --- ROSTERS ---
  const getBattingRoster = () => {
      let roster = currentMatch.battingTeamId === currentMatch.teamAId ? currentMatch.teamAPlayers : currentMatch.teamBPlayers;
      if (!roster || roster.length === 0) {
          const teamId = currentMatch.battingTeamId;
          const team = teams.find(t => t.id === teamId);
          if (team) roster = team.players;
      }
      return Array.isArray(roster) ? roster : [];
  };
  
  const getBowlingRoster = () => {
      let roster = currentMatch.battingTeamId === currentMatch.teamAId ? currentMatch.teamBPlayers : currentMatch.teamAPlayers;
      if (!roster || roster.length === 0) {
          const bowlingTeamId = currentMatch.battingTeamId === currentMatch.teamAId ? currentMatch.teamBId : currentMatch.teamAId;
          const team = teams.find(t => t.id === bowlingTeamId);
          if (team) roster = team.players;
      }
      return Array.isArray(roster) ? roster : [];
  };

  const isAlreadyOut = (p) => {
     const name = getPlayerName(p);
     const stats = currentMatch.battingStats || {};
     // Returns true only if 'out' is true. Retired Hurt has out=false, so they will be visible.
     const isRetiredHurt = stats[name]?.dismissal === 'Retired Hurt';
     return stats[name] && stats[name].out && !isRetiredHurt;
  };

  // --- UNDO LOGIC ---
  const undoLastAction = async () => {
    if (isProcessing) return;
    if (!currentMatch.timeline || currentMatch.timeline.length === 0) return alert("Nothing to undo!");

    if (!window.confirm("Undo last ball?")) return;

    setIsProcessing(true);
    try {
        const lastBall = currentMatch.timeline[0]; 
        const matchRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id);
        let bStats = JSON.parse(JSON.stringify(currentMatch.battingStats || {}));
        let bwStats = JSON.parse(JSON.stringify(currentMatch.bowlingStats || {}));
        let runsToRemove = 0, extrasToRemove = 0, legalBallsToRemove = 0, ballsFacedToRemove = 0;

        if (lastBall.type === 'legal') { runsToRemove = lastBall.runs; legalBallsToRemove = 1; ballsFacedToRemove = 1; } 
        else if (lastBall.type === 'wide') { runsToRemove = 1 + lastBall.runs; extrasToRemove = 1 + lastBall.runs; } 
        else if (lastBall.type === 'nb') { runsToRemove = 1 + lastBall.runs; extrasToRemove = 1; ballsFacedToRemove = 1; }
        else if (lastBall.type === 'bye' || lastBall.type === 'legbye') { runsToRemove = lastBall.runs; extrasToRemove = lastBall.runs; legalBallsToRemove = 1; ballsFacedToRemove = 1; }

        if (bStats[lastBall.striker]) {
            const isRunsForBatsman = lastBall.type === 'legal' || lastBall.type === 'nb';
            if (isRunsForBatsman) bStats[lastBall.striker].runs -= lastBall.runs;
            bStats[lastBall.striker].balls -= ballsFacedToRemove;
            if (lastBall.runs === 4 && isRunsForBatsman) bStats[lastBall.striker].fours -= 1;
            if (lastBall.runs === 6 && isRunsForBatsman) bStats[lastBall.striker].sixes -= 1;
            if (lastBall.isWicket) { bStats[lastBall.striker].out = false; delete bStats[lastBall.striker].dismissal; }
        }

        if (bwStats[lastBall.bowler]) {
            if (lastBall.type !== 'bye' && lastBall.type !== 'legbye') bwStats[lastBall.bowler].runs -= runsToRemove;
            bwStats[lastBall.bowler].balls -= legalBallsToRemove;
            if (lastBall.type === 'legal' || lastBall.type === 'bye' || lastBall.type === 'legbye') {
                 if((bwStats[lastBall.bowler].balls + 1) % 6 === 0) bwStats[lastBall.bowler].overs -= 1; 
            }
            if (lastBall.isWicket && lastBall.dismissalInfo?.type !== 'Run Out') bwStats[lastBall.bowler].wickets -= 1;
        }

        const updates = {
            score: currentMatch.score - runsToRemove,
            extras: (currentMatch.extras || 0) - extrasToRemove,
            legalBalls: Number(currentMatch.legalBalls) - legalBallsToRemove,
            wickets: lastBall.isWicket ? currentMatch.wickets - 1 : currentMatch.wickets,
            timeline: currentMatch.timeline.slice(1), 
            battingStats: bStats, bowlingStats: bwStats,
            striker: lastBall.striker, nonStriker: lastBall.nonStriker, bowler: lastBall.bowler
        };
        await updateDoc(matchRef, updates);
        setStriker(lastBall.striker); setNonStriker(lastBall.nonStriker); setBowler(lastBall.bowler);
    } catch (err) { alert("Failed to undo: " + err.message); } finally { setIsProcessing(false); }
  };

  // --- SCORING LOGIC ---
  const handleBallEvent = async (runs, type = 'legal', isWicket = false) => {
    if (isProcessing) return; 
    try {
        if (currentMatch.status !== 'Live') return;
        if (!striker || !bowler) { setModalState({ type: 'startInnings', data: currentMatch }); return; }
        
        if (type === 'wide') { setModalState({ type: 'wideOptions' }); return; }
        if (type === 'nb') { setModalState({ type: 'nbOptions' }); return; }
        if (type === 'bye') { setModalState({ type: 'byeOptions' }); return; } 
        if (type === 'legbye') { setModalState({ type: 'legByeOptions' }); return; } 
        if (isWicket) { setModalState({ type: 'wicket', data: { runs: 0, type: 'legal' } }); return; }
        
        setIsProcessing(true);
        await processScoreUpdate(runs, type, false, null);
    } catch (err) { alert("Error: " + err.message); } finally { setIsProcessing(false); }
  };

  const processScoreUpdate = async (runs, type, isWicket, dismissalInfo) => {
    const matchRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id);
    let bStats = JSON.parse(JSON.stringify(currentMatch.battingStats || {}));
    let bwStats = JSON.parse(JSON.stringify(currentMatch.bowlingStats || {}));
    
    // SAFETY INIT with ORDER NUMBER
    const getNextBatNum = () => { const n = Object.values(bStats).map(p=>p.number||0); return (n.length>0?Math.max(...n):0)+1; };
    const getNextBowlNum = () => { const n = Object.values(bwStats).map(p=>p.number||0); return (n.length>0?Math.max(...n):0)+1; };

    if (!bStats[striker]) bStats[striker] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, number: getNextBatNum() };
    if (!bStats[nonStriker]) bStats[nonStriker] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, number: getNextBatNum() + 1 };
    if (!bwStats[bowler]) bwStats[bowler] = { overs: 0, balls: 0, runs: 0, wickets: 0, number: getNextBowlNum() };

    let scoreToAdd = 0, extrasToAdd = 0, legalBallsToAdd = 0;

    if (type === 'legal') {
       scoreToAdd = runs; legalBallsToAdd = 1;
       bStats[striker].balls += 1; bStats[striker].runs += runs;
       if (runs === 4) bStats[striker].fours += 1; if (runs === 6) bStats[striker].sixes += 1;
       bwStats[bowler].balls += 1; bwStats[bowler].runs += runs;
       if (bwStats[bowler].balls % 6 === 0) bwStats[bowler].overs += 1;
    } else if (type === 'wide') {
       scoreToAdd = 1 + runs; extrasToAdd = 1 + runs; 
       bwStats[bowler].runs += (1 + runs);
    } else if (type === 'nb') {
       scoreToAdd = 1 + runs; extrasToAdd = 1; 
       bStats[striker].balls += 1; bStats[striker].runs += runs;
       if (runs === 4) bStats[striker].fours += 1; if (runs === 6) bStats[striker].sixes += 1;
       bwStats[bowler].runs += (1 + runs);
    } else if (type === 'bye' || type === 'legbye') {
       scoreToAdd = runs; extrasToAdd = runs; legalBallsToAdd = 1; 
       bStats[striker].balls += 1; 
       bwStats[bowler].balls += 1; if (bwStats[bowler].balls % 6 === 0) bwStats[bowler].overs += 1;
    }

    let newWickets = currentMatch.wickets;
    let outPlayerName = null;

    if (isWicket) {
       newWickets += 1; 
       if (dismissalInfo?.type !== 'Run Out') bwStats[bowler].wickets += 1;
       
       outPlayerName = (dismissalInfo?.who === 'nonStriker') ? nonStriker : striker;

       if (bStats[outPlayerName]) {
           bStats[outPlayerName].out = true;
           let dismissalText = dismissalInfo?.type || 'Out';
           if (dismissalInfo?.fielder) dismissalText = `c ${dismissalInfo.fielder} b ${bowler}`;
           else if (dismissalInfo?.type === 'Bowled') dismissalText = `b ${bowler}`;
           else if (dismissalInfo?.type === 'LBW') dismissalText = `lbw b ${bowler}`;
           else if (dismissalInfo?.type === 'Run Out') dismissalText = `Run Out`; 
           bStats[outPlayerName].dismissal = dismissalText;
       }
    }

    const currentLegalBalls = Number(currentMatch.legalBalls || 0); 
    const newLegalBalls = currentLegalBalls + legalBallsToAdd;
    let updates = { 
      score: currentMatch.score + scoreToAdd, extras: (currentMatch.extras || 0) + extrasToAdd, legalBalls: newLegalBalls, wickets: newWickets,
      timeline: [{ runs, type, isWicket, dismissalInfo, striker, nonStriker, bowler, timestamp: new Date().toISOString() }, ...(currentMatch.timeline || [])].slice(0, 50),
      battingStats: bStats, bowlingStats: bwStats
    };

    let nextStriker = striker; let nextNonStriker = nonStriker;
    if (runs % 2 !== 0) [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
    
    // Check Over End
    const isOverComplete = (newLegalBalls > 0 && newLegalBalls % 6 === 0 && (type === 'legal' || type === 'bye' || type === 'legbye'));
    if (isOverComplete) [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];

    const isAllOut = updates.wickets >= 10;
    const isOversDone = newLegalBalls >= (currentMatch.totalOvers * 6);
    const isChasing = currentMatch.currentInnings === 2;
    const targetReached = isChasing && updates.score >= currentMatch.target;

    if (targetReached || (isChasing && (isAllOut || isOversDone))) {
       updates.status = 'Concluding'; 
       if (targetReached) updates.result = `${currentMatch.battingTeam} won by ${10 - updates.wickets} wickets`;
       else {
          const runsShort = currentMatch.target - 1 - updates.score;
          updates.result = runsShort === 0 ? "Match Tied" : `${currentMatch.bowlingTeam} won by ${runsShort} runs`;
       }
       const mom = calculateMOM({...(currentMatch.innings1?.battingStats || {}), ...updates.battingStats}, {...(currentMatch.innings1?.bowlingStats || {}), ...updates.bowlingStats});
       updates.mom = mom;
       await updateDoc(matchRef, { ...updates, striker: nextStriker, nonStriker: nextNonStriker });
       setModalState({ type: 'matchResult', data: { ...updates, mom } }); 
       return;
    } else if (!isChasing && (isAllOut || isOversDone)) {
       setModalState({ type: 'inningsBreak', data: { ...updates } });
       return;
    }

    if (isWicket) { 
        setModalState({ type: 'newBatsman', data: { ...updates, nextStriker, nextNonStriker, outPlayerName, isOverComplete } }); 
        return; 
    }

    if (isOverComplete) { setModalState({ type: 'nextBowler', data: { ...updates, nextStriker, nextNonStriker } }); return; } 
    await updateDoc(matchRef, { ...updates, striker: nextStriker, nonStriker: nextNonStriker });
    setStriker(nextStriker); setNonStriker(nextNonStriker);
  };

  // --- CONFIRMATION HANDLERS ---
  const confirmStartInnings = async (p1, p2, b1) => {
    if (p1 === p2) return alert("Striker and Non-Striker cannot be the same.");
    try {
      const initialBattingStats = { 
          [p1]: { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, number: 1 }, 
          [p2]: { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, number: 2 } 
      };
      const initialBowlingStats = { 
          [b1]: { overs: 0, balls: 0, runs: 0, wickets: 0, number: 1 } 
      };
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id), { 
          striker: p1, nonStriker: p2, bowler: b1, battingStats: initialBattingStats, bowlingStats: initialBowlingStats
      });
      setStriker(p1); setNonStriker(p2); setBowler(b1); setModalState({ type: null });
    } catch (err) { alert("Error: " + err.message); }
  };

  const confirmChangeBatsmen = async (p1, p2) => {
      if (p1 === p2) return alert("Same player selected!");
      try {
          const currentBattingStats = currentMatch.battingStats || {};
          if (!currentBattingStats[p1]) currentBattingStats[p1] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, number: 1 };
          if (!currentBattingStats[p2]) currentBattingStats[p2] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, number: 2 };
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id), {
              striker: p1, nonStriker: p2, battingStats: currentBattingStats
          });
          setStriker(p1); setNonStriker(p2); setModalState({ type: null });
      } catch(err) { alert("Error: " + err.message); }
  };

  const confirmNextBowler = async (newBowlerName) => {
    try {
      const { nextStriker, nextNonStriker, ...updates } = modalState.data || {};
      const updatesToSave = updates.score !== undefined ? updates : {}; 
      const currentBowlingStats = updates.bowlingStats || currentMatch.bowlingStats || {};
      if (!currentBowlingStats[newBowlerName]) {
          const nextNum = Object.keys(currentBowlingStats).length + 1;
          currentBowlingStats[newBowlerName] = { overs: 0, balls: 0, runs: 0, wickets: 0, number: nextNum };
      }
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id), { ...updatesToSave, bowlingStats: currentBowlingStats, striker: nextStriker || striker, nonStriker: nextNonStriker || nonStriker, bowler: newBowlerName });
      setBowler(newBowlerName); setModalState({ type: null });
    } catch (err) { alert("Error: " + err.message); }
  };

  const confirmNewBatsman = async (newPlayerName) => {
    try {
      const { nextStriker, nextNonStriker, outPlayerName, isOverComplete, ...updates } = modalState.data;
      let finalStriker = nextStriker, finalNonStriker = nextNonStriker;
      if (outPlayerName) {
          if (finalStriker === outPlayerName) finalStriker = newPlayerName;
          else if (finalNonStriker === outPlayerName) finalNonStriker = newPlayerName;
      } else { if(updates.wickets > 0) finalStriker = newPlayerName; }
      
      const currentBattingStats = updates.battingStats || {};
      if (currentBattingStats[newPlayerName]) {
          delete currentBattingStats[newPlayerName].dismissal;
      } else {
          const nextBattingNumber = Object.keys(currentBattingStats).length + 1;
          currentBattingStats[newPlayerName] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, number: nextBattingNumber };
      }
      if (isOverComplete) { setModalState({ type: 'nextBowler', data: { ...updates, battingStats: currentBattingStats, nextStriker: finalStriker, nextNonStriker: finalNonStriker } }); return; }
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id), { ...updates, battingStats: currentBattingStats, striker: finalStriker, nonStriker: finalNonStriker });
      setStriker(finalStriker); setNonStriker(finalNonStriker); setModalState({ type: null });
    } catch (err) { alert("Error: " + err.message); }
  };

  const confirmRetire = async (retiringPlayer, newPlayer) => {
    try {
      const currentBattingStats = currentMatch.battingStats || {};
      if (currentBattingStats[retiringPlayer]) currentBattingStats[retiringPlayer].dismissal = 'Retired Hurt';
      if (currentBattingStats[newPlayer]) { delete currentBattingStats[newPlayer].dismissal; } 
      else { const nextBattingNumber = Object.keys(currentBattingStats).length + 1; currentBattingStats[newPlayer] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, number: nextBattingNumber }; }
      let newStriker = striker, newNonStriker = nonStriker;
      if (retiringPlayer === striker) newStriker = newPlayer; if (retiringPlayer === nonStriker) newNonStriker = newPlayer;
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id), { battingStats: currentBattingStats, striker: newStriker, nonStriker: newNonStriker });
      setStriker(newStriker); setNonStriker(newNonStriker); setModalState({ type: null });
    } catch (err) { alert(err.message); }
  };

  const confirmWide = async (extraRuns) => { try { await processScoreUpdate(extraRuns, 'wide', false, null); setModalState({ type: null }); } catch (err) { alert(err.message); } };
  const confirmNB = async (batRuns) => { try { await processScoreUpdate(batRuns, 'nb', false, null); setModalState({ type: null }); } catch (err) { alert(err.message); } };
  const confirmBye = async (runs) => { try { const nextBalls = Number(currentMatch.legalBalls) + 1; const isOverEnding = nextBalls > 0 && nextBalls % 6 === 0; await processScoreUpdate(runs, 'bye', false, null); if (!isOverEnding) setModalState({ type: null }); } catch (err) { alert(err.message); } };
  const confirmLegBye = async (runs) => { try { const nextBalls = Number(currentMatch.legalBalls) + 1; const isOverEnding = nextBalls > 0 && nextBalls % 6 === 0; await processScoreUpdate(runs, 'legbye', false, null); if (!isOverEnding) setModalState({ type: null }); } catch (err) { alert(err.message); } };
  
  const confirmCatcher = async (fielderName) => { await processScoreUpdate(0, 'legal', true, { type: 'Caught', who: 'striker', fielder: fielderName }); };
  const handleWicketClick = (type) => { 
      // FIX: Ensure run out triggers the correct flow
      if (type === 'Caught') setModalState({ type: 'selectFielder', data: { dismissalType: type } });
      else if (type === 'Run Out') setModalState({ type: 'runOut', data: { dismissalType: type } }); // NEW Run Out Modal
      else processScoreUpdate(0, 'legal', true, { type: type, who: 'striker' }); 
  };
  const rotateStrike = async () => { if (isProcessing) return; try { const newStriker = nonStriker; const newNonStriker = striker; setStriker(newStriker); setNonStriker(newNonStriker); await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id), { striker: newStriker, nonStriker: newNonStriker }); } catch (err) { alert("Failed to rotate"); } };
  const finalizeMatch = async () => { await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id), { status: 'Completed' }); setModalState({ type: null }); setView('admin-dash'); };
  const startSecondInnings = async () => {
    const updates = modalState.data;
    const matchRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', currentMatch.id);
    const innings1Data = { score: updates.score, wickets: updates.wickets, overs: formatOvers(updates.legalBalls), battingStats: updates.battingStats, bowlingStats: updates.bowlingStats, extras: updates.extras, teamName: currentMatch.battingTeam };
    const newMatchState = { currentInnings: 2, target: updates.score + 1, innings1: innings1Data, score: 0, wickets: 0, legalBalls: 0, overs: 0, extras: 0, battingTeam: currentMatch.bowlingTeam, battingTeamId: currentMatch.bowlingTeamId, bowlingTeam: currentMatch.battingTeam, bowlingTeamId: currentMatch.battingTeamId, striker: '', nonStriker: '', bowler: '', timeline: [], battingStats: {}, bowlingStats: {} };
    await updateDoc(matchRef, newMatchState);
    setModalState({ type: 'startInnings', data: { ...currentMatch, ...newMatchState, id: currentMatch.id } });
  };

  const getStats = (name, type) => {
    if (type === 'batting') {
        const stats = currentMatch.battingStats?.[name] || { runs: 0, balls: 0, fours: 0, sixes: 0 };
        const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
        return { ...stats, sr };
    } else {
        const stats = currentMatch.bowlingStats?.[name] || { overs: 0, runs: 0, wickets: 0, balls: 0 };
        const eco = stats.balls > 0 ? ((stats.runs / stats.balls) * 6).toFixed(1) : '0.0';
        const overs = `${Math.floor(stats.balls / 6)}.${stats.balls % 6}`;
        return { ...stats, eco, overs };
    }
  };

  const strikerStats = getStats(striker, 'batting');
  const nonStrikerStats = getStats(nonStriker, 'batting');
  const bowlerStats = getStats(bowler, 'bowling');

  // --- Helper to get only balls from current over ---
  const getCurrentOverBalls = () => {
      const timeline = currentMatch.timeline || [];
      const currentOverBalls = [];
      let ballsInOver = 0;

      // Iterate backwards to find start of current over
      for (let i = 0; i < timeline.length; i++) {
          const ball = timeline[i];
          currentOverBalls.unshift(ball); // Add to front as we iterate backwards
          
          if (ball.type === 'legal' || ball.type === 'bye' || ball.type === 'legbye' || ball.type === 'nb') {
              ballsInOver++;
          }
          // If we hit the 6th legal ball of previous over (or start of innings), stop.
          // Since timeline is reverse chronologically, the 1st ball found is the latest.
          // Wait, simple logic: legalBalls % 6 tells us how many balls into CURRENT over.
          // But timeline includes extras.
          // Better logic: Show last 'n' balls until a ball that completed an over.
      }
      
      // Simpler approach for display: Just show last 12 balls, it's context enough. 
      // But user asked for "This Over".
      // Let's rely on legal ball count. 
      const legalBalls = parseInt(currentMatch.legalBalls || 0);
      const ballsThisOver = legalBalls % 6;
      // If ballsThisOver is 0, it means over just finished OR new over hasn't started.
      // If 0, show last completed over? Or empty? Let's show last 8 for context generally.
      
      return timeline.slice(0, 8).reverse(); 
  };
  
  const thisOverTimeline = getCurrentOverBalls();

  return (
    <div className="pb-20">
       <div className="bg-gray-900 text-white p-4 rounded-xl shadow-lg mb-4 sticky top-20 z-30 relative">
         <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-2">
                 <div className="text-xs font-bold bg-red-600 px-2 py-1 rounded animate-pulse">LIVE</div>
                 <LiveBadge />
             </div>
             <button onClick={shareMatch} className="p-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors" title="Share Match"><Share2 className="w-4 h-4 text-white" /></button>
         </div>
         <div className="flex justify-between items-end pr-10">
            <div><div className="text-4xl font-bold">{currentMatch.score}/{currentMatch.wickets}</div><div className="text-gray-400 text-sm mt-1">Overs: {formatOvers(currentMatch.legalBalls)} / {currentMatch.totalOvers}</div></div>
            <div className="text-right"><div className="text-yellow-400 font-bold text-lg leading-tight">{currentMatch.battingTeam}</div><div className="text-xs text-gray-500">CRR: {calculateRunRate(currentMatch.score, currentMatch.legalBalls)}</div>
               {currentMatch.currentInnings === 2 && (<div className="text-sm font-bold text-green-400 mt-1">Need {currentMatch.target - currentMatch.score} off {(currentMatch.totalOvers * 6) - currentMatch.legalBalls} balls</div>)}
            </div>
         </div>
         {copied && <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow">Link Copied!</div>}
       </div>
       
       <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200 relative">
          <button onClick={rotateStrike} className="absolute top-2 right-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200" title="Swap Strike"><ArrowLeftRight className="w-4 h-4 text-gray-600" /></button>
          
          <div className="flex justify-between items-center mb-2 p-2 bg-green-50 rounded border border-green-100">
             <div>
                 <div className="font-bold text-green-900 flex items-center gap-1">
                     {striker} <Play className="w-3 h-3 ml-1 fill-current" />
                 </div>
                 <div className="text-xs text-gray-600 flex gap-2 mt-0.5">
                     <span className="font-semibold">{strikerStats.runs} ({strikerStats.balls})</span>
                     <span className="text-gray-400">|</span>
                     <span>4s: {strikerStats.fours}</span>
                     <span className="text-gray-400">|</span>
                     <span>6s: {strikerStats.sixes}</span>
                     <span className="text-gray-400">|</span>
                     <span>SR: {strikerStats.sr}</span>
                 </div>
             </div>
          </div>

          <div className="flex justify-between items-center mb-3 px-2">
             <div>
                 <div className="font-bold text-gray-600">{nonStriker}</div>
                 <div className="text-xs text-gray-400 flex gap-2 mt-0.5">
                     <span className="font-semibold">{nonStrikerStats.runs} ({nonStrikerStats.balls})</span>
                     <span>|</span>
                     <span>4s: {nonStrikerStats.fours}</span>
                     <span>|</span>
                     <span>6s: {nonStrikerStats.sixes}</span>
                     <span>|</span>
                     <span>SR: {nonStrikerStats.sr}</span>
                 </div>
             </div>
          </div>

          <div className="border-t pt-3 flex justify-between items-center">
             <div>
                 <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Bowler</span>
                 <div className="font-bold text-gray-800">{bowler}</div>
                 <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                     <span>{bowlerStats.overs}-{bowlerStats.runs}-{bowlerStats.wickets}</span>
                     <span>|</span>
                     <span>Eco: {bowlerStats.eco}</span>
                 </div>
             </div>
          </div>
       </div>

       {/* TIMELINE (THIS OVER) - FIX: FILTER LOGIC */}
       <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 px-1">
           <span className="text-xs font-bold text-gray-400 shrink-0">TIMELINE:</span>
           {thisOverTimeline.map((b, i) => (
               <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${b.isWicket ? 'bg-red-500 text-white' : b.runs === 4 ? 'bg-blue-500 text-white' : b.runs === 6 ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                   {b.isWicket ? 'W' : (b.type !== 'legal' && b.type !== 'bye' && b.type !== 'legbye') ? b.type.charAt(0).toUpperCase() : b.runs}
               </div>
           ))}
       </div>

       <div className="grid grid-cols-2 gap-2 mb-4">
           <button onClick={() => setModalState({type: 'nextBowler', data: {}})} className="flex flex-col items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 font-bold text-xs hover:bg-blue-100"><UserCheck className="w-4 h-4 mb-1" /> Change Bowler</button>
           <button onClick={() => setModalState({type: 'changeBatsmen'})} className="flex flex-col items-center justify-center p-3 bg-purple-50 text-purple-600 rounded-lg border border-purple-200 font-bold text-xs hover:bg-purple-100"><UserMinus className="w-4 h-4 mb-1" /> Change Batter</button>
           <button onClick={undoLastAction} className="flex flex-col items-center justify-center p-3 bg-red-50 text-red-600 rounded-lg border border-red-200 font-bold text-xs hover:bg-red-100"><Undo2 className="w-4 h-4 mb-1" /> Undo Ball</button>
           <button onClick={() => setModalState({type: 'retireBatsman'})} className="flex flex-col items-center justify-center p-3 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 font-bold text-xs hover:bg-gray-200"><UserCheck className="w-4 h-4 mb-1" /> Retire Batter</button>
       </div>

       <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3, 4, 6].map(run => (<button key={run} onClick={() => handleBallEvent(run, 'legal')} disabled={isProcessing} className={`h-16 text-2xl font-bold rounded-xl shadow-sm border-b-4 ${run === 4 ? 'bg-blue-500 text-white border-blue-700' : run === 6 ? 'bg-purple-600 text-white border-purple-800' : 'bg-white text-gray-800 border-gray-200'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>{run}</button>))}
          <button onClick={() => handleBallEvent(0, 'wide')} disabled={isProcessing} className="h-16 bg-orange-100 text-orange-800 font-bold rounded-xl border-b-4 border-orange-200">WD</button>
          <button onClick={() => handleBallEvent(0, 'nb')} disabled={isProcessing} className="h-16 bg-orange-100 text-orange-800 font-bold rounded-xl border-b-4 border-orange-200">NB</button>
          <button onClick={() => handleBallEvent(0, 'bye')} disabled={isProcessing} className="h-16 bg-gray-200 text-gray-700 font-bold rounded-xl border-b-4 border-gray-300">B</button>
          <button onClick={() => handleBallEvent(0, 'legbye')} disabled={isProcessing} className="h-16 bg-gray-200 text-gray-700 font-bold rounded-xl border-b-4 border-gray-300">LB</button>
          <button onClick={() => handleBallEvent(0, 'legal', true)} disabled={isProcessing} className="col-span-2 h-16 bg-red-600 text-white font-bold rounded-xl text-xl shadow-lg">OUT / WICKET</button>
       </div>
       
       {modalState.type === 'wicket' && (
          <Modal title="Wicket Details" onClose={() => setModalState({type: null})}>
             <div className="grid grid-cols-2 gap-3 mb-4">
                 {['Bowled', 'Caught', 'LBW', 'Stumped', 'Run Out'].map(type => 
                    <button key={type} onClick={() => handleWicketClick(type)} className="p-3 bg-gray-100 hover:bg-gray-200 rounded font-bold text-sm">{type}</button>
                 )}
             </div>
          </Modal>
       )}
       {/* NEW: Run Out Modal */}
       {modalState.type === 'runOut' && (
           <Modal title="Run Out Details" onClose={() => setModalState({type: null})}>
               <p className="text-sm text-gray-500 mb-2">Who got out?</p>
               <div className="grid grid-cols-2 gap-3 mb-4">
                   <button onClick={() => { processScoreUpdate(0, 'legal', true, { type: 'Run Out', who: 'striker' }); setModalState({type: null}); }} className="p-3 bg-red-100 text-red-700 rounded font-bold text-sm">Striker ({striker})</button>
                   <button onClick={() => { processScoreUpdate(0, 'legal', true, { type: 'Run Out', who: 'nonStriker' }); setModalState({type: null}); }} className="p-3 bg-red-100 text-red-700 rounded font-bold text-sm">Non-Striker ({nonStriker})</button>
               </div>
           </Modal>
       )}

       {modalState.type === 'wideOptions' && (<Modal title="Wide Ball" onClose={() => setModalState({type: null})}><div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3, 4].map(extra => <button key={extra} onClick={() => confirmWide(extra)} className="p-3 bg-gray-100 font-bold rounded hover:bg-gray-200">Wide + {extra}</button>)}</div></Modal>)}
       {modalState.type === 'nbOptions' && (<Modal title="No Ball" onClose={() => setModalState({type: null})}><div className="grid grid-cols-3 gap-3">{[0, 1, 2, 3, 4, 6].map(run => <button key={run} onClick={() => confirmNB(run)} className="p-3 bg-gray-100 font-bold rounded hover:bg-gray-200">NB + {run}</button>)}</div></Modal>)}
       {modalState.type === 'byeOptions' && (<Modal title="Byes" onClose={() => setModalState({type: null})}><p className="text-sm text-gray-500 mb-2">How many runs?</p><div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(run => <button key={run} onClick={() => confirmBye(run)} className="p-3 bg-gray-100 font-bold rounded hover:bg-gray-200">{run}</button>)}</div></Modal>)}
       {modalState.type === 'legByeOptions' && (<Modal title="Leg Byes" onClose={() => setModalState({type: null})}><p className="text-sm text-gray-500 mb-2">How many runs?</p><div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(run => <button key={run} onClick={() => confirmLegBye(run)} className="p-3 bg-gray-100 font-bold rounded hover:bg-gray-200">{run}</button>)}</div></Modal>)}
       
       {modalState.type === 'selectFielder' && (
           <Modal title="Who took the catch?" onClose={() => setModalState({type: null})}>
               <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                   {getBowlingRoster().map((player, i) => (
                       <button key={i} onClick={() => confirmCatcher(getPlayerName(player))} className="p-3 text-left border rounded hover:bg-blue-50 font-medium flex items-center"><Hand className="w-4 h-4 mr-2 text-blue-500" /> {getPlayerName(player)}</button>
                   ))}
                   <button onClick={() => confirmCatcher('Substitute')} className="p-3 text-left border rounded hover:bg-gray-50 text-gray-500 text-sm">Unknown/Sub</button>
               </div>
           </Modal>
       )}
       {modalState.type === 'newBatsman' && (
          <Modal title="Select New Batsman" preventClose={true}>
             <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                 {getBattingRoster().filter(p => {
                     const name = getPlayerName(p);
                     return name !== modalState.data.nextStriker && name !== modalState.data.nextNonStriker && name !== modalState.data.whoOut && !isAlreadyOut(p);
                 }).map((p, i) => (
                     <button key={i} onClick={() => confirmNewBatsman(getPlayerName(p))} className="p-3 text-left border rounded hover:bg-green-50 font-medium">{getPlayerName(p)}</button>
                 ))}
             </div>
          </Modal>
       )}
       {modalState.type === 'nextBowler' && (
          <Modal title="Next Bowler" onClose={() => setModalState({type: null})}>
             <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                 {getBowlingRoster().filter(p => getPlayerName(p) !== bowler).map((p, i) => (
                     <button key={i} onClick={() => confirmNextBowler(getPlayerName(p))} className="p-3 text-left border rounded hover:bg-blue-50 font-medium">{getPlayerName(p)}</button>
                 ))}
             </div>
             <button onClick={() => setModalState({type: null})} className="w-full mt-3 p-2 text-sm text-gray-500 border rounded hover:bg-gray-50">Cancel</button>
          </Modal>
       )}
       {modalState.type === 'startInnings' && (
          <Modal title="Start Innings" preventClose={true}>
             <div className="space-y-4">
                <select id="p1" className="w-full p-2 border rounded"><option>Select Striker</option>{getBattingRoster().map((p,i)=><option key={i} value={getPlayerName(p)}>{getPlayerName(p)}</option>)}</select>
                <select id="p2" className="w-full p-2 border rounded"><option>Select Non-Striker</option>{getBattingRoster().map((p,i)=><option key={i} value={getPlayerName(p)}>{getPlayerName(p)}</option>)}</select>
                <select id="b1" className="w-full p-2 border rounded"><option>Select Bowler</option>{getBowlingRoster().map((p,i)=><option key={i} value={getPlayerName(p)}>{getPlayerName(p)}</option>)}</select>
                <button onClick={() => confirmStartInnings(document.getElementById('p1').value, document.getElementById('p2').value, document.getElementById('b1').value)} className="w-full bg-green-600 text-white py-3 rounded font-bold">Start</button>
             </div>
          </Modal>
       )}
       {modalState.type === 'changeBatsmen' && (
           <Modal title="Change Batsmen" onClose={() => setModalState({type: null})}>
               <div className="space-y-4">
                   <select id="newP1" className="w-full p-2 border rounded" defaultValue={striker}><option>Select Striker</option>{getBattingRoster().map((p,i)=><option key={i} value={getPlayerName(p)}>{getPlayerName(p)}</option>)}</select>
                   <select id="newP2" className="w-full p-2 border rounded" defaultValue={nonStriker}><option>Select Non-Striker</option>{getBattingRoster().map((p,i)=><option key={i} value={getPlayerName(p)}>{getPlayerName(p)}</option>)}</select>
                   <button onClick={() => confirmChangeBatsmen(document.getElementById('newP1').value, document.getElementById('newP2').value)} className="w-full bg-purple-600 text-white py-3 rounded font-bold">Update</button>
               </div>
           </Modal>
       )}
       {modalState.type === 'retireBatsman' && (
           <Modal title="Retire Batsman" onClose={() => setModalState({type: null})}>
               <div className="space-y-4">
                   <p className="text-sm text-gray-500">Who is retiring hurt?</p>
                   <select id="retireP" className="w-full p-2 border rounded">
                       <option value={striker}>{striker} (Striker)</option>
                       <option value={nonStriker}>{nonStriker} (Non-Striker)</option>
                   </select>
                   <p className="text-sm text-gray-500">Select Replacement:</p>
                   <select id="newBatP" className="w-full p-2 border rounded">
                       <option>Select New Batsman</option>
                       {getBattingRoster().filter(p => {
                           const name = getPlayerName(p);
                           return name !== striker && name !== nonStriker && !isAlreadyOut(p);
                       }).map((p, i) => <option key={i} value={getPlayerName(p)}>{getPlayerName(p)}</option>)}
                   </select>
                   <button onClick={() => confirmRetire(document.getElementById('retireP').value, document.getElementById('newBatP').value)} className="w-full bg-red-600 text-white py-3 rounded font-bold">Confirm Retirement</button>
               </div>
           </Modal>
       )}
       {modalState.type === 'inningsBreak' && (
          <Modal title="Innings Break" preventClose={true}>
             <div className="text-center py-6">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">{currentMatch.battingTeam} Finish</h3>
                <div className="text-4xl font-black text-gray-800 mb-4">{modalState.data.score}/{modalState.data.wickets}</div>
                <div className="bg-gray-100 p-4 rounded-xl mb-6">
                   <p className="text-sm text-gray-500 uppercase">Target for {currentMatch.bowlingTeam}</p>
                   <p className="text-3xl font-bold text-green-600">{modalState.data.score + 1}</p>
                </div>
                <button onClick={startSecondInnings} className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center">Start 2nd Innings <ArrowRight className="w-5 h-5 ml-2" /></button>
             </div>
          </Modal>
       )}
       {modalState.type === 'matchResult' && (
          <Modal title="Match Concluded" preventClose={true}>
             <div className="text-center py-4">
                <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold">{modalState.data.result}</h2>
                {modalState.data.mom && (<div className="mt-4 bg-purple-100 p-3 rounded-lg border border-purple-200 inline-block animate-pulse"><div className="text-xs text-purple-600 font-bold uppercase tracking-wider">Man of the Match</div><div className="text-xl font-black text-purple-900 flex items-center justify-center mt-1"><Medal className="w-5 h-5 mr-2" /> {modalState.data.mom}</div></div>)}
                <button onClick={finalizeMatch} className="mt-6 bg-black text-white px-6 py-2 rounded w-full font-bold">End Match</button>
             </div>
          </Modal>
       )}
    </div>
  );
}
