// SquadPick - 7 vs 7 Football Team Balancer
// State & LocalStorage Management

const POSITIONS = ['GK', 'DEF', 'MID', 'ATT'];
const POS_ICONS = {
  'GK': '🧤 GK',
  'DEF': '🛡️ DEF',
  'MID': '⚡ MID',
  'ATT': '🎯 ATT'
};

// 14 Default players for a 7 vs 7 match (2 GK, 4 DEF, 5 MID, 3 ATT)
const DEFAULT_14_PLAYERS = [
  { id: '1', name: 'Mateo', position: 'GK', rating: 4 },
  { id: '2', name: 'Hugo', position: 'GK', rating: 4 },
  { id: '3', name: 'Marcus', position: 'DEF', rating: 4 },
  { id: '4', name: 'David', position: 'DEF', rating: 4 },
  { id: '5', name: 'Sami', position: 'DEF', rating: 3 },
  { id: '6', name: 'Lucas', position: 'DEF', rating: 3 },
  { id: '7', name: 'Alex', position: 'MID', rating: 5 },
  { id: '8', name: 'Karim', position: 'MID', rating: 4 },
  { id: '9', name: 'Yassine', position: 'MID', rating: 4 },
  { id: '10', name: 'Nico', position: 'MID', rating: 3 },
  { id: '11', name: 'Sam', position: 'MID', rating: 3 },
  { id: '12', name: 'Leo', position: 'ATT', rating: 5 },
  { id: '13', name: 'Enzo', position: 'ATT', rating: 4 },
  { id: '14', name: 'Tariq', position: 'ATT', rating: 4 }
];

let state = {
  players: [],
  formation: '2-3-1', // '2-3-1' | '3-2-1' | '2-2-2'
  soundEnabled: true,
  currentTeams: {
    teamA: [], // 7 players
    teamB: [], // 7 players
    bench: []  // any substitutes beyond 14
  },
  timer: {
    duration: 1200, // 20 minutes in seconds (7v7 half)
    remaining: 1200,
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

      // 2800 Hz and 3120 Hz dual tone
      osc1.frequency.setValueAtTime(2780, now);
      osc2.frequency.setValueAtTime(3120, now);

      // Tremolo / modulation for authentic whistle flutter
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.setValueAtTime(28, now);
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
  const saved = localStorage.getItem('squadpick_7v7_players_v1');
  if (saved) {
    try {
      state.players = JSON.parse(saved);
    } catch (e) {
      state.players = JSON.parse(JSON.stringify(DEFAULT_14_PLAYERS));
    }
  } else {
    state.players = JSON.parse(JSON.stringify(DEFAULT_14_PLAYERS));
  }
}

function saveState() {
  localStorage.setItem('squadpick_7v7_players_v1', JSON.stringify(state.players));
}

// UI Bindings
function bindEvents() {
  // Formation selection
  document.querySelectorAll('.form-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.form-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.formation = btn.dataset.form;
      document.getElementById('currentFormationBadge').textContent = state.formation;
      playSound('click');
      updateLineupDisplay();
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
    if (confirm('Reset roster to default 14 players (7 vs 7)?')) {
      state.players = JSON.parse(JSON.stringify(DEFAULT_14_PLAYERS));
      saveState();
      renderRoster();
      generateTeams(true);
      showToast('Roster reset to 14 players for 7v7');
    }
  });

  // Add player / sub
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

  // Check GK count
  const gkCount = state.players.filter(p => p.position === 'GK').length;
  const gkAlert = document.getElementById('gkAlert');
  const gkAlertText = document.getElementById('gkAlertText');

  if (gkCount === 2) {
    gkAlert.style.display = 'flex';
    gkAlert.style.background = 'rgba(16, 185, 129, 0.12)';
    gkAlert.style.borderColor = 'rgba(16, 185, 129, 0.35)';
    gkAlertText.style.color = '#34d399';
    gkAlertText.textContent = '2 Goalkeepers detected (1 per team guaranteed!)';
  } else if (gkCount < 2) {
    gkAlert.style.display = 'flex';
    gkAlert.style.background = 'rgba(217, 119, 6, 0.12)';
    gkAlert.style.borderColor = 'rgba(217, 119, 6, 0.35)';
    gkAlertText.style.color = '#fbbf24';
    gkAlertText.textContent = `Only ${gkCount} GK detected. Set 2 players to GK for authentic 7v7 balance!`;
  } else {
    gkAlert.style.display = 'flex';
    gkAlert.style.background = 'rgba(59, 130, 246, 0.12)';
    gkAlert.style.borderColor = 'rgba(59, 130, 246, 0.35)';
    gkAlertText.style.color = '#93c5fd';
    gkAlertText.textContent = `${gkCount} Goalkeepers detected (will rotate or share).`;
  }

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

  // Attach event listeners
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

// 7 vs 7 Team Generation Algorithm
function generateTeams(balanced = true) {
  const pool = [...state.players];
  const count = pool.length;

  if (count < 2) return;

  let teamA = [];
  let teamB = [];
  let bench = [];

  if (!balanced) {
    shuffle(pool);
    teamA = pool.slice(0, 7);
    teamB = pool.slice(7, 14);
    bench = pool.slice(14);
  } else {
    // 7v7 Dedicated Balancing Engine:
    // 1. Separate Goalkeepers
    const gks = pool.filter(p => p.position === 'GK');
    const outfield = pool.filter(p => p.position !== 'GK');

    // Balance Goalkeepers if >= 2
    if (gks.length >= 2) {
      // Sort GKs by rating, give one to each team
      gks.sort((a, b) => b.rating - a.rating);
      teamA.push(gks[0]);
      teamB.push(gks[1]);
      // Extra GKs (if any) go to outfield pool
      for (let i = 2; i < gks.length; i++) {
        outfield.push(gks[i]);
      }
    } else if (gks.length === 1) {
      teamA.push(gks[0]);
    }

    // Target outfield count per team: 7 - teamGKCount
    const targetA = 7 - teamA.length;
    const targetB = 7 - teamB.length;

    // Use combinatorial search or greedy alternating draft to balance outfield
    // Sort outfield by rating descending
    outfield.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return Math.random() - 0.5;
    });

    // Snake draft / balance by position and rating
    const defs = outfield.filter(p => p.position === 'DEF');
    const mids = outfield.filter(p => p.position === 'MID');
    const atts = outfield.filter(p => p.position === 'ATT');

    // Distribute DEF
    distributeGroup(defs, teamA, teamB, targetA, targetB);
    // Distribute MID
    distributeGroup(mids, teamA, teamB, 7, 7);
    // Distribute ATT
    distributeGroup(atts, teamA, teamB, 7, 7);

    // If any team still needs players up to 7
    const remaining = outfield.filter(p => !teamA.includes(p) && !teamB.includes(p));
    remaining.forEach(p => {
      if (teamA.length < 7 && teamB.length < 7) {
        const sumA = teamA.reduce((s, x) => s + x.rating, 0);
        const sumB = teamB.reduce((s, x) => s + x.rating, 0);
        if (sumA <= sumB) teamA.push(p);
        else teamB.push(p);
      } else if (teamA.length < 7) {
        teamA.push(p);
      } else if (teamB.length < 7) {
        teamB.push(p);
      } else {
        bench.push(p);
      }
    });

    // Final skill fine-tuning swap
    fineTuneOutfieldBalance(teamA, teamB);
  }

  state.currentTeams = { teamA, teamB, bench };
  updateLineupDisplay();
}

function distributeGroup(group, teamA, teamB, maxA, maxB) {
  group.forEach(p => {
    if (teamA.includes(p) || teamB.includes(p)) return;

    const sumA = teamA.reduce((s, x) => s + x.rating, 0);
    const sumB = teamB.reduce((s, x) => s + x.rating, 0);

    if (teamA.length < maxA && teamB.length < maxB) {
      if (sumA <= sumB) teamA.push(p);
      else teamB.push(p);
    } else if (teamA.length < maxA) {
      teamA.push(p);
    } else if (teamB.length < maxB) {
      teamB.push(p);
    }
  });
}

function fineTuneOutfieldBalance(teamA, teamB) {
  // Only swap outfield players between A and B if it improves delta
  let currentDelta = Math.abs(
    teamA.reduce((s, p) => s + p.rating, 0) - teamB.reduce((s, p) => s + p.rating, 0)
  );

  for (let i = 0; i < teamA.length; i++) {
    for (let j = 0; j < teamB.length; j++) {
      if (teamA[i].position === 'GK' || teamB[j].position === 'GK') continue;
      // Test swap
      const pA = teamA[i];
      const pB = teamB[j];

      const newSumA = teamA.reduce((s, p) => s + p.rating, 0) - pA.rating + pB.rating;
      const newSumB = teamB.reduce((s, p) => s + p.rating, 0) - pB.rating + pA.rating;
      const newDelta = Math.abs(newSumA - newSumB);

      if (newDelta < currentDelta) {
        teamA[i] = pB;
        teamB[j] = pA;
        currentDelta = newDelta;
      }
    }
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Update 7 vs 7 UI Presentation
function updateLineupDisplay() {
  const { teamA, teamB, bench } = state.currentTeams;

  const avgA = teamA.length ? (teamA.reduce((s, p) => s + p.rating, 0) / teamA.length).toFixed(1) : '0.0';
  const avgB = teamB.length ? (teamB.reduce((s, p) => s + p.rating, 0) / teamB.length).toFixed(1) : '0.0';
  const sumA = teamA.reduce((s, p) => s + p.rating, 0);
  const sumB = teamB.reduce((s, p) => s + p.rating, 0);

  // Balance Badge
  const balancePill = document.getElementById('balanceScore');
  const balanceText = document.getElementById('balanceScoreText');
  const ratingDelta = Math.abs(avgA - avgB);

  balanceText.textContent = `7v7 Fair Match (Delta: ${ratingDelta.toFixed(1)}★)`;
  balancePill.style.background = ratingDelta <= 0.3 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';

  // Card headers
  document.getElementById('teamACount').textContent = `${teamA.length} players`;
  document.getElementById('teamBCount').textContent = `${teamB.length} players`;
  document.getElementById('teamARatingVal').textContent = `${avgA} avg (${sumA}★)`;
  document.getElementById('teamBRatingVal').textContent = `${avgB} avg (${sumB}★)`;

  // Render tactical pitch lines
  renderTacticalPitch(teamA, teamB);

  // Render team cards
  document.getElementById('teamARosterList').innerHTML = teamA.map(p => renderCardPlayer(p, 'blue')).join('');
  document.getElementById('teamBRosterList').innerHTML = teamB.map(p => renderCardPlayer(p, 'red')).join('');

  // Bench Substitutes (if > 14 players)
  const benchContainer = document.getElementById('benchContainer');
  if (bench && bench.length > 0) {
    benchContainer.style.display = 'block';
    document.getElementById('benchCount').textContent = `${bench.length} subs`;
    document.getElementById('benchPlayersList').innerHTML = bench.map(p => `
      <div class="roster-item" style="background: #1e293b; border: 1px solid #334155;">
        <span class="pos-badge pos-${p.position}">${p.position}</span>
        <span class="roster-name" style="margin: 0 8px;">${escapeHtml(p.name)}</span>
        <span class="star-rating">${'★'.repeat(p.rating)}</span>
      </div>
    `).join('');
  } else {
    benchContainer.style.display = 'none';
  }

  attachTokenEvents();
}

// Tactical 7v7 Pitch Layout
function renderTacticalPitch(teamA, teamB) {
  // Sort team players by tactical role: GK -> DEF -> MID -> ATT
  const sortForPitch = (players) => {
    const roleOrder = { 'GK': 0, 'DEF': 1, 'MID': 2, 'ATT': 3 };
    return [...players].sort((a, b) => roleOrder[a.position] - roleOrder[b.position]);
  };

  const sortedA = sortForPitch(teamA);
  const sortedB = sortForPitch(teamB);

  // Split into tactical lines according to selected formation
  // Formations: '2-3-1', '3-2-1', '2-2-2'
  let formLines = [2, 3, 1]; // DEF, MID, ATT counts
  if (state.formation === '3-2-1') formLines = [3, 2, 1];
  if (state.formation === '2-2-2') formLines = [2, 2, 2];

  // Team A (Blue Half): Left to Center -> [GK] -> [DEF] -> [MID] -> [ATT]
  const teamAPitch = document.getElementById('pitchTeamAPlayers');
  const gkA = sortedA.filter(p => p.position === 'GK');
  const outfieldA = sortedA.filter(p => p.position !== 'GK');

  // Assign outfield players to formation lines
  const defsA = outfieldA.slice(0, formLines[0]);
  const midsA = outfieldA.slice(formLines[0], formLines[0] + formLines[1]);
  const attsA = outfieldA.slice(formLines[0] + formLines[1]);

  teamAPitch.innerHTML = `
    <div class="tactical-line gk-line">${gkA.map(p => renderPitchToken(p, 'gk-blue', 'GK')).join('')}</div>
    <div class="tactical-line def-line">${defsA.map((p, i) => renderPitchToken(p, 'blue', i + 2)).join('')}</div>
    <div class="tactical-line mid-line">${midsA.map((p, i) => renderPitchToken(p, 'blue', i + 4)).join('')}</div>
    <div class="tactical-line att-line">${attsA.map((p, i) => renderPitchToken(p, 'blue', i + 7)).join('')}</div>
  `;

  // Team B (Red Half): Center to Right -> [ATT] -> [MID] -> [DEF] -> [GK]
  const teamBPitch = document.getElementById('pitchTeamBPlayers');
  const gkB = sortedB.filter(p => p.position === 'GK');
  const outfieldB = sortedB.filter(p => p.position !== 'GK');

  const defsB = outfieldB.slice(0, formLines[0]);
  const midsB = outfieldB.slice(formLines[0], formLines[0] + formLines[1]);
  const attsB = outfieldB.slice(formLines[0] + formLines[1]);

  teamBPitch.innerHTML = `
    <div class="tactical-line att-line">${attsB.map((p, i) => renderPitchToken(p, 'red', i + 7)).join('')}</div>
    <div class="tactical-line mid-line">${midsB.map((p, i) => renderPitchToken(p, 'red', i + 4)).join('')}</div>
    <div class="tactical-line def-line">${defsB.map((p, i) => renderPitchToken(p, 'red', i + 2)).join('')}</div>
    <div class="tactical-line gk-line">${gkB.map(p => renderPitchToken(p, 'gk-red', 'GK')).join('')}</div>
  `;
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
        token.style.transform = 'scale(1.25) translateY(-8px)';
        token.querySelector('.jersey-badge').style.borderColor = '#fbbf24';
        showToast(`Select another player to swap with ${token.querySelector('.token-name').textContent}`);
        playSound('click');
      } else if (selectedTokenId === clickedId) {
        selectedTokenId = null;
        updateLineupDisplay();
      } else {
        swapPlayers(selectedTokenId, clickedId);
        selectedTokenId = null;
        playSound('click');
        showToast('Players swapped!');
      }
    });
  });
}

function swapPlayers(id1, id2) {
  const { teamA, teamB } = state.currentTeams;

  const loc1 = teamA.some(p => p.id === id1) ? 'teamA' : 'teamB';
  const loc2 = teamA.some(p => p.id === id2) ? 'teamA' : 'teamB';

  const getPlayer = (loc, id) => (loc === 'teamA' ? teamA : teamB).find(p => p.id === id);
  const p1 = getPlayer(loc1, id1);
  const p2 = getPlayer(loc2, id2);

  const replacePlayer = (loc, oldId, newP) => {
    const arr = loc === 'teamA' ? teamA : teamB;
    const idx = arr.findIndex(p => p.id === oldId);
    arr[idx] = newP;
  };

  replacePlayer(loc1, id1, p2);
  replacePlayer(loc2, id2, p1);

  updateLineupDisplay();
}

// Copy 7 vs 7 Lineup to WhatsApp
function copyWhatsAppLineup() {
  const { teamA, teamB, bench } = state.currentTeams;
  const avgA = teamA.length ? (teamA.reduce((s, p) => s + p.rating, 0) / teamA.length).toFixed(1) : '0';
  const avgB = teamB.length ? (teamB.reduce((s, p) => s + p.rating, 0) / teamB.length).toFixed(1) : '0';

  let text = `⚽ *7 vs 7 MATCHDAY LINEUP* ⚽\n`;
  text += `📋 Formation: *${state.formation}* • Balanced Match\n\n`;

  text += `🔵 *TEAM BLUE* (${teamA.length} Players - ${avgA}★ avg):\n`;
  const groupA = groupByPosition(teamA);
  text += formatGroupWhatsApp(groupA);

  text += `\n🔴 *TEAM RED* (${teamB.length} Players - ${avgB}★ avg):\n`;
  const groupB = groupByPosition(teamB);
  text += formatGroupWhatsApp(groupB);

  if (bench && bench.length > 0) {
    text += `\n🔄 *SUBSTITUTES / BENCH* (${bench.length}):\n`;
    bench.forEach(p => {
      text += `  • ${p.name} (${p.position} - ${p.rating}★)\n`;
    });
  }

  text += `\n⚖️ *Teams balanced by SquadPick 7v7*\nMatch ready for kickoff! 🔥`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('7v7 Lineup copied! Ready to paste in WhatsApp 📱');
    playSound('success');
  }).catch(() => {
    showToast('Failed to copy. Please allow clipboard permissions.');
  });
}

function groupByPosition(players) {
  return {
    GK: players.filter(p => p.position === 'GK'),
    DEF: players.filter(p => p.position === 'DEF'),
    MID: players.filter(p => p.position === 'MID'),
    ATT: players.filter(p => p.position === 'ATT')
  };
}

function formatGroupWhatsApp(group) {
  let res = '';
  if (group.GK.length) res += `  🧤 GK: ${group.GK.map(p => `${p.name} (${p.rating}★)`).join(', ')}\n`;
  if (group.DEF.length) res += `  🛡️ DEF: ${group.DEF.map(p => `${p.name} (${p.rating}★)`).join(', ')}\n`;
  if (group.MID.length) res += `  ⚡ MID: ${group.MID.map(p => `${p.name} (${p.rating}★)`).join(', ')}\n`;
  if (group.ATT.length) res += `  🎯 ATT: ${group.ATT.map(p => `${p.name} (${p.rating}★)`).join(', ')}\n`;
  return res;
}

// Match Clock (20 mins half)
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
      pauseTimer();
      playSound('whistle');
      showToast('⏰ HALF TIME! Referee whistle blown!');
      alert('⏰ HALF TIME! Switch sides or rotate substitutes.');
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

  const rotations = 5 + Math.floor(Math.random() * 4);
  const targetDeg = (rotations * 360) + (isHeads ? 0 : 180);

  coin.style.transform = `rotateY(${targetDeg}deg)`;

  setTimeout(() => {
    const winner = isHeads ? 'HEADS (Team Blue chooses side/ball)' : 'TAILS (Team Red chooses side/ball)';
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
