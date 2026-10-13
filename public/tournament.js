// ============================================================
// HERO WARS TOURNAMENT ARENA - CLIENT LOGIC
// ============================================================

// User & Avatar Management
let currentUser = localStorage.getItem('user');
let currentAvatar = localStorage.getItem('avatar') || 'avatar1.jpg';

if (!currentUser) {
    currentUser = 'Guest_' + Math.floor(1000 + Math.random() * 9000);
}

const userDisplayEl = document.getElementById('user-display');
if (userDisplayEl) userDisplayEl.textContent = currentUser;

const userAvatarEl = document.getElementById('user-avatar');
if (userAvatarEl) {
    userAvatarEl.src = 'avatars/' + currentAvatar;
    userAvatarEl.style.display = 'block';
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('user');
            localStorage.removeItem('avatar');
            window.location.href = '/';
        }
    });
}

// Language Selector Support
function selectLanguage(element, langCode) {
    const btn = element.closest('.lang-menu-container').querySelector('.nav-icon-btn');
    btn.innerHTML = langCode + ' <span style="font-size: 1.2em; margin-top: -2px;">🌐</span>';
    const options = element.parentElement.querySelectorAll('.lang-option');
    options.forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    localStorage.setItem('selectedLang', langCode);
    element.parentElement.style.display = 'none';
}

// Socket Connection
const socket = io();

// State Variables
let currentTourId = null;
let currentTourState = null;
let isHost = false;
let hostKey = localStorage.getItem('tb_host_key') || '';
let selectedPlayerLimit = 8;
let selectedCreateMode = 'draft';
let selectedNextMode = 'draft';

// Active Match Draft State
let activeMatchId = null;
let activeMatchMode = null;
let activeMatchRole = null;
let activeChoices = [];
let activeOpponentChoices = [];
let activeTypes = [];
let activeOpponentTypes = [];
let activeDraftIndex = 0;
let megaPool = { heroes: [], pets: [] };
let megaTurn = 'p1';
let megaPicksLeft = 1;
let megaLocalTimer = null;
let normalDraftTimer = null;
let tripleDraftTimer = null;
let megaPreviousAllItems = [];
let megaPreviousMyTeam = { heroes: [], pets: [] };
let megaPreviousOppTeam = { heroes: [], pets: [] };
let megaMyTeamState = { heroes: [], pets: [] };
let megaOppTeamState = { heroes: [], pets: [] };

// Audio Synthesizer (Web Audio API)
let audioCtx = null;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playBeep(freq = 440, duration = 0.15, type = 'sine') {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch(e) {}
}

function playWhistle() {
    try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
}

function playFanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        setTimeout(() => playBeep(freq, 0.4, 'triangle'), idx * 150);
    });
}

// Screen Switcher
function showScreen(screenId) {
    const screens = [
        'screen-entrance',
        'screen-host-setup',
        'screen-lobby',
        'screen-draft-arena',
        'screen-host-command',
        'screen-champion'
    ];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === screenId) ? 'block' : 'none';
    });
}

// ============================================================
// SCREEN 1: ENTRANCE LOGIC
// ============================================================

const inputJoinTourId = document.getElementById('input-join-tour-id');
const btnJoinTour = document.getElementById('btn-join-tour');
const joinStatusMsg = document.getElementById('join-status-msg');
const inputHostKey = document.getElementById('input-host-key');
const btnEnterHostMode = document.getElementById('btn-enter-host-mode');

// Platform Selector & Player ID Persistence
let selectedPlatform = localStorage.getItem('hw_platform') || 'WEB';
const savedPlayerId = localStorage.getItem('hw_player_id');
const inputJoinPlayerId = document.getElementById('input-join-player-id');
if (savedPlayerId && inputJoinPlayerId) {
    inputJoinPlayerId.value = savedPlayerId;
}

const platformBtns = document.querySelectorAll('#join-platform-buttons .platform-btn');
platformBtns.forEach(btn => {
    if (btn.dataset.platform === selectedPlatform) {
        platformBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
        platformBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPlatform = btn.dataset.platform;
        localStorage.setItem('hw_platform', selectedPlatform);
    });
});

// Check URL param ?id=
const urlParams = new URLSearchParams(window.location.search);
const paramTourId = urlParams.get('id');
if (paramTourId && inputJoinTourId) {
    inputJoinTourId.value = paramTourId.toUpperCase();
}

btnJoinTour.addEventListener('click', () => {
    const tourId = inputJoinTourId.value.trim().toUpperCase();
    const playerId = (document.getElementById('input-join-player-id')?.value || '').trim();
    if (!tourId) {
        joinStatusMsg.textContent = 'Please enter a valid Tournament ID.';
        joinStatusMsg.style.color = '#ef4444';
        return;
    }
    if (playerId) localStorage.setItem('hw_player_id', playerId);
    joinStatusMsg.textContent = 'Connecting to tournament ' + tourId + '...';
    joinStatusMsg.style.color = '#aef649';
    socket.emit('joinTournament', {
        tourId,
        username: currentUser,
        avatar: currentAvatar,
        playerId,
        platform: selectedPlatform,
        hostKey: isHost ? hostKey : ''
    });
});

btnEnterHostMode.addEventListener('click', () => {
    const enteredKey = inputHostKey.value.trim();
    if (!enteredKey) {
        alert('Please enter your Host Key / Password.');
        return;
    }
    socket.emit('verifyHostKey', { hostKey: enteredKey }, (res) => {
        if (res && res.valid) {
            hostKey = enteredKey;
            localStorage.setItem('tb_host_key', hostKey);
            isHost = true;
            showScreen('screen-host-setup');
        } else {
            alert('Invalid Host Key. If you need permission, click "Request Host Permission".');
        }
    });
});

document.getElementById('btn-back-to-entrance').addEventListener('click', () => {
    showScreen('screen-entrance');
});

// Host Request Modal
function openHostRequestModal() {
    document.getElementById('modal-host-request').style.display = 'flex';
}
function closeHostRequestModal() {
    document.getElementById('modal-host-request').style.display = 'none';
}
function useDefaultHostKey() {
    inputHostKey.value = 'tradeboy2026';
    closeHostRequestModal();
    btnEnterHostMode.click();
}

// ============================================================
// SCREEN 2: HOST SETUP (CREATE TOURNAMENT)
// ============================================================

// Player Limit Buttons
const limitButtons = document.querySelectorAll('#player-limit-group .limit-btn');
limitButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        limitButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPlayerLimit = parseInt(btn.dataset.limit) || 8;
    });
});

// Initial Mode Selector
const modeCards = document.querySelectorAll('#create-mode-group .mode-card');
modeCards.forEach(card => {
    card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedCreateMode = card.dataset.mode;
    });
});

// Form Submit
document.getElementById('form-create-tour').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('tour-name-input').value.trim();
    const details = document.getElementById('tour-details-input').value.trim();
    const rewards = document.getElementById('tour-rewards-input').value.trim();

    if (!name) {
        alert('Please provide a Tournament Name.');
        return;
    }

    socket.emit('createTournament', {
        hostKey,
        name,
        details,
        rewards,
        playerLimit: selectedPlayerLimit,
        gameMode: selectedCreateMode,
        username: currentUser,
        avatar: currentAvatar
    });
});

socket.on('tournamentCreated', ({ tourId, state, hostKey: key }) => {
    currentTourId = tourId;
    isHost = true;
    hostKey = key;
    localStorage.setItem('tb_host_key', key);
    updateTournamentState(state);
    showScreen('screen-lobby');
});

// ============================================================
// SCREEN 3: TOURNAMENT LOBBY
// ============================================================

// Tab Switcher
const tabButtons = document.querySelectorAll('.tour-nav-tabs .tour-tab');
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = btn.dataset.tab;
        document.getElementById('tab-slots').classList.toggle('active', targetTab === 'slots');
        document.getElementById('tab-bracket').classList.toggle('active', targetTab === 'bracket');
        const navBar = document.getElementById('bracket-nav-bar');
        if (navBar) {
            navBar.style.display = (targetTab === 'bracket' && currentTourState && (currentTourState.status === 'in_round' || currentTourState.status === 'round_completed')) ? 'block' : 'none';
        }
    });
});

// Copy Tour ID & Invite Link
document.getElementById('btn-copy-tour-id').addEventListener('click', () => {
    if (!currentTourId) return;
    navigator.clipboard.writeText(currentTourId);
    const btn = document.getElementById('btn-copy-tour-id');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy ID'; }, 2000);
});

document.getElementById('btn-copy-tour-link').addEventListener('click', () => {
    if (!currentTourId) return;
    const inviteUrl = `${window.location.origin}/tournament?id=${currentTourId}`;
    navigator.clipboard.writeText(inviteUrl);
    const btn = document.getElementById('btn-copy-tour-link');
    btn.textContent = '✅ Link Copied!';
    setTimeout(() => { btn.textContent = '🔗 Copy Link'; }, 2000);
});

document.getElementById('btn-leave-lobby').addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the tournament?')) {
        if (normalDraftTimer) { clearInterval(normalDraftTimer); normalDraftTimer = null; }
        if (tripleDraftTimer) { clearInterval(tripleDraftTimer); tripleDraftTimer = null; }
        if (megaLocalTimer) { clearInterval(megaLocalTimer); megaLocalTimer = null; }
        socket.emit('leaveTournament', { tourId: currentTourId, username: currentUser });
        currentTourId = null;
        showScreen('screen-entrance');
    }
});

document.getElementById('btn-leave-spectate').addEventListener('click', () => {
    if (normalDraftTimer) { clearInterval(normalDraftTimer); normalDraftTimer = null; }
    if (tripleDraftTimer) { clearInterval(tripleDraftTimer); tripleDraftTimer = null; }
    if (megaLocalTimer) { clearInterval(megaLocalTimer); megaLocalTimer = null; }
    socket.emit('leaveTournament', { tourId: currentTourId, username: currentUser });
    currentTourId = null;
    showScreen('screen-entrance');
});

// Host Lobby Mode Selector
const hostModeBtns = document.querySelectorAll('.host-mode-buttons .mode-toggle-btn');
hostModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!isHost || !currentTourId) return;
        hostModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const newMode = btn.dataset.mode;
        socket.emit('tourSetGameMode', { tourId: currentTourId, gameMode: newMode, hostKey });
    });
});

// Host Start Tournament
document.getElementById('btn-start-tournament').addEventListener('click', () => {
    if (!isHost || !currentTourId) return;
    socket.emit('startTournament', { tourId: currentTourId, hostKey });
});

// ============================================================
// STATE SYNCHRONIZATION & RENDERING
// ============================================================

socket.on('tourJoinedSuccess', ({ tourId, state }) => {
    currentTourId = tourId;
    updateTournamentState(state);
    showScreen('screen-lobby');
});

socket.on('tourJoinedAsSpectator', ({ message, state }) => {
    currentTourId = state.id;
    updateTournamentState(state);
    document.getElementById('spectator-banner').style.display = 'flex';
    if (isHost && state.status !== 'lobby') {
        showScreen('screen-host-command');
    } else {
        showScreen('screen-lobby');
    }
});

socket.on('tourStateUpdate', (state) => {
    updateTournamentState(state);
});

socket.on('tourError', (msg) => {
    alert(msg);
});

function updateTournamentState(state) {
    if (!state) return;
    currentTourState = state;
    currentTourId = state.id;

    // Check if current user is host
    if (state.hostUsername === currentUser || (hostKey && isHost)) {
        isHost = true;
    }

    // Header info
    document.getElementById('lobby-tour-name').textContent = state.name;
    document.getElementById('lobby-tour-id').textContent = state.id;
    document.getElementById('lobby-player-count').textContent = state.players.length;
    document.getElementById('lobby-player-limit').textContent = state.playerLimit;

    // Status pill
    const statusPill = document.getElementById('lobby-status-pill');
    if (state.status === 'lobby') statusPill.textContent = 'Lobby Open';
    else if (state.status === 'in_round') statusPill.textContent = state.currentRoundName || 'In Battle';
    else if (state.status === 'round_completed') statusPill.textContent = 'Round Finished';
    else if (state.status === 'finished') statusPill.textContent = 'Tournament Finished';

    // Details & Rewards
    const detailsBox = document.getElementById('lobby-details-box');
    if (state.details) {
        detailsBox.textContent = state.details;
        detailsBox.style.display = 'block';
    } else {
        detailsBox.style.display = 'none';
    }

    const rewardsBox = document.getElementById('lobby-rewards-box');
    if (state.rewards) {
        rewardsBox.textContent = '🎁 Rewards: ' + state.rewards;
        rewardsBox.style.display = 'inline-block';
    } else {
        rewardsBox.style.display = 'none';
    }

    // Render Slots Grid
    renderSlotsGrid(state);

    // Host Controls vs Player Notice
    const hostControls = document.getElementById('host-lobby-controls');
    const playerNotice = document.getElementById('player-waiting-notice');
    if (isHost && state.status === 'lobby') {
        hostControls.style.display = 'block';
        playerNotice.style.display = 'none';

        // Update mode toggle buttons
        hostModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === state.gameMode);
        });

        const startBtn = document.getElementById('btn-start-tournament');
        const hintEl = document.getElementById('host-start-hint');
        if (state.players.length >= state.playerLimit) {
            hintEl.textContent = 'All player slots are filled! Ready to launch!';
            hintEl.style.color = '#aef649';
            startBtn.disabled = false;
        } else {
            hintEl.textContent = `Slots: ${state.players.length} / ${state.playerLimit} joined. You can start anytime once at least 2 players have joined.`;
            hintEl.style.color = '#cbd5e1';
            startBtn.disabled = state.players.length < 2;
        }
    } else {
        hostControls.style.display = 'none';
        playerNotice.style.display = 'flex';
        document.getElementById('wait-mode-preview').textContent = `Game Mode: ${formatModeName(state.gameMode)}`;
    }

    // Check if player is eliminated
    const myPlayer = state.players.find(p => p.username === currentUser);
    const isEliminated = !!(myPlayer && myPlayer.eliminated);
    if (isEliminated) {
        const specBanner = document.getElementById('spectator-banner');
        if (specBanner) specBanner.style.display = 'flex';
    }

    // Render Bracket View
    renderBracket(state);

    // If tournament finished, show champion celebration screen with Winner Player ID
    if (state.status === 'finished' && state.champion) {
        renderChampionScreen(state.champion, state.runnerUp, state.rewards);
        return;
    }

    // Handle Screen Transitions for in_round or round_completed
    if (state.status === 'in_round' || state.status === 'round_completed') {
        const curRound = state.rounds && state.rounds[state.currentRoundIndex];
        let myCurrentMatch = null;
        if (curRound) {
            myCurrentMatch = curRound.matches.find(m => 
                (m.p1 && m.p1.username === currentUser) || 
                (m.p2 && m.p2.username === currentUser)
            );
        }

        if (isHost) {
            showScreen('screen-host-command');
            renderHostCommandCenter(state);
        } else {
            // Player or Spectator
            const isMyMatchActive = myCurrentMatch && myCurrentMatch.status !== 'completed' && !isEliminated;

            if (isMyMatchActive) {
                // Keep player on active draft/patron/locked teams screens while their battle is pending
            } else if (myCurrentMatch && myCurrentMatch.status === 'completed') {
                showScreen('screen-host-command');
                const didWin = (myCurrentMatch.winner === currentUser);
                renderHostCommandCenter(state, {
                    defeated: !didWin || isEliminated,
                    victory: didWin && !isEliminated
                });
            } else if (isEliminated) {
                showScreen('screen-host-command');
                renderHostCommandCenter(state, { defeated: true });
            } else {
                showScreen('screen-host-command');
                renderHostCommandCenter(state, { spectator: true });
            }
        }
    }
}

function formatModeName(mode) {
    if (mode === 'triple') return 'Triple Draft';
    if (mode === 'mega') return 'Mega Draft';
    return 'Draft Battle';
}

function renderSlotsGrid(state) {
    const container = document.getElementById('slots-container');
    container.innerHTML = '';
    const limit = state.playerLimit || 8;

    for (let i = 0; i < limit; i++) {
        const player = state.players[i];
        const card = document.createElement('div');
        card.className = 'slot-card ' + (player ? 'filled' : 'waiting');

        const slotNum = document.createElement('span');
        slotNum.className = 'slot-num-badge';
        slotNum.textContent = `#${i + 1}`;
        card.appendChild(slotNum);

        if (player) {
            const avatar = document.createElement('img');
            avatar.className = 'slot-avatar';
            avatar.src = 'avatars/' + (player.avatar || 'avatar1.jpg');
            card.appendChild(avatar);

            const info = document.createElement('div');
            info.className = 'slot-info';

            const name = document.createElement('div');
            name.className = 'slot-name';
            name.innerHTML = `${player.username} <span class="platform-badge ${player.platform === 'FB' ? 'fb' : 'web'}">${player.platform || 'WEB'}</span>`;
            info.appendChild(name);

            if (player.playerId) {
                const idTag = document.createElement('div');
                idTag.className = 'player-id-tag';
                idTag.title = 'Click to copy Player ID';
                idTag.innerHTML = `<span>ID: ${player.playerId}</span> <span style="font-size:0.7em;">📋</span>`;
                idTag.onclick = (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(player.playerId);
                    idTag.innerHTML = `<span>Copied!</span>`;
                    setTimeout(() => { idTag.innerHTML = `<span>ID: ${player.playerId}</span> <span style="font-size:0.7em;">📋</span>`; }, 1500);
                };
                info.appendChild(idTag);
            }

            const tag = document.createElement('div');
            tag.className = 'slot-status-tag';
            tag.innerHTML = player.eliminated ? '❌ Eliminated' : '⚡ READY';
            info.appendChild(tag);

            card.appendChild(info);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'slot-avatar-placeholder';
            placeholder.textContent = '+';
            card.appendChild(placeholder);

            const info = document.createElement('div');
            info.className = 'slot-info';

            const name = document.createElement('div');
            name.className = 'slot-name';
            name.style.color = '#9ca3af';
            name.textContent = 'Waiting to Join...';
            info.appendChild(name);

            const tag = document.createElement('div');
            tag.className = 'slot-status-tag waiting';
            tag.textContent = 'Open Slot';
            info.appendChild(tag);

            card.appendChild(info);
        }

        container.appendChild(card);
    }
}

// ============================================================
// 5-SECOND COUNTDOWN OVERLAY
// ============================================================

socket.on('tourCountdown', ({ seconds }) => {
    const modal = document.getElementById('modal-countdown');
    const numEl = document.getElementById('countdown-num');
    modal.style.display = 'flex';

    let count = seconds || 5;
    numEl.textContent = count;
    playBeep(440, 0.2, 'square');

    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            numEl.textContent = count;
            playBeep(440, 0.2, 'square');
        } else {
            clearInterval(countdownInterval);
            numEl.textContent = 'FIGHT!';
            playWhistle();
            setTimeout(() => {
                modal.style.display = 'none';
                if (isHost) {
                    showScreen('screen-host-command');
                }
            }, 800);
        }
    }, 1000);
});

// ============================================================
// DRAFT ARENA IMPLEMENTATION (NORMAL, TRIPLE, MEGA)
// ============================================================

// DRAFT COUNTDOWN HELPER
function startDraftCountdown(timerContainerId, timerBarId, timerTextId, timeLimit, onExpire) {
    const container = document.getElementById(timerContainerId);
    const bar = document.getElementById(timerBarId);
    const text = document.getElementById(timerTextId);
    if (!container || !bar || !text) return null;

    container.style.display = 'block';
    bar.style.transition = 'none';
    bar.style.width = '100%';
    bar.classList.remove('warning', 'danger');

    let timeLeft = timeLimit;
    text.textContent = `${timeLeft}s`;

    void bar.offsetWidth; // force reflow
    bar.style.transition = 'width 1s linear';
    bar.style.width = `${((timeLeft - 1) / timeLimit) * 100}%`;

    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(timer);
            text.textContent = "Time's up!";
            bar.style.width = '0%';
            bar.classList.remove('warning');
            bar.classList.add('danger');
            if (typeof onExpire === 'function') {
                onExpire();
            }
            return;
        }

        text.textContent = `${timeLeft}s`;
        bar.style.width = `${(timeLeft / timeLimit) * 100}%`;

        if (timeLeft <= 5) {
            bar.classList.remove('warning');
            bar.classList.add('danger');
        } else if (timeLeft <= 10) {
            bar.classList.add('warning');
        }
    }, 1000);

    return timer;
}

function autoPickRemainingNormalDraft() {
    while (activeDraftIndex < 3) {
        const idx = activeDraftIndex;
        const pair = activeChoices[idx];
        if (!pair) break;
        const type = activeTypes[idx];
        const dir = type === 'hero' ? 'heroes' : 'pets';
        const picked = pair[0];
        const rejected = pair[1];

        updateMyDraftSlot('arena-my-progress', idx, `${dir}/${picked}`);
        socket.emit('tourMakeChoice', {
            tourId: currentTourId,
            matchId: activeMatchId,
            index: idx,
            picked,
            rejected
        });
        activeDraftIndex++;
    }
    const pickArea = document.getElementById('normal-draft-pick-area');
    if (pickArea) pickArea.style.display = 'none';
    const waitingArea = document.getElementById('arena-draft-waiting');
    if (waitingArea) waitingArea.style.display = 'block';
}

function autoPickRemainingTripleDraft() {
    while (activeDraftIndex < 6) {
        const idx = activeDraftIndex;
        const triple = activeChoices[idx];
        if (!triple) break;
        const type = activeTypes[idx];
        const dir = type === 'hero' ? 'heroes' : 'pets';
        const picked = triple[0];

        updateMyDraftSlot('arena-triple-my-progress', idx, `${dir}/${picked}`);
        socket.emit('tourMakeTripleChoice', {
            tourId: currentTourId,
            matchId: activeMatchId,
            index: idx,
            picked
        });
        activeDraftIndex++;
    }
    const pickArea = document.getElementById('triple-draft-pick-area');
    if (pickArea) pickArea.style.display = 'none';
}

// 1. NORMAL DRAFT START
socket.on('tourMatchDraftStart', (data) => {
    if (normalDraftTimer) {
        clearInterval(normalDraftTimer);
        normalDraftTimer = null;
    }
    if (tripleDraftTimer) {
        clearInterval(tripleDraftTimer);
        tripleDraftTimer = null;
    }

    activeMatchId = data.matchId;
    activeMatchMode = 'draft';
    activeMatchRole = data.role;
    activeChoices = data.choices;
    activeOpponentChoices = data.opponentChoices;
    activeTypes = data.type;
    activeOpponentTypes = data.opponentType;
    activeDraftIndex = 0;

    showScreen('screen-draft-arena');
    document.getElementById('arena-match-info').textContent = `${currentTourState?.currentRoundName || 'Match'} • Your Battle`;
    document.getElementById('arena-mode-badge').textContent = 'Draft Battle';

    document.getElementById('normal-draft-container').style.display = 'block';
    document.getElementById('triple-draft-container').style.display = 'none';
    document.getElementById('mega-draft-container').style.display = 'none';
    document.getElementById('arena-draft-completed-box').style.display = 'none';
    document.getElementById('normal-draft-pick-area').style.display = 'block';
    const waitingEl = document.getElementById('arena-draft-waiting');
    if (waitingEl) waitingEl.style.display = 'none';

    // Opponent header
    document.getElementById('arena-opp-name').textContent = `${data.opponentName}'s Team`;
    const oppAvatar = document.getElementById('arena-opp-avatar');
    if (data.opponentAvatar) {
        oppAvatar.src = 'avatars/' + data.opponentAvatar;
        oppAvatar.style.display = 'block';
    }

    resetDraftSlots('arena-opp-progress');
    resetDraftSlots('arena-my-progress');

    showNormalDraftChoice(0);

    const timeLimit = data.timeLimit || 30;
    normalDraftTimer = startDraftCountdown(
        'normal-draft-timer-container',
        'normal-draft-timer-bar',
        'normal-draft-timer-text',
        timeLimit,
        autoPickRemainingNormalDraft
    );
});

function resetDraftSlots(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const slots = container.querySelectorAll('.draft-slot');
    slots.forEach(s => {
        s.textContent = '?';
        s.style.backgroundImage = 'none';
        s.classList.remove('filled');
    });
}

function showNormalDraftChoice(index) {
    if (index >= 3) return;
    const pair = activeChoices[index];
    const type = activeTypes[index];
    const dir = type === 'hero' ? 'heroes' : 'pets';

    document.getElementById('arena-round-indicator').textContent = `Pick ${index + 1} of 3: Choose 1 ${type === 'hero' ? 'Hero' : 'Pet'}`;

    const card1Img = document.getElementById('arena-card-1-img');
    const card1Name = document.getElementById('arena-card-1-name');
    const card2Img = document.getElementById('arena-card-2-img');
    const card2Name = document.getElementById('arena-card-2-name');

    card1Img.src = `${dir}/${pair[0]}`;
    card1Name.textContent = cleanItemName(pair[0]);

    card2Img.src = `${dir}/${pair[1]}`;
    card2Name.textContent = cleanItemName(pair[1]);

    const card1 = document.getElementById('arena-card-1');
    const card2 = document.getElementById('arena-card-2');

    card1.onclick = () => selectNormalDraftChoice(index, pair[0], pair[1], `${dir}/${pair[0]}`);
    card2.onclick = () => selectNormalDraftChoice(index, pair[1], pair[0], `${dir}/${pair[1]}`);
}

function selectNormalDraftChoice(index, picked, rejected, imgSrc) {
    playBeep(587.33, 0.15, 'sine');
    updateMyDraftSlot('arena-my-progress', index, imgSrc);

    socket.emit('tourMakeChoice', {
        tourId: currentTourId,
        matchId: activeMatchId,
        index,
        picked,
        rejected
    });

    activeDraftIndex++;
    if (activeDraftIndex < 3) {
        showNormalDraftChoice(activeDraftIndex);
    } else {
        if (normalDraftTimer) {
            clearInterval(normalDraftTimer);
            normalDraftTimer = null;
        }
        document.getElementById('normal-draft-pick-area').style.display = 'none';
        document.getElementById('arena-draft-waiting').style.display = 'block';
    }
}

function updateMyDraftSlot(containerId, index, imgSrc) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const slots = container.querySelectorAll('.draft-slot');
    if (slots[index]) {
        slots[index].style.backgroundImage = `url("${imgSrc}")`;
        slots[index].style.backgroundSize = 'cover';
        slots[index].textContent = '';
        slots[index].classList.add('filled');
    }
}

socket.on('tourOpponentSelected', () => {
    // Fill next opponent slot with checkmark
    const oppSlots = document.querySelectorAll('#arena-opp-progress .draft-slot, #arena-triple-opp-progress .draft-slot');
    for (let slot of oppSlots) {
        if (!slot.classList.contains('filled')) {
            slot.textContent = '✓';
            slot.classList.add('filled');
            break;
        }
    }
});

// 2. TRIPLE DRAFT START
socket.on('tourMatchTripleDraftStart', (data) => {
    if (normalDraftTimer) {
        clearInterval(normalDraftTimer);
        normalDraftTimer = null;
    }
    if (tripleDraftTimer) {
        clearInterval(tripleDraftTimer);
        tripleDraftTimer = null;
    }

    activeMatchId = data.matchId;
    activeMatchMode = 'triple';
    activeMatchRole = data.role;
    activeChoices = data.choices;
    activeTypes = data.type;
    activeDraftIndex = 0;

    showScreen('screen-draft-arena');
    document.getElementById('arena-match-info').textContent = `${currentTourState?.currentRoundName || 'Match'} • Triple Draft`;
    document.getElementById('arena-mode-badge').textContent = 'Triple Draft';

    document.getElementById('normal-draft-container').style.display = 'none';
    document.getElementById('triple-draft-container').style.display = 'block';
    document.getElementById('mega-draft-container').style.display = 'none';
    document.getElementById('arena-draft-completed-box').style.display = 'none';
    document.getElementById('triple-draft-pick-area').style.display = 'block';
    const tripleWaitingEl = document.getElementById('arena-triple-waiting');
    if (tripleWaitingEl) tripleWaitingEl.style.display = 'none';

    document.getElementById('arena-triple-opp-name').textContent = `${data.opponentName}'s Team`;
    const oppAvatar = document.getElementById('arena-triple-opp-avatar');
    if (data.opponentAvatar) {
        oppAvatar.src = 'avatars/' + data.opponentAvatar;
        oppAvatar.style.display = 'block';
    }

    resetDraftSlots('arena-triple-opp-progress');
    resetDraftSlots('arena-triple-my-progress');

    showTripleDraftChoice(0);

    const timeLimit = data.timeLimit || 35;
    tripleDraftTimer = startDraftCountdown(
        'triple-draft-timer-container',
        'triple-draft-timer-bar',
        'triple-draft-timer-text',
        timeLimit,
        autoPickRemainingTripleDraft
    );
});

function showTripleDraftChoice(index) {
    if (index >= 6) return;
    const triple = activeChoices[index];
    const type = activeTypes[index];
    const dir = type === 'hero' ? 'heroes' : 'pets';

    document.getElementById('arena-triple-round-indicator').textContent = `Round ${index + 1} of 6: Choose 1 ${type === 'hero' ? 'Hero' : 'Pet'}`;

    for (let i = 1; i <= 3; i++) {
        const card = document.getElementById(`arena-tcard-${i}`);
        const img = document.getElementById(`arena-tcard-${i}-img`);
        const name = document.getElementById(`arena-tcard-${i}-name`);
        const item = triple[i - 1];

        img.src = `${dir}/${item}`;
        name.textContent = cleanItemName(item);

        card.onclick = () => {
            playBeep(587.33, 0.15, 'sine');
            updateMyDraftSlot('arena-triple-my-progress', index, `${dir}/${item}`);
            socket.emit('tourMakeTripleChoice', {
                tourId: currentTourId,
                matchId: activeMatchId,
                index,
                picked: item
            });
            activeDraftIndex++;
            if (activeDraftIndex < 6) {
                showTripleDraftChoice(activeDraftIndex);
            } else {
                if (tripleDraftTimer) {
                    clearInterval(tripleDraftTimer);
                    tripleDraftTimer = null;
                }
                document.getElementById('triple-draft-pick-area').style.display = 'none';
            }
        };
    }
}

// 3. MEGA DRAFT ARENA IMPLEMENTATION (AUTHENTIC ORIGINAL MEGA DRAFT LOOK & FEEL)
socket.on('tourMatchMegaDraftStart', (data) => {
    activeMatchId = data.matchId;
    activeMatchMode = 'mega';
    activeMatchRole = data.role;
    megaPool = data.pool;
    megaTurn = data.turn;
    megaPicksLeft = data.picksLeftThisTurn;

    showScreen('screen-draft-arena');
    document.getElementById('arena-match-info').textContent = `${currentTourState?.currentRoundName || 'Match'} • Mega Draft`;
    document.getElementById('arena-mode-badge').textContent = 'Mega Draft';

    document.getElementById('normal-draft-container').style.display = 'none';
    document.getElementById('triple-draft-container').style.display = 'none';
    document.getElementById('mega-draft-container').style.display = 'block';
    document.getElementById('arena-draft-completed-box').style.display = 'none';

    // Opponent header setup
    document.getElementById('mega-opp-team-title').textContent = `${data.opponentName}'s Team`;
    const oppAvatar = document.getElementById('mega-opp-team-avatar');
    if (data.opponentAvatar) {
        oppAvatar.src = 'avatars/' + data.opponentAvatar;
        oppAvatar.style.display = 'block';
    } else {
        oppAvatar.style.display = 'none';
    }

    // My header setup
    document.getElementById('mega-my-team-title').textContent = `${currentUser}'s Team`;
    const myAvatar = document.getElementById('mega-my-team-avatar');
    if (currentAvatar) {
        myAvatar.src = 'avatars/' + currentAvatar;
        myAvatar.style.display = 'block';
    }

    // Reset slots to 6 empty '?' slots
    initMegaDraftSlots();

    // Reset card animation tracking
    megaPreviousAllItems = [];
    megaPreviousMyTeam = { heroes: [], pets: [] };
    megaPreviousOppTeam = { heroes: [], pets: [] };
    megaMyTeamState = { heroes: [], pets: [] };
    megaOppTeamState = { heroes: [], pets: [] };

    updateMegaDraftState(data.pool, { heroes: [], pets: [] }, { heroes: [], pets: [] }, data.turn, data.picksLeftThisTurn, data.timeLimit || 12);
});

socket.on('tourMegaDraftUpdate', (data) => {
    const p1 = (activeMatchRole === 'p1') ? data.p1 : data.p2;
    const p2 = (activeMatchRole === 'p1') ? data.p2 : data.p1;

    updateMegaDraftState(data.pool, p1, p2, data.turn, data.picksLeftThisTurn, data.timeLimit || 12);
});

function initMegaDraftSlots() {
    const myContainer = document.getElementById('mega-my-team');
    const oppContainer = document.getElementById('mega-opp-team');
    if (myContainer) {
        myContainer.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            myContainer.innerHTML += '<div class="slot">?</div>';
        }
    }
    if (oppContainer) {
        oppContainer.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            oppContainer.innerHTML += '<div class="slot">?</div>';
        }
    }
}

function updateMegaDraftState(pool, myTeam, oppTeam, turn, picksLeft, timeLimit) {
    const newMyAll = [...(myTeam.heroes || []), ...(myTeam.pets || [])];
    const newOppAll = [...(oppTeam.heroes || []), ...(oppTeam.pets || [])];

    const mySlotsContainer = document.getElementById('mega-my-team');
    const oppSlotsContainer = document.getElementById('mega-opp-team');

    const myAdded = newMyAll.filter(item => !megaPreviousAllItems.includes(item));
    const oppAdded = newOppAll.filter(item => !megaPreviousAllItems.includes(item));

    myAdded.forEach(item => animateMegaCard(item, mySlotsContainer, megaPreviousMyTeam));
    oppAdded.forEach(item => animateMegaCard(item, oppSlotsContainer, megaPreviousOppTeam));

    megaPreviousAllItems = [...newMyAll, ...newOppAll];
    megaPreviousMyTeam = myTeam;
    megaPreviousOppTeam = oppTeam;

    megaPool = pool;
    megaMyTeamState = myTeam;
    megaOppTeamState = oppTeam;
    megaTurn = turn;
    megaPicksLeft = picksLeft;

    const isMyTurn = (megaTurn === activeMatchRole);
    const turnIndicator = document.getElementById('mega-turn-indicator');
    const picksLeftEl = document.getElementById('mega-picks-left');

    if (isMyTurn) {
        turnIndicator.textContent = "Your Turn!";
        turnIndicator.style.color = "#fef08a";
        turnIndicator.className = "turn-active";
        picksLeftEl.textContent = `Picks left: ${picksLeft}`;
        picksLeftEl.style.display = "block";
    } else {
        turnIndicator.textContent = "Opponent's Turn...";
        turnIndicator.style.color = "#ef4444";
        turnIndicator.className = "turn-opponent";
        picksLeftEl.style.display = "none";
    }

    // Timer bar
    const timerContainer = document.getElementById('mega-timer-container');
    const timerBar = document.getElementById('mega-timer-bar');
    const timerText = document.getElementById('mega-timer-text');

    if (megaLocalTimer) clearInterval(megaLocalTimer);
    timerBar.style.transition = 'none';
    timerBar.style.width = '100%';
    timerBar.classList.remove('warning');
    timerBar.classList.remove('danger');

    if (!isMyTurn) {
        timerBar.classList.add('danger');
    }

    if (timeLimit) {
        timerContainer.style.display = 'block';
        let timeLeft = timeLimit;
        timerText.textContent = `${timeLeft}s`;

        void timerBar.offsetWidth; // force reflow
        timerBar.style.transition = 'width 1s linear';
        timerBar.style.width = `${((timeLeft - 1) / timeLimit) * 100}%`;

        megaLocalTimer = setInterval(() => {
            timeLeft--;
            if (timeLeft < 0) {
                clearInterval(megaLocalTimer);
                return;
            }
            timerText.textContent = `${timeLeft}s`;
            timerBar.style.width = `${(timeLeft / timeLimit) * 100}%`;

            if (isMyTurn && timeLeft <= 3) {
                timerBar.classList.add('warning');
            }
        }, 1000);
    } else {
        timerContainer.style.display = 'none';
    }

    renderMegaSlots(mySlotsContainer, myTeam);
    renderMegaSlots(oppSlotsContainer, oppTeam);
    renderMegaPool(pool);
}

function renderMegaSlots(container, team) {
    if (!container) return;
    const heroes = team.heroes || [];
    const pets = team.pets || [];
    const allItems = [...heroes, ...pets];
    const slots = container.querySelectorAll('.slot');

    for (let i = 0; i < 6; i++) {
        if (!slots[i]) continue;
        if (i < allItems.length) {
            const item = allItems[i];
            const isHero = heroes.includes(item);
            const path = isHero ? 'heroes/' : 'pets/';
            slots[i].innerHTML = `<img src="${path}${item}" title="${cleanItemName(item)}">`;
            slots[i].style.borderColor = isHero ? '#3b82f6' : '#a855f7';
            slots[i].style.borderStyle = 'solid';
        } else {
            slots[i].innerHTML = '?';
            slots[i].style.borderColor = 'rgba(255, 255, 255, 0.2)';
            slots[i].style.borderStyle = 'dashed';
        }
    }
}

function renderMegaPool(pool) {
    const heroesPool = document.getElementById('mega-heroes-pool');
    const petsPool = document.getElementById('mega-pets-pool');
    if (!heroesPool || !petsPool) return;

    heroesPool.innerHTML = '';
    petsPool.innerHTML = '';

    const isMyTurn = (megaTurn === activeMatchRole);
    const myHeroesCount = (megaMyTeamState.heroes || []).length;
    const myPetsCount = (megaMyTeamState.pets || []).length;

    (pool.heroes || []).forEach(h => {
        const div = document.createElement('div');
        div.className = 'pool-item';
        div.innerHTML = `<img src="heroes/${h}" title="${cleanItemName(h)}">`;

        if (isMyTurn && myHeroesCount < 5) {
            div.onclick = () => selectMegaChoice('hero', h);
        } else {
            div.classList.add('disabled');
        }

        heroesPool.appendChild(div);
    });

    (pool.pets || []).forEach(p => {
        const div = document.createElement('div');
        div.className = 'pool-item';
        div.innerHTML = `<img src="pets/${p}" title="${cleanItemName(p)}">`;

        if (isMyTurn && myPetsCount < 1) {
            div.onclick = () => selectMegaChoice('pet', p);
        } else {
            div.classList.add('disabled');
        }

        petsPool.appendChild(div);
    });
}

function selectMegaChoice(type, item) {
    if (megaTurn !== activeMatchRole) return;
    playBeep(587.33, 0.15, 'sine');
    socket.emit('tourMakeMegaChoice', {
        tourId: currentTourId,
        matchId: activeMatchId,
        type,
        item
    });
}

function animateMegaCard(item, container, previousTeam) {
    if (!container) return;
    const poolItems = Array.from(document.querySelectorAll('#mega-draft-container .pool-item img'));
    const poolImg = poolItems.find(img => img.src && img.src.includes(item));
    if (!poolImg) return;

    const prevHeroes = (previousTeam && previousTeam.heroes) ? previousTeam.heroes : [];
    const prevPets = (previousTeam && previousTeam.pets) ? previousTeam.pets : [];
    const slotIndex = prevHeroes.length + prevPets.length;
    const slots = container.querySelectorAll('.slot');
    const targetSlot = slots[slotIndex];
    if (!targetSlot) return;

    const startRect = poolImg.getBoundingClientRect();
    const targetRect = targetSlot.getBoundingClientRect();

    const clone = poolImg.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = startRect.left + 'px';
    clone.style.top = startRect.top + 'px';
    clone.style.width = startRect.width + 'px';
    clone.style.height = startRect.height + 'px';
    clone.style.zIndex = '1000';
    clone.style.transition = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    clone.style.borderRadius = '12px';
    clone.style.boxShadow = '0 10px 25px rgba(96,165,250,0.8)';
    clone.style.pointerEvents = 'none';

    document.body.appendChild(clone);
    void clone.offsetWidth; // force reflow

    clone.style.left = targetRect.left + 'px';
    clone.style.top = targetRect.top + 'px';
    clone.style.width = targetRect.width + 'px';
    clone.style.height = targetRect.height + 'px';
    clone.style.opacity = '0.5';

    setTimeout(() => {
        if (document.body.contains(clone)) {
            document.body.removeChild(clone);
        }
    }, 500);
}

// 4. PATRON SELECTION PHASE (40s LIMIT)
socket.on('tourMatchPatronPhase', (data) => {
    if (normalDraftTimer) { clearInterval(normalDraftTimer); normalDraftTimer = null; }
    if (tripleDraftTimer) { clearInterval(tripleDraftTimer); tripleDraftTimer = null; }
    if (megaLocalTimer) { clearInterval(megaLocalTimer); megaLocalTimer = null; }

    showScreen('screen-draft-arena');
    document.getElementById('arena-match-info').textContent = `${currentTourState?.currentRoundName || 'Match'} • Patron Pet Selection`;
    document.getElementById('arena-mode-badge').textContent = '40s Pet Patron Phase';

    document.getElementById('normal-draft-container').style.display = 'none';
    document.getElementById('triple-draft-container').style.display = 'none';
    document.getElementById('mega-draft-container').style.display = 'none';
    document.getElementById('arena-draft-completed-box').style.display = 'none';

    const patronScreen = document.getElementById('patron-screen');
    if (patronScreen) patronScreen.style.display = 'block';

    if (window.PatronSelector && typeof window.PatronSelector.cleanup === 'function') {
        window.PatronSelector.cleanup();
    }

    const heroes = (data && data.yourTeam && data.yourTeam.heroes) ? data.yourTeam.heroes : [];
    const tId = (data && data.tourId) ? data.tourId : currentTourId;
    const mId = (data && data.matchId) ? data.matchId : activeMatchId;

    PatronSelector.start({
        containerElement: patronScreen,
        heroes: heroes,
        timeLimit: (data && data.timeLimit) ? data.timeLimit : 40,
        onSubmit: (patrons) => {
            socket.emit('submitTourPatrons', {
                tourId: tId,
                matchId: mId,
                patrons: patrons || {}
            });
            if (patronScreen) patronScreen.style.display = 'none';
            const completeBox = document.getElementById('arena-draft-completed-box');
            if (completeBox) {
                completeBox.style.display = 'block';
                const showcase = document.getElementById('arena-completed-decks');
                if (showcase) {
                    showcase.innerHTML = `
                        <div style="padding: 25px; text-align: center;">
                            <div class="drafting-spinner-sm" style="margin: 0 auto 15px auto;"></div>
                            <h3 style="color: #aef649; font-size: 1.2rem; margin-bottom: 8px;">Patrons Submitted!</h3>
                            <p style="color: #9ca3af; font-size: 0.95rem;">Waiting for opponent to finalize their patron selections...</p>
                        </div>
                    `;
                }
            }
        }
    });
});

// MATCH DRAFT COMPLETE
function showMatchDraftCompleted(yourTeam, opponentTeam) {
    if (normalDraftTimer) { clearInterval(normalDraftTimer); normalDraftTimer = null; }
    if (tripleDraftTimer) { clearInterval(tripleDraftTimer); tripleDraftTimer = null; }
    if (megaLocalTimer) { clearInterval(megaLocalTimer); megaLocalTimer = null; }

    if (window.PatronSelector && typeof window.PatronSelector.cleanup === 'function') {
        window.PatronSelector.cleanup();
    }
    const patronScreen = document.getElementById('patron-screen');
    if (patronScreen) patronScreen.style.display = 'none';

    playFanfare();
    document.getElementById('normal-draft-container').style.display = 'none';
    document.getElementById('triple-draft-container').style.display = 'none';
    document.getElementById('mega-draft-container').style.display = 'none';
    const completeBox = document.getElementById('arena-draft-completed-box');
    completeBox.style.display = 'block';

    const showcase = document.getElementById('arena-completed-decks');
    showcase.innerHTML = `
        <div class="results-container" style="display: flex; gap: 30px; justify-content: center; flex-wrap: wrap; margin-top: 15px;">
            <div class="team-result" style="text-align: center; min-width: 320px; max-width: 440px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px;">
                    <h3 style="color: #aef649; margin: 0; font-size: 1.3rem;">Your Team</h3>
                </div>
                <div id="tour-my-result-grid" class="team-grid" style="justify-content: center; display: flex; flex-wrap: wrap; gap: 10px;"></div>
            </div>
            <div class="team-result" style="text-align: center; min-width: 320px; max-width: 440px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 15px;">
                    <h3 style="color: #ef4444; margin: 0; font-size: 1.3rem;">Opponent's Team</h3>
                </div>
                <div id="tour-opp-result-grid" class="team-grid" style="justify-content: center; display: flex; flex-wrap: wrap; gap: 10px;"></div>
            </div>
        </div>
    `;

    renderTeamResultsWithPatrons(yourTeam, document.getElementById('tour-my-result-grid'), '#3b82f6');
    renderTeamResultsWithPatrons(opponentTeam, document.getElementById('tour-opp-result-grid'), '#ef4444');
}

socket.on('tourMatchDraftComplete', ({ yourTeam, opponentTeam }) => {
    showMatchDraftCompleted(yourTeam, opponentTeam);
});

socket.on('tourMatchTripleDraftComplete', ({ yourTeam, opponentTeam }) => {
    showMatchDraftCompleted(yourTeam, opponentTeam);
});

socket.on('tourMegaDraftComplete', ({ yourTeam, opponentTeam }) => {
    showMatchDraftCompleted(yourTeam, opponentTeam);
});

// ============================================================
// SCREEN 5: HOST COMBAT TRAINING COMMAND CENTER
// ============================================================

function renderHostCommandCenter(state, playerStatus = {}) {
    if (!state || !state.rounds) return;
    const curRound = state.rounds[state.currentRoundIndex];
    if (!curRound) return;

    // Header updates: Role badge pill & subtitle text
    const badgePill = document.getElementById('command-badge-pill');
    const subtitleText = document.getElementById('command-subtitle-text');
    const playerNotice = document.getElementById('player-combat-notice');

    const myPlayer = (state.players || []).find(p => p.username === currentUser);
    const userIsEliminated = !!(myPlayer && myPlayer.eliminated);
    const isDefeated = !!(playerStatus.defeated || userIsEliminated);
    const isVictor = !!(playerStatus.victory && !userIsEliminated);

    const roundTitleEl = document.getElementById('command-round-title');
    if (roundTitleEl) {
        roundTitleEl.textContent = `${curRound.roundName || 'Round'} Battles • Combat Center`;
    }

    if (isHost) {
        if (badgePill) badgePill.textContent = 'Host Combat Center';
        if (subtitleText) {
            subtitleText.innerHTML = `Inspect each match group's drafted 5 Heroes and 1 Pet. Run the battle in original <strong>Hero Wars - Combat Training</strong>, then declare the winner below to advance them to the next round!`;
        }
        if (playerNotice) {
            playerNotice.style.display = 'none';
            playerNotice.innerHTML = '';
        }
    } else {
        if (badgePill) badgePill.textContent = 'Tournament Arena • Spectator';
        if (subtitleText) {
            subtitleText.innerHTML = `Live overview of all active tournament matches in this round. Inspect player formations, pet patrons, and track battle progress live!`;
        }

        if (isDefeated) {
            if (playerNotice) {
                playerNotice.style.display = 'block';
                playerNotice.innerHTML = `
                    <div class="player-defeated-banner">
                        <div class="defeated-banner-icon">💀</div>
                        <div class="defeated-banner-content">
                            <div class="defeated-banner-title">You have been defeated.</div>
                            <div class="defeated-banner-desc">You fought valiantly! You are now in spectator mode. Follow the remaining tournament battles and track the bracket live below!</div>
                        </div>
                    </div>
                `;
            }
        } else if (isVictor) {
            if (playerNotice) {
                playerNotice.style.display = 'block';
                playerNotice.innerHTML = `
                    <div class="player-victory-banner">
                        <div class="victory-banner-icon">🏆</div>
                        <div class="victory-banner-content">
                            <div class="victory-banner-title">VICTORY! Match Won!</div>
                            <div class="victory-banner-desc">Congratulations! You advanced to the next round. Sit back and watch other matches while the host prepares the next round.</div>
                        </div>
                    </div>
                `;
            }
        } else {
            if (playerNotice) {
                playerNotice.style.display = 'none';
                playerNotice.innerHTML = '';
            }
        }
    }

    const container = document.getElementById('command-matches-list');
    container.innerHTML = '';

    curRound.matches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'match-group-card ' + (match.status === 'completed' ? 'completed' : '');

        const isCompleted = (match.status === 'completed' && match.winner);
        const isDecksReady = !isCompleted && match.p1Deck && match.p2Deck;
        const isPatronSelection = !isCompleted && match.draftStatus === 'patron_selection';
        const isDrafting = !isCompleted && !isDecksReady && !isPatronSelection;

        const statusClass = isCompleted ? 'done' : (isDecksReady ? 'ready' : (isPatronSelection ? 'patron' : 'drafting'));
        const statusText = isCompleted ? `Winner: ${match.winner}` : (isDecksReady ? 'Decks Ready For Combat' : (isPatronSelection ? 'Patron Pet Selection (40s)' : 'Drafting In Progress'));

        card.innerHTML = `
            <div class="match-group-header">
                <div class="match-group-tag">
                    <span>Match #${match.matchNumber}</span>
                    <span class="match-status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>

            <div class="combat-duel-container">
                <!-- Player 1 Box -->
                <div class="duel-player-box ${match.winner === match.p1?.username ? 'winner-box' : ''}">
                    <div class="duel-player-header">
                        <img src="avatars/${match.p1?.avatar || 'avatar1.jpg'}" class="duel-avatar">
                        <div style="text-align: left;">
                            <div class="duel-username">
                                ${match.p1 ? match.p1.username : 'BYE'}
                                ${match.p1?.platform ? `<span class="platform-badge ${match.p1.platform === 'FB' ? 'fb' : 'web'}">${match.p1.platform}</span>` : ''}
                                ${match.winner === match.p1?.username ? '👑' : ''}
                            </div>
                            ${match.p1?.playerId ? `
                                <div class="player-id-tag" onclick="copyPlayerId('${match.p1.playerId}')" title="Click to copy Player ID">
                                     ID: ${match.p1.playerId} 📋
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="duel-deck-row">
                        ${renderDeckImages(match.p1Deck)}
                    </div>
                    ${match.p1Deck ? `<button class="tour-btn-sm" onclick="copyTeamFormation('${match.p1.username}', '${escapeJson(match.p1Deck)}', '${match.p1.playerId || ''}', '${match.p1.platform || 'WEB'}')">📋 Copy P1 Team</button>` : ''}
                </div>

                <!-- VS Divider -->
                <div class="duel-vs-divider">VS</div>

                <!-- Player 2 Box -->
                <div class="duel-player-box ${match.winner === match.p2?.username ? 'winner-box' : ''}">
                    <div class="duel-player-header">
                        <img src="avatars/${match.p2?.avatar || 'avatar2.jpg'}" class="duel-avatar">
                        <div style="text-align: left;">
                            <div class="duel-username">
                                ${match.p2 ? match.p2.username : 'BYE'}
                                ${match.p2?.platform ? `<span class="platform-badge ${match.p2.platform === 'FB' ? 'fb' : 'web'}">${match.p2.platform}</span>` : ''}
                                ${match.winner === match.p2?.username ? '👑' : ''}
                            </div>
                            ${match.p2?.playerId ? `
                                <div class="player-id-tag" onclick="copyPlayerId('${match.p2.playerId}')" title="Click to copy Player ID">
                                     ID: ${match.p2.playerId} 📋
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="duel-deck-row">
                        ${renderDeckImages(match.p2Deck)}
                    </div>
                    ${match.p2Deck ? `<button class="tour-btn-sm" onclick="copyTeamFormation('${match.p2.username}', '${escapeJson(match.p2Deck)}', '${match.p2.playerId || ''}', '${match.p2.platform || 'WEB'}')">📋 Copy P2 Team</button>` : ''}
                </div>
            </div>

            <!-- Action Area: Only unlock winner buttons when both decks are completed! -->
            ${isDrafting ? `
                <div class="combat-drafting-notice">
                    <div class="drafting-spinner-sm"></div>
                    <div class="drafting-notice-content">
                        <div class="drafting-notice-title">⏳ Drafting In Progress...</div>
                        <div class="drafting-notice-desc">Players are selecting heroes and pets. Winner selection will unlock once both teams are locked!</div>
                    </div>
                </div>
            ` : ''}

            ${isPatronSelection ? `
                <div class="combat-drafting-notice" style="background: rgba(168, 85, 247, 0.1); border-color: rgba(168, 85, 247, 0.5); color: #d8b4fe;">
                    <div class="drafting-spinner-sm" style="border-top-color: #c084fc;"></div>
                    <div class="drafting-notice-content">
                        <div class="drafting-notice-title" style="color: #e9d5ff;">🐾 Patron Pet Selection (40s)</div>
                        <div class="drafting-notice-desc">Players are assigning patron pets to their drafted heroes. Winner selection will unlock once both teams submit!</div>
                    </div>
                </div>
            ` : ''}

            ${isDecksReady ? `
                ${isHost ? `
                    <div class="combat-ready-notice">
                        ⚔️ Both formations locked! Copy codes above to run Hero Wars Combat Training, then declare the winner:
                    </div>
                    <div class="combat-actions-row">
                        ${match.p1 ? `
                            <button class="btn-winner-select" 
                                onclick="declareMatchWinner('${match.id}', '${match.p1.username}')">
                                👑 Declare Winner: ${match.p1.username}
                            </button>
                        ` : ''}
                        ${match.p2 ? `
                            <button class="btn-winner-select" 
                                onclick="declareMatchWinner('${match.id}', '${match.p2.username}')">
                                👑 Declare Winner: ${match.p2.username}
                            </button>
                        ` : ''}
                    </div>
                ` : `
                    <div class="combat-ready-notice spectator">
                        ⚔️ Both formations locked! Host is currently conducting this battle in Hero Wars Combat Training. The result will appear automatically!
                    </div>
                `}
            ` : ''}

            ${isCompleted ? `
                <div style="display: flex; justify-content: center; margin-top: 15px;">
                    <div class="combat-winner-banner">
                        <span>🏆 Match Winner: <strong>${match.winner}</strong></span>
                    </div>
                </div>
            ` : ''}
        `;

        container.appendChild(card);
    });

    // Check if all matches in round are done - only show controls to Host
    const advanceBox = document.getElementById('host-round-advance-box');
    if (state.status === 'round_completed') {
        if (isHost) {
            advanceBox.style.display = 'block';
            document.getElementById('advance-sub-text').textContent = `All battles for ${curRound.roundName} have concluded! Select game mode and proceed.`;
        } else {
            advanceBox.style.display = 'none';
        }
    } else {
        advanceBox.style.display = 'none';
    }
}

function renderDeckImages(deck) {
    if (!deck) {
        return '<span style="color: #9ca3af; font-size: 0.85rem;">Drafting in progress...</span>';
    }
    const heroCards = (deck.heroes || []).map(h => {
        const patron = (deck.patrons && deck.patrons[h]) ? deck.patrons[h] : null;
        return `
            <div class="hero-patron-badge-wrap" style="position: relative; display: inline-block;">
                <img src="heroes/${h}" class="hero-mini-card" title="${cleanItemName(h)}">
                ${patron ? `<img src="patrons/${patron}" class="patron-mini-badge" title="Patron: ${cleanItemName(patron)}" style="width: 22px; height: 22px; bottom: -3px; right: -3px;">` : ''}
            </div>
        `;
    }).join('');
    const petCard = deck.pet ? `
        <img src="pets/${deck.pet}" class="hero-mini-card pet-mini-card" title="${cleanItemName(deck.pet)} (Team Pet)">
    ` : '';
    return heroCards + petCard;
}

function escapeJson(obj) {
    return encodeURIComponent(JSON.stringify(obj));
}

window.copyTeamFormation = function(username, encodedDeck, playerId, platform) {
    try {
        const deck = JSON.parse(decodeURIComponent(encodedDeck));
        const heroList = (deck.heroes || []).map(h => {
            const hName = cleanItemName(h);
            const pName = (deck.patrons && deck.patrons[h]) ? cleanItemName(deck.patrons[h]) : null;
            return pName ? `${hName} (Patron: ${pName})` : hName;
        }).join(', ');
        const pet = deck.pet ? cleanItemName(deck.pet) : 'None';
        const idInfo = playerId ? ` (ID: ${playerId}, Platform: ${platform || 'WEB'})` : '';
        const text = `${username}${idInfo}\nHeroes & Patrons: ${heroList}\nTeam Pet: ${pet}`;
        navigator.clipboard.writeText(text);
        alert(`Copied team for ${username} to clipboard!\n\n${text}`);
    } catch(e) {}
};

window.copyPlayerId = function(id) {
    if (!id) return;
    navigator.clipboard.writeText(id);
    alert('Copied Hero Wars Player ID: ' + id);
};

window.declareMatchWinner = function(matchId, winnerUsername) {
    if (!isHost) return;
    if (!confirm(`Confirm ${winnerUsername} as the winner of this match?`)) return;
    playFanfare();
    socket.emit('declareWinner', {
        tourId: currentTourId,
        matchId,
        winnerUsername,
        hostKey
    });
};

// Host Round Advance Mode Buttons
const nextModeBtns = document.querySelectorAll('.next-mode-buttons .next-mode-btn');
nextModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        nextModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedNextMode = btn.dataset.mode;
    });
});

document.getElementById('btn-start-next-round').addEventListener('click', () => {
    if (!isHost || !currentTourId) return;
    socket.emit('startNextRound', {
        tourId: currentTourId,
        hostKey,
        nextGameMode: selectedNextMode
    });
});

document.getElementById('btn-toggle-host-bracket').addEventListener('click', () => {
    showScreen('screen-lobby');
    document.querySelector('.tour-tab[data-tab="bracket"]').click();
    const navBar = document.getElementById('bracket-nav-bar');
    if (navBar) navBar.style.display = 'block';
});

const btnBackToCombatCenter = document.getElementById('btn-back-to-combat-center');
if (btnBackToCombatCenter) {
    btnBackToCombatCenter.addEventListener('click', () => {
        showScreen('screen-host-command');
    });
}

// ============================================================
// INTERACTIVE BRACKET RENDERING
// ============================================================

function renderBracket(state) {
    const wrapper = document.getElementById('bracket-view');
    wrapper.innerHTML = '';

    if (!state.rounds || state.rounds.length === 0) {
        wrapper.innerHTML = '<div style="color: #9ca3af; text-align: center; width: 100%; padding: 40px;">Bracket will generate once tournament starts!</div>';
        return;
    }

    state.rounds.forEach(round => {
        const col = document.createElement('div');
        col.className = 'bracket-column';

        const title = document.createElement('div');
        title.className = 'bracket-round-title';
        title.textContent = round.roundName;
        col.appendChild(title);

        const matchesContainer = document.createElement('div');
        matchesContainer.className = 'bracket-matches';

        round.matches.forEach(m => {
            const node = document.createElement('div');
            node.className = 'bracket-match-node';

            const p1IsWinner = m.winner && m.p1 && m.winner === m.p1.username;
            const p2IsWinner = m.winner && m.p2 && m.winner === m.p2.username;

            node.innerHTML = `
                <div class="bracket-participant ${p1IsWinner ? 'winner' : ''}">
                    <div class="bracket-participant-name">
                        <img src="avatars/${m.p1?.avatar || 'avatar1.jpg'}" class="bracket-avatar">
                        <span>${m.p1 ? m.p1.username : 'BYE'}</span>
                    </div>
                    <span>${p1IsWinner ? '🏆' : ''}</span>
                </div>
                <div class="bracket-participant ${p2IsWinner ? 'winner' : ''}">
                    <div class="bracket-participant-name">
                        <img src="avatars/${m.p2?.avatar || 'avatar2.jpg'}" class="bracket-avatar">
                        <span>${m.p2 ? m.p2.username : 'BYE'}</span>
                    </div>
                    <span>${p2IsWinner ? '🏆' : ''}</span>
                </div>
            `;
            matchesContainer.appendChild(node);
        });

        col.appendChild(matchesContainer);
        wrapper.appendChild(col);
    });

    if (state.champion) {
        const champCol = document.createElement('div');
        champCol.className = 'bracket-column';
        const champPlatform = state.champion.platform || 'WEB';
        champCol.innerHTML = `
            <div class="bracket-round-title" style="color: var(--tour-gold);">Champion 👑</div>
            <div class="bracket-matches">
                <div class="bracket-match-node" style="border: 2px solid var(--tour-gold); background: rgba(245, 158, 11, 0.15); padding: 14px; text-align: center; border-radius: 12px; box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);">
                    <img src="avatars/${state.champion.avatar || 'avatar1.jpg'}" style="width: 46px; height: 46px; border-radius: 50%; border: 2px solid var(--tour-gold); margin: 0 auto 6px auto; display: block; object-fit: cover;">
                    <div style="font-weight: 900; color: #fff; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span>${state.champion.username}</span>
                        <span class="platform-badge ${champPlatform === 'FB' ? 'fb' : 'web'}" style="font-size: 0.65rem;">${champPlatform}</span>
                    </div>
                    ${state.champion.playerId ? `
                        <div class="player-id-tag" onclick="copyPlayerId('${state.champion.playerId}')" style="margin-top: 6px;" title="Click to copy winner ID">
                            ID: ${state.champion.playerId} 📋
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        wrapper.appendChild(champCol);
    }
}

// ============================================================
// SCREEN 6: CHAMPION VICTORY CELEBRATION
// ============================================================

function renderChampionScreen(champion, runnerUp, rewards) {
    if (!champion) return;
    showScreen('screen-champion');

    document.getElementById('champ-username').textContent = champion.username;
    document.getElementById('champ-avatar').src = 'avatars/' + (champion.avatar || 'avatar1.jpg');

    // Winner In-Game Player ID & Platform
    const champPlayerId = champion.playerId || '';
    const champPlatform = champion.platform || 'WEB';
    const champIdEl = document.getElementById('champ-player-id');
    const champPlatformBadge = document.getElementById('champ-platform-badge');
    const btnCopyChampId = document.getElementById('btn-copy-champ-id');

    if (champPlayerId) {
        champIdEl.textContent = champPlayerId;
        champPlatformBadge.textContent = champPlatform;
        champPlatformBadge.className = `platform-badge ${champPlatform === 'FB' ? 'fb' : 'web'}`;
        btnCopyChampId.style.display = 'inline-block';
        btnCopyChampId.onclick = () => {
            navigator.clipboard.writeText(champPlayerId);
            btnCopyChampId.textContent = 'Copied! ✅';
            setTimeout(() => { btnCopyChampId.textContent = '📋 Copy Winner ID'; }, 2000);
        };
    } else {
        champIdEl.textContent = 'Not Provided';
        champPlatformBadge.textContent = champPlatform;
        btnCopyChampId.style.display = 'none';
    }

    // Runner-Up Player ID & Platform
    const runnerUsernameEl = document.getElementById('runner-up-username');
    const runnerIdBox = document.getElementById('runner-up-id-box');
    const runnerPlatformBadge = document.getElementById('runner-platform-badge');
    const runnerPlayerIdTag = document.getElementById('runner-player-id-tag');

    if (runnerUp && runnerUp.username && runnerUp.username !== 'None') {
        runnerUsernameEl.textContent = runnerUp.username;
        if (runnerUp.playerId) {
            runnerIdBox.style.display = 'inline-flex';
            runnerPlatformBadge.textContent = runnerUp.platform || 'WEB';
            runnerPlatformBadge.className = `platform-badge ${runnerUp.platform === 'FB' ? 'fb' : 'web'}`;
            runnerPlayerIdTag.textContent = `ID: ${runnerUp.playerId} 📋`;
            runnerPlayerIdTag.onclick = () => {
                navigator.clipboard.writeText(runnerUp.playerId);
                runnerPlayerIdTag.textContent = 'Copied! ✅';
                setTimeout(() => { runnerPlayerIdTag.textContent = `ID: ${runnerUp.playerId} 📋`; }, 2000);
            };
        } else {
            runnerIdBox.style.display = 'none';
        }
    } else {
        runnerUsernameEl.textContent = 'None';
        runnerIdBox.style.display = 'none';
    }

    const rewardsBox = document.getElementById('champ-rewards-box');
    if (rewards) {
        document.getElementById('champ-rewards-text').textContent = rewards;
        rewardsBox.style.display = 'block';
    } else {
        rewardsBox.style.display = 'none';
    }

    createConfetti();
}

socket.on('tourFinished', ({ champion, runnerUp, rewards }) => {
    playFanfare();
    renderChampionScreen(champion, runnerUp, rewards);
});

document.getElementById('btn-champ-view-bracket').addEventListener('click', () => {
    showScreen('screen-lobby');
    document.querySelector('.tour-tab[data-tab="bracket"]').click();
});

function createConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    const colors = ['#aef649', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#ffffff'];

    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.style.position = 'fixed';
        piece.style.top = '-20px';
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.width = Math.random() * 10 + 6 + 'px';
        piece.style.height = Math.random() * 14 + 8 + 'px';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.opacity = Math.random() * 0.8 + 0.2;
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        piece.style.pointerEvents = 'none';
        piece.style.zIndex = '9998';
        piece.style.transition = `top ${Math.random() * 3 + 2}s ease-in, transform 3s linear`;

        container.appendChild(piece);

        setTimeout(() => {
            piece.style.top = '105vh';
            piece.style.transform = `rotate(${Math.random() * 720}deg)`;
        }, 50);
    }
}

// Clean Hero / Pet Filename
function cleanItemName(filename) {
    if (!filename) return '';
    return filename
        .replace(/\.(png|webp|jpg)$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}
