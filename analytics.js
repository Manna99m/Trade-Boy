// analytics.js - Lightweight, self-hosted, privacy-first analytics for Trade Boy
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, 'analytics-data.json');
const SALT = crypto.randomBytes(16).toString('hex');

// In-memory data store
let data = {
    daily: {},      // 'YYYY-MM-DD' -> { pageviews, uniques: [hashes], pages: {}, referrers: {}, countries: {}, devices: {}, events: {} }
    recentVisits: [] // Array of last 50 visits
};

// Map of visitorHash -> lastSeenTimestamp
const activeVisitors = new Map();

// Load persisted data
try {
    if (fs.existsSync(DATA_FILE)) {
        const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (raw && typeof raw.daily === 'object') {
            data.daily = raw.daily;
            data.recentVisits = Array.isArray(raw.recentVisits) ? raw.recentVisits : [];
        }
    }
} catch (e) {
    console.error('[Analytics] Failed to load analytics-data.json:', e.message);
}

// Debounced file save
let saveTimeout = null;
let isDirty = false;

function scheduleSave() {
    isDirty = true;
    if (saveTimeout) return;
    saveTimeout = setTimeout(saveToDisk, 20000); // write at most once every 20s
}

function saveToDisk() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    if (!isDirty) return;
    try {
        // Keep only last 90 days of daily data
        const keys = Object.keys(data.daily).sort();
        if (keys.length > 90) {
            const toRemove = keys.slice(0, keys.length - 90);
            toRemove.forEach(k => delete data.daily[k]);
        }
        // Save to disk
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        isDirty = false;
    } catch (e) {
        console.error('[Analytics] Error saving analytics-data.json:', e.message);
    }
}

// Save on process exit
process.on('SIGINT', saveToDisk);
process.on('SIGTERM', saveToDisk);

// Bot regex
const BOT_REGEX = /bot|crawler|spider|crawling|googlebot|bingbot|yandex|baidu|duckduckbot|slurp|twitterbot|facebookexternalhit|discordbot|curl|wget|postman|headlesschrome|bytespider|ahrefsbot|semrushbot|dotbot/i;

function isBot(ua) {
    return !ua || BOT_REGEX.test(ua);
}

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

function getVisitorHash(req) {
    const ip = req.headers['cf-connecting-ip'] || 
               req.headers['x-forwarded-for']?.split(',')[0].trim() || 
               req.socket?.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const today = getTodayKey();
    return crypto.createHash('sha256').update(ip + ua + today + SALT).digest('hex').slice(0, 16);
}

function parseReferrer(ref) {
    if (!ref) return 'Direct / None';
    try {
        const lower = ref.toLowerCase();
        if (lower.startsWith('android-app://com.discord') || lower.includes('discord')) return 'Discord';
        if (lower.startsWith('android-app://com.google') || lower.includes('google.')) return 'Google';
        if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
        if (lower.includes('reddit.com')) return 'Reddit';
        if (lower.includes('facebook.com') || lower.includes('fb.me')) return 'Facebook';
        if (lower.includes('twitter.com') || lower.includes('x.com') || lower.includes('t.co')) return 'Twitter / X';
        if (lower.includes('t.me') || lower.includes('telegram')) return 'Telegram';
        if (lower.includes('vk.com')) return 'VKontakte';

        const host = new URL(ref).hostname.toLowerCase();
        if (host.includes('trade-boy.com') || host.includes('trade-boy.onrender.com') || host.includes('localhost')) {
            return 'Internal';
        }
        return host.replace(/^www\./, '');
    } catch (e) {
        return 'Direct / None';
    }
}

function parseDevice(ua) {
    if (!ua) return 'desktop';
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
        return 'mobile';
    }
    if (/ipad|tablet/i.test(ua)) {
        return 'tablet';
    }
    return 'desktop';
}

function getCountry(req) {
    const cf = req.headers['cf-ipcountry'];
    if (cf && cf !== 'XX' && cf !== 'T1') return cf.toUpperCase();
    return 'Unknown';
}

// Clean pathname for cleaner stats
function normalizePath(urlPath) {
    try {
        const p = urlPath.split('?')[0].replace(/\/+$/, '') || '/';
        return p;
    } catch (e) {
        return urlPath;
    }
}

const STATIC_EXT_REGEX = /\.(css|js|png|jpg|jpeg|gif|webp|ico|svg|woff|woff2|ttf|map|json|webmanifest|txt|xml)$/i;

function initDailyRecord(dayKey) {
    if (!data.daily[dayKey]) {
        data.daily[dayKey] = {
            pageviews: 0,
            uniques: [], // list of hashes for that day
            pages: {},
            referrers: {},
            countries: {},
            devices: {},
            events: {}
        };
    }
}

// Tracking middleware for incoming HTTP requests
function trackMiddleware(req, res, next) {
    if (req.method !== 'GET') return next();

    const urlPath = req.originalUrl || req.url;
    // Skip static assets, socket.io, api routes, and analytics routes
    if (STATIC_EXT_REGEX.test(urlPath)) return next();
    if (urlPath.startsWith('/socket.io') || urlPath.startsWith('/api/') || urlPath.startsWith('/analytics')) return next();

    const ua = req.headers['user-agent'] || '';
    if (isBot(ua)) return next();

    const dayKey = getTodayKey();
    initDailyRecord(dayKey);

    const record = data.daily[dayKey];
    const hash = getVisitorHash(req);
    const page = normalizePath(urlPath);
    const rawRef = req.headers['referer'] || req.headers['referrer'] || '';
    const ref = parseReferrer(rawRef);
    const country = getCountry(req);
    const device = parseDevice(ua);

    // Record active ping
    activeVisitors.set(hash, Date.now());

    // Pageview
    record.pageviews = (record.pageviews || 0) + 1;

    // Unique visitor check
    let isNewVisitor = false;
    if (!Array.isArray(record.uniques)) record.uniques = [];
    if (!record.uniques.includes(hash)) {
        record.uniques.push(hash);
        isNewVisitor = true;
    }

    // Top pages
    record.pages[page] = (record.pages[page] || 0) + 1;

    // Referrers (ignore pure internal clicks to keep acquisition sources clear)
    if (ref !== 'Internal') {
        record.referrers[ref] = (record.referrers[ref] || 0) + 1;
    }

    // Countries
    record.countries[country] = (record.countries[country] || 0) + 1;

    // Devices
    record.devices[device] = (record.devices[device] || 0) + 1;

    // Recent visits log (keep 40 latest)
    data.recentVisits.unshift({
        time: new Date().toISOString(),
        page,
        ref: ref === 'Internal' ? 'Direct' : ref,
        country,
        device,
        isNew: isNewVisitor
    });
    if (data.recentVisits.length > 40) {
        data.recentVisits.length = 40;
    }

    scheduleSave();
    next();
}

// Track custom event (e.g. affiliate click, promo code copy)
function trackEvent(name) {
    const dayKey = getTodayKey();
    initDailyRecord(dayKey);
    const record = data.daily[dayKey];
    record.events = record.events || {};
    record.events[name] = (record.events[name] || 0) + 1;
    scheduleSave();
}

function getActiveCount() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [hash, time] of activeVisitors.entries()) {
        if (time < fiveMinutesAgo) activeVisitors.delete(hash);
    }
    return activeVisitors.size;
}

// Country code to friendly name & flag emoji map
const COUNTRY_NAMES = {
    'US': 'United States 🇺🇸',
    'DE': 'Germany 🇩🇪',
    'RU': 'Russia 🇷🇺',
    'BD': 'Bangladesh 🇧🇩',
    'GB': 'United Kingdom 🇬🇧',
    'FR': 'France 🇫🇷',
    'CA': 'Canada 🇨🇦',
    'PL': 'Poland 🇵🇱',
    'UA': 'Ukraine 🇺🇦',
    'BR': 'Brazil 🇧🇷',
    'IN': 'India 🇮🇳',
    'AU': 'Australia 🇦🇺',
    'IT': 'Italy 🇮🇹',
    'ES': 'Spain 🇪🇸',
    'NL': 'Netherlands 🇳🇱',
    'TR': 'Turkey 🇹🇷',
    'JP': 'Japan 🇯🇵',
    'KR': 'South Korea 🇰🇷',
    'ID': 'Indonesia 🇮🇩',
    'PH': 'Philippines 🇵🇭',
    'VN': 'Vietnam 🇻🇳',
    'TH': 'Thailand 🇹🇭',
    'MX': 'Mexico 🇲🇽',
    'AR': 'Argentina 🇦🇷',
    'CL': 'Chile 🇨🇱',
    'Unknown': 'Global / Other 🌐'
};

function getStats(range = '7d') {
    const today = new Date();
    const days = [];
    let count = 7;
    if (range === 'today') count = 1;
    else if (range === '7d') count = 7;
    else if (range === '30d') count = 30;
    else if (range === 'all') count = 90;

    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setUTCDate(today.getUTCDate() - i);
        days.push(d.toISOString().slice(0, 10));
    }

    let totalViews = 0;
    const uniqueHashes = new Set();
    const pageCounts = {};
    const refCounts = {};
    const countryCounts = {};
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
    const eventCounts = {};
    const timeline = [];

    days.forEach(day => {
        const rec = data.daily[day];
        const views = rec?.pageviews || 0;
        const uniques = rec?.uniques?.length || 0;
        totalViews += views;

        if (rec && Array.isArray(rec.uniques)) {
            rec.uniques.forEach(h => uniqueHashes.add(h));
        }

        timeline.push({ date: day.slice(5), views, uniques });

        if (rec) {
            if (rec.pages) {
                Object.entries(rec.pages).forEach(([p, c]) => {
                    pageCounts[p] = (pageCounts[p] || 0) + c;
                });
            }
            if (rec.referrers) {
                Object.entries(rec.referrers).forEach(([r, c]) => {
                    refCounts[r] = (refCounts[r] || 0) + c;
                });
            }
            if (rec.countries) {
                Object.entries(rec.countries).forEach(([cn, c]) => {
                    countryCounts[cn] = (countryCounts[cn] || 0) + c;
                });
            }
            if (rec.devices) {
                Object.entries(rec.devices).forEach(([dev, c]) => {
                    deviceCounts[dev] = (deviceCounts[dev] || 0) + c;
                });
            }
            if (rec.events) {
                Object.entries(rec.events).forEach(([ev, c]) => {
                    eventCounts[ev] = (eventCounts[ev] || 0) + c;
                });
            }
        }
    });

    // Format top lists
    const topPages = Object.entries(pageCounts)
        .map(([page, views]) => ({ page, views, pct: totalViews > 0 ? Math.round((views / totalViews) * 100) : 0 }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

    const totalRefs = Object.values(refCounts).reduce((a, b) => a + b, 0);
    const topReferrers = Object.entries(refCounts)
        .map(([source, count]) => ({ source, count, pct: totalRefs > 0 ? Math.round((count / totalRefs) * 100) : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    const topCountries = Object.entries(countryCounts)
        .map(([code, count]) => ({
            code,
            name: COUNTRY_NAMES[code] || `${code} 🏳️`,
            count,
            pct: totalViews > 0 ? Math.round((count / totalViews) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    return {
        liveNow: getActiveCount(),
        totalViews,
        totalUniques: uniqueHashes.size,
        range,
        timeline,
        topPages,
        topReferrers,
        topCountries,
        devices: deviceCounts,
        events: eventCounts,
        recentVisits: data.recentVisits.slice(0, 20)
    };
}

module.exports = {
    trackMiddleware,
    trackEvent,
    getStats,
    saveToDisk
};

