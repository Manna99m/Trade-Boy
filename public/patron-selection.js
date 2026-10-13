// ============================================================
// HERO WARS PATRON PET SELECTION LOGIC & RULES
// ============================================================

const ALL_PATRON_PETS = [
    { file: "Albus.png", name: "Albus" },
    { file: "Axel.png", name: "Axel" },
    { file: "Biscuit.png", name: "Biscuit" },
    { file: "Cain.png", name: "Cain" },
    { file: "Fenris.png", name: "Fenris" },
    { file: "Khorus.png", name: "Khorus" },
    { file: "Mara.png", name: "Mara" },
    { file: "Merlin.png", name: "Merlin" },
    { file: "Oliver.png", name: "Oliver" },
    { file: "Robin.png", name: "Robin" },
    { file: "Vex.png", name: "Vex" }
];

const PATRON_RULES = {
    "Albus.png": [
        "Augustus.png", "Aidan.png", "Arachne.png", "Dare Devil.png", "corvus.png",
        "Chabba.png", "Cleaver.png", "Galahad.png", "Heidi.png", "Iris.png",
        "Jhu.png", "Kayla.png", "Keira.png", "Lian.png", "Maya.png",
        "Sebastian.png", "Phobos.png", "Rufus.png", "Quing Mao.png", "yasmine.png"
    ],
    "Axel.png": [
        "Alvanor.png", "Avalon.png",
        "Augustus.png", "Astaroth.png", "Arachne.png", "Amira.png", "byrna.webp",
        "Aurora.png", "Cascade.png", "Celeste.png", "Cornelious.png", "Electra.png",
        "Dorian.png", "fluffy.webp", "Faceless.png", "Folio.png", "Heidi.png",
        "Helios.png", "Guus.png", "isaac.png", "Jet.png", "Judge.png",
        "Lars.png", "Jordgen.png", "Kai.png", "Julias.png", "Krista.png",
        "Mojo.png", "Lian.png", "Martha.png", "Mushy and Shroom.png", "Maya.png",
        "Markus.png", "morrigan.png", "Phobos.png", "Satori.png", "Rufus.png",
        "Orion.png", "Peppy.png", "somna.webp", "Thea.png"
    ],
    "Biscuit.png": [
        "Alvanor.png", "Avalon.png",
        "adam.webp", "Augustus.png", "Astaroth.png", "Amira.png", "byrna.webp",
        "corvus.png", "Aurora.png", "Cascade.png", "Celeste.png", "Chabba.png",
        "Cornelious.png", "Cleaver.png", "Electra.png", "eva.webp", "fluffy.webp",
        "Faceless.png", "Folio.png", "Galahad.png", "Heidi.png", "Helios.png",
        "Iris.png", "Judge.png", "Lars.png", "Kai.png", "Kayla.png",
        "Julias.png", "Krista.png", "Mojo.png", "Lian.png", "Lilith.png",
        "Maya.png", "Lyria.png", "Phobos.png", "Satori.png", "Rufus.png",
        "Orion.png", "Peppy.png", "Polaris.png", "Ninja Turtles.png", "Ziri.png"
    ],
    "Cain.png": [
        "adam.webp", "Dante.png", "Aurora.png", "Elmir.png", "Dark star.png",
        "Heidi.png", "Jet.png", "Nebula.png", "Quing Mao.png", "yasmine.png"
    ],
    "Fenris.png": [
        "adam.webp", "Astrid.png", "Artemis.png", "Andvari.png", "Dare Devil.png",
        "Dante.png", "Chabba.png", "Cleaver.png", "Fox.png", "Elmir.png",
        "eva.webp", "Dark star.png", "Galahad.png", "Guus.png", "Ginger.png",
        "Ishmael.png", "Jhu.png", "Lara Croft.png", "Karkh.png", "Keira.png",
        "Lyria.png", "Sebastian.png", "Ninja Turtles.png", "Quing Mao.png",
        "yasmine.png", "somna.webp", "Ziri.png", "Tristan.png"
    ],
    "Khorus.png": [
        "Alvanor.png", "Avalon.png",
        "Augustus.png", "Aidan.png", "byrna.webp", "Cascade.png", "Celeste.png",
        "fluffy.webp", "Faceless.png", "Folio.png", "Helios.png", "Guus.png",
        "Judge.png", "Lars.png", "Kai.png", "Krista.png", "Mojo.png",
        "Lian.png", "Lilith.png", "Phobos.png", "Satori.png", "Orion.png",
        "Peppy.png", "Polaris.png"
    ],
    "Mara.png": [
        "Astrid.png", "Andvari.png", "Arachne.png", "Dare Devil.png", "Fox.png",
        "Fafnir.png", "Dark star.png", "Faceless.png", "isaac.png", "Ishmael.png",
        "Judge.png", "Lars.png", "Lara Croft.png", "Karkh.png", "Mojo.png",
        "Lian.png", "Lilith.png", "Orion.png", "Peppy.png", "Polaris.png", "Thea.png"
    ],
    "Merlin.png": [
        "Alvanor.png", "Avalon.png",
        "Augustus.png", "Aidan.png", "byrna.webp", "Aurora.png", "Cascade.png",
        "Celeste.png", "Electra.png", "Dorian.png", "fluffy.webp", "Faceless.png",
        "Folio.png", "Helios.png", "Lars.png", "Kai.png", "Krista.png",
        "Mojo.png", "Lilith.png", "Markus.png", "Phobos.png", "Satori.png",
        "Orion.png", "Peppy.png", "Thea.png"
    ],
    "Oliver.png": [
        "Alvanor.png", "Avalon.png",
        "Astaroth.png", "Andvari.png", "Amira.png", "corvus.png", "Aurora.png",
        "Chabba.png", "Cornelious.png", "Cleaver.png", "Fafnir.png", "Electra.png",
        "Galahad.png", "Guus.png", "Iris.png", "isaac.png", "Ishmael.png",
        "Jet.png", "Judge.png", "Jordgen.png", "Julias.png", "Lilith.png",
        "Martha.png", "Mushy and Shroom.png", "Markus.png", "Lyria.png",
        "morrigan.png", "Sebastian.png", "Rufus.png", "Ninja Turtles.png",
        "somna.webp", "Ziri.png"
    ],
    "Robin.png": [
        "Alvanor.png", "Avalon.png",
        "Astaroth.png", "Andvari.png", "Amira.png", "Dare Devil.png", "byrna.webp",
        "Cornelious.png", "Fox.png", "Fafnir.png", "Dorian.png", "Dark star.png",
        "Faceless.png", "Folio.png", "Guus.png", "Ginger.png", "Jet.png",
        "Judge.png", "Mojo.png", "Lian.png", "Lilith.png", "Martha.png",
        "Maya.png", "Markus.png", "morrigan.png", "Phobos.png", "Satori.png",
        "Peppy.png", "Nebula.png", "somna.webp", "Thea.png"
    ],
    "Vex.png": [
        "adam.webp", "Astrid.png", "Artemis.png", "Dare Devil.png", "Fox.png",
        "Elmir.png", "eva.webp", "Dark star.png", "Ginger.png", "Jhu.png",
        "Lara Croft.png", "Karkh.png", "Keira.png"
    ]
};

function cleanHeroDisplayName(filename) {
    if (!filename) return '';
    return filename.replace(/\.(png|jpg|webp)$/i, '').replace(/[-_]/g, ' ');
}

function cleanPetDisplayName(filename) {
    if (!filename) return '';
    return filename.replace(/\.(png|jpg|webp)$/i, '');
}

function isPetCompatibleWithHero(petFile, heroFile) {
    if (!petFile || !heroFile) return false;
    const rules = PATRON_RULES[petFile];
    if (!rules || rules.length === 0) return true;
    const heroClean = heroFile.toLowerCase().trim();
    return rules.some(r => r.toLowerCase().trim() === heroClean);
}

// Controller for managing Patron Selection UI
const PatronSelectorCore = {
    heroes: [],
    assignedPatrons: {}, // heroFile -> petFile
    timeLimit: 40,
    timerInterval: null,
    onSubmitCallback: null,
    activeHeroIndex: null,

    cleanup() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.closeModal();
    },

    start({ containerElement, containerId, heroes, timeLimit = 40, onSubmit }) {
        this.heroes = heroes || [];
        this.assignedPatrons = {};
        this.timeLimit = timeLimit;
        this.onSubmitCallback = onSubmit;
        this.activeHeroIndex = null;

        if (this.timerInterval) clearInterval(this.timerInterval);

        const targetContainer = containerElement 
            ? ((typeof containerElement === 'string') ? document.getElementById(containerElement) : containerElement)
            : (containerId ? document.getElementById(containerId) : document.getElementById('patron-screen'));

        this.renderUI(targetContainer);
        this.startTimer();
    },

    init(options) {
        if (options) {
            this.start(options);
        }
    },

    renderUI(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="patron-screen" id="patron-screen-card">
                <h2 class="patron-title">ASSIGN PET PATRONS</h2>
                <p class="patron-subtitle">Choose a patron pet for each hero before the battle begins!</p>
                
                <div class="patron-timer-container">
                    <div class="patron-timer-bar" id="patron-timer-bar"></div>
                    <span class="patron-timer-text" id="patron-timer-text">${this.timeLimit}s</span>
                </div>

                <div class="patron-heroes-grid" id="patron-heroes-container"></div>

                <div>
                    <button class="patron-submit-btn" id="patron-submit-btn">
                        ✅ Submit Patrons
                    </button>
                    <div id="patron-submitted-msg" style="display: none; color: #aef649; font-weight: bold; margin-top: 12px; font-size: 1.05rem;">
                        ⏳ Patrons submitted! Waiting for opponent...
                    </div>
                </div>
            </div>

            <!-- Pet Selection Modal -->
            <div class="patron-modal-backdrop" id="patron-picker-modal" style="display: none;">
                <div class="patron-modal-box">
                    <h3 class="patron-modal-title">
                        Choose Patron for <span class="patron-modal-target-hero" id="patron-modal-hero-name"></span>
                    </h3>
                    <p class="patron-modal-sub">Only compatible pets can patron this hero according to official rules.</p>
                    
                    <div class="patron-picker-grid" id="patron-picker-grid"></div>

                    <div class="patron-modal-actions">
                        <button class="patron-btn-remove" id="patron-modal-remove-btn">Remove Patron</button>
                        <button class="patron-btn-close" id="patron-modal-close-btn">Close</button>
                    </div>
                </div>
            </div>
        `;

        this.renderHeroes();

        document.getElementById('patron-submit-btn').onclick = () => {
            this.submit();
        };

        document.getElementById('patron-modal-close-btn').onclick = () => {
            this.closeModal();
        };

        document.getElementById('patron-modal-remove-btn').onclick = () => {
            if (this.activeHeroIndex !== null) {
                const hero = this.heroes[this.activeHeroIndex];
                delete this.assignedPatrons[hero];
                this.renderHeroes();
            }
            this.closeModal();
        };
    },

    renderHeroes() {
        const container = document.getElementById('patron-heroes-container');
        if (!container) return;
        container.innerHTML = '';

        this.heroes.forEach((hero, index) => {
            const card = document.createElement('div');
            const assignedPet = this.assignedPatrons[hero];
            card.className = `patron-hero-card ${assignedPet ? 'has-patron' : ''}`;

            card.innerHTML = `
                <div class="patron-hero-avatar-wrapper">
                    <img src="heroes/${hero}" class="patron-hero-img" alt="${cleanHeroDisplayName(hero)}">
                    <div class="patron-slot-badge ${assignedPet ? 'assigned' : 'empty'}" title="${assignedPet ? `Patron: ${cleanPetDisplayName(assignedPet)} (Click to change)` : 'Click to assign patron'}">
                        ${assignedPet ? `<img src="patrons/${assignedPet}">` : ''}
                    </div>
                </div>
                <div class="patron-hero-name">${cleanHeroDisplayName(hero)}</div>
                <div class="patron-assigned-label">${assignedPet ? `+ ${cleanPetDisplayName(assignedPet)}` : 'No Patron'}</div>
            `;

            card.onclick = () => {
                this.openModal(index);
            };

            container.appendChild(card);
        });
    },

    openModal(heroIndex) {
        this.activeHeroIndex = heroIndex;
        const hero = this.heroes[heroIndex];
        const heroNameEl = document.getElementById('patron-modal-hero-name');
        if (heroNameEl) heroNameEl.textContent = cleanHeroDisplayName(hero);

        const grid = document.getElementById('patron-picker-grid');
        grid.innerHTML = '';

        ALL_PATRON_PETS.forEach(pet => {
            const isCompatible = isPetCompatibleWithHero(pet.file, hero);
            const isCurrent = this.assignedPatrons[hero] === pet.file;

            // Check if assigned to another hero
            let assignedToOther = null;
            for (const [h, p] of Object.entries(this.assignedPatrons)) {
                if (p === pet.file && h !== hero) {
                    assignedToOther = h;
                }
            }

            const item = document.createElement('div');
            let itemClasses = 'patron-picker-item';
            if (!isCompatible) itemClasses += ' incompatible';
            else itemClasses += ' compatible';
            if (isCurrent) itemClasses += ' active';
            item.className = itemClasses;

            let tagHtml = '';
            if (isCurrent) {
                tagHtml = '<span class="patron-picker-tag active-tag">✓ Active</span>';
            } else if (assignedToOther) {
                tagHtml = `<span class="patron-picker-tag assigned-elsewhere">On ${cleanHeroDisplayName(assignedToOther)}</span>`;
            } else if (!isCompatible) {
                tagHtml = '<span class="patron-picker-tag incompatible-tag">Incompatible</span>';
            }

            item.innerHTML = `
                <img src="patrons/${pet.file}" alt="${pet.name}">
                <span class="patron-picker-name">${pet.name}</span>
                ${tagHtml}
            `;

            if (isCompatible) {
                item.onclick = () => {
                    // Remove from previous owner if assigned elsewhere
                    if (assignedToOther) {
                        delete this.assignedPatrons[assignedToOther];
                    }
                    this.assignedPatrons[hero] = pet.file;
                    this.renderHeroes();
                    this.closeModal();
                };
            }

            grid.appendChild(item);
        });

        const modal = document.getElementById('patron-picker-modal');
        if (modal) modal.style.display = 'flex';
    },

    closeModal() {
        const modal = document.getElementById('patron-picker-modal');
        if (modal) modal.style.display = 'none';
        this.activeHeroIndex = null;
    },

    startTimer() {
        let timeLeft = this.timeLimit;
        const bar = document.getElementById('patron-timer-bar');
        const text = document.getElementById('patron-timer-text');
        if (!bar || !text) return;

        bar.style.transition = 'none';
        bar.style.width = '100%';
        bar.classList.remove('warning', 'danger');

        void bar.offsetWidth;
        bar.style.transition = 'width 1s linear';
        bar.style.width = `${((timeLeft - 1) / this.timeLimit) * 100}%`;

        this.timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
                text.textContent = "Time's up!";
                bar.style.width = '0%';
                bar.classList.add('danger');
                this.submit();
                return;
            }

            text.textContent = `${timeLeft}s`;
            bar.style.width = `${(timeLeft / this.timeLimit) * 100}%`;

            if (timeLeft <= 5) {
                bar.classList.remove('warning');
                bar.classList.add('danger');
            } else if (timeLeft <= 10) {
                bar.classList.add('warning');
            }
        }, 1000);
    },

    submit() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        const submitBtn = document.getElementById('patron-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.display = 'none';
        }
        const submittedMsg = document.getElementById('patron-submitted-msg');
        if (submittedMsg) submittedMsg.style.display = 'block';

        this.closeModal();

        if (typeof this.onSubmitCallback === 'function') {
            this.onSubmitCallback(this.assignedPatrons);
        }
    }
};

function PatronSelector(options) {
    if (options) {
        PatronSelectorCore.start(options);
    }
    return PatronSelectorCore;
}
Object.assign(PatronSelector, PatronSelectorCore);
window.PatronSelector = PatronSelector;

// Render final team on results screen with badges
function renderTeamResultsWithPatrons(team, containerElement, borderColor = '#3b82f6') {
    if (!containerElement || !team) return;
    containerElement.innerHTML = '';

    const heroes = team.heroes || [];
    const patrons = team.patrons || {};

    heroes.forEach(h => {
        const wrapper = document.createElement('div');
        wrapper.className = 'hero-with-patron';

        const patronPet = patrons[h];
        wrapper.innerHTML = `
            <img src="heroes/${h}" class="main-hero-img" title="${cleanHeroDisplayName(h)}" style="border-color: ${borderColor};">
            ${patronPet ? `<img src="patrons/${patronPet}" class="patron-mini-badge" title="Patron: ${cleanPetDisplayName(patronPet)}">` : ''}
        `;

        containerElement.appendChild(wrapper);
    });

    const mainPet = team.pet || (team.pets && team.pets[0]);
    if (mainPet) {
        const petWrapper = document.createElement('div');
        petWrapper.className = 'hero-with-patron';
        petWrapper.innerHTML = `
            <img src="pets/${mainPet}" class="main-hero-img" title="Main Pet: ${cleanPetDisplayName(mainPet)}" style="border-color: #a855f7;">
        `;
        containerElement.appendChild(petWrapper);
    }
}
