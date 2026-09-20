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
    "Albus.png", "Axel.png", "Biscuit.png", "Cain.png", "Fenris.png", "Khorus.png", "Mara.png", "Merlin.png", "Oliver.png", "Vex.png"
];

// Sort alphabetically regardless of case
heroes.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
pets.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

let currentTab = 'heroes'; // 'heroes' or 'pets'
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

function openPetModal(heroImg) {
    modalTargetHero = heroImg;
    petModalGrid.innerHTML = '';
    
    pets.forEach(pet => {
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
                badgeImg.src = `pets/${patronPets[hero]}`;
                badge.appendChild(badgeImg);
            } else {
                badge.innerHTML = '<span>+</span>';
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
