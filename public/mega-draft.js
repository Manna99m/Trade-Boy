const user = localStorage.getItem('user');
if (!user) {
    window.location.href = 'login.html';
}
document.getElementById('user-display').textContent = user;
const avatar = localStorage.getItem('avatar');
if (avatar) {
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
        avatarEl.src = 'avatars/' + avatar;
        avatarEl.style.display = 'block';
    }
}
document.getElementById('logout-btn').addEventListener('click', () => {
    if(confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('user');
        window.location.href = '/';
    }
});

const socket = io();

document.addEventListener('click', (e) => {
    const container = document.querySelector('.lang-menu-container');
    const menu = document.getElementById('lang-dropdown');
    if (container && menu && !container.contains(e.target)) {
        menu.style.display = 'none';
    }
});

function selectLanguage(element, langCode) {
    const btn = element.closest('.lang-menu-container').querySelector('.nav-icon-btn');
    btn.innerHTML = langCode + ' <span style="font-size: 1.2em; margin-top: -2px;">🌐</span>';
    const options = element.parentElement.querySelectorAll('.lang-option');
    options.forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    localStorage.setItem('selectedLang', langCode);
    element.parentElement.style.display = 'none';
}

const savedLang = localStorage.getItem('selectedLang');
if (savedLang) {
    const container = document.querySelector('.lang-menu-container');
    if (container) {
        const btn = container.querySelector('.nav-icon-btn');
        btn.innerHTML = savedLang + ' <span style="font-size: 1.2em; margin-top: -2px;">🌐</span>';
        const options = container.querySelectorAll('.lang-option');
        options.forEach(opt => {
            if (opt.textContent.startsWith(savedLang)) opt.classList.add('active');
            else opt.classList.remove('active');
        });
    }
}

// UI Elements
const lobbyScreen = document.getElementById('lobby-screen');
const draftScreen = document.getElementById('draft-screen');
const resultsScreen = document.getElementById('results-screen');
const lobbyStatus = document.getElementById('lobby-status');
const mySlotsContainer = document.getElementById('my-team');
const oppSlotsContainer = document.getElementById('opponent-team');
const heroesPool = document.getElementById('heroes-pool');
const petsPool = document.getElementById('pets-pool');
const turnIndicator = document.getElementById('turn-indicator');
const picksLeftEl = document.getElementById('picks-left');

// State
let myRoomId = null;
let myRole = null; // 'p1' or 'p2'
let poolState = { heroes: [], pets: [] };
let myTeam = { heroes: [], pets: [] };
let oppTeam = { heroes: [], pets: [] };
let currentTurn = '';
let picksLeftThisTurn = 0;
let localTimer = null;
let previousAllItems = [];
let previousMyTeam = { heroes: [], pets: [] };
let previousOppTeam = { heroes: [], pets: [] };

// Initialize empty slots
for (let i = 0; i < 6; i++) {
    mySlotsContainer.innerHTML += `<div class="slot">?</div>`;
    oppSlotsContainer.innerHTML += `<div class="slot">?</div>`;
}

// Lobby Actions
document.getElementById('btn-random').addEventListener('click', () => {
    lobbyStatus.textContent = "Joining random queue...";
    socket.emit('joinMegaRandom', user);
});

document.getElementById('btn-create').addEventListener('click', () => {
    lobbyStatus.textContent = "Creating custom room...";
    socket.emit('createMegaCustom', user);
});

document.getElementById('btn-join').addEventListener('click', () => {
    const roomId = document.getElementById('room-input').value.trim().toUpperCase();
    if (roomId) {
        lobbyStatus.textContent = "Joining room " + roomId + "...";
        socket.emit('joinMegaCustom', { user, roomId });
    }
});

// Socket Events
socket.on('waiting', (msg) => {
    lobbyStatus.textContent = msg;
});

socket.on('megaRoomCreated', (roomId) => {
    lobbyStatus.textContent = `Room created! ID: ${roomId}. Waiting for opponent...`;
    myRoomId = roomId;
});

socket.on('errorMsg', (msg) => {
    lobbyStatus.textContent = msg;
});

socket.on('megaGameStarted', (data) => {
    lobbyScreen.style.display = 'none';
    draftScreen.style.display = 'block';
    
    myRoomId = data.roomId;
    myRole = data.role;
    currentTurn = data.turn;
    picksLeftThisTurn = data.picksLeftThisTurn;
    
    document.getElementById('opponent-team-title').textContent = data.opponentName + "'s Team";
    if (data.opponentAvatar) {
        const oppAvatarEl = document.getElementById('opponent-team-avatar');
        if (oppAvatarEl) {
            oppAvatarEl.src = 'avatars/' + data.opponentAvatar;
            oppAvatarEl.style.display = 'block';
        }
    }
    
    document.getElementById('my-team-title').textContent = user + "'s Team";
    const myAvatarEl = document.getElementById('my-team-avatar');
    if (myAvatarEl && localStorage.getItem('avatar')) {
        myAvatarEl.src = 'avatars/' + localStorage.getItem('avatar');
        myAvatarEl.style.display = 'block';
    }
    
    updateDraftState(data.pool, {heroes:[], pets:[]}, {heroes:[], pets:[]}, currentTurn, picksLeftThisTurn, data.timeLimit);
});

socket.on('megaDraftUpdate', (data) => {
    const p1 = myRole === 'p1' ? data.p1 : data.p2;
    const p2 = myRole === 'p1' ? data.p2 : data.p1;
    
    updateDraftState(data.pool, p1, p2, data.turn, data.picksLeftThisTurn, data.timeLimit);
});

socket.on('megaDraftComplete', (data) => {
    draftScreen.style.display = 'none';
    resultsScreen.style.display = 'block';
    
    document.getElementById('my-final-title').textContent = document.getElementById('my-team-title').textContent;
    document.getElementById('opponent-final-title').textContent = document.getElementById('opponent-team-title').textContent;
    
    if (data.opponentAvatar) {
        document.getElementById('opponent-final-avatar').src = 'avatars/' + data.opponentAvatar;
        document.getElementById('opponent-final-avatar').style.display = 'block';
    }
    if (localStorage.getItem('avatar')) {
        document.getElementById('my-final-avatar').src = 'avatars/' + localStorage.getItem('avatar');
        document.getElementById('my-final-avatar').style.display = 'block';
    }
    
    const myGrid = document.getElementById('my-team-grid');
    const oppGrid = document.getElementById('opponent-team-grid');
    
    myGrid.innerHTML = '';
    oppGrid.innerHTML = '';
    
    data.yourTeam.heroes.forEach(h => {
        myGrid.innerHTML += `<img src="heroes/${h}" title="${h.split('.')[0]}">`;
    });
    data.yourTeam.pets.forEach(p => {
        myGrid.innerHTML += `<img src="pets/${p}" title="${p.split('.')[0]}" style="border-color: #a855f7;">`;
    });
    
    data.opponentTeam.heroes.forEach(h => {
        oppGrid.innerHTML += `<img src="heroes/${h}" title="${h.split('.')[0]}">`;
    });
    data.opponentTeam.pets.forEach(p => {
        oppGrid.innerHTML += `<img src="pets/${p}" title="${p.split('.')[0]}" style="border-color: #a855f7;">`;
    });
});

function updateDraftState(pool, p1Team, p2Team, turn, picksLeft, timeLimit) {
    const newMyAll = [...p1Team.heroes, ...p1Team.pets];
    const newOppAll = [...p2Team.heroes, ...p2Team.pets];
    
    const myAdded = newMyAll.filter(item => !previousAllItems.includes(item));
    const oppAdded = newOppAll.filter(item => !previousAllItems.includes(item));
    
    myAdded.forEach(item => animateCard(item, mySlotsContainer, previousMyTeam));
    oppAdded.forEach(item => animateCard(item, oppSlotsContainer, previousOppTeam));
    
    previousAllItems = [...newMyAll, ...newOppAll];
    previousMyTeam = p1Team;
    previousOppTeam = p2Team;
    
    poolState = pool;
    myTeam = p1Team;
    oppTeam = p2Team;
    currentTurn = turn;
    picksLeftThisTurn = picksLeft;
    
    const isMyTurn = currentTurn === myRole;
    
    if (isMyTurn) {
        turnIndicator.textContent = "Your Turn!";
        turnIndicator.style.color = "#fef08a";
        turnIndicator.className = "turn-active";
        picksLeftEl.textContent = `Picks left: ${picksLeftThisTurn}`;
        picksLeftEl.style.display = "block";
    } else {
        turnIndicator.textContent = "Opponent's Turn...";
        turnIndicator.style.color = "#ef4444";
        turnIndicator.className = "turn-opponent";
        picksLeftEl.style.display = "none";
    }
    
    const timerContainer = document.querySelector('.timer-container');
    const timerBar = document.querySelector('.timer-bar');
    const timerText = document.getElementById('timer-text');
    
    if (localTimer) clearInterval(localTimer);
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
        
        localTimer = setInterval(() => {
            timeLeft--;
            if (timeLeft < 0) {
                clearInterval(localTimer);
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
    
    renderSlots(mySlotsContainer, myTeam);
    renderSlots(oppSlotsContainer, oppTeam);
    renderPool(poolState);
}

function renderSlots(container, team) {
    const allItems = [...team.heroes, ...team.pets];
    const slots = container.querySelectorAll('.slot');
    
    for (let i = 0; i < 6; i++) {
        if (i < allItems.length) {
            const item = allItems[i];
            const path = team.heroes.includes(item) ? 'heroes/' : 'pets/';
            slots[i].innerHTML = `<img src="${path}${item}">`;
            slots[i].style.borderColor = team.heroes.includes(item) ? '#3b82f6' : '#a855f7';
        } else {
            slots[i].innerHTML = '?';
            slots[i].style.borderColor = '#666';
        }
    }
}

function renderPool(pool) {
    heroesPool.innerHTML = '';
    petsPool.innerHTML = '';
    
    const isMyTurn = currentTurn === myRole;
    
    pool.heroes.forEach(h => {
        const div = document.createElement('div');
        div.className = 'pool-item';
        div.innerHTML = `<img src="heroes/${h}">`;
        
        if (isMyTurn && myTeam.heroes.length < 5) {
            div.onclick = () => makeChoice('hero', h);
        } else {
            div.classList.add('disabled');
        }
        
        heroesPool.appendChild(div);
    });
    
    pool.pets.forEach(p => {
        const div = document.createElement('div');
        div.className = 'pool-item';
        div.innerHTML = `<img src="pets/${p}">`;
        
        if (isMyTurn && myTeam.pets.length < 1) {
            div.onclick = () => makeChoice('pet', p);
        } else {
            div.classList.add('disabled');
        }
        
        petsPool.appendChild(div);
    });
}

function makeChoice(type, item) {
    if (currentTurn !== myRole) return;
    
    socket.emit('makeMegaChoice', { roomId: myRoomId, type, item });
}

function animateCard(item, container, previousTeam) {
    const poolItems = Array.from(document.querySelectorAll('.pool-item img'));
    const poolImg = poolItems.find(img => img.src.includes(item));
    
    if (!poolImg) return;
    
    const slotIndex = previousTeam.heroes.length + previousTeam.pets.length;
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
        if(document.body.contains(clone)) {
            document.body.removeChild(clone);
        }
    }, 500);
}
