const heroes = [
    "Aidan.png", "Amira.png", "Andvari.png", "Arachne.png", "Artemis.png", "Astaroth.png", 
    "Astrid.png", "Augustus.png", "Aurora.png", "Avalon.png", "Cascade.png", "Celeste.png", 
    "Chabba.png", "Cleaver.png", "Cornelious.png", "Dante.png", "Dare Devil.png", "Dark star.png", 
    "Dorian.png", "Electra.png", "Elmir.png", "Faceless.png", "Fafnir.png", "Folio.png", 
    "Fox.png", "Galahad.png", "Ginger.png", "Guus.png", "Heidi.png", "Helios.png", "Iris.png", 
    "Ishmael.png", "Jet.png", "Jhu.png", "Jordgen.png", "Judge.png", "Julias.png", "Kai.png", 
    "Karkh.png", "Kayla.png", "Keira.png", "Krista.png", "Lara Croft.png", "Lars.png", "Lian.png", 
    "Lilith.png", "Lyria.png", "Markus.png", "Martha.png", "Maya.png", "Mojo.png", 
    "Mushy and Shroom.png", "Nebula.png", "Ninja Turtles.png", "Omen.png", "Orion.png", "Peppy.png", 
    "Phobos.png", "Polaris.png", "Quing Mao.png", "Rufus.png", "Satori.png", "Sebastian.png", 
    "Thea.png", "Tristan.png", "Ziri.png", "corvus.png", "isaac.png", "morrigan.png", "yasmine.png",
    "adam.webp", "byrna.webp", "eva.webp", "somna.webp", "fluffy.webp"
];

const pets = [
    "Albus.png", "Axel.png", "Biscuit.png", "Cain.png", "Fenris.png", "Khorus.png", "Mara.png", "Merlin.png", "Oliver.png", "Vex.png", "Robin.png"
];

// Sort alphabetically regardless of case
heroes.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
pets.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));


let currentTab = 'heroes'; // 'heroes' or 'pets'
const HERO_POSITIONS = {
  "adam.webp": 47,
  "Aidan.png": 58,
  "Amira.png": 35,
  "Andvari.png": 19,
  "Arachne.png": 27,
  "Artemis.png": 65,
  "Astaroth.png": 10,
  "Astrid.png": 57,
  "Augustus.png": 56,
  "Aurora.png": 2,
  "Avalon.png": 25,
  "byrna.webp": 42,
  "Cascade.png": 45,
  "Celeste.png": 34,
  "Chabba.png": 1,
  "Cleaver.png": 3,
  "Cornelious.png": 60,
  "corvus.png": 5,
  "Dante.png": 29,
  "Dare Devil.png": 52,
  "Dark star.png": 54,
  "Dorian.png": 66,
  "Electra.png": 4,
  "Elmir.png": 21,
  "eva.webp": 67,
  "Faceless.png": 61,
  "Fafnir.png": 72,
  "fluffy.webp": 46,
  "Folio.png": 49,
  "Fox.png": 62,
  "Galahad.png": 12,
  "Ginger.png": 50,
  "Guus.png": 28,
  "Heidi.png": 43,
  "Helios.png": 73,
  "Iris.png": 59,
  "isaac.png": 37,
  "Ishmael.png": 16,
  "Jet.png": 70,
  "Jhu.png": 38,
  "Jordgen.png": 44,
  "Judge.png": 32,
  "Julias.png": 9,
  "Kai.png": 36,
  "Karkh.png": 17,
  "Kayla.png": 13,
  "Keira.png": 31,
  "Krista.png": 30,
  "Lara Croft.png": 53,
  "Lars.png": 55,
  "Lian.png": 63,
  "Lilith.png": 74,
  "Lyria.png": 14,
  "Markus.png": 18,
  "Martha.png": 75,
  "Maya.png": 26,
  "Mojo.png": 41,
  "morrigan.png": 33,
  "Mushy and Shroom.png": 11,
  "Nebula.png": 39,
  "Ninja Turtles.png": 22,
  "Omen.png": 999,
  "Orion.png": 48,
  "Peppy.png": 69,
  "Phobos.png": 64,
  "Polaris.png": 68,
  "Quing Mao.png": 23,
  "Rufus.png": 8,
  "Satori.png": 24,
  "Sebastian.png": 40,
  "somna.webp": 51,
  "Thea.png": 71,
  "Tristan.png": 15,
  "yasmine.png": 20,
  "Ziri.png": 7
};

const selectedHeroes = [];
let selectedPet = null;
const patronPets = {}; // maps heroImg -> petImg
let modalTargetHero = null;

const gridContainer = document.getElementById('item-grid');
const heroSlots = document.querySelectorAll('.hero-slot');
const petSlot = document.getElementById('pet-slot');
const okButton = document.getElementById('ok-btn');
const tabHeroesBtn = document.getElementById('tab-heroes');
const tabPetsBtn = document.getElementById('tab-pets');

// Modal elements
const petModal = document.getElementById('pet-modal');
const closeModalBtn = document.getElementById('close-modal');
const petModalGrid = document.getElementById('pet-modal-grid');

closeModalBtn.addEventListener('click', () => {
    petModal.style.display = 'none';
    modalTargetHero = null;
});

const patronRules = {
    "Albus.png": [
        "Augustus.png",
        "Aidan.png",
        "Arachne.png",
        "Dare Devil.png",
        "corvus.png",
        "Chabba.png",
        "Cleaver.png",
        "Galahad.png",
        "Heidi.png",
        "Iris.png",
        "Jhu.png",
        "Kayla.png",
        "Keira.png",
        "Lian.png",
        "Maya.png",
        "Sebastian.png",
        "Phobos.png",
        "Rufus.png",
        "Quing Mao.png",
        "yasmine.png"
    ],
    "Axel.png": [
        "Augustus.png",
        "Astaroth.png",
        "Arachne.png",
        "Amira.png",
        "byrna.webp",
        "Aurora.png",
        "Cascade.png",
        "Celeste.png",
        "Cornelious.png",
        "Electra.png",
        "Dorian.png",
        "fluffy.webp",
        "Faceless.png",
        "Folio.png",
        "Heidi.png",
        "Helios.png",
        "Guus.png",
        "isaac.png",
        "Jet.png",
        "Judge.png",
        "Lars.png",
        "Jordgen.png",
        "Kai.png",
        "Julias.png",
        "Krista.png",
        "Mojo.png",
        "Lian.png",
        "Martha.png",
        "Mushy and Shroom.png",
        "Maya.png",
        "Markus.png",
        "morrigan.png",
        "Phobos.png",
        "Satori.png",
        "Rufus.png",
        "Orion.png",
        "Peppy.png",
        "somna.webp",
        "Thea.png"
    ],
    "Biscuit.png": [
        "adam.webp",
        "Augustus.png",
        "Astaroth.png",
        "Amira.png",
        "byrna.webp",
        "corvus.png",
        "Aurora.png",
        "Cascade.png",
        "Celeste.png",
        "Chabba.png",
        "Cornelious.png",
        "Cleaver.png",
        "Electra.png",
        "eva.webp",
        "fluffy.webp",
        "Faceless.png",
        "Folio.png",
        "Galahad.png",
        "Heidi.png",
        "Helios.png",
        "Iris.png",
        "Judge.png",
        "Lars.png",
        "Kai.png",
        "Kayla.png",
        "Julias.png",
        "Krista.png",
        "Mojo.png",
        "Lian.png",
        "Lilith.png",
        "Maya.png",
        "Lyria.png",
        "Phobos.png",
        "Satori.png",
        "Rufus.png",
        "Orion.png",
        "Peppy.png",
        "Polaris.png",
        "Ninja Turtles.png",
        "Ziri.png"
    ],
    "Cain.png": [
        "adam.webp",
        "Dante.png",
        "Aurora.png",
        "Elmir.png",
        "Dark star.png",
        "Heidi.png",
        "Jet.png",
        "Nebula.png",
        "Quing Mao.png",
        "yasmine.png"
    ],
    "Fenris.png": [
        "adam.webp",
        "Astrid.png",
        "Artemis.png",
        "Andvari.png",
        "Dare Devil.png",
        "Dante.png",
        "Chabba.png",
        "Cleaver.png",
        "Fox.png",
        "Elmir.png",
        "eva.webp",
        "Dark star.png",
        "Galahad.png",
        "Guus.png",
        "Ginger.png",
        "Ishmael.png",
        "Jhu.png",
        "Lara Croft.png",
        "Karkh.png",
        "Keira.png",
        "Lyria.png",
        "Sebastian.png",
        "Ninja Turtles.png",
        "Quing Mao.png",
        "yasmine.png",
        "somna.webp",
        "Ziri.png",
        "Tristan.png"
    ],
    "Khorus.png": [
        "Augustus.png",
        "Aidan.png",
        "byrna.webp",
        "Cascade.png",
        "Celeste.png",
        "fluffy.webp",
        "Faceless.png",
        "Folio.png",
        "Helios.png",
        "Guus.png",
        "Judge.png",
        "Lars.png",
        "Kai.png",
        "Krista.png",
        "Mojo.png",
        "Lian.png",
        "Lilith.png",
        "Phobos.png",
        "Satori.png",
        "Orion.png",
        "Peppy.png",
        "Polaris.png"
    ],
    "Mara.png": [
        "Astrid.png",
        "Andvari.png",
        "Arachne.png",
        "Dare Devil.png",
        "Fox.png",
        "Fafnir.png",
        "Dark star.png",
        "Faceless.png",
        "isaac.png",
        "Ishmael.png",
        "Judge.png",
        "Lars.png",
        "Lara Croft.png",
        "Karkh.png",
        "Mojo.png",
        "Lian.png",
        "Lilith.png",
        "Orion.png",
        "Peppy.png",
        "Polaris.png",
        "Thea.png"
    ],
    "Merlin.png": [
        "Augustus.png",
        "Aidan.png",
        "byrna.webp",
        "Aurora.png",
        "Cascade.png",
        "Celeste.png",
        "Electra.png",
        "Dorian.png",
        "fluffy.webp",
        "Faceless.png",
        "Folio.png",
        "Helios.png",
        "Lars.png",
        "Kai.png",
        "Krista.png",
        "Mojo.png",
        "Lilith.png",
        "Markus.png",
        "Phobos.png",
        "Satori.png",
        "Orion.png",
        "Peppy.png",
        "Thea.png"
    ],
    "Oliver.png": [
        "Astaroth.png",
        "Andvari.png",
        "Amira.png",
        "corvus.png",
        "Aurora.png",
        "Chabba.png",
        "Cornelious.png",
        "Cleaver.png",
        "Fafnir.png",
        "Electra.png",
        "Galahad.png",
        "Guus.png",
        "Iris.png",
        "isaac.png",
        "Ishmael.png",
        "Jet.png",
        "Judge.png",
        "Jordgen.png",
        "Julias.png",
        "Lilith.png",
        "Martha.png",
        "Mushy and Shroom.png",
        "Markus.png",
        "Lyria.png",
        "morrigan.png",
        "Sebastian.png",
        "Rufus.png",
        "Ninja Turtles.png",
        "somna.webp",
        "Ziri.png"
    ],
    "Robin.png": [
        "Astaroth.png",
        "Andvari.png",
        "Amira.png",
        "Dare Devil.png",
        "byrna.webp",
        "Cornelious.png",
        "Fox.png",
        "Fafnir.png",
        "Dorian.png",
        "Dark star.png",
        "Faceless.png",
        "Folio.png",
        "Guus.png",
        "Ginger.png",
        "Jet.png",
        "Judge.png",
        "Mojo.png",
        "Lian.png",
        "Lilith.png",
        "Martha.png",
        "Maya.png",
        "Markus.png",
        "morrigan.png",
        "Phobos.png",
        "Satori.png",
        "Peppy.png",
        "Nebula.png",
        "somna.webp",
        "Thea.png"
    ],
    "Vex.png": [
        "adam.webp",
        "Astrid.png",
        "Artemis.png",
        "Dare Devil.png",
        "Fox.png",
        "Elmir.png",
        "eva.webp",
        "Dark star.png",
        "Ginger.png",
        "Jhu.png",
        "Lara Croft.png",
        "Karkh.png",
        "Keira.png"
    ]
};

function openPetModal(heroImg) {
    modalTargetHero = heroImg;
    petModalGrid.innerHTML = '';
    
    // Filter pets based on rules
    const allowedPets = pets.filter(pet => {
        const rules = patronRules[pet];
        if (!rules || rules.length === 0) return true; // No restrictions defined
        return rules.includes(heroImg);
    });

    if (allowedPets.length === 0) {
        petModalGrid.innerHTML = '<div style="color: white; padding: 20px; text-align: center; width: 100%;">No pets can patron this hero.</div>';
    }

    allowedPets.forEach(pet => {
        const item = document.createElement('div');
        item.className = 'pet-list-item';
        
        // Check assignment
        let assignedTo = null;
        for (const [h, p] of Object.entries(patronPets)) {
            if (p === pet) assignedTo = h;
        }
        
        const isAssignedToTarget = assignedTo === heroImg;
        
        const img = document.createElement('img');
        img.src = `pets/${pet}`;
        img.className = 'pet-list-img';
        
        const info = document.createElement('div');
        info.className = 'pet-list-info';
        
        const name = document.createElement('div');
        name.className = 'pet-list-name';
        name.textContent = pet.split('.')[0];
        
        const status = document.createElement('div');
        if (assignedTo) {
            status.className = 'pet-list-status assigned';
            status.textContent = isAssignedToTarget ? 'Assigned to this hero' : `Assigned to ${assignedTo.split('.')[0]}`;
        } else {
            status.className = 'pet-list-status unassigned';
            status.textContent = 'Not assigned';
        }
        
        info.appendChild(name);
        info.appendChild(status);
        item.appendChild(img);
        item.appendChild(info);
        
        item.addEventListener('click', () => {
            if (isAssignedToTarget) {
                // Clicking assigned pet unassigns it
                delete patronPets[heroImg];
            } else {
                // If pet is assigned elsewhere, remove that assignment
                if (assignedTo) {
                    delete patronPets[assignedTo];
                }
                patronPets[heroImg] = pet;
            }
            petModal.style.display = 'none';
            updateBottomBar();
        });
        
        petModalGrid.appendChild(item);
    });
    
    petModal.style.display = 'flex';
}

function renderGrid() {
    gridContainer.innerHTML = '';
    
    let items = currentTab === 'heroes' ? heroes : pets;
    const searchBar = document.querySelector('.search-bar');
    const query = searchBar ? searchBar.value.toLowerCase() : '';
    
    if (query) {
        items = items.filter(itemImg => itemImg.toLowerCase().includes(query));
    }
    
    const folder = currentTab === 'heroes' ? 'heroes' : 'pets';
    
    items.forEach(itemImg => {
        const div = document.createElement('div');
        div.className = 'hero-card';
        
        // Restore selection state visually
        if (currentTab === 'heroes' && selectedHeroes.includes(itemImg)) {
            div.classList.add('selected');
        } else if (currentTab === 'pets' && selectedPet === itemImg) {
            div.classList.add('selected-pet');
        }
        
        const img = document.createElement('img');
        img.src = `${folder}/${itemImg}`;
        img.alt = itemImg.split('.')[0];
        
        const overlay = document.createElement('div');
        overlay.className = 'check-overlay';
        overlay.innerHTML = '✔️';
        
        div.appendChild(img);
        div.appendChild(overlay);
        
        div.addEventListener('click', () => toggleItem(itemImg));
        gridContainer.appendChild(div);
    });
}

function toggleItem(itemImg) {
    if (currentTab === 'heroes') {
        const index = selectedHeroes.indexOf(itemImg);
        if (index > -1) {
            // Deselect
            selectedHeroes.splice(index, 1);
        } else {
            // Select if under 5
            if (selectedHeroes.length < 5) {
                selectedHeroes.push(itemImg);
                selectedHeroes.sort((a, b) => (HERO_POSITIONS[b] || 0) - (HERO_POSITIONS[a] || 0));
            } else {
                alert('You can only select up to 5 heroes!');
                return;
            }
        }
    } else {
        // Toggle pet
        if (selectedPet === itemImg) {
            selectedPet = null;
        } else {
            selectedPet = itemImg;
        }
    }
    
    // Re-render grid to update borders and checkmarks, then update bottom bar
    renderGrid();
    updateBottomBar();
}

function updateBottomBar() {
    // Update Pet Slot
    petSlot.innerHTML = '';
    if (selectedPet) {
        const img = document.createElement('img');
        img.src = `pets/${selectedPet}`;
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            selectedPet = null;
            renderGrid();
            updateBottomBar();
        });
        petSlot.appendChild(img);
    }
    
    // Update Hero Slots
    heroSlots.forEach((slot, index) => {
        slot.innerHTML = '';
        if (index < selectedHeroes.length) {
            const hero = selectedHeroes[index];
            const img = document.createElement('img');
            img.src = `heroes/${hero}`;
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                const heroIndex = selectedHeroes.indexOf(hero);
                if (heroIndex > -1) {
                    selectedHeroes.splice(heroIndex, 1);
                    delete patronPets[hero]; // Remove patron pet too
                    renderGrid();
                    updateBottomBar();
                }
            });
            slot.appendChild(img);
            
            // Add patron badge
            const badge = document.createElement('div');
            badge.className = 'patron-badge';
            if (patronPets[hero]) {
                const badgeImg = document.createElement('img');
                badgeImg.src = `patrons/${patronPets[hero]}`;
                badge.appendChild(badgeImg);
                badge.classList.add('has-patron');
            } else {
                badge.innerHTML = '<span>+</span>';
                badge.classList.remove('has-patron');
            }
            
            badge.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent hero click
                openPetModal(hero);
            });
            
            slot.appendChild(badge);
        }
    });
}

// Tab Switching
tabHeroesBtn.addEventListener('click', () => {
    currentTab = 'heroes';
    tabHeroesBtn.classList.add('active');
    tabPetsBtn.classList.remove('active');
    renderGrid();
});

tabPetsBtn.addEventListener('click', () => {
    currentTab = 'pets';
    tabPetsBtn.classList.add('active');
    tabHeroesBtn.classList.remove('active');
    renderGrid();
});

// Initial Render
renderGrid();
updateBottomBar();

const searchBar = document.querySelector('.search-bar');
if (searchBar) {
    searchBar.addEventListener('input', () => {
        renderGrid();
    });
}

okButton.addEventListener('click', () => {
    if(selectedHeroes.length === 0) {
        alert('Please select at least 1 hero.');
        return;
    }
    let msg = 'Team Built Successfully!\n\nHeroes: ' + selectedHeroes.map(h => {
        let name = h.split('.')[0];
        if (patronPets[h]) name += ` (+ ${patronPets[h].split('.')[0]})`;
        return name;
    }).join(', ');
    
    if (selectedPet) {
        msg += '\n\nMain Pet: ' + selectedPet.split('.')[0];
    }
    alert(msg);
});
