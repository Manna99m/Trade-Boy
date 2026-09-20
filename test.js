
        const user = localStorage.getItem('user');
        if (!user) {
            window.location.href = '/';
        }
        document.getElementById('user-display').textContent = user;
        
        document.getElementById('profile-btn').addEventListener('click', () => {
            if(confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('user');
                window.location.href = '/';
            }
        });

        // Simple mock data for posts
        const postData = {
            'archdemon-teams': { title: 'Archdemon Teams', content: 'Detailed strategy on how to defeat the Archdemon. Focus on high single-target DPS and sustained healing.' },
            'event-teams': { title: 'Event Teams', content: 'For this week\\'s event, you should prioritize heroes with crowd control and area-of-effect damage.' },
            'team-build': { title: 'Team Build', content: 'A balanced team usually consists of 1 Tank, 2 DPS, 1 Support, and 1 Healer. Learn the nuances of synergy here.' },
            'heroes': { title: 'Heroes Tier List', content: 'S-Tier: ... A-Tier: ... B-Tier: ... (Placeholder details for hero analysis).' },
            'titans': { title: 'Titans Guide', content: 'Upgrading your titans is crucial for Guild Wars. Focus on the Water and Fire titans first for maximum impact.' },
            'maestro-teams': { title: 'Best Team for Maestro', content: 'Strategies and team comps for Maestro are being compiled. Stay tuned.' },
            'osh-teams': { 
                title: 'Best Team for OSH', 
                content: `
                <p style="margin-bottom: 20px;">Here is the top performing team composition against OSH:</p>
                <div class="selected-slots" style="background: rgba(0,0,0,0.4); padding: 20px; border-radius: 10px; border: 1px solid #b8860b;">
                    <div class="slot pet-slot"><img src="pets/Khorus.png"></div>
                    <div class="slot hero-slot">
                        <img src="heroes/isaac.png">
                        <div class="patron-badge"><img src="pets/Oliver.png"></div>
                    </div>
                    <div class="slot hero-slot">
                        <img src="heroes/Nebula.png">
                        <div class="patron-badge"><img src="pets/Cain.png"></div>
                    </div>
                    <div class="slot hero-slot">
                        <img src="heroes/Sebastian.png">
                        <div class="patron-badge"><img src="pets/Albus.png"></div>
                    </div>
                    <div class="slot hero-slot">
                        <img src="heroes/Cornelious.png">
                        <div class="patron-badge"><img src="pets/Biscuit.png"></div>
                    </div>
                    <div class="slot hero-slot">
                        <img src="heroes/Martha.png">
                        <div class="patron-badge"><img src="pets/Axel.png"></div>
                    </div>
                </div>
                <p style="margin-top: 20px;"><em>I will add other teams later...</em></p>
                `
            }
        };

        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');
        
        const container = document.getElementById('post-content');
        
        if (postId && postData[postId]) {
            const post = postData[postId];
            document.title = `${post.title} - Trade Boy`;
            
            container.innerHTML = `
                <img src="thumbnail.jpg" alt="${post.title}" class="post-header-img">
                <h1 style="margin-bottom: 20px; font-size: 2.5rem;">${post.title}</h1>
                <div style="font-size: 1.1rem; line-height: 1.8; color: #cbd5e1;">${post.content}</div>
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="color: #94a3b8;">Written by: Nexus Admin</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <h1>Post not found</h1>
                <p>The post you are looking for does not exist.</p>
            `;
        }
    