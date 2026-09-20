const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Initialize users.json if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
} else {
    // Assign random avatars to existing users without one
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    let modified = false;
    users.forEach(u => {
        if (!u.avatar) {
            u.avatar = `avatar${Math.floor(Math.random() * 10) + 1}.jpg`;
            modified = true;
        }
    });
    if (modified) fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post('/api/register', (req, res) => {
    const { username, password, avatar } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const assignedAvatar = avatar || `avatar${Math.floor(Math.random() * 10) + 1}.jpg`;
    users.push({ username, password, avatar: assignedAvatar });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.status(201).json({ message: 'User registered successfully', avatar: assignedAvatar });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        res.json({ message: 'Login successful', avatar: user.avatar });
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});

app.get('/api/user/:username', (req, res) => {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.find(u => u.username === req.params.username);
    if (user) {
        res.json({ username: user.username, avatar: user.avatar });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

app.put('/api/user/avatar', (req, res) => {
    const { username, avatar } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex !== -1) {
        users[userIndex].avatar = avatar;
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        res.json({ message: 'Avatar updated successfully' });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Draft Battle logic
const heroesDir = path.join(__dirname, 'public', 'heroes');
const petsDir = path.join(__dirname, 'public', 'pets');
let allHeroes = [];
let allPets = [];
if (fs.existsSync(heroesDir)) allHeroes = fs.readdirSync(heroesDir).filter(f => f.endsWith('.png') || f.endsWith('.webp'));
if (fs.existsSync(petsDir)) allPets = fs.readdirSync(petsDir).filter(f => f.endsWith('.png') || f.endsWith('.webp'));

let randomQueue = [];
let rooms = {};

let megaRandomQueue = [];
let megaRooms = {};

let tripleRandomQueue = [];
let tripleRooms = {};

function getUserAvatar(username) {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === username);
        return user ? user.avatar : null;
    } catch(e) { return null; }
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function checkDraftComplete(room) {
    if (room.status === 'completed') return;
    if (room.p1.results.picked.length === 3 && room.p2.results.picked.length === 3) {
        room.status = 'completed';
        if (room.timer) clearTimeout(room.timer);
        
        let p1Final, p2Final;
        
        if (room.p1.type[2] === 'pet') {
            p1Final = {
                heroes: [...room.p1.results.picked.slice(0, 2), ...room.p2.results.rejected.slice(0, 3)],
                pet: room.p1.results.picked[2]
            };
            p2Final = {
                heroes: [...room.p2.results.picked.slice(0, 3), ...room.p1.results.rejected.slice(0, 2)],
                pet: room.p1.results.rejected[2]
            };
        } else {
            p1Final = {
                heroes: [...room.p1.results.picked.slice(0, 3), ...room.p2.results.rejected.slice(0, 2)],
                pet: room.p2.results.rejected[2]
            };
            p2Final = {
                heroes: [...room.p2.results.picked.slice(0, 2), ...room.p1.results.rejected.slice(0, 3)],
                pet: room.p2.results.picked[2]
            };
        }
        
        const p1Avatar = getUserAvatar(room.p1.username);
        const p2Avatar = getUserAvatar(room.p2.username);
        
        io.to(room.p1.id).emit('draftComplete', { yourTeam: p1Final, opponentTeam: p2Final, p1Name: room.p1.username, p2Name: room.p2.username, opponentAvatar: p2Avatar });
        io.to(room.p2.id).emit('draftComplete', { yourTeam: p2Final, opponentTeam: p1Final, p1Name: room.p2.username, p2Name: room.p1.username, opponentAvatar: p1Avatar });
    }
}

function checkTripleDraftComplete(room) {
    if (room.status === 'completed') return;
    if (room.p1.results.picked.length === 6 && room.p2.results.picked.length === 6) {
        room.status = 'completed';
        if (room.timer) clearTimeout(room.timer);
        
        const p1Final = {
            heroes: room.p1.results.picked.slice(0, 5),
            pet: room.p1.results.picked[5]
        };
        const p2Final = {
            heroes: room.p2.results.picked.slice(0, 5),
            pet: room.p2.results.picked[5]
        };
        
        const p1Avatar = getUserAvatar(room.p1.username);
        const p2Avatar = getUserAvatar(room.p2.username);
        
        io.to(room.p1.id).emit('tripleDraftComplete', { yourTeam: p1Final, opponentTeam: p2Final, p1Name: room.p1.username, p2Name: room.p2.username, opponentAvatar: p2Avatar });
        io.to(room.p2.id).emit('tripleDraftComplete', { yourTeam: p2Final, opponentTeam: p1Final, p1Name: room.p2.username, p2Name: room.p1.username, opponentAvatar: p1Avatar });
    }
}

function startGame(roomId) {
    const room = rooms[roomId];
    room.status = 'drafting';
    
    const shuffledHeroes = shuffle([...allHeroes]);
    const shuffledPets = shuffle([...allPets]);
    
    const draftHeroes = shuffledHeroes.slice(0, 10);
    const draftPets = shuffledPets.slice(0, 2);
    
    const p1GetsPet = Math.random() < 0.5;
    
    if (p1GetsPet) {
        room.p1.choices = [
            [draftHeroes[0], draftHeroes[1]],
            [draftHeroes[2], draftHeroes[3]],
            [draftPets[0], draftPets[1]]
        ];
        room.p2.choices = [
            [draftHeroes[4], draftHeroes[5]],
            [draftHeroes[6], draftHeroes[7]],
            [draftHeroes[8], draftHeroes[9]]
        ];
        room.p1.type = ['hero', 'hero', 'pet'];
        room.p2.type = ['hero', 'hero', 'hero'];
    } else {
        room.p1.choices = [
            [draftHeroes[0], draftHeroes[1]],
            [draftHeroes[2], draftHeroes[3]],
            [draftHeroes[4], draftHeroes[5]]
        ];
        room.p2.choices = [
            [draftHeroes[6], draftHeroes[7]],
            [draftHeroes[8], draftHeroes[9]],
            [draftPets[0], draftPets[1]]
        ];
        room.p1.type = ['hero', 'hero', 'hero'];
        room.p2.type = ['hero', 'hero', 'pet'];
    }
    
    room.p1.results = { picked: [], rejected: [] };
    room.p2.results = { picked: [], rejected: [] };
    
    const p1Avatar = getUserAvatar(room.p1.username);
    const p2Avatar = getUserAvatar(room.p2.username);
    
    io.to(room.p1.id).emit('gameStarted', { roomId, role: 'p1', choices: room.p1.choices, type: room.p1.type, opponentName: room.p2.username, opponentAvatar: p2Avatar });
    io.to(room.p2.id).emit('gameStarted', { roomId, role: 'p2', choices: room.p2.choices, type: room.p2.type, opponentName: room.p1.username, opponentAvatar: p1Avatar });

    room.timer = setTimeout(() => {
        const players = [room.p1, room.p2];
        players.forEach(player => {
            while (player.results.picked.length < 3) {
                const idx = player.results.picked.length;
                const choicePair = player.choices[idx];
                player.results.picked.push(choicePair[0]);
                player.results.rejected.push(choicePair[1]);
            }
        });
        checkDraftComplete(room);
    }, 30000);
}

function startTripleGame(roomId) {
    const room = tripleRooms[roomId];
    room.status = 'drafting';
    
    const shuffledHeroes = shuffle([...allHeroes]);
    const shuffledPets = shuffle([...allPets]);
    
    const draftHeroes = shuffledHeroes.slice(0, 30);
    const draftPets = shuffledPets.slice(0, 6);
    
    room.p1.choices = [
        [draftHeroes[0], draftHeroes[1], draftHeroes[2]],
        [draftHeroes[3], draftHeroes[4], draftHeroes[5]],
        [draftHeroes[6], draftHeroes[7], draftHeroes[8]],
        [draftHeroes[9], draftHeroes[10], draftHeroes[11]],
        [draftHeroes[12], draftHeroes[13], draftHeroes[14]],
        [draftPets[0], draftPets[1], draftPets[2]]
    ];
    room.p2.choices = [
        [draftHeroes[15], draftHeroes[16], draftHeroes[17]],
        [draftHeroes[18], draftHeroes[19], draftHeroes[20]],
        [draftHeroes[21], draftHeroes[22], draftHeroes[23]],
        [draftHeroes[24], draftHeroes[25], draftHeroes[26]],
        [draftHeroes[27], draftHeroes[28], draftHeroes[29]],
        [draftPets[3], draftPets[4], draftPets[5]]
    ];
    room.p1.type = ['hero', 'hero', 'hero', 'hero', 'hero', 'pet'];
    room.p2.type = ['hero', 'hero', 'hero', 'hero', 'hero', 'pet'];
    
    room.p1.results = { picked: [] };
    room.p2.results = { picked: [] };
    
    const p1Avatar = getUserAvatar(room.p1.username);
    const p2Avatar = getUserAvatar(room.p2.username);
    
    io.to(room.p1.id).emit('tripleGameStarted', { roomId, role: 'p1', choices: room.p1.choices, opponentChoices: room.p2.choices, type: room.p1.type, opponentName: room.p2.username, opponentAvatar: p2Avatar });
    io.to(room.p2.id).emit('tripleGameStarted', { roomId, role: 'p2', choices: room.p2.choices, opponentChoices: room.p1.choices, type: room.p2.type, opponentName: room.p1.username, opponentAvatar: p1Avatar });

    room.timer = setTimeout(() => {
        const players = [room.p1, room.p2];
        players.forEach(player => {
            while (player.results.picked.length < 6) {
                const idx = player.results.picked.length;
                const choicePair = player.choices[idx];
                player.results.picked.push(choicePair[0]);
            }
        });
        checkTripleDraftComplete(room);
    }, 60000);
}

function startMegaGame(roomId) {
    const room = megaRooms[roomId];
    room.status = 'drafting';
    
    const shuffledHeroes = shuffle([...allHeroes]);
    const shuffledPets = shuffle([...allPets]);
    
    room.pool = {
        heroes: shuffledHeroes.slice(0, 15),
        pets: shuffledPets.slice(0, 3)
    };
    
    room.turn = 'p1';
    room.picksLeftThisTurn = 1;
    room.p1.results = { heroes: [], pets: [] };
    room.p2.results = { heroes: [], pets: [] };
    room.totalPicks = 0;
    
    const p1Avatar = getUserAvatar(room.p1.username);
    const p2Avatar = getUserAvatar(room.p2.username);

    io.to(room.p1.id).emit('megaGameStarted', { roomId, role: 'p1', pool: room.pool, opponentName: room.p2.username, opponentAvatar: p2Avatar, turn: room.turn, picksLeftThisTurn: room.picksLeftThisTurn, timeLimit: 10 });
    io.to(room.p2.id).emit('megaGameStarted', { roomId, role: 'p2', pool: room.pool, opponentName: room.p1.username, opponentAvatar: p1Avatar, turn: room.turn, picksLeftThisTurn: room.picksLeftThisTurn, timeLimit: 10 });
    
    startMegaTurnTimer(roomId);
}

function startMegaTurnTimer(roomId) {
    const room = megaRooms[roomId];
    if (!room || room.status !== 'drafting') return;
    
    if (room.turnTimer) clearTimeout(room.turnTimer);
    
    room.turnTimer = setTimeout(() => {
        const player = room.turn === 'p1' ? room.p1 : room.p2;
        let type = 'hero';
        let item = null;
        
        if (player.results.heroes.length < 5 && room.pool.heroes.length > 0) {
            type = 'hero';
            item = room.pool.heroes[Math.floor(Math.random() * room.pool.heroes.length)];
        } else if (player.results.pets.length < 1 && room.pool.pets.length > 0) {
            type = 'pet';
            item = room.pool.pets[Math.floor(Math.random() * room.pool.pets.length)];
        }
        
        if (item) {
            processMegaPick(roomId, player.id, type, item);
        }
    }, 10000);
}

function processMegaPick(roomId, socketId, type, item) {
    const room = megaRooms[roomId];
    if (!room) return;
    
    const player = room.turn === 'p1' ? room.p1 : room.p2;
    if (socketId !== player.id) return;
    
    if (type === 'hero' && player.results.heroes.length >= 5) return;
    if (type === 'pet' && player.results.pets.length >= 1) return;
    if (type === 'hero' && !room.pool.heroes.includes(item)) return;
    if (type === 'pet' && !room.pool.pets.includes(item)) return;
    
    if (type === 'hero') room.pool.heroes = room.pool.heroes.filter(h => h !== item);
    else room.pool.pets = room.pool.pets.filter(p => p !== item);
    
    if (type === 'hero') player.results.heroes.push(item);
    else player.results.pets.push(item);
    
    room.totalPicks++;
    room.picksLeftThisTurn--;
    
    if (room.picksLeftThisTurn === 0) {
        room.turn = room.turn === 'p1' ? 'p2' : 'p1';
        if (room.totalPicks === 1) room.picksLeftThisTurn = 2;
        else if (room.totalPicks === 3) room.picksLeftThisTurn = 2;
        else if (room.totalPicks === 5) room.picksLeftThisTurn = 2;
        else if (room.totalPicks === 7) room.picksLeftThisTurn = 2;
        else if (room.totalPicks === 9) room.picksLeftThisTurn = 2;
        else if (room.totalPicks === 11) room.picksLeftThisTurn = 1;
    }
    
    const p1Avatar = getUserAvatar(room.p1.username);
    const p2Avatar = getUserAvatar(room.p2.username);
    
    io.to(room.p1.id).emit('megaDraftUpdate', { pool: room.pool, p1: room.p1.results, p2: room.p2.results, turn: room.turn, picksLeftThisTurn: room.picksLeftThisTurn, timeLimit: 10, p1Name: room.p1.username, p2Name: room.p2.username, p1Avatar, p2Avatar });
    io.to(room.p2.id).emit('megaDraftUpdate', { pool: room.pool, p1: room.p1.results, p2: room.p2.results, turn: room.turn, picksLeftThisTurn: room.picksLeftThisTurn, timeLimit: 10, p1Name: room.p1.username, p2Name: room.p2.username, p1Avatar, p2Avatar });
    
    if (room.totalPicks === 12) {
        if (room.turnTimer) clearTimeout(room.turnTimer);
        room.status = 'completed';
        io.to(room.p1.id).emit('megaDraftComplete', { yourTeam: room.p1.results, opponentTeam: room.p2.results, opponentAvatar: p2Avatar });
        io.to(room.p2.id).emit('megaDraftComplete', { yourTeam: room.p2.results, opponentTeam: room.p1.results, opponentAvatar: p1Avatar });
    } else {
        startMegaTurnTimer(roomId);
    }
}

io.on('connection', (socket) => {
    socket.on('joinRandom', (username) => {
        socket.username = username;
        randomQueue.push(socket);
        if (randomQueue.length >= 2) {
            const p1 = randomQueue.shift();
            const p2 = randomQueue.shift();
            const roomId = generateRoomId();
            p1.join(roomId);
            p2.join(roomId);
            rooms[roomId] = { p1, p2, status: 'waiting' };
            startGame(roomId);
        } else {
            socket.emit('waiting', 'Waiting for another player...');
        }
    });

    socket.on('createCustom', (username) => {
        socket.username = username;
        const roomId = generateRoomId();
        socket.join(roomId);
        rooms[roomId] = { p1: socket, status: 'waiting' };
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinCustom', ({ roomId, username }) => {
        socket.username = username;
        const room = rooms[roomId];
        if (room && room.status === 'waiting' && !room.p2) {
            socket.join(roomId);
            room.p2 = socket;
            startGame(roomId);
        } else {
            socket.emit('errorMsg', 'Room not found or full.');
        }
    });
    
    socket.on('makeChoice', ({ roomId, index, picked, rejected }) => {
        const room = rooms[roomId];
        if (!room) return;
        
        const player = room.p1.id === socket.id ? room.p1 : room.p2;
        if (player.results.picked.length >= 3) return;
        
        const opponent = room.p1.id === socket.id ? room.p2 : room.p1;
        
        player.results.picked.push(picked);
        player.results.rejected.push(rejected);
        
        io.to(opponent.id).emit('opponentSelected');
        
        checkDraftComplete(room);
    });

    socket.on('joinTripleRandom', (username) => {
        socket.username = username;
        tripleRandomQueue.push(socket);
        if (tripleRandomQueue.length >= 2) {
            const p1 = tripleRandomQueue.shift();
            const p2 = tripleRandomQueue.shift();
            const roomId = generateRoomId();
            p1.join(roomId);
            p2.join(roomId);
            tripleRooms[roomId] = { p1, p2, status: 'waiting' };
            startTripleGame(roomId);
        } else {
            socket.emit('waiting', 'Waiting for another player...');
        }
    });

    socket.on('createTripleCustom', (username) => {
        socket.username = username;
        const roomId = generateRoomId();
        socket.join(roomId);
        tripleRooms[roomId] = { p1: socket, status: 'waiting' };
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinTripleCustom', ({ roomId, username }) => {
        socket.username = username;
        const room = tripleRooms[roomId];
        if (room && room.status === 'waiting' && !room.p2) {
            socket.join(roomId);
            room.p2 = socket;
            startTripleGame(roomId);
        } else {
            socket.emit('errorMsg', 'Room not found or full.');
        }
    });
    
    socket.on('makeTripleChoice', ({ roomId, index, picked }) => {
        const room = tripleRooms[roomId];
        if (!room) return;
        
        const player = room.p1.id === socket.id ? room.p1 : room.p2;
        if (player.results.picked.length >= 6) return;
        
        const opponent = room.p1.id === socket.id ? room.p2 : room.p1;
        
        player.results.picked.push(picked);
        
        io.to(opponent.id).emit('opponentSelected');
        
        checkTripleDraftComplete(room);
    });

    socket.on('joinMegaRandom', (username) => {
        socket.username = username;
        megaRandomQueue.push(socket);
        if (megaRandomQueue.length >= 2) {
            const p1 = megaRandomQueue.shift();
            const p2 = megaRandomQueue.shift();
            const roomId = generateRoomId();
            p1.join(roomId);
            p2.join(roomId);
            megaRooms[roomId] = { p1, p2, status: 'waiting' };
            startMegaGame(roomId);
        } else {
            socket.emit('waiting', 'Waiting for another player...');
        }
    });

    socket.on('createMegaCustom', (username) => {
        socket.username = username;
        const roomId = generateRoomId();
        socket.join(roomId);
        megaRooms[roomId] = { p1: socket, status: 'waiting' };
        socket.emit('megaRoomCreated', roomId);
    });

    socket.on('joinMegaCustom', ({ roomId, username }) => {
        socket.username = username;
        const room = megaRooms[roomId];
        if (room && room.status === 'waiting' && !room.p2) {
            socket.join(roomId);
            room.p2 = socket;
            startMegaGame(roomId);
        } else {
            socket.emit('errorMsg', 'Room not found or full.');
        }
    });

    socket.on('makeMegaChoice', ({ roomId, type, item }) => {
        processMegaPick(roomId, socket.id, type, item);
    });

    socket.on('disconnect', () => {
        randomQueue = randomQueue.filter(s => s.id !== socket.id);
        megaRandomQueue = megaRandomQueue.filter(s => s.id !== socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
