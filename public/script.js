const formTitle = document.getElementById('form-title');
const authForm = document.getElementById('auth-form');
const submitBtn = document.getElementById('submit-btn');
const toggleMsg = document.getElementById('toggle-msg');
const toggleLink = document.getElementById('toggle-link');
const errorMsg = document.getElementById('error-msg');
const loginOptions = document.getElementById('login-options');

let isLogin = true;
let selectedAvatar = null;

const avatarGrid = document.getElementById('avatar-grid');
const avatarContainer = document.getElementById('avatar-picker-container');

// Render 10 avatars
for (let i = 1; i <= 10; i++) {
    const img = document.createElement('img');
    img.src = `avatars/avatar${i}.jpg`;
    img.className = 'avatar-option';
    img.dataset.avatar = `avatar${i}.jpg`;
    
    img.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
        img.classList.add('selected');
        selectedAvatar = img.dataset.avatar;
    });
    
    avatarGrid.appendChild(img);
}

toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    
    if (isLogin) {
        formTitle.textContent = 'Login';
        submitBtn.textContent = 'Login';
        toggleMsg.textContent = "Don't have an account?";
        toggleLink.textContent = 'Register';
        loginOptions.style.display = 'flex';
        avatarContainer.style.display = 'none';
    } else {
        formTitle.textContent = 'Register';
        submitBtn.textContent = 'Register';
        toggleMsg.textContent = 'Already have an account?';
        toggleLink.textContent = 'Login';
        loginOptions.style.display = 'none';
        avatarContainer.style.display = 'block';
    }
    errorMsg.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    errorMsg.textContent = '';

    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
        const payload = { username, password };
        if (!isLogin && selectedAvatar) {
            payload.avatar = selectedAvatar;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (isLogin) {
                // Save user and redirect to home
                localStorage.setItem('user', username);
                localStorage.setItem('avatar', data.avatar);
                window.location.href = '/';
            } else {
                // Auto switch to login
                toggleLink.click();
                errorMsg.textContent = 'Registration successful! Please login.';
                errorMsg.style.color = '#51cf66';
            }
        } else {
            errorMsg.textContent = data.error || 'An error occurred';
            errorMsg.style.color = '#ff6b6b';
        }
    } catch (err) {
        errorMsg.textContent = 'Network error. Please try again.';
        errorMsg.style.color = '#ff6b6b';
    }
});
