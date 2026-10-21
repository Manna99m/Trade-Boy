// Whole-site translation, driven by the language menu in the top bar.
// Uses Google's website translator, which translates every page (including
// text added later by scripts). The chosen language is remembered in
// localStorage ('selectedLang') so it carries across pages.
// The Google script is only loaded when a non-English language is chosen.
(function () {
    const LANGUAGES = [
        ['EN', 'en', 'EN - English'],
        ['RU', 'ru', 'RU - Русский'],
        ['PT', 'pt', 'PT - Português'],
        ['FR', 'fr', 'FR - Français'],
        ['IT', 'it', 'IT - Italiano'],
        ['DE', 'de', 'DE - Deutsch'],
        ['ES', 'es', 'ES - Español'],
        ['PL', 'pl', 'PL - Polski'],
        ['ID', 'id', 'ID - Indonesia'],
        ['Zh-CN', 'zh-CN', 'Zh-CN - 简体字'],
        ['Zh-TW', 'zh-TW', 'Zh-TW - 繁體中文'],
        ['JA', 'ja', 'JA - 日本語'],
        ['KO', 'ko', 'KO - 한국어'],
        ['TH', 'th', 'TH - ภาษาไทย']
    ];
    const googleCode = code => (LANGUAGES.find(l => l[0] === code) || LANGUAGES[0])[1];

    function getSavedLang() {
        try {
            const saved = localStorage.getItem('selectedLang');
            return LANGUAGES.some(l => l[0] === saved) ? saved : 'EN';
        } catch (e) {
            return 'EN';
        }
    }

    function saveLang(code) {
        try { localStorage.setItem('selectedLang', code); } catch (e) {}
    }

    // Google's translator reads this cookie to know which language to show
    function setGoogleCookie(code) {
        const host = location.hostname;
        const domains = ['', host, '.' + host.split('.').slice(-2).join('.')];
        const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
        domains.forEach(d => {
            const domainPart = d ? '; domain=' + d : '';
            if (code === 'EN') {
                document.cookie = 'googtrans=; path=/; ' + expired + domainPart;
            } else {
                document.cookie = 'googtrans=/en/' + googleCode(code) + '; path=/' + domainPart;
            }
        });
    }

    function loadGoogleTranslate() {
        if (document.getElementById('google-translate-script')) return;
        const holder = document.createElement('div');
        holder.id = 'google_translate_element';
        holder.style.display = 'none';
        document.body.appendChild(holder);

        window.googleTranslateElementInit = function () {
            new google.translate.TranslateElement({ pageLanguage: 'en', autoDisplay: false }, 'google_translate_element');
        };
        const s = document.createElement('script');
        s.id = 'google-translate-script';
        s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(s);
    }

    function applyLanguage(code) {
        setGoogleCookie(code);
        const combo = document.querySelector('select.goog-te-combo');
        if (code !== 'EN' && combo) {
            // Translator already running: switch language in place
            combo.value = googleCode(code);
            combo.dispatchEvent(new Event('change'));
        } else if (code !== 'EN' && !document.getElementById('google-translate-script')) {
            loadGoogleTranslate();
        } else {
            // Back to English (or translator still loading): reload with the new cookie
            location.reload();
        }
    }

    // Same language list on every page, built from LANGUAGES
    function buildMenus(current) {
        document.querySelectorAll('.lang-menu-container').forEach(container => {
            const btn = container.querySelector('.nav-icon-btn');
            const menu = container.querySelector('.lang-dropdown');
            if (btn) {
                btn.removeAttribute('data-i18n');
                btn.innerHTML = current + ' <span style="font-size: 1.2em; margin-top: -2px;">🌐</span>';
            }
            if (menu) {
                menu.innerHTML = '';
                LANGUAGES.forEach(([code, , label]) => {
                    const opt = document.createElement('div');
                    opt.className = 'lang-option' + (code === current ? ' active' : '');
                    opt.dataset.lang = code;
                    opt.textContent = label;
                    menu.appendChild(opt);
                });
            }
            container.classList.add('notranslate');
        });
    }

    // Things that should never be translated
    function protectText() {
        document.querySelectorAll(
            '.logo, .footer-logo-text, .promo-code-text, #promo-code-val, #user-display, .lang-menu-container'
        ).forEach(el => el.classList.add('notranslate'));
    }

    // Google doesn't translate input placeholders, so keep the hand-written
    // dictionary for those; Google handles all visible text.
    window.applyTranslations = function (langCode) {
        if (typeof translations === 'undefined') return;
        const dict = translations[langCode] || translations.EN;
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key]) el.placeholder = dict[key];
        });
    };

    // Older pages call selectLanguage() from inline onclick handlers
    if (typeof window.selectLanguage !== 'function') {
        window.selectLanguage = function () {};
    }

    document.addEventListener('click', e => {
        const opt = e.target.closest('.lang-option[data-lang]');
        if (!opt) return;
        e.stopPropagation();
        const code = opt.dataset.lang;
        const menu = opt.closest('.lang-dropdown');
        if (menu) menu.style.display = 'none';
        if (code === getSavedLang()) return;
        saveLang(code);
        buildMenus(code);
        window.applyTranslations(code);
        applyLanguage(code);
    }, true);

    document.addEventListener('DOMContentLoaded', () => {
        const current = getSavedLang();
        buildMenus(current);
        protectText();
        window.applyTranslations(current);
        setGoogleCookie(current);
        if (current !== 'EN') loadGoogleTranslate();
    });
})();
