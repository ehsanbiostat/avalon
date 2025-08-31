// Authentication System
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isRegistering = false;
        this.userDatabase = JSON.parse(localStorage.getItem('avalonUsers')) || {};
        
        this.initializeAuth();
    }

    initializeAuth() {
        // Check for existing session
        const savedUser = localStorage.getItem('avalonCurrentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.isLoggedIn = true;
            this.updateAuthUI();
        }

        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auth button
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            authBtn.addEventListener('click', () => this.toggleAuthModal());
        }

        // Auth form
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => this.handleAuth(e));
        }

        // Auth toggle
        const authToggleLink = document.getElementById('authToggleLink');
        if (authToggleLink) {
            authToggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthMode();
            });
        }

        // Modal close buttons
        const closeButtons = document.querySelectorAll('.close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Close modal when clicking outside
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });
    }

    toggleAuthModal() {
        if (this.isLoggedIn) {
            this.logout();
        } else {
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.style.display = 'block';
            }
        }
    }

    toggleAuthMode() {
        this.isRegistering = !this.isRegistering;
        
        const title = document.getElementById('authTitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const toggleLink = document.getElementById('authToggleLink');
        const emailGroup = document.getElementById('emailGroup');
        const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
        
        if (this.isRegistering) {
            title.textContent = 'Create Your Legend';
            submitBtn.textContent = 'Join the Realm';
            toggleLink.textContent = 'Already have an account? Sign in';
            emailGroup.style.display = 'block';
            confirmPasswordGroup.style.display = 'block';
            document.getElementById('email').required = true;
            document.getElementById('confirmPassword').required = true;
        } else {
            title.textContent = 'Join the Quest';
            submitBtn.textContent = 'Enter Avalon';
            toggleLink.textContent = 'New to Avalon? Create an account';
            emailGroup.style.display = 'none';
            confirmPasswordGroup.style.display = 'none';
            document.getElementById('email').required = false;
            document.getElementById('confirmPassword').required = false;
        }
    }

    handleAuth(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const email = document.getElementById('email').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (this.isRegistering) {
            this.register(username, password, email, confirmPassword);
        } else {
            this.login(username, password);
        }
    }

    register(username, password, email, confirmPassword) {
        // Validation
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match!', 'error');
            return;
        }
        
        if (this.userDatabase[username]) {
            this.showNotification('Username already exists! Please choose another.', 'error');
            return;
        }
        
        if (username.length < 3) {
            this.showNotification('Username must be at least 3 characters long.', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters long.', 'error');
            return;
        }
        
        // Create new user
        const newUser = {
            username: username,
            password: this.hashPassword(password),
            email: email,
            id: this.generateUserId(),
            avatar: username.charAt(0).toUpperCase(),
            joinDate: new Date().toISOString(),
            stats: {
                gamesPlayed: 0,
                wins: 0,
                questsSucceeded: 0,
                timesAsMerlin: 0,
                successfulAssassinations: 0,
                perfectDeductions: 0,
                favoriteRole: null,
                winStreak: 0,
                bestWinStreak: 0,
                totalPlayTime: 0,
                achievements: []
            }
        };
        
        this.userDatabase[username] = newUser;
        localStorage.setItem('avalonUsers', JSON.stringify(this.userDatabase));
        
        // Auto-login after registration
        this.loginUser(newUser);
        this.showNotification(`Welcome to Avalon, ${username}! Your account has been created.`, 'success');
        
        // Show welcome modal for new users
        this.showWelcomeModal();
        
    }

    login(username, password) {
        const user = this.userDatabase[username];
        
        if (!user) {
            this.showNotification('Username not found. Please register first.', 'error');
            return;
        }
        
        if (!this.verifyPassword(password, user.password)) {
            this.showNotification('Incorrect password!', 'error');
            return;
        }
        
        this.loginUser(user);
        this.showNotification(`Welcome back, ${username}!`, 'success');
    }

    loginUser(user) {
        this.currentUser = {
            name: user.username,
            id: user.id,
            avatar: user.avatar,
            email: user.email
        };
        this.isLoggedIn = true;
        
        // Save session
        localStorage.setItem('avalonCurrentUser', JSON.stringify(this.currentUser));
        
        // Update UI
        this.updateAuthUI();
        this.closeModals();
        
        // Clear form
        document.getElementById('authForm').reset();
        
        // Update stats display
        this.updateStatsDisplay(user.stats);
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        this.userDatabase[user.username] = user;
        localStorage.setItem('avalonUsers', JSON.stringify(this.userDatabase));
    }

    logout() {
        // Save current stats before logout
        if (this.currentUser) {
            const user = this.userDatabase[this.currentUser.name];
            if (user && window.gameState && window.gameState.stats) {
                user.stats = window.gameState.stats;
                localStorage.setItem('avalonUsers', JSON.stringify(this.userDatabase));
            }
        }
        
        this.currentUser = null;
        this.isLoggedIn = false;
        this.isRegistering = false;
        
        // Clear session
        localStorage.removeItem('avalonCurrentUser');
        
        // Update UI
        this.updateAuthUI();
        
        // Reset auth form to login mode
        if (this.isRegistering) {
            this.toggleAuthMode();
        }
        
        this.showNotification('You have been logged out.', 'info');
        
        // Redirect to home
        this.showSection('home');
    }

    updateAuthUI() {
        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            if (this.isLoggedIn) {
                authBtn.textContent = `Logout (${this.currentUser.name})`;
            } else {
                authBtn.textContent = 'Login';
            }
        }
    }

    updateStatsDisplay(stats) {
        if (!stats) return;
        
        const statElements = {
            'gamesPlayed': document.getElementById('gamesPlayed'),
            'winRate': document.getElementById('winRate'),
            'questsSucceeded': document.getElementById('questsSucceeded'),
            'timesAsMerlin': document.getElementById('timesAsMerlin'),
            'successfulAssassinations': document.getElementById('successfulAssassinations'),
            'perfectDeductions': document.getElementById('perfectDeductions')
        };
        
        if (statElements.gamesPlayed) {
            statElements.gamesPlayed.textContent = stats.gamesPlayed || 0;
        }
        
        if (statElements.winRate) {
            const winRate = stats.gamesPlayed > 0 
                ? Math.round((stats.wins / stats.gamesPlayed) * 100)
                : 0;
            statElements.winRate.textContent = `${winRate}%`;
        }
        
        if (statElements.questsSucceeded) {
            statElements.questsSucceeded.textContent = stats.questsSucceeded || 0;
        }
        
        if (statElements.timesAsMerlin) {
            statElements.timesAsMerlin.textContent = stats.timesAsMerlin || 0;
        }
        
        if (statElements.successfulAssassinations) {
            statElements.successfulAssassinations.textContent = stats.successfulAssassinations || 0;
        }
        
        if (statElements.perfectDeductions) {
            statElements.perfectDeductions.textContent = stats.perfectDeductions || 0;
        }
    }

    showWelcomeModal() {
        const modalContent = `
            <h2 style="color: #ffd700;">Welcome to Avalon!</h2>
            <div style="margin: 2rem 0; line-height: 1.8;">
                <p>You've successfully joined the realm of Avalon! Here's what you can do:</p>
                <ul style="margin: 1rem 0; padding-left: 1.5rem;">
                    <li>🎮 Play games with other knights</li>
                    <li>📊 Track your statistics and achievements</li>
                    <li>🏆 Climb the rankings</li>
                    <li>🎭 Master different roles</li>
                    <li>💬 Chat with other players</li>
                </ul>
                <p style="margin-top: 1.5rem;">Your first quest awaits! Click "Create Game Room" to begin your journey.</p>
            </div>
            <button class="btn btn-primary" onclick="authSystem.closeModals()">Begin Adventure</button>
        `;
        this.showModal(modalContent);
    }

    showModal(content) {
        const modal = document.getElementById('authModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // Store original content
        if (!modal.dataset.originalContent) {
            modal.dataset.originalContent = modalContent.innerHTML;
        }
        
        modalContent.innerHTML = content;
        modal.style.display = 'block';
    }

    closeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Restore original auth modal content if needed
        const authModal = document.getElementById('authModal');
        if (authModal && authModal.dataset.originalContent) {
            authModal.querySelector('.modal-content').innerHTML = authModal.dataset.originalContent;
            delete authModal.dataset.originalContent;
        }
    }

    showSection(sectionName) {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    showNotification(message, type = 'info') {
        const colors = {
            'success': '#00b894',
            'error': '#d63031',
            'warning': '#fdcb6e',
            'info': '#ffd700'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.7));
            color: ${colors[type]};
            padding: 1rem 2rem;
            border-radius: 10px;
            border: 2px solid ${colors[type]};
            z-index: 5000;
            animation: slideDown 0.5s ease-out;
            max-width: 400px;
            text-align: center;
            font-weight: bold;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease-out';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    // Utility functions
    hashPassword(password) {
        // Simple hash for demo (use proper hashing in production)
        return btoa(password + 'avalon_salt');
    }

    verifyPassword(password, hashedPassword) {
        return this.hashPassword(password) === hashedPassword;
    }

    generateUserId() {
        return Math.random().toString(36).substr(2, 9);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserLoggedIn() {
        return this.isLoggedIn;
    }

    getUserStats() {
        if (this.currentUser) {
            const user = this.userDatabase[this.currentUser.name];
            return user ? user.stats : null;
        }
        return null;
    }

    updateUserStats(newStats) {
        if (this.currentUser) {
            const user = this.userDatabase[this.currentUser.name];
            if (user) {
                user.stats = { ...user.stats, ...newStats };
                localStorage.setItem('avalonUsers', JSON.stringify(this.userDatabase));
                this.updateStatsDisplay(user.stats);
            }
        }
    }
}

// Initialize auth system
const authSystem = new AuthSystem();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
