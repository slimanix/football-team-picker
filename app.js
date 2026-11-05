// SquadPick - 7-Player Football Team Balancer
// State & LocalStorage Management

const POSITIONS = ['GK', 'DEF', 'MID', 'ATT'];
const POS_ICONS = {
  'GK': '🧤 GK',
  'DEF': '🛡️ DEF',
  'MID': '⚡ MID',
  'ATT': '🎯 ATT'
};

const DEFAULT_PLAYERS = [
  { id: '1', name: 'Alex', position: 'MID', rating: 4 },
  { id: '2', name: 'Leo', position: 'ATT', rating: 5 },
  { id: '3', name: 'Marcus', position: 'DEF', rating: 3 },
  { id: '4', name: 'Karim', position: 'ATT', rating: 4 },
  { id: '5', name: 'David', position: 'DEF', rating: 4 },
  { id: '6', name: 'Sam', position: 'MID', rating: 3 },
  { id: '7', name: 'Mateo', position: 'GK', rating: 4 }
];

let state = {
  players: [],
  gameMode: 'joker', // 'joker' | 'handicap' | 'sub' | 'free'
  soundEnabled: true,
  currentTeams: {
    teamA: [],
    teamB: [],
    neutral: null
  },
  timer: {
    duration: 300, // 5 minutes in seconds
    remaining: 300,
    intervalId: null,
    isRunning: false
  }
};

// Web Audio API for sound effects (Zero external dependencies)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (!state.soundEnabled) return;
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;

    if (type === 'whistle') {
      // Realistic Referee Fox 40 Whistle (Two simultaneous modulated high tones)
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      // 2800 Hz and 3100 Hz dual tone
      osc1.frequency.setValueAtTime(2780, now);
      osc2.frequency.setValueAtTime(3120, now);

      // Tremolo / modulation for authentic whistle flutter
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.setValueAtTime(28, now); // 28 Hz flutter
      lfoGain.gain.setValueAtTime(120, now);
      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);
      lfo.start(now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
      gain.gain.setValueAtTime(0.35, now + 0.4);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
      lfo.stop(now + 0.65);
    } else if (type === 'toss') {
      // High pitch metallic chime for coin toss
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.35);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success') {
      // Fanfare cheer chords
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.2, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.07 + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.45);
      });
    }
  } catch (e) {
    console.error('Audio error:', e);
  }
}

// Initialization
function init() {
  loadSavedState();
  bindEvents();
  renderRoster();
  generateTeams(true); // Initial balanced generate
}

function loadSavedState() {
  const saved = localStorage.getItem('squadpick_players_v1');
  if (saved) {
    try {
      state.players = JSON.parse(saved);
    } catch (e) {
      state.players = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
    }
  } else {
    state.players = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
  }
}

function saveState() {
  localStorage.setItem('squadpick_players_v1', JSON.stringify(state.players));
}

// UI Bindings
function bindEvents() {
  // Mode selection
  document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.gameMode = e.target.value;
      playSound('click');
      document.querySelectorAll('.mode-option').forEach(el => el.classList.remove('active'));
      e.target.closest('.mode-option').classList.add('active');
      generateTeams(true);
    });
  });

  // Sound toggle
  document.getElementById('soundToggleBtn').addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    const btn = document.getElementById('soundToggleBtn');
    btn.querySelector('.icon').textContent = state.soundEnabled ? '🔊' : '🔇';
    btn.querySelector('.label').textContent = state.soundEnabled ? 'Sound ON' : 'Sound OFF';
    playSound('click');
  });

  // Reset squad
  document.getElementById('resetSquadBtn').addEventListener('click', () => {
    if (confirm('Reset roster to default 7 players?')) {
      state.players = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
      saveState();
      renderRoster();
      generateTeams(true);
      showToast('Roster reset to default 7 players');
    }
  });

  // Add player
  document.getElementById('addPlayerBtn').addEventListener('click', () => {
    const newId = String(Date.now());
    const count = state.players.length + 1;
    state.players.push({
      id: newId,
      name: `Player ${count}`,
      position: POSITIONS[count % POSITIONS.length],
      rating: 3
    });
    saveState();
    renderRoster();
    playSound('click');
    showToast(`Added Player ${count}`);
  });

  // Action Buttons
  document.getElementById('generateBalancedBtn').addEventListener('click', () => {
    generateTeams(true);
    playSound('success');
  });

  document.getElementById('generateRandomBtn').addEventListener('click', () => {
    generateTeams(false);
    playSound('whistle');
  });

  // WhatsApp Share
  document.getElementById('copyWhatsAppBtn').addEventListener('click', copyWhatsAppLineup);

  // Match Timer Buttons
  document.getElementById('startTimerBtn').addEventListener('click', startTimer);
  document.getElementById('pauseTimerBtn').addEventListener('click', pauseTimer);
  document.getElementById('resetTimerBtn').addEventListener('click', resetTimer);
  document.getElementById('whistleBtn').addEventListener('click', () => playSound('whistle'));

  // Coin Toss Modal
  const coinModal = document.getElementById('coinModal');
  document.getElementById('coinTossBtn').addEventListener('click', () => {
    coinModal.classList.add('open');
    document.getElementById('coinResult').textContent = 'Click Flip to Toss!';
  });
  document.getElementById('closeCoinModal').addEventListener('click', () => {
    coinModal.classList.remove('open');
  });
  document.getElementById('flipCoinBtn').addEventListener('click', flipCoin);
}

// Render Players Roster
function renderRoster() {
  const container = document.getElementById('playersList');
  document.getElementById('playerCountBadge').textContent = state.players.length;

  container.innerHTML = state.players.map((p, idx) => `
    <div class="player-row" data-id="${p.id}">
      <span class="player-num">${idx + 1}</span>
      <input type="text" class="player-name-input" value="${escapeHtml(p.name)}" placeholder="Name">
      
      <div class="position-select-wrapper">
        <button class="pos-badge pos-${p.position}" title="Click to cycle position">
          ${POS_ICONS[p.position]}
        </button>
      </div>

      <div class="star-rating" title="Skill rating (1-5)">
        ${[1, 2, 3, 4, 5].map(star => `
          <span class="star ${star <= p.rating ? 'active' : ''}" data-val="${star}">★</span>
        `).join('')}
      </div>

      <button class="btn-remove-player" title="Remove player">&times;</button>
    </div>
  `).join('');

  // Attach event listeners to roster items
  container.querySelectorAll('.player-row').forEach(row => {
    const id = row.dataset.id;
    const player = state.players.find(p => p.id === id);

    // Name change
    const nameInput = row.querySelector('.player-name-input');
    nameInput.addEventListener('change', (e) => {
      player.name = e.target.value.trim() || 'Player';
      saveState();
      updateLineupDisplay();
    });

    // Position cycling
    const posBadge = row.querySelector('.pos-badge');
    posBadge.addEventListener('click', () => {
      const currentIdx = POSITIONS.indexOf(player.position);
      const nextPos = POSITIONS[(currentIdx + 1) % POSITIONS.length];
      player.position = nextPos;
      saveState();
      renderRoster();
      updateLineupDisplay();
      playSound('click');
    });

    // Star rating
    row.querySelectorAll('.star').forEach(starEl => {
      starEl.addEventListener('click', () => {
        const val = parseInt(starEl.dataset.val, 10);
        player.rating = val;
        saveState();
        renderRoster();
        updateLineupDisplay();
        playSound('click');
      });
    });

    // Remove player
    row.querySelector('.btn-remove-player').addEventListener('click', () => {
      if (state.players.length <= 2) {
        showToast('Need at least 2 players!');
        return;
      }
      state.players = state.players.filter(p => p.id !== id);
      saveState();
      renderRoster();
      generateTeams(true);
    });
  });
}

// Team Generation Algorithm
function generateTeams(balanced = true) {
  const pool = [...state.players];
  const count = pool.length;

  if (count < 2) return;

  let teamA = [];
  let teamB = [];
  let neutral = null;

  if (state.gameMode === 'joker' && count >= 3) {
    // Select 1 player to be Joker (preferably Midfielder or median rating player)
    // Then balance the remaining players into two equal halves (e.g., 3 vs 3)
    let jokerIndex = 0;
    if (balanced) {
      // Find candidate midfielders or median rated player
      const mids = pool.filter(p => p.position === 'MID');
      if (mids.length > 0) {
        jokerIndex = pool.indexOf(mids[Math.floor(Math.random() * mids.length)]);
      } else {
        // Median rating player
        const sorted = [...pool].sort((a, b) => a.rating - b.rating);
        const medianPlayer = sorted[Math.floor(sorted.length / 2)];
        jokerIndex = pool.indexOf(medianPlayer);
      }
    } else {
      jokerIndex = Math.floor(Math.random() * pool.length);
    }

    neutral = pool.splice(jokerIndex, 1)[0];
    const split = splitPool(pool, Math.floor(pool.length / 2), balanced);
    teamA = split.teamA;
    teamB = split.teamB;

  } else if (state.gameMode === 'sub' && count >= 3) {
    // 3 vs 3 + 1 Rotating Sub
    const subIndex = Math.floor(Math.random() * pool.length);
    neutral = pool.splice(subIndex, 1)[0];
    const split = splitPool(pool, Math.floor(pool.length / 2), balanced);
    teamA = split.teamA;
    teamB = split.teamB;

  } else if (state.gameMode === 'handicap' && count === 7) {
    // Specifically for 7 players: 3 vs 4
    // 3 players on Team A, 4 players on Team B
    // In balanced mode, Team A should have higher average rating so that Total Skill A ~ Total Skill B!
    if (balanced) {
      const best = findBestHandicapSplit(pool, 3, 4);
      teamA = best.teamA;
      teamB = best.teamB;
    } else {
      shuffle(pool);
      teamA = pool.slice(0, 3);
      teamB = pool.slice(3);
    }
    neutral = null;

  } else {
    // Free / Even Split
    const targetSize = Math.ceil(pool.length / 2);
    const split = splitPool(pool, targetSize, balanced);
    teamA = split.teamA;
    teamB = split.teamB;
    neutral = null;
  }

  state.currentTeams = { teamA, teamB, neutral };
  updateLineupDisplay();
}

// Split algorithm with fairness minimization
function splitPool(pool, targetSizeA, balanced) {
  if (!balanced) {
    shuffle(pool);
    return {
      teamA: pool.slice(0, targetSizeA),
      teamB: pool.slice(targetSizeA)
    };
  }

  // Find partition that minimizes absolute difference in rating
  const combinations = getCombinations(pool, targetSizeA);
  let bestDiff = Infinity;
  let bestChoice = combinations[0];

  combinations.forEach(combo => {
    const aIds = new Set(combo.map(p => p.id));
    const b = pool.filter(p => !aIds.has(p.id));

    const avgA = combo.reduce((s, p) => s + p.rating, 0) / combo.length;
    const avgB = b.reduce((s, p) => s + p.rating, 0) / b.length;
    const ratingDiff = Math.abs(avgA - avgB);

    // Positional balance penalty
    const aDef = combo.filter(p => p.position === 'DEF' || p.position === 'GK').length;
    const bDef = b.filter(p => p.position === 'DEF' || p.position === 'GK').length;
    const posDiff = Math.abs(aDef - bDef) * 0.25;

    const totalScore = ratingDiff + posDiff;
    if (totalScore < bestDiff) {
      bestDiff = totalScore;
      bestChoice = combo;
    }
  });

  const aIds = new Set(bestChoice.map(p => p.id));
  return {
    teamA: bestChoice,
    teamB: pool.filter(p => !aIds.has(p.id))
  };
}

// Optimal handicap solver (Sum rating matching)
function findBestHandicapSplit(pool, sizeA, sizeB) {
  const combos = getCombinations(pool, sizeA);
  let bestDiff = Infinity;
  let bestCombo = combos[0];

  combos.forEach(combo => {
    const aIds = new Set(combo.map(p => p.id));
    const b = pool.filter(p => !aIds.has(p.id));
    const sumA = combo.reduce((s, p) => s + p.rating, 0);
    const sumB = b.reduce((s, p) => s + p.rating, 0);
    const diff = Math.abs(sumA - sumB);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestCombo = combo;
    }
  });

  const aIds = new Set(bestCombo.map(p => p.id));
  return {
    teamA: bestCombo,
    teamB: pool.filter(p => !aIds.has(p.id))
  };
}

function getCombinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getCombinations(tail, k - 1).map(combo => [head, ...combo]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Update UI Presentation
function updateLineupDisplay() {
  const { teamA, teamB, neutral } = state.currentTeams;

  // Averages & totals
  const avgA = teamA.length ? (teamA.reduce((s, p) => s + p.rating, 0) / teamA.length).toFixed(1) : '0.0';
  const avgB = teamB.length ? (teamB.reduce((s, p) => s + p.rating, 0) / teamB.length).toFixed(1) : '0.0';
  const sumA = teamA.reduce((s, p) => s + p.rating, 0);
  const sumB = teamB.reduce((s, p) => s + p.rating, 0);

  // Balance Badge
  const balancePill = document.getElementById('balanceScore');
  const balanceText = document.getElementById('balanceScoreText');
  const ratingDelta = Math.abs(avgA - avgB);

  if (state.gameMode === 'handicap') {
    const sumDelta = Math.abs(sumA - sumB);
    balanceText.textContent = `Balanced: 3v4 Total (${sumA} pts vs ${sumB} pts)`;
    balancePill.style.background = sumDelta <= 2 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  } else {
    balanceText.textContent = `Fair Match (Delta: ${ratingDelta.toFixed(1)}★)`;
    balancePill.style.background = ratingDelta <= 0.5 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  }

  // Cards display
  document.getElementById('teamACount').textContent = `${teamA.length} players`;
  document.getElementById('teamBCount').textContent = `${teamB.length} players`;
  document.getElementById('teamARatingVal').textContent = `${avgA} avg (${sumA}★)`;
  document.getElementById('teamBRatingVal').textContent = `${avgB} avg (${sumB}★)`;

  // Neutral card handling
  const neutralCard = document.getElementById('neutralCard');
  const pitchCenterZone = document.getElementById('pitchCenterZone');
  const teamCardsGrid = document.querySelector('.team-cards-grid');

  if (neutral) {
    neutralCard.style.display = 'block';
    pitchCenterZone.style.display = 'flex';
    teamCardsGrid.classList.add('has-neutral');

    const isSub = state.gameMode === 'sub';
    document.getElementById('neutralRoleLabel').textContent = isSub ? 'ROTATING SUB / GK' : 'NEUTRAL JOKER';
    document.getElementById('neutralCardBadge').textContent = isSub ? 'ROTATING SUB' : 'NEUTRAL JOKER';
    document.getElementById('neutralRatingVal').textContent = `${neutral.rating}.0 ★`;
    document.getElementById('neutralInstructions').textContent = isSub
      ? 'Rotates every 5 mins! Shared keeper or super sub for both sides.'
      : 'Plays with whichever team is on the attack. Creates quick passing options!';

    document.getElementById('neutralRosterList').innerHTML = renderCardPlayer(neutral, 'yellow');
    document.getElementById('pitchJokerSlot').innerHTML = renderPitchToken(neutral, 'yellow', '★');
  } else {
    neutralCard.style.display = 'none';
    pitchCenterZone.style.display = 'none';
    teamCardsGrid.classList.remove('has-neutral');
    document.getElementById('pitchJokerSlot').innerHTML = '';
  }

  // Pitch tokens
  document.getElementById('pitchTeamAPlayers').innerHTML = teamA.map((p, i) => renderPitchToken(p, 'blue', i + 1)).join('');
  document.getElementById('pitchTeamBPlayers').innerHTML = teamB.map((p, i) => renderPitchToken(p, 'red', i + 1)).join('');

  // Roster lists in cards
  document.getElementById('teamARosterList').innerHTML = teamA.map(p => renderCardPlayer(p, 'blue')).join('');
  document.getElementById('teamBRosterList').innerHTML = teamB.map(p => renderCardPlayer(p, 'red')).join('');

  // Attach token swap events
  attachTokenEvents();
}

function renderPitchToken(player, color, num) {
  return `
    <div class="pitch-player-token" data-id="${player.id}" title="${player.name} (${player.position} - ${player.rating}★)">
      <div class="jersey-badge ${color}">
        ${num}
        <span class="token-role pos-${player.position}">${player.position}</span>
      </div>
      <div class="token-name">${escapeHtml(player.name)}</div>
      <div class="token-stars">${'★'.repeat(player.rating)}</div>
    </div>
  `;
}

function renderCardPlayer(player, color) {
  return `
    <div class="roster-item" data-id="${player.id}">
      <div class="roster-left">
        <span class="pos-badge pos-${player.position}">${player.position}</span>
        <span class="roster-name">${escapeHtml(player.name)}</span>
      </div>
      <div class="roster-rating">
        <span class="star-rating">${'★'.repeat(player.rating)}</span>
      </div>
    </div>
  `;
}

// Interactive Token Swapping
let selectedTokenId = null;

function attachTokenEvents() {
  document.querySelectorAll('.pitch-player-token').forEach(token => {
    token.addEventListener('click', () => {
      const clickedId = token.dataset.id;

      if (!selectedTokenId) {
        selectedTokenId = clickedId;
        token.style.transform = 'scale(1.2) translateY(-8px)';
        token.querySelector('.jersey-badge').style.borderColor = '#fbbf24';
        showToast(`Select another player to swap with ${token.querySelector('.token-name').textContent}`);
        playSound('click');
      } else if (selectedTokenId === clickedId) {
        selectedTokenId = null;
        updateLineupDisplay();
      } else {
        // Swap selectedTokenId and clickedId
        swapPlayers(selectedTokenId, clickedId);
        selectedTokenId = null;
        playSound('click');
        showToast('Players swapped!');
      }
    });
  });
}

function swapPlayers(id1, id2) {
  const { teamA, teamB, neutral } = state.currentTeams;

  const findContainer = (id) => {
    if (teamA.some(p => p.id === id)) return 'teamA';
    if (teamB.some(p => p.id === id)) return 'teamB';
    if (neutral && neutral.id === id) return 'neutral';
    return null;
  };

  const loc1 = findContainer(id1);
  const loc2 = findContainer(id2);
  if (!loc1 || !loc2) return;

  const getPlayer = (loc, id) => {
    if (loc === 'teamA') return teamA.find(p => p.id === id);
    if (loc === 'teamB') return teamB.find(p => p.id === id);
    if (loc === 'neutral') return neutral;
  };

  const p1 = getPlayer(loc1, id1);
  const p2 = getPlayer(loc2, id2);

  const replacePlayer = (loc, oldId, newP) => {
    if (loc === 'teamA') {
      const idx = teamA.findIndex(p => p.id === oldId);
      teamA[idx] = newP;
    } else if (loc === 'teamB') {
      const idx = teamB.findIndex(p => p.id === oldId);
      teamB[idx] = newP;
    } else if (loc === 'neutral') {
      state.currentTeams.neutral = newP;
    }
  };

  replacePlayer(loc1, id1, p2);
  replacePlayer(loc2, id2, p1);

  updateLineupDisplay();
}

// Copy to WhatsApp
function copyWhatsAppLineup() {
  const { teamA, teamB, neutral } = state.currentTeams;
  const avgA = teamA.length ? (teamA.reduce((s, p) => s + p.rating, 0) / teamA.length).toFixed(1) : '0';
  const avgB = teamB.length ? (teamB.reduce((s, p) => s + p.rating, 0) / teamB.length).toFixed(1) : '0';

  let modeText = '3 vs 3 + Joker';
  if (state.gameMode === 'handicap') modeText = '3 vs 4 Handicap';
  if (state.gameMode === 'sub') modeText = '3 vs 3 + Rotating Sub';
  if (state.gameMode === 'free') modeText = 'Standard Match';

  let text = `⚽ *FOOTBALL MATCHDAY SQUAD* ⚽\n`;
  text += `📋 Mode: *${modeText}*\n\n`;

  text += `🔵 *TEAM BLUE* (${avgA}★ avg):\n`;
  teamA.forEach(p => {
    text += `  • ${p.name} (${p.position} - ${p.rating}★)\n`;
  });

  text += `\n🔴 *TEAM RED* (${avgB}★ avg):\n`;
  teamB.forEach(p => {
    text += `  • ${p.name} (${p.position} - ${p.rating}★)\n`;
  });

  if (neutral) {
    const isSub = state.gameMode === 'sub';
    text += `\n🟡 *${isSub ? 'ROTATING SUB' : 'NEUTRAL JOKER'}*:\n`;
    text += `  • ${neutral.name} (${neutral.position} - ${neutral.rating}★)\n`;
    text += `  ℹ️ ${isSub ? 'Rotates every 5 minutes' : 'Plays with team in possession'}\n`;
  }

  text += `\n⚖️ *Teams balanced by SquadPick*\nReady for kickoff! 🔥`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Lineup copied! Ready to paste in WhatsApp 📱');
    playSound('success');
  }).catch(() => {
    showToast('Failed to copy. Please allow clipboard permissions.');
  });
}

// Match & Rotation Timer
function startTimer() {
  if (state.timer.isRunning) return;
  state.timer.isRunning = true;
  document.getElementById('startTimerBtn').disabled = true;
  document.getElementById('pauseTimerBtn').disabled = false;
  playSound('whistle');

  state.timer.intervalId = setInterval(() => {
    if (state.timer.remaining > 0) {
      state.timer.remaining--;
      updateTimerDisplay();
    } else {
      // Time is up!
      pauseTimer();
      playSound('whistle');
      showToast('⏰ TIME IS UP! Whistle blown!');
      if (state.gameMode === 'sub') {
        alert('⏰ TIME TO ROTATE THE SUB! Blow whistle & swap 7th player.');
      }
    }
  }, 1000);
}

function pauseTimer() {
  state.timer.isRunning = false;
  clearInterval(state.timer.intervalId);
  document.getElementById('startTimerBtn').disabled = false;
  document.getElementById('pauseTimerBtn').disabled = true;
}

function resetTimer() {
  pauseTimer();
  state.timer.remaining = state.timer.duration;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timer.remaining / 60);
  const secs = state.timer.remaining % 60;
  const str = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  document.getElementById('timerDisplay').textContent = str;
}

// Coin Toss Feature
function flipCoin() {
  const coin = document.getElementById('coinElement');
  const resultText = document.getElementById('coinResult');
  const isHeads = Math.random() < 0.5;

  playSound('toss');
  resultText.textContent = 'Flipping...';

  // Random spin degrees
  const rotations = 5 + Math.floor(Math.random() * 4); // 5-8 full spins
  const targetDeg = (rotations * 360) + (isHeads ? 0 : 180);

  coin.style.transform = `rotateY(${targetDeg}deg)`;

  setTimeout(() => {
    const winner = isHeads ? 'HEADS (Team Blue picks)' : 'TAILS (Team Red picks)';
    resultText.textContent = `Result: ${winner}`;
    playSound('success');
  }, 1500);
}

// Toast helper
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
