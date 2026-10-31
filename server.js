const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const HERO_POSITIONS = require('./public/hero-positions.js');

// Put a finished team's heroes in in-game line-up order (back to front,
// tank last), the same order the Team Build page uses
function orderTeam(team) {
    if (team && Array.isArray(team.heroes)) {
        team.heroes.sort((a, b) => (HERO_POSITIONS[b] || 0) - (HERO_POSITIONS[a] || 0));
    }
    return team;
}

app.use(express.json());

// Redirect old onrender.com traffic to official custom domain
app.use((req, res, next) => {
    const host = req.get('host');
    if (host && host.includes('trade-boy.onrender.com')) {
        return res.redirect(301, 'https://trade-boy.com' + req.originalUrl);
    }
    next();
});

// ---------- Guide pages (SEO) ----------
// Each guide has its own keyword-rich address, and the server sends the full
// guide already in the HTML (title, description, canonical, structured data
// and the team content), so Google can read and index it without running
// JavaScript. The guide content itself still lives in public/post.html.
const SITE = 'https://trade-boy.com';
const GUIDES = {
    'best-team-for-osh': {
        id: 'osh-teams',
        title: 'Best Team for OSH in Hero Wars (2026) | Trade Boy',
        desc: 'Best Hero Wars teams for OSH: proven Cornelius, Lara Croft and Jhu lineups for Level 150 and 160, with damage, playstyle, difficulty, recommended buffs and video guides.',
        img: 'osh-teams.jpg'
    },
    'best-team-for-maestro': {
        id: 'maestro-teams',
        title: 'Best Team for Maestro in Hero Wars (2026) | Trade Boy',
        desc: 'Best Hero Wars teams for Maestro: Hard Mode lineups for 1 Billion+ damage and Easy Mode Cornelius teams for Level 150, with buffs, patrons and video guides.',
        img: 'maestro-teams.jpg'
    },
    'best-team-for-archdemon': {
        id: 'archdemon-teams',
        title: 'Best Team for Archdemon in Hero Wars (18.4B+ Spooky Festival) | Trade Boy',
        desc: 'Best Hero Wars teams for the Archdemon in the Spooky Festival: proven 18.4 Billion+ lineups from Buff 110 to Buff 250, with Talisman Capital Bonus, exact hero ranks and pet patrons.',
        img: 'archdemon-teams.jpg'
    },
    'hero-wars-event-teams': {
        id: 'event-teams',
        title: 'Hero Wars Event Teams - EVA Chapters (2026) | Trade Boy',
        desc: 'Best Hero Wars teams for the current events and EVA chapters, with lineups, difficulty and video guides.',
        img: 'event-teams.jpg'
    }
};
const GUIDE_SLUG_BY_ID = Object.fromEntries(Object.entries(GUIDES).map(([slug, g]) => [g.id, slug]));

// Old /post?id=... addresses: guides move to their new address; placeholder
// posts go to the real page for that topic
const OLD_POST_REDIRECTS = { heroes: '/tier-list', titans: '/titans-tier-list', 'team-build': '/team-build', 'draft-battle': '/draft' };

const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Read the guide content (the postData object) out of post.html
function loadPostData(html) {
    const start = html.indexOf('const postData = ');
    const end = html.indexOf('const urlParams', start);
    if (start < 0 || end < 0) return {};
    const objText = html.slice(start + 'const postData = '.length, html.lastIndexOf('};', end) + 1);
    try {
        return require('vm').runInNewContext('(' + objText + ')', {});
    } catch (e) {
        console.error('Could not read guide content from post.html:', e.message);
        return {};
    }
}

function renderGuide(html, slug) {
    const guide = GUIDES[slug];
    const post = loadPostData(html)[guide.id];
    if (!post) return null;

    const url = `${SITE}/${slug}`;
    const img = `${SITE}/${guide.img}`;
    const structuredData = [
        {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: guide.desc,
            image: img,
            mainEntityOfPage: url,
            author: { '@type': 'Organization', name: 'Trade Boy', url: SITE },
            publisher: { '@type': 'Organization', name: 'Trade Boy', logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } },
            dateModified: new Date(fs.statSync(path.join(__dirname, 'public', 'post.html')).mtime).toISOString()
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
                { '@type': 'ListItem', position: 2, name: post.title, item: url }
            ]
        }
    ];

    const head = `<title>${escapeHtml(guide.title)}</title>
    <meta name="description" content="${escapeHtml(guide.desc)}">
    <link rel="canonical" href="${url}">
    <meta property="og:title" content="${escapeHtml(guide.title)}" />
    <meta property="og:description" content="${escapeHtml(guide.desc)}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
    <script>window.__POST_ID__ = ${JSON.stringify(guide.id)};</script>`;

    // Same markup the page's own script would build in the browser
    const body = `
                <img src="${post.img || 'thumbnail.jpg'}" alt="${escapeHtml(post.title)}" class="post-header-img">
                <h1 style="margin-bottom: 20px; font-size: 2.5rem;">${post.title}</h1>
                <div style="font-size: 1.1rem; line-height: 1.8; color: #cbd5e1;">${post.content}</div>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="color: #94a3b8;">Written by: Trade Boy</p>
                </div>`;

    return html
        .replace(/<title>[^<]*<\/title>/, head)
        .replace(/\s*<meta name="robots" content="noindex, follow">/, '') // the bare template stays noindex; guides are indexable
        .replace(/\s*<meta (property="og:[a-z]+"|name="twitter:card")[^>]*>/g, '')
        .replace(/(<div class="post-detail" id="post-content")>\s*<!-- Content generated by JS -->\s*<\/div>/,
                 `$1 data-ssr="1">${body}\n        </div>`);
}

Object.keys(GUIDES).forEach(slug => {
    app.get('/' + slug, (req, res, next) => {
        fs.readFile(path.join(__dirname, 'public', 'post.html'), 'utf8', (err, html) => {
            if (err) return next();
            const page = renderGuide(html, slug);
            if (!page) return next();
            res.send(page);
        });
    });
});

app.get('/post', (req, res, next) => {
    const id = req.query.id;
    if (GUIDE_SLUG_BY_ID[id]) return res.redirect(301, '/' + GUIDE_SLUG_BY_ID[id]);
    if (OLD_POST_REDIRECTS[id]) return res.redirect(301, OLD_POST_REDIRECTS[id]);
    next();
});

app.get('/heroes/Avalon.png', (req, res) => {
    res.redirect('/heroes/Alvanor.png');
});

// Case-insensitive & extension-tolerant asset resolver for Linux/Render production
['heroes', 'pets', 'patrons', 'talismans'].forEach(folder => {
    app.get(`/${folder}/:file`, (req, res, next) => {
        const filePath = path.join(__dirname, 'public', folder, req.params.file);
        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath, { dotfiles: 'allow' });
        }
        const dir = path.join(__dirname, 'public', folder);
        fs.readdir(dir, (err, files) => {
            if (err || !files) return next();
            const targetLower = req.params.file.toLowerCase();
            const targetBase = targetLower.replace(/\.[^/.]+$/, "");
            const match = files.find(f => f.toLowerCase() === targetLower || f.toLowerCase().startsWith(targetBase + '.'));
            if (match) {
                return res.sendFile(path.join(dir, match), { dotfiles: 'allow' });
            }
            next();
        });
    });
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Initialize users.json if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
} else {
    // Assign random avatars to existing users without one,
    // and replace any plain-text passwords with hashes
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    let modified = false;
    users.forEach(u => {
        if (!u.avatar) {
            u.avatar = `avatar${Math.floor(Math.random() * 10) + 1}.jpg`;
            modified = true;
        }
        if (typeof u.password === 'string' && !u.password.startsWith('scrypt$')) {
            u.password = hashPassword(u.password);
            modified = true;
        }
    });
    if (modified) fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Passwords are stored as "scrypt$<salt>$<hash>". Older accounts saved in
// plain text are upgraded to a hash the next time they log in.
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
    if (typeof stored !== 'string') return false;
    if (!stored.startsWith('scrypt$')) return stored === password;
    const [, salt, hash] = stored.split('$');
    const expected = Buffer.from(hash, 'hex');
    const actual = crypto.scryptSync(String(password), salt, expected.length);
    return crypto.timingSafeEqual(expected, actual);
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
    users.push({ username, password: hashPassword(password), avatar: assignedAvatar });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.status(201).json({ message: 'User registered successfully', avatar: assignedAvatar });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    const user = users.find(u => u.username === username && verifyPassword(password, u.password));

    if (user) {
        if (!user.password.startsWith('scrypt$')) {
            user.password = hashPassword(password);
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        }
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
    if (room.status === 'completed' || room.status === 'patron_selection') return;
    if (room.p1.results.picked.length === 3 && room.p2.results.picked.length === 3) {
        if (room.timer) clearTimeout(room.timer);
        room.status = 'patron_selection';
        
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
        
        room.p1Final = orderTeam(p1Final);
        room.p2Final = orderTeam(p2Final);
        room.p1Patrons = null;
        room.p2Patrons = null;
        
        io.to(room.p1.id).emit('draftPatronPhase', { yourTeam: p1Final, timeLimit: 40 });
        io.to(room.p2.id).emit('draftPatronPhase', { yourTeam: p2Final, timeLimit: 40 });

        room.patronTimer = setTimeout(() => {
            finalizeDraftPatrons(room);
        }, 42000);
    }
}

function finalizeDraftPatrons(room) {
    if (!room || room.status === 'completed') return;
    if (room.patronTimer) clearTimeout(room.patronTimer);
    room.status = 'completed';

    room.p1Final.patrons = room.p1Patrons || {};
    room.p2Final.patrons = room.p2Patrons || {};

    const p1Avatar = getUserAvatar(room.p1.username);
    const p2Avatar = getUserAvatar(room.p2.username);

    io.to(room.p1.id).emit('draftComplete', { yourTeam: room.p1Final, opponentTeam: room.p2Final, p1Name: room.p1.username, p2Name: room.p2.username, opponentAvatar: p2Avatar });
    io.to(room.p2.id).emit('draftComplete', { yourTeam: room.p2Final, opponentTeam: room.p1Final, p1Name: room.p2.username, p2Name: room.p1.username, opponentAvatar: p1Avatar });
}

function checkTripleDraftComplete(room) {
    if (room.status === 'completed' || room.status === 'patron_selection') return;
    if (room.p1.results.picked.length === 6 && room.p2.results.picked.length === 6) {
        if (room.timer) clearTimeout(room.timer);
        room.status = 'patron_selection';
        
        const p1Final = {
            heroes: room.p1.results.picked.slice(0, 5),
            pet: room.p1.results.picked[5]
        };
        const p2Final = {
            heroes: room.p2.results.picked.slice(0, 5),
            pet: room.p2.results.picked[5]
        };
        
        room.p1Final = orderTeam(p1Final);
        room.p2Final = orderTeam(p2Final);
        room.p1Patrons = null;
        room.p2Patrons = null;

        io.to(room.p1.id).emit('triplePatronPhase', { yourTeam: p1Final, timeLimit: 40 });
        io.to(room.p2.id).emit('triplePatronPhase', { yourTeam: p2Final, timeLimit: 40 });

        room.patronTimer = setTimeout(() => {
            finalizeTriplePatrons(room);
        }, 42000);
    }
}

function finalizeTriplePatrons(room) {
    if (!room || room.status === 'completed') return;
    if (room.patronTimer) clearTimeout(room.patronTimer);
    room.status = 'completed';

    room.p1Final.patrons = room.p1Patrons || {};
    room.p2Final.patrons = room.p2Patrons || {};

    const p1Avatar = getUserAvatar(room.p1.username);
    const p2Avatar = getUserAvatar(room.p2.username);

    io.to(room.p1.id).emit('tripleDraftComplete', { yourTeam: room.p1Final, opponentTeam: room.p2Final, p1Name: room.p1.username, p2Name: room.p2.username, opponentAvatar: p2Avatar });
    io.to(room.p2.id).emit('tripleDraftComplete', { yourTeam: room.p2Final, opponentTeam: room.p1Final, p1Name: room.p2.username, p2Name: room.p1.username, opponentAvatar: p1Avatar });
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
    
    io.to(room.p1.id).emit('gameStarted', { roomId, role: 'p1', choices: room.p1.choices, opponentChoices: room.p2.choices, type: room.p1.type, opponentType: room.p2.type, opponentName: room.p2.username, opponentAvatar: p2Avatar });
    io.to(room.p2.id).emit('gameStarted', { roomId, role: 'p2', choices: room.p2.choices, opponentChoices: room.p1.choices, type: room.p2.type, opponentType: room.p1.type, opponentName: room.p1.username, opponentAvatar: p1Avatar });

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
        room.status = 'patron_selection';

        const p1Final = {
            heroes: room.p1.results.heroes,
            pet: room.p1.results.pets[0]
        };
        const p2Final = {
            heroes: room.p2.results.heroes,
            pet: room.p2.results.pets[0]
        };

        room.p1Final = orderTeam(p1Final);
        room.p2Final = orderTeam(p2Final);
        room.p1Patrons = null;
        room.p2Patrons = null;

        io.to(room.p1.id).emit('megaPatronPhase', { yourTeam: p1Final, timeLimit: 40 });
        io.to(room.p2.id).emit('megaPatronPhase', { yourTeam: p2Final, timeLimit: 40 });

        room.patronTimer = setTimeout(() => {
            finalizeMegaPatrons(room);
        }, 42000);
    } else {
        startMegaTurnTimer(roomId);
    }
}

function finalizeMegaPatrons(room) {
    if (!room || room.status === 'completed') return;
    if (room.patronTimer) clearTimeout(room.patronTimer);
    room.status = 'completed';

    room.p1Final.patrons = room.p1Patrons || {};
    room.p2Final.patrons = room.p2Patrons || {};

    const p1Avatar = getUserAvatar(room.p1.username);
    const p2Avatar = getUserAvatar(room.p2.username);

    const p1TeamData = {
        heroes: room.p1Final.heroes,
        pet: room.p1Final.pet,
        pets: [room.p1Final.pet],
        patrons: room.p1Final.patrons
    };
    const p2TeamData = {
        heroes: room.p2Final.heroes,
        pet: room.p2Final.pet,
        pets: [room.p2Final.pet],
        patrons: room.p2Final.patrons
    };

    io.to(room.p1.id).emit('megaDraftComplete', { yourTeam: p1TeamData, opponentTeam: p2TeamData, p1Name: room.p1.username, p2Name: room.p2.username, opponentAvatar: p2Avatar });
    io.to(room.p2.id).emit('megaDraftComplete', { yourTeam: p2TeamData, opponentTeam: p1TeamData, p1Name: room.p2.username, p2Name: room.p1.username, opponentAvatar: p1Avatar });
}

// ==========================================
// TOURNAMENT SYSTEM CORE LOGIC & HELPERS
// ==========================================
const MASTER_HOST_KEYS = [
    'tradeboy2026',
    'TB-HOST-2026',
    'admin2026',
    'hero-wars-host',
    'olympus-hw',
    'hw-deda',
    'hw-central',
    'project-hw',
    'marzuki-hw',
    process.env.HOST_KEY
].filter(Boolean);
let tournaments = {};

function isValidHostKey(key) {
    if (typeof key !== 'string' || !key) return false;
    const cleanKey = key.trim().toLowerCase();
    return MASTER_HOST_KEYS.some(k => k.toLowerCase() === cleanKey);
}

function generateTourId() {
    return 'TB-' + Math.floor(1000 + Math.random() * 9000);
}

function getRoundName(totalPlayers, roundIndex) {
    const remainingMatches = Math.pow(2, Math.log2(totalPlayers) - 1 - roundIndex);
    if (remainingMatches === 1) return 'Grand Finals';
    if (remainingMatches === 2) return 'Semi-Finals';
    if (remainingMatches === 4) return 'Quarter-Finals';
    if (remainingMatches === 8) return 'Round of 16';
    if (remainingMatches === 16) return 'Round of 32';
    return `Round ${roundIndex + 1}`;
}

function getTournamentPublicState(tour) {
    if (!tour) return null;
    return {
        id: tour.id,
        name: tour.name,
        details: tour.details,
        rewards: tour.rewards,
        playerLimit: tour.playerLimit,
        gameMode: tour.gameMode,
        hostUsername: tour.hostUsername,
        status: tour.status,
        currentRoundIndex: tour.currentRoundIndex,
        totalRounds: tour.totalRounds,
        currentRoundName: getRoundName(tour.playerLimit, tour.currentRoundIndex),
        players: tour.players.map(p => ({
            username: p.username,
            avatar: p.avatar,
            playerId: p.playerId || '',
            platform: p.platform || 'WEB',
            eliminated: !!p.eliminated,
            isHost: !!p.isHost,
            ready: true
        })),
        rounds: tour.rounds.map(r => ({
            roundIndex: r.roundIndex,
            roundName: r.roundName,
            gameMode: r.gameMode,
            status: r.status,
            matches: r.matches.map(m => ({
                id: m.id,
                matchNumber: m.matchNumber,
                p1: m.p1 ? {
                    username: m.p1.username,
                    avatar: m.p1.avatar,
                    playerId: m.p1.playerId || '',
                    platform: m.p1.platform || 'WEB'
                } : null,
                p2: m.p2 ? {
                    username: m.p2.username,
                    avatar: m.p2.avatar,
                    playerId: m.p2.playerId || '',
                    platform: m.p2.platform || 'WEB'
                } : null,
                p1Deck: m.p1Deck,
                p2Deck: m.p2Deck,
                draftStatus: m.draftStatus,
                winner: m.winner,
                status: m.status
            }))
        })),
        champion: tour.champion,
        runnerUp: tour.runnerUp
    };
}

function setupInitialRound(tour) {
    // Pairing: Player 1 vs Player 2, 3 vs 4, ... up to 31 vs 32 as requested
    const numMatches = tour.playerLimit / 2;
    const initialMatches = [];

    for (let i = 0; i < numMatches; i++) {
        const p1Index = i * 2;
        const p2Index = i * 2 + 1;
        const p1 = tour.players[p1Index] || null;
        const p2 = tour.players[p2Index] || null;

        const match = {
            id: `m_0_${i}`,
            matchNumber: i + 1,
            p1: p1 ? {
                username: p1.username,
                avatar: p1.avatar,
                playerId: p1.playerId || '',
                platform: p1.platform || 'WEB',
                socketId: p1.socketId
            } : null,
            p2: p2 ? {
                username: p2.username,
                avatar: p2.avatar,
                playerId: p2.playerId || '',
                platform: p2.platform || 'WEB',
                socketId: p2.socketId
            } : null,
            p1Deck: null,
            p2Deck: null,
            draftStatus: 'pending',
            winner: null,
            status: 'pending'
        };

        // If a slot has only 1 player (bye), auto-advance
        if (p1 && !p2) {
            match.winner = p1.username;
            match.status = 'completed';
        }

        initialMatches.push(match);
    }

    tour.rounds = [{
        roundIndex: 0,
        roundName: getRoundName(tour.playerLimit, 0),
        gameMode: tour.gameMode,
        status: 'in_progress',
        matches: initialMatches
    }];
}

function startMatchesForRound(tour, roundIndex) {
    const round = tour.rounds[roundIndex];
    if (!round) return;

    round.status = 'in_progress';
    round.gameMode = tour.gameMode;

    round.matches.forEach(match => {
        if (!match.p1 || !match.p2 || match.status === 'completed') return;

        match.status = 'drafting';
        match.draftStatus = 'drafting';

        if (tour.gameMode === 'draft') {
            initMatchDraft(tour, match);
        } else if (tour.gameMode === 'triple') {
            initMatchTripleDraft(tour, match);
        } else if (tour.gameMode === 'mega') {
            initMatchMegaDraft(tour, match);
        }
    });
}

function initMatchDraft(tour, match) {
    const shuffledHeroes = shuffle([...allHeroes]);
    const shuffledPets = shuffle([...allPets]);
    const draftHeroes = shuffledHeroes.slice(0, 10);
    const draftPets = shuffledPets.slice(0, 2);
    const p1GetsPet = Math.random() < 0.5;

    let p1Choices, p2Choices, p1Type, p2Type;

    if (p1GetsPet) {
        p1Choices = [
            [draftHeroes[0], draftHeroes[1]],
            [draftHeroes[2], draftHeroes[3]],
            [draftPets[0], draftPets[1]]
        ];
        p2Choices = [
            [draftHeroes[4], draftHeroes[5]],
            [draftHeroes[6], draftHeroes[7]],
            [draftHeroes[8], draftHeroes[9]]
        ];
        p1Type = ['hero', 'hero', 'pet'];
        p2Type = ['hero', 'hero', 'hero'];
    } else {
        p1Choices = [
            [draftHeroes[0], draftHeroes[1]],
            [draftHeroes[2], draftHeroes[3]],
            [draftHeroes[4], draftHeroes[5]]
        ];
        p2Choices = [
            [draftHeroes[6], draftHeroes[7]],
            [draftHeroes[8], draftHeroes[9]],
            [draftPets[0], draftPets[1]]
        ];
        p1Type = ['hero', 'hero', 'hero'];
        p2Type = ['hero', 'hero', 'pet'];
    }

    match.draftData = {
        type: 'draft',
        p1GetsPet,
        p1: { choices: p1Choices, type: p1Type, results: { picked: [], rejected: [] } },
        p2: { choices: p2Choices, type: p2Type, results: { picked: [], rejected: [] } }
    };

    if (match.p1 && match.p1.socketId) {
        io.to(match.p1.socketId).emit('tourMatchDraftStart', {
            tourId: tour.id,
            matchId: match.id,
            mode: 'draft',
            role: 'p1',
            choices: p1Choices,
            opponentChoices: p2Choices,
            type: p1Type,
            opponentType: p2Type,
            opponentName: match.p2.username,
            opponentAvatar: match.p2.avatar,
            timeLimit: 30
        });
    }

    if (match.p2 && match.p2.socketId) {
        io.to(match.p2.socketId).emit('tourMatchDraftStart', {
            tourId: tour.id,
            matchId: match.id,
            mode: 'draft',
            role: 'p2',
            choices: p2Choices,
            opponentChoices: p1Choices,
            type: p2Type,
            opponentType: p1Type,
            opponentName: match.p1.username,
            opponentAvatar: match.p1.avatar,
            timeLimit: 30
        });
    }

    // 32s auto pick fallback (30s limit + 2s network buffer)
    match.draftTimer = setTimeout(() => {
        if (!match || match.status !== 'drafting') return;
        ['p1', 'p2'].forEach(role => {
            const playerState = match.draftData[role];
            while (playerState.results.picked.length < 3) {
                const idx = playerState.results.picked.length;
                const pair = playerState.choices[idx];
                playerState.results.picked.push(pair[0]);
                playerState.results.rejected.push(pair[1]);
            }
        });
        checkTourDraftComplete(tour, match);
    }, 32000);
}

function finalizeTourMatchPatrons(tour, match) {
    if (!match || match.status === 'awaiting_combat' || match.status === 'completed') return;
    if (match.patronTimer) clearTimeout(match.patronTimer);

    match.draftStatus = 'completed';
    match.status = 'awaiting_combat';

    match.p1Final.patrons = match.p1Patrons || {};
    match.p2Final.patrons = match.p2Patrons || {};

    match.p1Deck = match.p1Final;
    match.p2Deck = match.p2Final;

    const eventName = match.draftData.type === 'draft' 
        ? 'tourMatchDraftComplete' 
        : (match.draftData.type === 'triple' ? 'tourMatchTripleDraftComplete' : 'tourMegaDraftComplete');

    if (match.p1?.socketId) {
        io.to(match.p1.socketId).emit(eventName, {
            matchId: match.id,
            yourTeam: match.p1Final,
            opponentTeam: match.p2Final,
            opponentName: match.p2?.username,
            opponentAvatar: match.p2?.avatar
        });
    }
    if (match.p2?.socketId) {
        io.to(match.p2.socketId).emit(eventName, {
            matchId: match.id,
            yourTeam: match.p2Final,
            opponentTeam: match.p1Final,
            opponentName: match.p1?.username,
            opponentAvatar: match.p1?.avatar
        });
    }

    io.to(`tour_${tour.id}`).emit('tourStateUpdate', getTournamentPublicState(tour));
}

function checkTourDraftComplete(tour, match) {
    if (match.status !== 'drafting') return;
    const { p1, p2, p1GetsPet } = match.draftData;

    if (p1.results.picked.length === 3 && p2.results.picked.length === 3) {
        if (match.draftTimer) clearTimeout(match.draftTimer);
        match.draftStatus = 'patron_selection';

        let p1Final, p2Final;
        if (p1GetsPet) {
            p1Final = {
                heroes: [...p1.results.picked.slice(0, 2), ...p2.results.rejected.slice(0, 3)],
                pet: p1.results.picked[2]
            };
            p2Final = {
                heroes: [...p2.results.picked.slice(0, 3), ...p1.results.rejected.slice(0, 2)],
                pet: p1.results.rejected[2]
            };
        } else {
            p1Final = {
                heroes: [...p1.results.picked.slice(0, 3), ...p2.results.rejected.slice(0, 2)],
                pet: p2.results.rejected[2]
            };
            p2Final = {
                heroes: [...p2.results.picked.slice(0, 2), ...p1.results.rejected.slice(0, 3)],
                pet: p2.results.picked[2]
            };
        }

        match.p1Final = orderTeam(p1Final);
        match.p2Final = orderTeam(p2Final);
        match.p1Patrons = null;
        match.p2Patrons = null;

        if (match.p1?.socketId) {
            io.to(match.p1.socketId).emit('tourMatchPatronPhase', {
                tourId: tour.id,
                matchId: match.id,
                yourTeam: p1Final,
                timeLimit: 40
            });
        }
        if (match.p2?.socketId) {
            io.to(match.p2.socketId).emit('tourMatchPatronPhase', {
                tourId: tour.id,
                matchId: match.id,
                yourTeam: p2Final,
                timeLimit: 40
            });
        }

        io.to(`tour_${tour.id}`).emit('tourStateUpdate', getTournamentPublicState(tour));

        match.patronTimer = setTimeout(() => {
            finalizeTourMatchPatrons(tour, match);
        }, 42000);
    }
}

function initMatchTripleDraft(tour, match) {
    const shuffledHeroes = shuffle([...allHeroes]);
    const shuffledPets = shuffle([...allPets]);
    const draftHeroes = shuffledHeroes.slice(0, 30);
    const draftPets = shuffledPets.slice(0, 6);

    const p1Choices = [
        [draftHeroes[0], draftHeroes[1], draftHeroes[2]],
        [draftHeroes[3], draftHeroes[4], draftHeroes[5]],
        [draftHeroes[6], draftHeroes[7], draftHeroes[8]],
        [draftHeroes[9], draftHeroes[10], draftHeroes[11]],
        [draftHeroes[12], draftHeroes[13], draftHeroes[14]],
        [draftPets[0], draftPets[1], draftPets[2]]
    ];
    const p2Choices = [
        [draftHeroes[15], draftHeroes[16], draftHeroes[17]],
        [draftHeroes[18], draftHeroes[19], draftHeroes[20]],
        [draftHeroes[21], draftHeroes[22], draftHeroes[23]],
        [draftHeroes[24], draftHeroes[25], draftHeroes[26]],
        [draftHeroes[27], draftHeroes[28], draftHeroes[29]],
        [draftPets[3], draftPets[4], draftPets[5]]
    ];

    const types = ['hero', 'hero', 'hero', 'hero', 'hero', 'pet'];

    match.draftData = {
        type: 'triple',
        p1: { choices: p1Choices, type: types, results: { picked: [] } },
        p2: { choices: p2Choices, type: types, results: { picked: [] } }
    };

    if (match.p1?.socketId) {
        io.to(match.p1.socketId).emit('tourMatchTripleDraftStart', {
            tourId: tour.id,
            matchId: match.id,
            mode: 'triple',
            role: 'p1',
            choices: p1Choices,
            opponentChoices: p2Choices,
            type: types,
            opponentName: match.p2.username,
            opponentAvatar: match.p2.avatar,
            timeLimit: 35
        });
    }

    if (match.p2?.socketId) {
        io.to(match.p2.socketId).emit('tourMatchTripleDraftStart', {
            tourId: tour.id,
            matchId: match.id,
            mode: 'triple',
            role: 'p2',
            choices: p2Choices,
            opponentChoices: p1Choices,
            type: types,
            opponentName: match.p1.username,
            opponentAvatar: match.p1.avatar,
            timeLimit: 35
        });
    }

    // 37s auto pick fallback (35s limit + 2s network buffer)
    match.draftTimer = setTimeout(() => {
        if (!match || match.status !== 'drafting') return;
        ['p1', 'p2'].forEach(role => {
            const playerState = match.draftData[role];
            while (playerState.results.picked.length < 6) {
                const idx = playerState.results.picked.length;
                playerState.results.picked.push(playerState.choices[idx][0]);
            }
        });
        checkTourTripleDraftComplete(tour, match);
    }, 37000);
}

function checkTourTripleDraftComplete(tour, match) {
    if (match.status !== 'drafting') return;
    const { p1, p2 } = match.draftData;

    if (p1.results.picked.length === 6 && p2.results.picked.length === 6) {
        if (match.draftTimer) clearTimeout(match.draftTimer);
        match.draftStatus = 'patron_selection';

        const p1Final = {
            heroes: p1.results.picked.slice(0, 5),
            pet: p1.results.picked[5]
        };
        const p2Final = {
            heroes: p2.results.picked.slice(0, 5),
            pet: p2.results.picked[5]
        };

        match.p1Final = orderTeam(p1Final);
        match.p2Final = orderTeam(p2Final);
        match.p1Patrons = null;
        match.p2Patrons = null;

        if (match.p1?.socketId) {
            io.to(match.p1.socketId).emit('tourMatchPatronPhase', {
                tourId: tour.id,
                matchId: match.id,
                yourTeam: p1Final,
                timeLimit: 40
            });
        }
        if (match.p2?.socketId) {
            io.to(match.p2.socketId).emit('tourMatchPatronPhase', {
                tourId: tour.id,
                matchId: match.id,
                yourTeam: p2Final,
                timeLimit: 40
            });
        }

        io.to(`tour_${tour.id}`).emit('tourStateUpdate', getTournamentPublicState(tour));

        match.patronTimer = setTimeout(() => {
            finalizeTourMatchPatrons(tour, match);
        }, 42000);
    }
}

function initMatchMegaDraft(tour, match) {
    const shuffledHeroes = shuffle([...allHeroes]);
    const shuffledPets = shuffle([...allPets]);

    match.draftData = {
        type: 'mega',
        pool: {
            heroes: shuffledHeroes.slice(0, 15),
            pets: shuffledPets.slice(0, 3)
        },
        turn: 'p1',
        picksLeftThisTurn: 1,
        totalPicks: 0,
        p1: { results: { heroes: [], pets: [] } },
        p2: { results: { heroes: [], pets: [] } }
    };

    if (match.p1?.socketId) {
        io.to(match.p1.socketId).emit('tourMatchMegaDraftStart', {
            tourId: tour.id,
            matchId: match.id,
            mode: 'mega',
            role: 'p1',
            pool: match.draftData.pool,
            opponentName: match.p2.username,
            opponentAvatar: match.p2.avatar,
            turn: match.draftData.turn,
            picksLeftThisTurn: match.draftData.picksLeftThisTurn,
            timeLimit: 12
        });
    }

    if (match.p2?.socketId) {
        io.to(match.p2.socketId).emit('tourMatchMegaDraftStart', {
            tourId: tour.id,
            matchId: match.id,
            mode: 'mega',
            role: 'p2',
            pool: match.draftData.pool,
            opponentName: match.p1.username,
            opponentAvatar: match.p1.avatar,
            turn: match.draftData.turn,
            picksLeftThisTurn: match.draftData.picksLeftThisTurn,
            timeLimit: 12
        });
    }

    startTourMegaTurnTimer(tour, match);
}

function startTourMegaTurnTimer(tour, match) {
    if (!match || match.status !== 'drafting') return;
    if (match.megaTurnTimer) clearTimeout(match.megaTurnTimer);

    match.megaTurnTimer = setTimeout(() => {
        if (!match || match.status !== 'drafting') return;
        const currentRole = match.draftData.turn;
        const playerState = match.draftData[currentRole];
        const pool = match.draftData.pool;

        let type = 'hero';
        let item = null;
        if (playerState.results.heroes.length < 5 && pool.heroes.length > 0) {
            type = 'hero';
            item = pool.heroes[Math.floor(Math.random() * pool.heroes.length)];
        } else if (playerState.results.pets.length < 1 && pool.pets.length > 0) {
            type = 'pet';
            item = pool.pets[Math.floor(Math.random() * pool.pets.length)];
        }

        if (item) {
            const playerSocketId = currentRole === 'p1' ? match.p1.socketId : match.p2.socketId;
            processTourMegaPick(tour, match, playerSocketId, type, item);
        }
    }, 12000);
}

function processTourMegaPick(tour, match, socketId, type, item) {
    if (!match || match.status !== 'drafting') return;
    const currentRole = match.draftData.turn;
    const currentSocketId = currentRole === 'p1' ? match.p1?.socketId : match.p2?.socketId;

    if (socketId !== currentSocketId) return;

    const playerState = match.draftData[currentRole];
    const pool = match.draftData.pool;

    if (type === 'hero' && playerState.results.heroes.length >= 5) return;
    if (type === 'pet' && playerState.results.pets.length >= 1) return;
    if (type === 'hero' && !pool.heroes.includes(item)) return;
    if (type === 'pet' && !pool.pets.includes(item)) return;

    if (type === 'hero') pool.heroes = pool.heroes.filter(h => h !== item);
    else pool.pets = pool.pets.filter(p => p !== item);

    if (type === 'hero') playerState.results.heroes.push(item);
    else playerState.results.pets.push(item);

    match.draftData.totalPicks++;
    match.draftData.picksLeftThisTurn--;

    if (match.draftData.picksLeftThisTurn === 0) {
        match.draftData.turn = currentRole === 'p1' ? 'p2' : 'p1';
        const total = match.draftData.totalPicks;
        if (total === 1 || total === 3 || total === 5 || total === 7 || total === 9) {
            match.draftData.picksLeftThisTurn = 2;
        } else if (total === 11) {
            match.draftData.picksLeftThisTurn = 1;
        }
    }

    const payload = {
        pool: match.draftData.pool,
        p1: match.draftData.p1.results,
        p2: match.draftData.p2.results,
        turn: match.draftData.turn,
        picksLeftThisTurn: match.draftData.picksLeftThisTurn,
        timeLimit: 12,
        p1Name: match.p1.username,
        p2Name: match.p2.username,
        p1Avatar: match.p1.avatar,
        p2Avatar: match.p2.avatar
    };

    if (match.p1?.socketId) io.to(match.p1.socketId).emit('tourMegaDraftUpdate', payload);
    if (match.p2?.socketId) io.to(match.p2.socketId).emit('tourMegaDraftUpdate', payload);

    if (match.draftData.totalPicks >= 12) {
        if (match.megaTurnTimer) clearTimeout(match.megaTurnTimer);
        match.draftStatus = 'patron_selection';

        const p1Final = {
            heroes: match.draftData.p1.results.heroes,
            pet: match.draftData.p1.results.pets[0] || null
        };
        const p2Final = {
            heroes: match.draftData.p2.results.heroes,
            pet: match.draftData.p2.results.pets[0] || null
        };

        match.p1Final = orderTeam(p1Final);
        match.p2Final = orderTeam(p2Final);
        match.p1Patrons = null;
        match.p2Patrons = null;

        if (match.p1?.socketId) {
            io.to(match.p1.socketId).emit('tourMatchPatronPhase', {
                tourId: tour.id,
                matchId: match.id,
                yourTeam: p1Final,
                timeLimit: 40
            });
        }
        if (match.p2?.socketId) {
            io.to(match.p2.socketId).emit('tourMatchPatronPhase', {
                tourId: tour.id,
                matchId: match.id,
                yourTeam: p2Final,
                timeLimit: 40
            });
        }

        io.to(`tour_${tour.id}`).emit('tourStateUpdate', getTournamentPublicState(tour));

        match.patronTimer = setTimeout(() => {
            finalizeTourMatchPatrons(tour, match);
        }, 42000);
    } else {
        startTourMegaTurnTimer(tour, match);
    }
}

// Player names are typed freely (login is optional), and they are shown to other
// players and placed inside buttons, so strip anything that could break the page
// and cap the length. public/player-name.js cleans names exactly the same way.
function cleanName(raw, fallback = 'Guest') {
    const name = String(raw == null ? '' : raw)
        .replace(/[\u0000-\u001f\u007f<>"'`\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 20);
    return name || fallback;
}

io.on('connection', (socket) => {
    // An error inside one handler (e.g. a malformed message) must not crash
    // the whole server, so every handler below runs inside try/catch.
    const on = socket.on.bind(socket);
    socket.on = (event, handler) => on(event, (...args) => {
        try {
            return handler(...args);
        } catch (err) {
            console.error(`Socket event "${event}" failed:`, err);
        }
    });

    // Only someone actually playing in a room, while it's drafting, may pick
    const isDraftingPlayer = room => room && room.status === 'drafting' && room.p1 && room.p2 &&
        (room.p1.id === socket.id || room.p2.id === socket.id);

    socket.on('joinRandom', (username) => {
        socket.username = cleanName(username);
        if (randomQueue.includes(socket)) return; // double click: don't match with yourself
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
        socket.username = cleanName(username);
        const roomId = generateRoomId();
        socket.join(roomId);
        rooms[roomId] = { p1: socket, status: 'waiting' };
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinCustom', ({ roomId, username }) => {
        socket.username = cleanName(username);
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
        if (!isDraftingPlayer(room)) return;
        
        const player = room.p1.id === socket.id ? room.p1 : room.p2;
        if (player.results.picked.length >= 3) return;
        
        const opponent = room.p1.id === socket.id ? room.p2 : room.p1;
        
        player.results.picked.push(picked);
        player.results.rejected.push(rejected);
        
        io.to(opponent.id).emit('opponentSelected');
        
        checkDraftComplete(room);
    });

    socket.on('joinTripleRandom', (username) => {
        socket.username = cleanName(username);
        if (tripleRandomQueue.includes(socket)) return;
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
        socket.username = cleanName(username);
        const roomId = generateRoomId();
        socket.join(roomId);
        tripleRooms[roomId] = { p1: socket, status: 'waiting' };
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinTripleCustom', ({ roomId, username }) => {
        socket.username = cleanName(username);
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
        if (!isDraftingPlayer(room)) return;
        
        const player = room.p1.id === socket.id ? room.p1 : room.p2;
        if (player.results.picked.length >= 6) return;
        
        const opponent = room.p1.id === socket.id ? room.p2 : room.p1;
        
        player.results.picked.push(picked);
        
        io.to(opponent.id).emit('opponentSelected');
        
        checkTripleDraftComplete(room);
    });

    socket.on('joinMegaRandom', (username) => {
        socket.username = cleanName(username);
        if (megaRandomQueue.includes(socket)) return;
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
        socket.username = cleanName(username);
        const roomId = generateRoomId();
        socket.join(roomId);
        megaRooms[roomId] = { p1: socket, status: 'waiting' };
        socket.emit('megaRoomCreated', roomId);
    });

    socket.on('joinMegaCustom', ({ roomId, username }) => {
        socket.username = cleanName(username);
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
        if (!isDraftingPlayer(megaRooms[roomId])) return;
        processMegaPick(roomId, socket.id, type, item);
    });

    socket.on('submitDraftPatrons', ({ roomId, patrons }) => {
        const room = rooms[roomId];
        if (!room || room.status !== 'patron_selection') return;
        if (socket.id === room.p1.id) room.p1Patrons = patrons || {};
        else if (socket.id === room.p2.id) room.p2Patrons = patrons || {};

        if (room.p1Patrons !== null && room.p2Patrons !== null) {
            finalizeDraftPatrons(room);
        }
    });

    socket.on('submitTriplePatrons', ({ roomId, patrons }) => {
        const room = tripleRooms[roomId];
        if (!room || room.status !== 'patron_selection') return;
        if (socket.id === room.p1.id) room.p1Patrons = patrons || {};
        else if (socket.id === room.p2.id) room.p2Patrons = patrons || {};

        if (room.p1Patrons !== null && room.p2Patrons !== null) {
            finalizeTriplePatrons(room);
        }
    });

    socket.on('submitMegaPatrons', ({ roomId, patrons }) => {
        const room = megaRooms[roomId];
        if (!room || room.status !== 'patron_selection') return;
        if (socket.id === room.p1.id) room.p1Patrons = patrons || {};
        else if (socket.id === room.p2.id) room.p2Patrons = patrons || {};

        if (room.p1Patrons !== null && room.p2Patrons !== null) {
            finalizeMegaPatrons(room);
        }
    });

    socket.on('cancelMatchmaking', (data) => {
        randomQueue = randomQueue.filter(s => s.id !== socket.id);
        tripleRandomQueue = tripleRandomQueue.filter(s => s.id !== socket.id);
        megaRandomQueue = megaRandomQueue.filter(s => s.id !== socket.id);
        
        if (data && data.roomId) {
            if (rooms[data.roomId] && rooms[data.roomId].p1 && rooms[data.roomId].p1.id === socket.id) {
                delete rooms[data.roomId];
            }
            if (tripleRooms[data.roomId] && tripleRooms[data.roomId].p1 && tripleRooms[data.roomId].p1.id === socket.id) {
                delete tripleRooms[data.roomId];
            }
            if (megaRooms[data.roomId] && megaRooms[data.roomId].p1 && megaRooms[data.roomId].p1.id === socket.id) {
                delete megaRooms[data.roomId];
            }
        }
    });

    socket.on('disconnect', () => {
        randomQueue = randomQueue.filter(s => s.id !== socket.id);
        tripleRandomQueue = tripleRandomQueue.filter(s => s.id !== socket.id);
        megaRandomQueue = megaRandomQueue.filter(s => s.id !== socket.id);

        for (const [id, room] of Object.entries(rooms)) {
            if (room.status === 'patron_selection' && (room.p1?.id === socket.id || room.p2?.id === socket.id)) {
                finalizeDraftPatrons(room);
            }
        }
        for (const [id, room] of Object.entries(tripleRooms)) {
            if (room.status === 'patron_selection' && (room.p1?.id === socket.id || room.p2?.id === socket.id)) {
                finalizeTriplePatrons(room);
            }
        }
        for (const [id, room] of Object.entries(megaRooms)) {
            if (room.status === 'patron_selection' && (room.p1?.id === socket.id || room.p2?.id === socket.id)) {
                finalizeMegaPatrons(room);
            }
        }

        // Free finished rooms and unjoined custom rooms this player was in,
        // otherwise they stay in memory until the server restarts
        for (const roomList of [rooms, tripleRooms, megaRooms]) {
            for (const [id, room] of Object.entries(roomList)) {
                const inRoom = room.p1?.id === socket.id || room.p2?.id === socket.id;
                if (inRoom && (room.status === 'completed' || (room.status === 'waiting' && !room.p2))) {
                    delete roomList[id];
                }
            }
        }

        for (const [tId, tour] of Object.entries(tournaments)) {
            if (tour.rounds && tour.rounds[tour.currentRoundIndex]) {
                const curRound = tour.rounds[tour.currentRoundIndex];
                curRound.matches.forEach(match => {
                    if (match.draftStatus === 'patron_selection' && (match.p1?.socketId === socket.id || match.p2?.socketId === socket.id)) {
                        finalizeTourMatchPatrons(tour, match);
                    }
                });
            }
        }
    });

    // ==========================================
    // TOURNAMENT SYSTEM SOCKET HANDLERS
    // ==========================================

    socket.on('verifyHostKey', ({ hostKey }, callback) => {
        const isValid = isValidHostKey(hostKey);
        if (typeof callback === 'function') {
            callback({ valid: isValid });
        } else {
            socket.emit('hostKeyVerified', { valid: isValid });
        }
    });

    socket.on('createTournament', ({ hostKey, name, details, rewards, playerLimit, gameMode, username, avatar }) => {
        if (!isValidHostKey(hostKey)) {
            return socket.emit('tourError', 'Invalid Host Key / Permission denied.');
        }

        const validLimits = [4, 8, 16, 32];
        const limit = validLimits.includes(parseInt(playerLimit)) ? parseInt(playerLimit) : 8;
        const validModes = ['draft', 'triple', 'mega'];
        const mode = validModes.includes(gameMode) ? gameMode : 'draft';

        const tourId = generateTourId();
        const totalRounds = Math.log2(limit);

        const tour = {
            id: tourId,
            name: name && name.trim() ? name.trim() : 'Hero Wars Tournament',
            details: details ? details.trim() : '',
            rewards: rewards ? rewards.trim() : '',
            playerLimit: limit,
            gameMode: mode,
            hostKey: hostKey.trim(),
            hostSocketId: socket.id,
            hostUsername: cleanName(username, 'Tournament Host'),
            status: 'lobby',
            currentRoundIndex: 0,
            totalRounds: totalRounds,
            players: [], // Host is NOT forced into participants!
            rounds: [],
            champion: null,
            runnerUp: null,
            createdTime: Date.now()
        };

        tournaments[tourId] = tour;
        socket.join(`tour_${tourId}`);
        socket.tourId = tourId;
        socket.isTourHost = true;

        socket.emit('tournamentCreated', {
            tourId,
            state: getTournamentPublicState(tour),
            hostKey: tour.hostKey
        });
    });

    socket.on('joinTournament', ({ tourId, username, avatar, playerId, platform, isHostJoining, hostKey }) => {
        const cleanId = (tourId || '').trim().toUpperCase();
        const tour = tournaments[cleanId];

        if (!tour) {
            return socket.emit('tourError', 'Tournament not found. Please check the Tour ID.');
        }

        username = cleanName(username);
        // A matching name normally means the same player reconnecting. Names are typed
        // freely now, so only allow that if the earlier player has actually disconnected;
        // otherwise someone could take over another player's spot by typing their name.
        const sameName = tour.players.find(p => p.username === username);
        if (sameName && sameName.socketId !== socket.id && io.sockets.sockets.get(sameName.socketId)) {
            return socket.emit('tourError', `The name "${username}" is already taken in this tournament. Please type a different name.`);
        }

        socket.join(`tour_${cleanId}`);
        socket.tourId = cleanId;

        // If the host is re-authenticating
        if (hostKey && isValidHostKey(hostKey) && hostKey.trim() === tour.hostKey) {
            tour.hostSocketId = socket.id;
            socket.isTourHost = true;
        }

        const cleanPlayerId = (playerId || '').trim();
        const cleanPlatform = (platform === 'FB') ? 'FB' : 'WEB';

        // Check if player already in tournament
        let player = tour.players.find(p => p.username === username);

        if (player) {
            // Reconnecting player
            player.socketId = socket.id;
            player.avatar = avatar || getUserAvatar(username) || player.avatar;
            if (cleanPlayerId) player.playerId = cleanPlayerId;
            if (platform) player.platform = cleanPlatform;
            // Update active match socket if playing
            const curRound = tour.rounds[tour.currentRoundIndex];
            if (curRound) {
                curRound.matches.forEach(m => {
                    if (m.p1 && m.p1.username === username) {
                        m.p1.socketId = socket.id;
                        m.p1.playerId = player.playerId;
                        m.p1.platform = player.platform;
                    }
                    if (m.p2 && m.p2.username === username) {
                        m.p2.socketId = socket.id;
                        m.p2.playerId = player.playerId;
                        m.p2.platform = player.platform;
                    }
                });
            }
        } else {
            // New join
            if (tour.status !== 'lobby') {
                // If tournament already started, allow joining as spectator!
                socket.emit('tourJoinedAsSpectator', {
                    message: 'Tournament already started. You are now spectating.',
                    state: getTournamentPublicState(tour)
                });
                return;
            }

            if (tour.players.length >= tour.playerLimit) {
                return socket.emit('tourError', 'Tournament is full! You can watch as spectator once it starts.');
            }

            player = {
                username,
                avatar: avatar || getUserAvatar(username) || 'avatar1.jpg',
                playerId: cleanPlayerId,
                platform: cleanPlatform,
                socketId: socket.id,
                isHost: isHostJoining || (socket.id === tour.hostSocketId),
                eliminated: false,
                joinedAt: Date.now()
            };
            tour.players.push(player);
        }

        const state = getTournamentPublicState(tour);
        io.to(`tour_${cleanId}`).emit('tourStateUpdate', state);
        socket.emit('tourJoinedSuccess', { tourId: cleanId, state });
    });

    socket.on('leaveTournament', ({ tourId, username }) => {
        username = cleanName(username);
        const cleanId = (tourId || '').trim().toUpperCase();
        const tour = tournaments[cleanId];
        if (!tour) return;

        socket.leave(`tour_${cleanId}`);
        if (tour.status === 'lobby') {
            tour.players = tour.players.filter(p => p.username !== username);
            io.to(`tour_${cleanId}`).emit('tourStateUpdate', getTournamentPublicState(tour));
        }
        socket.emit('tourLeft');
    });

    socket.on('tourSetGameMode', ({ tourId, gameMode, hostKey }) => {
        const tour = tournaments[tourId];
        if (!tour) return;
        if (tour.hostKey !== (hostKey || '').trim()) {
            return socket.emit('tourError', 'Host permission required.');
        }
        if (['draft', 'triple', 'mega'].includes(gameMode)) {
            tour.gameMode = gameMode;
            io.to(`tour_${tourId}`).emit('tourStateUpdate', getTournamentPublicState(tour));
        }
    });

    socket.on('startTournament', ({ tourId, hostKey }) => {
        const tour = tournaments[tourId];
        if (!tour) return;
        if (tour.hostKey !== (hostKey || '').trim()) {
            return socket.emit('tourError', 'Host permission required.');
        }

        if (tour.players.length < 2) {
            return socket.emit('tourError', 'Need at least 2 players to start the tournament.');
        }

        if (tour.status !== 'lobby') {
            return socket.emit('tourError', 'Tournament already started.');
        }

        // Fill remaining slots if any or seed bracket
        setupInitialRound(tour);

        tour.status = 'countdown';
        io.to(`tour_${tour.id}`).emit('tourCountdown', { seconds: 5 });

        setTimeout(() => {
            if (!tournaments[tour.id]) return;
            tour.status = 'in_round';
            startMatchesForRound(tour, 0);
            io.to(`tour_${tour.id}`).emit('tourStateUpdate', getTournamentPublicState(tour));
        }, 5500);
    });

    socket.on('tourMakeChoice', ({ tourId, matchId, index, picked, rejected }) => {
        const tour = tournaments[tourId];
        if (!tour || tour.status !== 'in_round') return;

        const curRound = tour.rounds[tour.currentRoundIndex];
        if (!curRound) return;
        const match = curRound.matches.find(m => m.id === matchId);
        if (!match || match.status !== 'drafting') return;

        const isP1 = match.p1 && match.p1.socketId === socket.id;
        const isP2 = match.p2 && match.p2.socketId === socket.id;
        if (!isP1 && !isP2) return;

        const playerState = isP1 ? match.draftData.p1 : match.draftData.p2;
        if (playerState.results.picked.length >= 3) return;

        playerState.results.picked.push(picked);
        playerState.results.rejected.push(rejected);

        const opponentSocketId = isP1 ? match.p2.socketId : match.p1.socketId;
        if (opponentSocketId) {
            io.to(opponentSocketId).emit('tourOpponentSelected');
        }

        checkTourDraftComplete(tour, match);
    });

    socket.on('tourMakeTripleChoice', ({ tourId, matchId, index, picked }) => {
        const tour = tournaments[tourId];
        if (!tour || tour.status !== 'in_round') return;

        const curRound = tour.rounds[tour.currentRoundIndex];
        if (!curRound) return;
        const match = curRound.matches.find(m => m.id === matchId);
        if (!match || match.status !== 'drafting') return;

        const isP1 = match.p1 && match.p1.socketId === socket.id;
        const isP2 = match.p2 && match.p2.socketId === socket.id;
        if (!isP1 && !isP2) return;

        const playerState = isP1 ? match.draftData.p1 : match.draftData.p2;
        if (playerState.results.picked.length >= 6) return;

        playerState.results.picked.push(picked);

        const opponentSocketId = isP1 ? match.p2.socketId : match.p1.socketId;
        if (opponentSocketId) {
            io.to(opponentSocketId).emit('tourOpponentSelected');
        }

        checkTourTripleDraftComplete(tour, match);
    });

    socket.on('tourMakeMegaChoice', ({ tourId, matchId, type, item }) => {
        const tour = tournaments[tourId];
        if (!tour || tour.status !== 'in_round') return;

        const curRound = tour.rounds[tour.currentRoundIndex];
        if (!curRound) return;
        const match = curRound.matches.find(m => m.id === matchId);
        if (!match || match.status !== 'drafting') return;

        processTourMegaPick(tour, match, socket.id, type, item);
    });

    socket.on('submitTourPatrons', ({ tourId, matchId, patrons }) => {
        const tour = tournaments[tourId];
        if (!tour) return;
        const curRound = tour.rounds[tour.currentRoundIndex];
        if (!curRound) return;
        const match = curRound.matches.find(m => m.id === matchId);
        if (!match || match.draftStatus !== 'patron_selection') return;

        if (match.p1 && match.p1.socketId === socket.id) match.p1Patrons = patrons || {};
        else if (match.p2 && match.p2.socketId === socket.id) match.p2Patrons = patrons || {};

        if (match.p1Patrons !== null && match.p2Patrons !== null) {
            finalizeTourMatchPatrons(tour, match);
        }
    });

    socket.on('declareWinner', ({ tourId, matchId, winnerUsername, hostKey }) => {
        const tour = tournaments[tourId];
        if (!tour) return;
        if (tour.hostKey !== (hostKey || '').trim()) {
            return socket.emit('tourError', 'Host permission required.');
        }

        const curRound = tour.rounds[tour.currentRoundIndex];
        if (!curRound) return;
        const match = curRound.matches.find(m => m.id === matchId);
        if (!match) return;

        if (match.status === 'completed') {
            return socket.emit('tourError', 'Match already completed.');
        }

        if (match.p1 && match.p2 && (!match.p1Deck || !match.p2Deck)) {
            return socket.emit('tourError', 'Cannot declare a winner while players are still drafting teams.');
        }

        if (![match.p1?.username, match.p2?.username].includes(winnerUsername)) {
            return socket.emit('tourError', 'Winner must be one of the match participants.');
        }

        match.winner = winnerUsername;
        match.status = 'completed';

        const loserUsername = match.p1.username === winnerUsername ? match.p2?.username : match.p1?.username;
        if (loserUsername) {
            const loser = tour.players.find(p => p.username === loserUsername);
            if (loser) loser.eliminated = true;
        }

        // Check if all active matches in this round are completed
        const activeMatches = curRound.matches.filter(m => m.p1 || m.p2);
        const allRoundMatchesDone = activeMatches.length > 0 && activeMatches.every(m => m.status === 'completed' && m.winner);

        if (allRoundMatchesDone) {
            curRound.status = 'completed';
            // Is this the Grand Finals? (Only 1 active match)
            if (activeMatches.length === 1) {
                tour.status = 'finished';
                const finalMatch = activeMatches[0];
                const champUser = finalMatch.winner;
                const runnerUser = finalMatch.p1.username === champUser ? finalMatch.p2?.username : finalMatch.p1?.username;
                const champPlayer = tour.players.find(p => p.username === champUser);
                const runnerPlayer = runnerUser ? tour.players.find(p => p.username === runnerUser) : null;

                const champPlayerId = champPlayer?.playerId || (finalMatch.p1?.username === champUser ? finalMatch.p1?.playerId : finalMatch.p2?.playerId) || '';
                const champPlatform = champPlayer?.platform || (finalMatch.p1?.username === champUser ? finalMatch.p1?.platform : finalMatch.p2?.platform) || 'WEB';

                const runnerPlayerId = runnerPlayer?.playerId || (finalMatch.p1?.username === runnerUser ? finalMatch.p1?.playerId : finalMatch.p2?.playerId) || '';
                const runnerPlatform = runnerPlayer?.platform || (finalMatch.p1?.username === runnerUser ? finalMatch.p1?.platform : finalMatch.p2?.platform) || 'WEB';

                tour.champion = {
                    username: champUser,
                    avatar: getUserAvatar(champUser) || champPlayer?.avatar || 'avatar1.jpg',
                    playerId: champPlayerId,
                    platform: champPlatform
                };
                tour.runnerUp = {
                    username: runnerUser || 'None',
                    avatar: getUserAvatar(runnerUser) || runnerPlayer?.avatar || 'avatar2.jpg',
                    playerId: runnerPlayerId,
                    platform: runnerPlatform
                };
                io.to(`tour_${tour.id}`).emit('tourFinished', {
                    champion: tour.champion,
                    runnerUp: tour.runnerUp,
                    rewards: tour.rewards
                });
            } else {
                tour.status = 'round_completed';
                io.to(`tour_${tour.id}`).emit('tourRoundEnded', {
                    roundIndex: tour.currentRoundIndex,
                    roundName: curRound.roundName,
                    message: `All matches for ${curRound.roundName} completed! Host can select next mode and start next round.`
                });
            }
        }

        io.to(`tour_${tour.id}`).emit('tourStateUpdate', getTournamentPublicState(tour));
    });

    socket.on('startNextRound', ({ tourId, hostKey, nextGameMode }) => {
        const tour = tournaments[tourId];
        if (!tour) return;
        if (tour.hostKey !== (hostKey || '').trim()) {
            return socket.emit('tourError', 'Host permission required.');
        }

        if (tour.status !== 'round_completed') {
            return socket.emit('tourError', 'Current round is not complete yet.');
        }

        if (['draft', 'triple', 'mega'].includes(nextGameMode)) {
            tour.gameMode = nextGameMode;
        }

        const prevRound = tour.rounds[tour.currentRoundIndex];
        const winners = prevRound.matches.map(m => m.winner);

        const nextRoundIndex = tour.currentRoundIndex + 1;
        tour.currentRoundIndex = nextRoundIndex;

        const nextMatches = [];
        for (let i = 0; i < winners.length; i += 2) {
            const p1User = winners[i];
            const p2User = winners[i + 1];
            const p1Player = tour.players.find(p => p.username === p1User);
            const p2Player = tour.players.find(p => p.username === p2User);

            nextMatches.push({
                id: `m_${nextRoundIndex}_${Math.floor(i / 2)}`,
                matchNumber: Math.floor(i / 2) + 1,
                p1: p1Player ? {
                    username: p1Player.username,
                    avatar: p1Player.avatar,
                    playerId: p1Player.playerId || '',
                    platform: p1Player.platform || 'WEB',
                    socketId: p1Player.socketId
                } : null,
                p2: p2Player ? {
                    username: p2Player.username,
                    avatar: p2Player.avatar,
                    playerId: p2Player.playerId || '',
                    platform: p2Player.platform || 'WEB',
                    socketId: p2Player.socketId
                } : null,
                p1Deck: null,
                p2Deck: null,
                draftStatus: 'pending',
                winner: null,
                status: 'pending'
            });
        }

        tour.rounds.push({
            roundIndex: nextRoundIndex,
            roundName: getRoundName(tour.playerLimit, nextRoundIndex),
            gameMode: tour.gameMode,
            status: 'pending',
            matches: nextMatches
        });

        tour.status = 'countdown';
        io.to(`tour_${tour.id}`).emit('tourCountdown', { seconds: 5 });

        setTimeout(() => {
            if (!tournaments[tour.id]) return;
            tour.status = 'in_round';
            startMatchesForRound(tour, nextRoundIndex);
            io.to(`tour_${tour.id}`).emit('tourStateUpdate', getTournamentPublicState(tour));
        }, 5500);
    });

    socket.on('getTournamentState', ({ tourId }) => {
        const tour = tournaments[tourId];
        if (tour) {
            socket.emit('tourStateUpdate', getTournamentPublicState(tour));
        } else {
            socket.emit('tourError', 'Tournament not found.');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
