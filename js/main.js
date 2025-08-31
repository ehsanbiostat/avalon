// Main Application
class AvalonApp {
    constructor() {
        this.currentSection = 'home';
        this.initializeApp();
    }

    initializeApp() {
        this.setupNavigation();
        this.setupGlobalEventListeners();
        this.initializeSystems();
        this.showSection('home');
    }

    setupNavigation() {
        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Brand click to go home
        const brandElement = document.querySelector('.nav-brand');
        if (brandElement) {
            brandElement.addEventListener('click', () => {
                this.showSection('home');
            });
        }
    }

    setupGlobalEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape key to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Ctrl/Cmd + Enter to submit forms
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const activeElement = document.activeElement;
                if (activeElement && activeElement.form) {
                    activeElement.form.dispatchEvent(new Event('submit'));
                }
            }
        });

        // Handle room code input formatting
        const roomCodeInput = document.getElementById('roomCode');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }

        // Handle player count input
        const playerCountInput = document.getElementById('playerCount');
        if (playerCountInput) {
            playerCountInput.addEventListener('input', () => {
                if (roomSystem && roomSystem.updatePlayerCount) {
                    roomSystem.updatePlayerCount();
                }
            });
        }
    }

    initializeSystems() {
        // Initialize all systems in the correct order
        // Auth system is already initialized
        // Room system is already initialized
        // Game system is already initialized
        
        // Set up global references
        window.authSystem = authSystem;
        window.roomSystem = roomSystem;
        window.gameSystem = gameSystem;
        
        // Initialize any additional features
        this.initializeAnimations();
        this.initializeNotifications();
    }

    initializeAnimations() {
        // Add smooth scrolling for navigation
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Add click animation
                link.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    link.style.transform = '';
                }, 150);
            });
        });

        // Add hover effects for buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = '';
            });
        });
    }

    initializeNotifications() {
        // Create notification container if it doesn't exist
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(notificationContainer);
        }
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
        }
        
        // Update navigation
        this.updateNavigation(sectionName);
        
        // Handle section-specific logic
        this.handleSectionChange(sectionName);
    }

    updateNavigation(sectionName) {
        // Remove active class from all nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current section link
        const activeLink = document.querySelector(`.nav-link[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    handleSectionChange(sectionName) {
        switch (sectionName) {
            case 'stats':
                // Refresh stats when visiting stats section
                if (authSystem && authSystem.getUserStats) {
                    const stats = authSystem.getUserStats();
                    if (stats) {
                        authSystem.updateStatsDisplay(stats);
                    }
                }
                break;
                
            case 'home':
                // Reset any game state when going home
                this.resetGameState();
                break;
        }
    }

    resetGameState() {
        // Close any open modals
        this.closeAllModals();
        
        // Reset any active game state
        if (roomSystem) {
            roomSystem.stopLobbyPolling();
        }
    }

    closeAllModals() {
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

    // Utility functions
    showLoading() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'block';
        }
    }

    hideLoading() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        authSystem.showNotification(`An error occurred: ${error.message}`, 'error');
    }

    // App lifecycle
    start() {
        console.log('Avalon App started successfully!');
        
        // Check if user is already logged in
        if (authSystem && authSystem.isUserLoggedIn()) {
            console.log('User is already logged in');
        }
        
        // Show welcome message for new users
        this.showWelcomeMessage();
    }

    showWelcomeMessage() {
        // Only show welcome message if user hasn't seen it before
        const hasSeenWelcome = localStorage.getItem('avalonWelcomeSeen');
        if (!hasSeenWelcome && !authSystem.isUserLoggedIn()) {
            setTimeout(() => {
                authSystem.showNotification('Welcome to Avalon! Create an account or login to start playing.', 'info');
                localStorage.setItem('avalonWelcomeSeen', 'true');
            }, 2000);
        }
    }

    // Cleanup
    destroy() {
        // Clean up any intervals or event listeners
        if (roomSystem) {
            roomSystem.stopLobbyPolling();
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.avalonApp = new AvalonApp();
    
    // Start the app
    window.avalonApp.start();
    
    // Add some global utility functions
    window.utils = {
        // Generate random ID
        generateId: () => Math.random().toString(36).substr(2, 9),
        
        // Format date
        formatDate: (date) => new Date(date).toLocaleDateString(),
        
        // Shuffle array
        shuffle: (array) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },
        
        // Debounce function
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };
    
    // Debug functions
    window.toggleDebugPanel = function() {
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel) {
            debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
        }
    };
    
    console.log('🎮 Avalon - The Resistance is ready!');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause any active polling
        if (roomSystem && roomSystem.lobbyPolling) {
            roomSystem.stopLobbyPolling();
        }
    } else {
        // Page is visible again, resume polling if needed
        if (roomSystem && roomSystem.currentRoom && !roomSystem.lobbyPolling) {
            roomSystem.lobbyPolling = setInterval(() => roomSystem.updateLobbyDisplay(), 2000);
        }
    }
});

// Handle beforeunload
window.addEventListener('beforeunload', () => {
    // Save any pending data
    if (authSystem && authSystem.getCurrentUser()) {
        const stats = authSystem.getUserStats();
        if (stats) {
            localStorage.setItem(`avalonStats_${authSystem.getCurrentUser().name}`, JSON.stringify(stats));
        }
    }
    
    // Clean up
    if (window.avalonApp) {
        window.avalonApp.destroy();
    }
});
