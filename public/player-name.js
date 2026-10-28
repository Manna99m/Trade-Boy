// Player name for the draft modes and the tournament.
// Login is optional: the name is whatever the player typed in the name box,
// else their account name, else a guest name like "Guest_4821" that stays
// the same on this device. The typed name is remembered for next time.
// clean() matches cleanName() in server.js, so both sides agree on the name.
(function () {
    const NAME_KEY = 'playerName';
    const GUEST_KEY = 'guestName';

    function read(key) { try { return localStorage.getItem(key) || ''; } catch (e) { return ''; } }
    function write(key, value) { try { value ? localStorage.setItem(key, value) : localStorage.removeItem(key); } catch (e) {} }

    function clean(raw) {
        return String(raw == null ? '' : raw)
            .replace(/[\u0000-\u001f\u007f<>"'`\\]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 20);
    }

    function guestName() {
        let g = read(GUEST_KEY);
        if (!g) {
            g = 'Guest_' + Math.floor(1000 + Math.random() * 9000);
            write(GUEST_KEY, g);
        }
        return g;
    }

    window.TBPlayer = {
        clean,
        loggedInUser: read('user'),
        // Name to use right now. With a box id: what's typed there wins (and is remembered).
        getName(inputId) {
            const el = inputId ? document.getElementById(inputId) : null;
            if (el) {
                const typed = clean(el.value);
                el.value = typed;
                write(NAME_KEY, typed);
                if (typed) return typed;
            } else if (clean(read(NAME_KEY))) {
                return clean(read(NAME_KEY));
            }
            return clean(this.loggedInUser) || guestName();
        }
    };

    // Fill every name box with the last name used (or the account name)
    function prefill() {
        document.querySelectorAll('[data-player-name]').forEach(el => {
            if (!el.value) el.value = clean(read(NAME_KEY)) || clean(read('user'));
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prefill);
    else prefill();
})();
