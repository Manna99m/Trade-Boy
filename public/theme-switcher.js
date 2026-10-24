// Site theme: Glass (original look), Light (black & white), Dark, or System
// (the default: follows the device's light/dark setting and switches live).
// Loaded right after theme.css in <head> so the theme is applied before the
// page is drawn. The choice is remembered in localStorage ('siteTheme').
(function () {
    const THEMES = [
        ['glass', 'Glass'],
        ['light', 'Light'],
        ['dark', 'Dark'],
        ['system', 'System']
    ];
    const DEFAULT_THEME = 'system';
    const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function getTheme() {
        try {
            const saved = localStorage.getItem('siteTheme');
            return THEMES.some(t => t[0] === saved) ? saved : DEFAULT_THEME;
        } catch (e) {
            return DEFAULT_THEME;
        }
    }

    function resolveTheme(theme) {
        // System resolves to Light or Dark from the device setting
        return theme === 'system' ? (darkQuery && darkQuery.matches ? 'dark' : 'light') : theme;
    }

    function applyTheme(theme) {
        const resolved = resolveTheme(theme);
        // Glass = the original styles only, so the theme stylesheet is switched off
        const sheet = document.getElementById('theme-css');
        if (sheet) sheet.disabled = resolved === 'glass';
        document.documentElement.setAttribute('data-theme', resolved);
    }

    applyTheme(getTheme());

    // Device switched between light and dark while the page is open
    if (darkQuery) {
        const onChange = () => { if (getTheme() === 'system') applyTheme('system'); };
        if (darkQuery.addEventListener) darkQuery.addEventListener('change', onChange);
        else if (darkQuery.addListener) darkQuery.addListener(onChange);
    }

    // ---------- "Light on / light off" switch animation ----------
    // A round bulb drops in with a pull cord beside it. A hand reaches up from
    // the bottom of the screen, pinches the cord's bead and tugs it: the bulb
    // switches on (light themes: warm light floods the screen) or off (dark:
    // darkness spreads). The new theme is applied while the screen is covered,
    // then it fades away. Skipped for people who prefer reduced motion.
    const FX_TOTAL = 2600;   // whole animation (ms)
    const FX_PULL = 1150;    // moment the cord is tugged and the bulb flips
    const FX_SWAP = 1950;    // screen fully covered: theme swaps underneath

    const FX_CSS = `
.tb-theme-fx { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; overflow: hidden; --cord: 46vh; }
.tb-burst {
    position: absolute; left: 50%; top: 168px; width: 300vmax; height: 300vmax;
    margin: -150vmax 0 0 -150vmax; border-radius: 50%; transform: scale(0); opacity: 0;
    animation: tbBurst 0.8s ${FX_PULL}ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
.tb-theme-fx.on .tb-burst {
    background: radial-gradient(circle, #fffdf3 0%, #fff6d6 35%, #fff1c4 60%, rgba(255, 241, 196, 0.97) 69%, rgba(255, 241, 196, 0) 71%);
}
.tb-theme-fx.off .tb-burst {
    background: radial-gradient(circle, #050505 0%, #0b0b0b 55%, rgba(11, 11, 11, 0.97) 69%, rgba(11, 11, 11, 0) 71%);
}
.tb-theme-fx.fade { transition: opacity 0.5s ease; opacity: 0; }

/* Bulb + pull cord hang from the top and drop in together */
.tb-rig {
    position: absolute; top: 0; left: 50%; width: 0; height: 0;
    transform: translateY(-120vh); animation: tbRig ${FX_TOTAL}ms ease-in-out forwards;
}
.tb-bulb { position: absolute; top: 0; left: -60px; width: 120px; }
.tb-bulb svg { display: block; width: 100%; height: auto; overflow: visible; }
.tb-glass { fill: #ffffff; transition: fill 0.15s ease, filter 0.15s ease; }
.tb-theme-fx.lit .tb-glass { fill: #ffe27a; filter: drop-shadow(0 0 22px #ffd84d) drop-shadow(0 0 48px rgba(255, 216, 77, 0.8)); }
.tb-ray { stroke: #ffcf3d; stroke-width: 5; stroke-linecap: round; opacity: 0; transition: opacity 0.15s ease; }
.tb-theme-fx.lit .tb-ray { opacity: 1; }
.tb-cord {
    position: absolute; top: 0; left: 78px; width: 3px; height: var(--cord);
    background: #111; animation: tbCord ${FX_TOTAL}ms ease-in-out forwards;
}
.tb-cord::after {
    content: ''; position: absolute; left: 50%; bottom: -12px; width: 16px; height: 16px;
    margin-left: -8px; border-radius: 50%; background: #111;
}

/* Hand + sleeve rise from the bottom to the cord's bead */
.tb-hand {
    position: absolute; left: 50%; margin-left: 25px; top: calc(var(--cord) - 52px); width: 110px;
    transform: translateY(110vh); animation: tbHand ${FX_TOTAL}ms ease-in-out forwards;
}
.tb-hand svg { display: block; width: 100%; height: auto; }
.tb-sleeve {
    width: 62px; height: 110vh; margin: -8px auto 0 22px;
    background: linear-gradient(90deg, #7fb7bf, #9fd0d6 45%, #7fb7bf);
    border-top: 14px solid #6aa3ab; border-radius: 6px 6px 0 0;
}

/* Going dark: once switched off, draw the bulb and cord in light lines so they stay visible on black */
.tb-theme-fx.off:not(.lit) .tb-bulb [stroke] { stroke: #cfcfcf; transition: stroke 0.15s ease; }
.tb-theme-fx.off:not(.lit) .tb-bulb .tb-socket { fill: #1c1c1c; }
.tb-theme-fx.off:not(.lit) .tb-glass { fill: #2a2a2a; }
.tb-theme-fx.off:not(.lit) .tb-cord, .tb-theme-fx.off:not(.lit) .tb-cord::after { background: #cfcfcf; }

/* Timeline (percent of ${FX_TOTAL}ms): drop in, hand rises, tug, release, hand leaves, rig rises */
@keyframes tbRig {
    0%   { transform: translateY(-120vh); }
    14%  { transform: translateY(0); }
    44%  { transform: translateY(0); }
    47%  { transform: translateY(10px); }
    52%  { transform: translateY(0); }
    84%  { transform: translateY(0); }
    100% { transform: translateY(-120vh); }
}
@keyframes tbCord {
    0%, 38% { height: var(--cord); }
    44%     { height: calc(var(--cord) + 46px); }
    52%     { height: var(--cord); }
    100%    { height: var(--cord); }
}
@keyframes tbHand {
    0%, 12% { transform: translateY(110vh); }
    34%     { transform: translateY(0); }
    38%     { transform: translateY(0); }
    44%     { transform: translateY(46px); }
    50%     { transform: translateY(40px); }
    70%     { transform: translateY(110vh); }
    100%    { transform: translateY(110vh); }
}
@keyframes tbBurst {
    0%   { transform: scale(0); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
}`;

    // Round bulb: socket on top, big round glass, little filament
    const BULB_SVG = `
<svg viewBox="0 0 120 230" aria-hidden="true">
    <line x1="60" y1="0" x2="60" y2="96" stroke="#111" stroke-width="3"/>
    <rect class="tb-socket" x="46" y="94" width="28" height="24" rx="6" fill="#fff" stroke="#111" stroke-width="3"/>
    <line x1="46" y1="102" x2="74" y2="102" stroke="#111" stroke-width="2.5"/>
    <line x1="46" y1="109" x2="74" y2="109" stroke="#111" stroke-width="2.5"/>
    <path class="tb-glass" d="M50 118 L70 118 C72 124 76 126 82 129 A48 48 0 1 1 38 129 C44 126 48 124 50 118 Z" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
    <path d="M52 168 C52 156 56 150 60 150 C64 150 68 156 68 168" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="56" y1="120" x2="54" y2="160" stroke="#111" stroke-width="2"/>
    <line x1="64" y1="120" x2="66" y2="160" stroke="#111" stroke-width="2"/>
    <line class="tb-ray" x1="-4" y1="168" x2="6" y2="168"/>
    <line class="tb-ray" x1="114" y1="168" x2="124" y2="168"/>
    <line class="tb-ray" x1="4" y1="132" x2="12" y2="138"/>
    <line class="tb-ray" x1="116" y1="132" x2="108" y2="138"/>
    <line class="tb-ray" x1="10" y1="206" x2="18" y2="200"/>
    <line class="tb-ray" x1="110" y1="206" x2="102" y2="200"/>
    <line class="tb-ray" x1="60" y1="226" x2="60" y2="236"/>
</svg>`;

    // Closed fist gripping the cord (drawn in front of it, so the cord disappears into the hand)
    const HAND_SVG = `
<svg viewBox="0 0 110 120" aria-hidden="true">
    <g stroke="#3a2a22" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">
        <rect x="18" y="26" width="72" height="84" rx="30" fill="#f2d5c0"/>
        <path d="M18 50 C26 50 34 52 40 56" fill="none"/>
        <path d="M18 70 C26 70 34 72 40 76" fill="none"/>
        <path d="M20 90 C27 90 34 92 40 95" fill="none"/>
        <path d="M86 66 C100 52 96 30 78 26 C66 24 58 28 52 36 C60 38 68 42 72 50" fill="#f2d5c0"/>
        <ellipse cx="80" cy="34" rx="6" ry="4" transform="rotate(-20 80 34)" fill="#e9c2b0" stroke="none"/>
    </g>
</svg>`;

    let animating = false;

    function playSwitchAnimation(theme, done) {
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion || animating) { applyTheme(theme); done(); return; }
        animating = true;

        if (!document.getElementById('tb-theme-fx-css')) {
            const style = document.createElement('style');
            style.id = 'tb-theme-fx-css';
            style.textContent = FX_CSS;
            document.head.appendChild(style);
        }

        const goingDark = resolveTheme(theme) === 'dark';
        const fx = document.createElement('div');
        // Light themes: bulb starts off and turns on. Dark: starts on and turns off.
        fx.className = 'tb-theme-fx ' + (goingDark ? 'off lit' : 'on');
        fx.innerHTML = `
            <div class="tb-burst"></div>
            <div class="tb-rig"><div class="tb-cord"></div><div class="tb-bulb">${BULB_SVG}</div></div>
            <div class="tb-hand">${HAND_SVG}<div class="tb-sleeve"></div></div>`;
        document.body.appendChild(fx);

        // The tug on the cord flips the bulb
        setTimeout(() => fx.classList.toggle('lit'), FX_PULL);
        // Screen fully covered: swap the theme underneath
        setTimeout(() => { applyTheme(theme); done(); }, FX_SWAP);
        // Reveal the new theme
        setTimeout(() => fx.classList.add('fade'), FX_SWAP + 60);
        setTimeout(() => { fx.remove(); animating = false; }, FX_TOTAL + 100);
    }

    const icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"></path></svg>';

    function buildSwitcher() {
        const rightGroup = document.querySelector('.top-nav > div:last-child');
        if (!rightGroup || document.querySelector('.theme-menu-container')) return;

        const current = getTheme();
        const container = document.createElement('div');
        container.className = 'theme-menu-container notranslate';
        container.style.position = 'relative';
        container.innerHTML = `
            <button type="button" class="nav-icon-btn theme-toggle-btn" aria-label="Change theme" aria-haspopup="true">
                ${icon}<span class="theme-label"></span>
            </button>
            <div class="lang-dropdown theme-dropdown" role="menu" style="display: none;"></div>
        `;

        const btn = container.querySelector('.theme-toggle-btn');
        const label = container.querySelector('.theme-label');
        const menu = container.querySelector('.theme-dropdown');

        function render(theme) {
            label.textContent = THEMES.find(t => t[0] === theme)[1];
            menu.innerHTML = '';
            THEMES.forEach(([value, name]) => {
                const opt = document.createElement('div');
                opt.className = 'lang-option' + (value === theme ? ' active' : '');
                opt.setAttribute('role', 'menuitem');
                opt.dataset.themeOption = value;
                opt.textContent = name;
                menu.appendChild(opt);
            });
        }

        render(current);

        btn.addEventListener('click', e => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        menu.addEventListener('click', e => {
            const opt = e.target.closest('[data-theme-option]');
            if (!opt) return;
            const theme = opt.dataset.themeOption;
            menu.style.display = 'none';
            if (theme === getTheme()) return;
            try { localStorage.setItem('siteTheme', theme); } catch (err) {}
            playSwitchAnimation(theme, () => render(theme));
        });

        document.addEventListener('click', e => {
            if (!container.contains(e.target)) menu.style.display = 'none';
        });

        rightGroup.insertBefore(container, rightGroup.firstChild);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildSwitcher);
    } else {
        buildSwitcher();
    }
})();
