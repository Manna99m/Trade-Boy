// Loading screen for image-heavy pages (Hero Tier List, Titans Tier List, Team Build).
// A dim "TRADE BOY" wordmark fills with white from the bottom like a rising wave,
// with a "loading... 42%" counter, following how many hero pictures have loaded.
// When everything is in, the screen slides up and away.
// Must be loaded early in <head> so it covers the page before anything is drawn.
(function () {
    const MIN_SHOW = 700;     // never flash for less than this (ms)
    const MAX_WAIT = 10000;   // give up waiting after this (ms), e.g. a broken image
    const startedAt = Date.now();

    const wave = encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 400" preserveAspectRatio="none">' +
        '<path d="M0 200 Q60 186 120 200 T240 200 V400 H0 Z" fill="#ffffff"/></svg>'
    );

    const css = `
#tb-loader {
    position: fixed; inset: 0; z-index: 2147483600;
    background: #0f0f10; display: flex; align-items: center; justify-content: center;
    transition: transform 0.7s cubic-bezier(0.7, 0, 0.2, 1);
}
#tb-loader.done { transform: translateY(-100%); }
#tb-loader .tb-word {
    position: relative; font-family: 'Inter', 'Arial Black', 'Segoe UI', sans-serif;
    font-weight: 900; font-size: clamp(44px, 12vw, 150px); line-height: 1;
    letter-spacing: -0.04em; white-space: nowrap; user-select: none;
}
#tb-loader .tb-base { color: #2c2c2e; }
#tb-loader .tb-fill {
    position: absolute; inset: 0; color: transparent;
    background-image: url("data:image/svg+xml,${wave}");
    background-repeat: repeat-x; background-size: 240px 200%;
    background-position: 0 0%;
    -webkit-background-clip: text; background-clip: text;
    animation: tbWave 1.6s linear infinite;
}
#tb-loader .tb-count {
    position: absolute; right: 0; top: calc(100% + 10px);
    font: 600 12px/1 'Inter', 'Segoe UI', sans-serif; letter-spacing: 1px;
    color: #8a8a8e; text-transform: lowercase;
}
@keyframes tbWave { from { background-position-x: 0; } to { background-position-x: 240px; } }
@media (prefers-reduced-motion: reduce) {
    #tb-loader .tb-fill { animation: none; }
    #tb-loader { transition: opacity 0.3s ease; }
    #tb-loader.done { transform: none; opacity: 0; }
}`;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const loader = document.createElement('div');
    loader.id = 'tb-loader';
    loader.setAttribute('aria-label', 'Loading');
    loader.className = 'notranslate';
    loader.innerHTML = `
        <div class="tb-word">
            <span class="tb-base">TRADE BOY</span>
            <span class="tb-fill" aria-hidden="true">TRADE BOY</span>
            <span class="tb-count">loading... 0%</span>
        </div>`;
    // <body> doesn't exist yet, so attach to <html>; it still covers the whole page
    document.documentElement.appendChild(loader);

    const fill = loader.querySelector('.tb-fill');
    const count = loader.querySelector('.tb-count');

    // ---------- Progress: share of page images that have finished loading ----------
    const tracked = new Set();
    let loadedCount = 0;
    let pageLoaded = false;
    let goal = 0;      // real progress (0-100)
    let shown = 0;     // progress currently displayed; rises smoothly towards goal
    let finished = false;
    let exiting = false;
    const RISE_PER_MS = 0.11; // max fill speed: 0 -> 100% in about 0.9s, even when cached

    function track(img) {
        if (tracked.has(img)) return;
        tracked.add(img);
        if (img.complete) { loadedCount++; return; }
        const done = () => { loadedCount++; update(); };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
    }

    function scan(root) {
        if (root.tagName === 'IMG') track(root);
        if (root.querySelectorAll) root.querySelectorAll('img').forEach(track);
    }

    function target() {
        const imgs = tracked.size ? loadedCount / tracked.size : 0;
        // The page's own load event counts for the last 10%
        return Math.min(100, Math.round(imgs * 90 + (pageLoaded ? 10 : 0)));
    }

    function render(p) {
        const text = 'loading... ' + p + '%';
        if (count.textContent === text) return;
        fill.style.backgroundPositionY = p + '%';
        count.textContent = text;
    }

    function update() {
        if (finished) return;
        goal = Math.max(goal, target()); // never goes backwards
        if (pageLoaded && loadedCount >= tracked.size) finish();
    }

    function finish() {
        finished = true;
        goal = 100;
        if (document.hidden) { shown = 100; render(100); exit(); }
    }

    function exit() {
        if (exiting) return;
        exiting = true;
        const wait = Math.max(0, MIN_SHOW - (Date.now() - startedAt)) + 300;
        setTimeout(() => {
            loader.classList.add('done');
            setTimeout(() => loader.remove(), 800);
        }, wait);
    }

    // The water rises smoothly towards the real progress, so the fill is always
    // visible (when pictures are already cached, loading is near-instant)
    let last = performance.now();
    function tick(now) {
        const dt = Math.min(now - last, 100);
        last = now;
        shown = Math.min(goal, shown + dt * RISE_PER_MS);
        render(Math.round(shown));
        if (finished && shown >= 100) { exit(); return; }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // A tab opened in the background doesn't animate; don't keep it waiting
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && finished) { shown = 100; render(100); exit(); }
    });

    // Images added later (hero grids built by scripts, hero frames) are tracked too
    // (changes inside the loader itself, like the counter text, are ignored,
    // otherwise updating the counter would trigger another update forever)
    const observer = new MutationObserver(list => {
        let found = false;
        list.forEach(m => {
            if (loader.contains(m.target)) return;
            m.addedNodes.forEach(n => { if (n.nodeType === 1) { scan(n); found = true; } });
        });
        if (found) update();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('DOMContentLoaded', () => { scan(document); update(); });
    window.addEventListener('load', () => {
        // Let scripts that build the grid on load run first
        setTimeout(() => { pageLoaded = true; scan(document); update(); }, 50);
    });

    setTimeout(() => {
        observer.disconnect();
        finish();
        // Safety net if animation frames aren't running (e.g. tab never shown)
        setTimeout(() => { shown = 100; render(100); exit(); }, 1500);
    }, MAX_WAIT);
})();
