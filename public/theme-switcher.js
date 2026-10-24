// Site theme: Glass (original look), Light (black & white) or Dark.
// Loaded right after theme.css in <head> so the theme is applied before the
// page is drawn. The choice is remembered in localStorage ('siteTheme').
(function () {
    const THEMES = [
        ['glass', 'Glass'],
        ['light', 'Light'],
        ['dark', 'Dark']
    ];
    const DEFAULT_THEME = 'glass';

    function getTheme() {
        try {
            const saved = localStorage.getItem('siteTheme');
            return THEMES.some(t => t[0] === saved) ? saved : DEFAULT_THEME;
        } catch (e) {
            return DEFAULT_THEME;
        }
    }

    function applyTheme(theme) {
        // Glass = the original styles only, so the theme stylesheet is switched off
        const sheet = document.getElementById('theme-css');
        if (sheet) sheet.disabled = theme === 'glass';
        document.documentElement.setAttribute('data-theme', theme);
    }

    applyTheme(getTheme());

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
            try { localStorage.setItem('siteTheme', theme); } catch (err) {}
            applyTheme(theme);
            render(theme);
            menu.style.display = 'none';
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
