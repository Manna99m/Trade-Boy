/* hero-framer.js */
document.addEventListener('DOMContentLoaded', () => {
    // Inject CSS
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = 'hero-framer.css';
    document.head.appendChild(style);

    // Function to wrap a hero or pet image
    function wrapHeroImage(img) {
        if (img.classList.contains('hero-framed-portrait')) return;
        if (img.closest('.hero-frame-container') || img.closest('.hero-frame-wrapper')) return;

        const src = img.getAttribute('src');
        if (!src) return;
        
        const isHero = src.includes('heroes/');
        const isPet = src.includes('pets/');
        
        if (!isHero && !isPet) return;

        const wrapper = document.createElement('div');
        wrapper.className = img.className; 
        wrapper.classList.remove('hero-framed-portrait'); 
        wrapper.classList.add('hero-frame-wrapper');
        if (isPet) wrapper.classList.add('is-pet');
        
        wrapper.style.cssText = img.style.cssText;
        img.style.cssText = '';
        
        const bg = document.createElement('img');
        bg.src = isHero ? 'frame/bg.png' : 'frame/pet-bg.png';
        bg.className = 'hero-frame-base-bg';

        const frameBg = document.createElement('img');
        frameBg.src = isHero ? 'frame/frame.png' : 'frame/pet-frame.png';
        frameBg.className = 'hero-frame-border';
        
        const lvl = document.createElement('img');
        lvl.src = isHero ? 'frame/130.png' : 'frame/pet-130.png';
        lvl.className = 'hero-frame-lvl';
        
        const star = document.createElement('img');
        star.src = 'frame/star.png';
        star.className = 'hero-frame-star';
        
        img.className = 'hero-framed-portrait';
        
        img.parentNode.insertBefore(wrapper, img);
        
        wrapper.appendChild(bg); 
        wrapper.appendChild(img);
        wrapper.appendChild(frameBg);
        wrapper.appendChild(lvl);
        wrapper.appendChild(star);
    }

    // Wrap existing images
    document.querySelectorAll('img[src*="heroes/"], img[src*="pets/"]').forEach(wrapHeroImage);

    // Watch for dynamically added images
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.tagName === 'IMG' && (node.src.includes('heroes/') || node.src.includes('pets/'))) {
                        wrapHeroImage(node);
                    }
                    const imgs = node.querySelectorAll('img[src*="heroes/"], img[src*="pets/"]');
                    imgs.forEach(wrapHeroImage);
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});
