// Main Application
class AvalonApp {
    constructor() {
        console.log('=== AVALON APP CONSTRUCTOR ===');
        this.currentSection = 'home';
        this.initializeApp();
    }

    initializeApp() {
        console.log('=== INITIALIZING APP ===');
        this.setupNavigation();
        this.setupGlobalEventListeners();
        this.initializeSystems();
        this.showSection('home');
    }

    setupNavigation() {
        console.log('=== SETTING UP NAVIGATION ===');
        // Navigation links
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        console.log('Found nav links:', navLinks.length);
        navLinks.forEach(link => {
            console.log('Adding click listener to nav link:', link.dataset.section);
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                console.log('Nav link clicked:', section);
                this.showSection(section);
            });
        });

        // Brand click to go home
        const brandElement = document.querySelector('.nav-brand');
        if (brandElement) {
            console.log('Adding click listener to brand element');
            brandElement.addEventListener('click', () => {
                console.log('Brand clicked, going to home');
                this.showSection('home');
            });
        } else {
            console.log('Brand element not found');
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
        // Supabase auth system is already initialized
        // Supabase room system is already initialized
        // Game system is already initialized
        
        // Set up global references
        window.authSystem = window.supabaseAuthSystem;
        window.roomSystem = window.supabaseRoomSystem;
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
    
    
    window.testFailCount = function() {
        console.log('Debug button clicked: Test Fail Count');
        if (window.gameSystem && window.gameSystem.showMissionFailCount) {
            window.gameSystem.showMissionFailCount(2);
        } else {
            console.log('Game system not available');
            authSystem.showNotification('Game system not available', 'error');
        }
    };
    
    window.testVoteResults = function() {
        console.log('Debug button clicked: Test Vote Results');
        if (window.gameSystem && window.gameSystem.showVoteResults) {
            // Create sample vote data for testing
            if (!window.gameSystem.playerVotes || Object.keys(window.gameSystem.playerVotes).length === 0) {
                console.log('Creating sample vote data for testing...');
                window.gameSystem.playerVotes = {};
                window.gameSystem.players.forEach(player => {
                    // Randomly assign votes for testing
                    window.gameSystem.playerVotes[player.id] = Math.random() > 0.5;
                });
                console.log('Sample votes created:', window.gameSystem.playerVotes);
            }
            window.gameSystem.showVoteResults();
        } else {
            console.log('Game system not available');
            authSystem.showNotification('Game system not available', 'error');
        }
    };
    
    window.testRejectionCounter = function() {
        console.log('=== TEST REJECTION COUNTER ===');
        console.log('Debug button clicked: Test Rejection Counter');
        
        if (!window.gameSystem) {
            console.error('Game system not available');
            authSystem.showNotification('Game system not available', 'error');
            return;
        }
        
        if (!window.gameSystem.updateRejectionCounter) {
            console.error('updateRejectionCounter function not found');
            authSystem.showNotification('updateRejectionCounter function not found', 'error');
            return;
        }
        
        console.log('Game system available, starting test...');
        console.log('Current rejectedTeams value:', window.gameSystem.rejectedTeams);
        
        // Test different rejection counts
        const testCounts = [0, 1, 2, 3, 4, 5];
        let currentIndex = 0;
        
        // REMOVED: Test polling - using real-time updates only
        console.log('Rejection counter test removed - using real-time updates only');
        
        authSystem.showNotification('Testing rejection counter - watch the center bar!', 'info');
    };
    
    window.testLadyOfLake = function() {
        console.log('=== TEST LADY OF LAKE ===');
        console.log('Debug button clicked: Test Lady of Lake');
        
        if (!window.gameSystem) {
            console.error('Game system not available');
            authSystem.showNotification('Game system not available', 'error');
            return;
        }
        
        if (!window.gameSystem.triggerLadyOfLake) {
            console.error('triggerLadyOfLake function not found');
            authSystem.showNotification('triggerLadyOfLake function not found', 'error');
            return;
        }
        
        console.log('Game system available, testing Lady of Lake...');
        console.log('Lady of Lake enabled:', window.gameSystem.ladyOfLake?.enabled);
        console.log('Current holder:', window.gameSystem.ladyOfLake?.currentHolder);
        console.log('Uses remaining:', window.gameSystem.ladyOfLake?.usesRemaining);
        
        if (window.gameSystem.ladyOfLake?.enabled) {
            console.log('Lady of Lake is enabled, triggering...');
            
            // Force trigger Lady of Lake interface for testing
            if (window.gameSystem.ladyOfLake.currentHolder) {
                const currentHolder = window.gameSystem.players.find(p => p.id === window.gameSystem.ladyOfLake.currentHolder);
                if (currentHolder) {
                    console.log('Forcing Lady of Lake interface for:', currentHolder.name);
                    window.gameSystem.showLadyOfLakeInterface(currentHolder);
                    authSystem.showNotification(`Lady of Lake interface triggered for ${currentHolder.name}!`, 'info');
                } else {
                    console.log('Current holder not found');
                    authSystem.showNotification('Lady of Lake holder not found', 'error');
                }
            } else {
                console.log('No current Lady of Lake holder');
                authSystem.showNotification('No Lady of Lake holder assigned', 'warning');
            }
        } else {
            console.log('Lady of Lake not enabled. Room config:', window.gameSystem.currentGame);
            authSystem.showNotification('Lady of Lake is not enabled in this game', 'warning');
        }
    };
    
    window.testLadyOfLakePermission = function() {
        console.log('=== TEST LADY OF LAKE EXAMINATION ===');
        console.log('Debug button clicked: Test Lady of Lake Examination');
        
        if (!window.gameSystem) {
            console.error('Game system not available');
            authSystem.showNotification('Game system not available', 'error');
            return;
        }
        
        if (!window.gameSystem.showLoyaltyPermissionRequest) {
            console.error('showLoyaltyPermissionRequest function not found');
            authSystem.showNotification('showLoyaltyPermissionRequest function not found', 'error');
            return;
        }
        
        // Create test players for demonstration
        const testTargetPlayer = { 
            id: 'test_target', 
            name: 'Test Player', 
            isAI: true,
            avatar: 'T'
        };
        const testCurrentHolder = { 
            id: 'test_holder', 
            name: 'Lady of Lake Holder', 
            isAI: false,
            avatar: 'L'
        };
        
        console.log('Testing Lady of Lake examination notification...');
        console.log('Target player:', testTargetPlayer);
        console.log('Current holder:', testCurrentHolder);
        
        window.gameSystem.showLoyaltyPermissionRequest(testTargetPlayer, testCurrentHolder);
        authSystem.showNotification('Lady of Lake examination test triggered!', 'info');
    };

    window.testRoleModal = function() {
        console.log('=== TEST ROLE MODAL ===');
        console.log('Debug button clicked: Test Role Modal');
        
        if (!window.gameSystem) {
            console.error('Game system not available');
            authSystem.showNotification('Game system not available', 'error');
            return;
        }
        
        if (!window.gameSystem.showPlayerRole) {
            console.error('showPlayerRole function not found');
            authSystem.showNotification('showPlayerRole function not found', 'error');
            return;
        }
        
        console.log('Testing role modal display...');
        window.gameSystem.showPlayerRole();
        authSystem.showNotification('Role modal test triggered!', 'info');
    };
    
    console.log('🎮 Avalon - The Resistance is ready!');
    
    // Check if there's an active game and provide return option
    window.checkForActiveGame = function() {
        console.log('Checking for active game...');
        
        // Check if game system exists and has current game
        if (window.gameSystem && window.gameSystem.currentGame) {
            console.log('Active game found:', window.gameSystem.currentGame);
            
            // Show return to game option
            const returnButton = document.createElement('div');
            returnButton.id = 'returnToGameButton';
            returnButton.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(45deg, #ffd700, #ffed4e);
                color: #000;
                padding: 1rem 1.5rem;
                border-radius: 10px;
                border: 2px solid #fff;
                cursor: pointer;
                font-weight: bold;
                z-index: 10000;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
                animation: pulse 2s infinite;
            `;
            returnButton.innerHTML = '🕵️ Return to Game';
            returnButton.onclick = () => {
                if (window.gameSystem && window.gameSystem.showGameInterface) {
                    window.gameSystem.showGameInterface();
                    returnButton.remove();
                }
            };
            
            document.body.appendChild(returnButton);
            console.log('Return to game button added');
            
            // Add pulse animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
            
        } else {
            console.log('No active game found');
        }
    };
    
    // Check for active game when page loads
    setTimeout(() => {
        window.checkForActiveGame();
    }, 1000);
    
    // Monitor game interface visibility to catch when it gets closed
    window.monitorGameInterface = function() {
        const gameInterface = document.getElementById('gameInterface');
        if (gameInterface) {
            // Create a MutationObserver to watch for style changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const display = gameInterface.style.display;
                        if (display === 'none') {
                            console.error('🚨 GAME INTERFACE WAS CLOSED! 🚨');
                            console.error('Display changed to:', display);
                            console.error('Stack trace:', new Error().stack);
                            
                            // Show return to game button immediately
                            window.checkForActiveGame();
                        }
                    }
                });
            });
            
            observer.observe(gameInterface, { attributes: true, attributeFilter: ['style'] });
            console.log('Game interface monitoring started');
        }
    };
    
    // Start monitoring when page loads
    setTimeout(() => {
        window.monitorGameInterface();
    }, 2000);
});

// Handle page visibility changes - real-time subscriptions handle this automatically
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - real-time subscriptions continue in background');
    } else {
        console.log('Page visible - real-time subscriptions active');
        // Check if we need to reconnect to real-time updates
        if (roomSystem && roomSystem.currentRoom && roomSystem.subscriptionStatus !== 'SUBSCRIBED') {
            console.log('Reconnecting to real-time updates...');
            roomSystem.subscribeToRoomUpdates(roomSystem.currentRoom.id);
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
