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
const draftWaiting = document.getElementById('draft-waiting');
const draftCards = document.querySelector('.draft-cards-container');

// State
let currentChoices = [];
let currentOpponentChoices = [];
let currentTypes = [];
let choiceIndex = 0;
let myRoomId = null;
let timeLeft = 30;
let timerInterval;

// Lobby Actions
document.getElementById('btn-random').addEventListener('click', () => {
    lobbyStatus.textContent = "Joining random queue...";
    socket.emit('joinTripleRandom', user);
});

document.getElementById('btn-create').addEventListener('click', () => {
    lobbyStatus.textContent = "Creating room...";
    socket.emit('createTripleCustom', user);
});

document.getElementById('btn-join').addEventListener('click', () => {
    const roomId = document.getElementById('room-input').value.trim().toUpperCase();
    if (roomId) {
        lobbyStatus.textContent = "Joining room " + roomId + "...";
        socket.emit('joinTripleCustom', { roomId, username: user });
        myRoomId = roomId;
    }
});

// Socket Events
socket.on('waiting', (msg) => {
    lobbyStatus.textContent = msg;
});

socket.on('roomCreated', (roomId) => {
    lobbyStatus.textContent = `Room created! ID: ${roomId}. Waiting for opponent...`;
    myRoomId = roomId;
});

socket.on('errorMsg', (msg) => {
    lobbyStatus.textContent = msg;
});

socket.on('tripleGameStarted', (data) => {
    lobbyScreen.style.display = 'none';
    draftScreen.style.display = 'block';
    
    if(!myRoomId) myRoomId = 'random'; // Random queue doesn't send roomId to client in this basic implementation, let's fix server to send it or just rely on socket connection. Actually, we need roomId to emit makeChoice! 
    // Wait, the server uses rooms[roomId], but it knows the socket.id. But I passed roomId in `makeChoice`.
    // Let me update the server to send the roomId in `gameStarted`.
    
    myRoomId = data.roomId || myRoomId; 
    
    currentChoices = data.choices;
    currentOpponentChoices = data.opponentChoices;
    currentTypes = data.type;
    choiceIndex = 0;
    
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
    document.querySelectorAll('.draft-slot').forEach(slot => {
        slot.className = 'draft-slot';
        slot.innerHTML = '?';
    });
    
    renderChoice();
    
    timeLeft = 30;
    const updateDraftTimerUI = () => {
        document.getElementById('timer-text').textContent = timeLeft + "s";
        const pct = (timeLeft / 30) * 100;
        const timerBar = document.getElementById('timer-bar');
        timerBar.style.width = pct + "%";
        timerBar.className = "timer-bar";
        if (timeLeft <= 5) {
            timerBar.classList.add("danger");
        } else if (timeLeft <= 10) {
            timerBar.classList.add("warning");
        }
    };
    
    updateDraftTimerUI();
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-text').textContent = "Time's up!";
            document.getElementById('timer-bar').style.width = "0%";
            document.querySelectorAll('.select-btn').forEach(btn => btn.disabled = true);
            
            // Automatically pick the first option for any remaining choices
            while (choiceIndex < currentChoices.length) {
                window.selectCard(0, true);
            }
        } else {
            updateDraftTimerUI();
        }
    }, 1000);
});

function renderChoice() {
    if (choiceIndex >= currentChoices.length) {
        // Done with all choices
        draftCards.style.display = 'none';
        document.getElementById('opponent-cards-container').style.display = 'none';
        draftWaiting.style.display = 'block';
        document.getElementById('draft-title').textContent = "Waiting for Opponent";
        return;
    }
    
    const choicePair = currentChoices[choiceIndex];
    const type = currentTypes[choiceIndex];
    
    // Translation support
    let pickKey = "choose_hero";
    if (type === 'pet') pickKey = "choose_pet";
    let titleText = `Choose a <span style="color: #3b82f6">${type.toUpperCase()}</span>!`;
    if (window.translations) {
        const lang = localStorage.getItem('selectedLang') || 'EN';
        if (window.translations[lang] && window.translations[lang][pickKey]) {
            titleText = window.translations[lang][pickKey];
        }
    }
    
    document.getElementById('draft-title').innerHTML = titleText;
    
    const path = type === 'hero' ? 'heroes/' : 'pets/';
    document.getElementById('img-0').src = path + choicePair[0];
    document.getElementById('img-1').src = path + choicePair[1];
    document.getElementById('img-2').src = path + choicePair[2];
    
    if (currentOpponentChoices && currentOpponentChoices[choiceIndex]) {
        const oppChoicePair = currentOpponentChoices[choiceIndex];
        document.getElementById('opp-img-0').src = path + oppChoicePair[0];
        document.getElementById('opp-img-1').src = path + oppChoicePair[1];
        document.getElementById('opp-img-2').src = path + oppChoicePair[2];
        document.getElementById('opponent-cards-container').style.display = 'flex';
    } else {
        document.getElementById('opponent-cards-container').style.display = 'none';
    }
}

window.selectCard = function(index, isAuto = false) {
    const choicePair = currentChoices[choiceIndex];
    const picked = choicePair[index];
    
    socket.emit('makeTripleChoice', { roomId: myRoomId, index: choiceIndex, picked });
    
    const path = currentTypes[choiceIndex] === 'hero' ? 'heroes/' : 'pets/';
    const myPickSlot = Array.from(document.querySelectorAll('#my-progress .draft-slot')).find(s => s.innerHTML === '?');
    
    const selectedImg = document.getElementById(`img-${index}`);
    
    if (myPickSlot && selectedImg && !isAuto) {
        animateToSlot(selectedImg, myPickSlot, path, picked, true);
    } else {
        if (myPickSlot) {
            myPickSlot.innerHTML = `<img src="${path}${picked}">`;
            myPickSlot.classList.add('filled');
        }
    }
    
    choiceIndex++;
    
    if (!isAuto) {
        document.querySelectorAll('.select-btn').forEach(btn => btn.disabled = true);
        setTimeout(() => {
            renderChoice();
            document.querySelectorAll('.select-btn').forEach(btn => btn.disabled = false);
        }, 500);
    } else {
        renderChoice();
    }
};

function animateToSlot(imgEl, slotEl, path, item, isPick) {
    const startRect = imgEl.getBoundingClientRect();
    const targetRect = slotEl.getBoundingClientRect();
    
    const clone = imgEl.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.left = startRect.left + 'px';
    clone.style.top = startRect.top + 'px';
    clone.style.width = startRect.width + 'px';
    clone.style.height = startRect.height + 'px';
    clone.style.zIndex = '1000';
    clone.style.transition = 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    clone.style.borderRadius = '8px';
    clone.style.boxShadow = isPick ? '0 10px 25px rgba(96,165,250,0.8)' : '0 10px 25px rgba(239,68,68,0.8)';
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
        slotEl.innerHTML = `<img src="${path}${item}">`;
        slotEl.classList.add('filled');
    }, 500);
}

socket.on('opponentSelected', () => {
    const oppPickSlot = Array.from(document.querySelectorAll('#opponent-progress .draft-slot')).find(s => s.innerHTML === '?' && !s.classList.contains('green'));
    if (oppPickSlot) {
        oppPickSlot.classList.add('green');
    }
});

socket.on('tripleDraftComplete', (data) => {
    if (timerInterval) clearInterval(timerInterval);
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
    
    // Render my team
    data.yourTeam.heroes.forEach(h => {
        myGrid.innerHTML += `<img src="heroes/${h}" title="${h.split('.')[0]}">`;
    });
    myGrid.innerHTML += `<img src="pets/${data.yourTeam.pet}" title="${data.yourTeam.pet.split('.')[0]}" style="border-color: #a855f7;">`;
    
    // Render opponent team
    data.opponentTeam.heroes.forEach(h => {
        oppGrid.innerHTML += `<img src="heroes/${h}" title="${h.split('.')[0]}">`;
    });
    oppGrid.innerHTML += `<img src="pets/${data.opponentTeam.pet}" title="${data.opponentTeam.pet.split('.')[0]}" style="border-color: #a855f7;">`;
});
