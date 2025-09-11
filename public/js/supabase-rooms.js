// Supabase Room Management System
console.log('=== LOADING SUPABASE ROOMS SYSTEM ===');
console.log('Script is being executed!');
import { supabaseAuthSystem } from './supabase-auth.js';
import { TABLES, GAME_STATUS } from '../supabase-config.js';
console.log('Supabase rooms system imports loaded');

// Team proposal state constants
const TEAM_PROPOSAL_STATE = {
    NONE: 'none',
    SELECTING: 'selecting',
    PROPOSED: 'proposed',
    VOTING: 'voting',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

// Mission team sizes based on player count and mission number
const MISSION_TEAM_SIZES = {
    5: [2, 3, 2, 3, 3], // 5 players: missions 1-5
    6: [2, 3, 4, 3, 4], // 6 players: missions 1-5
    7: [2, 3, 3, 4, 4], // 7 players: missions 1-5
    8: [3, 4, 4, 5, 5], // 8 players: missions 1-5
    9: [3, 4, 4, 5, 5], // 9 players: missions 1-5
    10: [3, 4, 4, 5, 5] // 10 players: missions 1-5
};

class SupabaseRoomSystem {
    constructor() {
        console.log('=== SUPABASE ROOMS SYSTEM CONSTRUCTOR ===');
        console.log('supabaseAuthSystem:', supabaseAuthSystem);
        this.supabase = supabaseAuthSystem.supabase;
        this.currentRoom = null;
        this.isHost = false;
        this.lobbyPolling = null; // For compatibility with old room system
        this.showingRoleInformation = false; // Flag to prevent multiple simultaneous calls to showRoleInformation

        // Real-time subscription system (ONLY method for live updates)
        this.roomSubscription = null;
        this.subscriptionStatus = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isSubscribing = false; // Prevent duplicate subscriptions
        this.subscriptionDebounceTimer = null; // Debounce subscription calls
        this.updateDebounceTimer = null; // Debounce UI updates
        this.lastUpdateTime = 0; // Rate limiting for updates
        this.performanceMetrics = {
            subscriptionCount: 0,
            updateCount: 0,
            lastPerformanceCheck: Date.now()
        };
        
        // State tracking for debugging
        this.stateUpdateLog = [];
        this.maxStateLogEntries = 50;

        // Add a small delay to ensure DOM is fully ready
        console.log('Setting up setTimeout for event listeners...');
        setTimeout(() => {
            console.log('setTimeout callback executing...');
            console.log('About to call setupEventListeners...');
            try {
                console.log('Calling setupEventListeners method...');
        this.setupEventListeners();
                console.log('setupEventListeners completed successfully');
                
                // Expose debug functions globally
                window.testRealTimeUpdates = () => this.testRealTimeUpdates();
                console.log('Debug function exposed: window.testRealTimeUpdates()');

                // Add window resize listener for responsive positioning
                this.setupResponsiveListeners();

                // Check if user is already in a room
                this.checkForExistingRoom();
            } catch (error) {
                console.error('Error in setupEventListeners:', error);
                console.error('Error stack:', error.stack);
            }
        }, 100);
    }

    setupEventListeners() {
        // MINIMAL TEST - Just one simple log
        console.log('MINIMAL TEST: Method is executing!');

        // Test if we can find the buttons
        const testBtn = document.getElementById('createRoomBtn');
        console.log('TEST: createRoomBtn found:', !!testBtn);
        if (testBtn) {
            console.log('TEST: Button element:', testBtn);
            console.log('TEST: Button text:', testBtn.textContent);
        }

        // Add event listeners
        if (testBtn) {
            testBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create room button clicked!');
                alert('Create room button clicked!');
            });
            console.log('Event listener added to createRoomBtn');
        }

        // Create Room button
        const createRoomBtn = document.getElementById('createRoomBtn');
        console.log('createRoomBtn element:', createRoomBtn);
        if (createRoomBtn) {
            console.log('Adding click event listener to createRoomBtn');
            createRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create room button clicked!');
                this.showCreateRoom();
            });
        } else {
            console.error('createRoomBtn not found!');
        }

        // Join Room button
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        console.log('joinRoomBtn element:', joinRoomBtn);
        if (joinRoomBtn) {
            console.log('Adding click event listener to joinRoomBtn');
            joinRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Join room button clicked!');
                this.showJoinRoom();
            });
        } else {
            console.error('joinRoomBtn not found!');
        }

        // Join Room Submit button (for room code input)
        const joinRoomSubmitBtn = document.getElementById('joinRoomSubmitBtn');
        console.log('joinRoomSubmitBtn element:', joinRoomSubmitBtn);
        if (joinRoomSubmitBtn) {
            console.log('Adding click event listener to joinRoomSubmitBtn');
            joinRoomSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Join room submit button clicked!');
                this.handleJoinRoomSubmit();
            });
        } else {
            console.error('joinRoomSubmitBtn not found!');
        }

        // Room code input (for Enter key support)
        const roomCodeInput = document.getElementById('roomCode');
        if (roomCodeInput) {
            console.log('Adding keydown event listener to roomCode input');
            roomCodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('Enter key pressed in room code input');
                    this.handleJoinRoomSubmit();
                }
            });
        } else {
            console.error('roomCode input not found!');
        }
    }

    setupResponsiveListeners() {
        console.log('=== SETTING UP RESPONSIVE LISTENERS ===');

        // Debounced resize handler to prevent excessive calls
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                console.log('Window resized - recalculating player positions');
                if (this.currentRoom && this.currentRoom.players) {
                    this.positionPlayersOnCircle();
                }
            }, 250); // 250ms debounce
        };

        // Add resize listener
        window.addEventListener('resize', handleResize);

        // Store reference for cleanup
        this.resizeHandler = handleResize;
    }

    stopLobbyPolling() {
        // For compatibility with old room system
        // In Supabase version, we use real-time subscriptions instead of polling
        console.log('stopLobbyPolling called (compatibility method)');
    }


    updateLobbyDisplay() {
        // For compatibility with old room system
        console.log('updateLobbyDisplay called (compatibility method)');
    }

    showCreateRoom() {
        console.log('=== SHOW CREATE ROOM ===');

        // Check if user is logged in
        if (!supabaseAuthSystem.isUserLoggedIn()) {
            supabaseAuthSystem.showNotification('Please login to create a game room!', 'error');
            supabaseAuthSystem.toggleAuthModal();
            return;
        }

        // Load the room creation content
        this.loadRoomCreationContent();

        const roomModal = document.getElementById('roomModal');
        if (roomModal) {
            roomModal.style.display = 'block';
            console.log('Room creation modal opened');
        } else {
            console.error('roomModal not found!');
        }
    }

    showJoinRoom() {
        console.log('=== SHOW JOIN ROOM ===');

        // Check if user is logged in
        if (!supabaseAuthSystem.isUserLoggedIn()) {
            supabaseAuthSystem.showNotification('Please login to join a game room!', 'error');
            supabaseAuthSystem.toggleAuthModal();
            return;
        }

        const joinModal = document.getElementById('joinModal');
        if (joinModal) {
            joinModal.style.display = 'block';
            this.displayActiveRooms();
            console.log('Join room modal opened');
        } else {
            console.error('joinModal not found!');
        }
    }

    async handleJoinRoomSubmit() {
        console.log('=== HANDLE JOIN ROOM SUBMIT ===');

        // Check if user is logged in
        if (!supabaseAuthSystem.isUserLoggedIn()) {
            this.showNotification('Please login to join a room!', 'error');
            return;
        }

        // Get room code from input
        const roomCodeInput = document.getElementById('roomCode');
        if (!roomCodeInput) {
            console.error('Room code input not found!');
            this.showNotification('Room code input not found!', 'error');
            return;
        }

        const roomCode = roomCodeInput.value.trim().toUpperCase();
        if (!roomCode) {
            this.showNotification('Please enter a room code!', 'error');
            return;
        }

        if (roomCode.length !== 6) {
            this.showNotification('Room code must be 6 characters!', 'error');
            return;
        }

        console.log('Attempting to join room with code:', roomCode);

        // Use the existing joinRoomByCode function
        const success = await this.joinRoomByCode(roomCode);

        if (success) {
            // Close the join modal
            const joinModal = document.getElementById('joinModal');
            if (joinModal) {
                joinModal.style.display = 'none';
            }

            // Clear the input
            roomCodeInput.value = '';
        }
    }

    loadRoomCreationContent() {
        console.log('=== LOADING ROOM CREATION CONTENT ===');
        const content = document.getElementById('roomCreationContent');
        if (!content) {
            console.error('roomCreationContent not found!');
            return;
        }

        content.innerHTML = `
            <div class="room-presets">
                <h3 style="color: #ffd700; margin-bottom: 1rem;">Quick Setup</h3>
                <div class="preset-buttons">
                    <button class="preset-btn" data-preset="classic10">Classic 10 Player</button>
                    <button class="preset-btn" data-preset="classic10Lady">Classic 10 + Lady</button>
                    <button class="preset-btn" data-preset="chaos10">Chaos for Merlin</button>
                    <button class="preset-btn" data-preset="chaos10Lady">Chaos + Lady</button>
                    <button class="preset-btn" data-preset="custom">Custom Setup</button>
                </div>
            </div>

            <div class="room-settings">
                <h3 style="color: #ffd700; margin-bottom: 1.5rem;">Room Settings</h3>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label for="playerCount" style="color: #ffd700; display: block; margin-bottom: 0.5rem;">
                        Number of Players: <span id="playerCountDisplay">5</span>
                    </label>
                    <input type="range" id="playerCount" min="5" max="10" value="5"
                           onchange="window.supabaseRoomSystem.updatePlayerCount()" style="width: 100%;">
                </div>

                <div class="role-selection">
                    <div class="role-column good">
                        <h4>Good Roles</h4>
                        <div class="role-option">
                            <input type="checkbox" id="roleMerlin" checked disabled>
                            <label for="roleMerlin">Merlin (Required)</label>
                        </div>
                        <div class="role-option">
                            <input type="checkbox" id="rolePercival">
                            <label for="rolePercival">Percival</label>
                        </div>
                    </div>

                    <div class="role-column evil">
                        <h4>Evil Roles</h4>
                        <div class="role-option">
                            <input type="checkbox" id="roleAssassin" checked disabled>
                            <label for="roleAssassin">Assassin (Required)</label>
                        </div>
                        <div class="role-option">
                            <input type="checkbox" id="roleMorgana">
                            <label for="roleMorgana">Morgana</label>
                        </div>
                        <div class="role-option">
                            <input type="checkbox" id="roleMordred">
                            <label for="roleMordred">Mordred</label>
                        </div>
                        <div class="role-option">
                            <input type="checkbox" id="roleOberon">
                            <label for="roleOberon">Oberon</label>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #ffd700; margin-bottom: 0.5rem;">Special Options</h4>
                    <div class="role-option">
                        <input type="checkbox" id="ladyOfLake">
                        <label for="ladyOfLake">Enable Lady of the Lake</label>
                    </div>
                    <div class="role-option">
                        <input type="checkbox" id="chaosMode">
                        <label for="chaosMode">Chaos for Merlin (Fake Oberon)</label>
                    </div>
                </div>

                <div class="role-balance">
                    <p style="color: #ffd700;">Role Distribution:</p>
                    <p class="good-count">Good: 3 players</p>
                    <p class="evil-count">Evil: 2 players</p>
                </div>

                <button class="btn btn-primary" onclick="window.supabaseRoomSystem.createRoom()">Create Room</button>
            </div>
        `;

        // Add preset button event listeners
        const presetButtons = content.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.loadPreset(preset);

                // Update active button
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Initialize with custom preset
        this.loadPreset('custom');
        content.querySelector('[data-preset="custom"]').classList.add('active');

        console.log('Room creation content loaded successfully');
    }

    async displayActiveRooms() {
        console.log('=== DISPLAYING ACTIVE ROOMS ===');
        const container = document.getElementById('activeRoomsList');
        if (!container) {
            console.error('activeRoomsList not found!');
            return;
        }

        container.innerHTML = '<p style="color: rgba(255,255,255,0.5);">Loading active rooms...</p>';

        try {
            // Fetch active rooms from Supabase
            const { data: rooms, error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select(`
                    *,
                    room_players (
                        player_name,
                        player_avatar,
                        is_host
                    )
                `)
                .eq('status', GAME_STATUS.WAITING)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching active rooms:', error);
                container.innerHTML = '<p style="color: #e74c3c;">Error loading rooms. Please try again.</p>';
                return;
            }

            console.log('Active rooms fetched:', rooms);

            if (!rooms || rooms.length === 0) {
                container.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No active rooms available. Create one!</p>';
                return;
            }

            // Display the rooms
            container.innerHTML = '';
            rooms.forEach(room => {
                const roomCard = document.createElement('div');
                roomCard.className = 'room-item';
                roomCard.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 15px;
                    margin: 10px 0;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                `;

                const playerCount = room.room_players ? room.room_players.length : 0;
                const host = room.room_players ? room.room_players.find(p => p.is_host) : null;

                // Get status display text
                let statusText = '';
                let statusColor = '#ffd700';
                switch (room.status) {
                    case 'waiting':
                        statusText = 'Waiting';
                        statusColor = '#ffd700';
                        break;
                    case 'role_distribution':
                        statusText = 'Starting';
                        statusColor = '#3498db';
                        break;
                    case 'playing':
                        statusText = 'In Progress';
                        statusColor = '#e74c3c';
                        break;
                    default:
                        statusText = room.status;
                        statusColor = '#95a5a6';
                }

                roomCard.innerHTML = `
                    <div class="room-info">
                        <div style="font-weight: bold; color: #ffd700;">Room ${room.code}</div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 0.9em;">
                            Host: ${host ? host.player_name : room.host_name} |
                            Players: ${playerCount}/${room.max_players}
                        </div>
                        <div style="color: ${statusColor}; font-size: 0.8em; font-weight: bold; margin-top: 4px;">
                            Status: ${statusText}
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="window.supabaseRoomSystem.joinRoomByCode('${room.code}')"
                            style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Join
                    </button>
                `;
                container.appendChild(roomCard);
            });

            console.log('Active rooms displayed successfully');
        } catch (error) {
            console.error('Exception fetching active rooms:', error);
            container.innerHTML = '<p style="color: #e74c3c;">Error loading rooms. Please try again.</p>';
        }
    }

    updatePlayerCount() {
        console.log('=== UPDATE PLAYER COUNT ===');
        const playerCountInput = document.getElementById('playerCount');
        const playerCountDisplay = document.getElementById('playerCountDisplay');

        if (playerCountInput && playerCountDisplay) {
            const count = parseInt(playerCountInput.value);
            playerCountDisplay.textContent = count;

            // Update role balance
            this.updateRoleBalance(count);
            console.log('Player count updated to:', count);
        }
    }

    updateRoleBalance(playerCount) {
        console.log('=== UPDATE ROLE BALANCE ===');
        const goodCount = document.querySelector('.good-count');
        const evilCount = document.querySelector('.evil-count');

        if (goodCount && evilCount) {
            // Calculate role distribution based on player count
            const evilPlayers = Math.floor(playerCount / 3);
            const goodPlayers = playerCount - evilPlayers;

            goodCount.textContent = `Good: ${goodPlayers} players`;
            evilCount.textContent = `Evil: ${evilPlayers} players`;

            console.log('Role balance updated:', { goodPlayers, evilPlayers });
        }
    }

    loadPreset(presetName) {
        console.log('=== LOADING PRESET ===', presetName);

        // Define preset configurations
        const presets = {
            'classic10': {
                playerCount: 10,
                roles: { percival: true, morgana: true, mordred: true, oberon: true },
                ladyOfLake: false,
                chaosMode: false
            },
            'classic10Lady': {
                playerCount: 10,
                roles: { percival: true, morgana: true, mordred: true, oberon: true },
                ladyOfLake: true,
                chaosMode: false
            },
            'chaos10': {
                playerCount: 10,
                roles: { percival: true, morgana: true, mordred: true, oberon: true },
                ladyOfLake: false,
                chaosMode: true
            },
            'chaos10Lady': {
                playerCount: 10,
                roles: { percival: true, morgana: true, mordred: true, oberon: true },
                ladyOfLake: true,
                chaosMode: true
            },
            'custom': {
                playerCount: 5,
                roles: { percival: false, morgana: false, mordred: false, oberon: false },
                ladyOfLake: false,
                chaosMode: false
            }
        };

        const preset = presets[presetName];
        if (!preset) {
            console.error('Unknown preset:', presetName);
            return;
        }

        // Update player count
        const playerCountInput = document.getElementById('playerCount');
        if (playerCountInput) {
            playerCountInput.value = preset.playerCount;
            this.updatePlayerCount();
        }

        // Update role checkboxes
        Object.keys(preset.roles).forEach(role => {
            const checkbox = document.getElementById(`role${role.charAt(0).toUpperCase() + role.slice(1)}`);
            if (checkbox) {
                checkbox.checked = preset.roles[role];
            }
        });

        // Update special options
        const ladyOfLakeCheckbox = document.getElementById('ladyOfLake');
        const chaosModeCheckbox = document.getElementById('chaosMode');

        if (ladyOfLakeCheckbox) ladyOfLakeCheckbox.checked = preset.ladyOfLake;
        if (chaosModeCheckbox) chaosModeCheckbox.checked = preset.chaosMode;

        console.log('Preset loaded:', preset);
    }

    showNotification(message, type = 'info') {
        console.log(`Notification (${type}): ${message}`);
        // Use the auth system's notification method
        if (supabaseAuthSystem && supabaseAuthSystem.showNotification) {
            supabaseAuthSystem.showNotification(message, type);
        }
    }

    async createRoom() {
        console.log('=== CREATE ROOM CALLED ===');

        // Check if user is logged in
        if (!supabaseAuthSystem.isUserLoggedIn()) {
            this.showNotification('Please login to create a room!', 'error');
            return false;
        }

        // Use default room configuration for now
        const roomConfig = this.getDefaultRoomConfig();
        if (!roomConfig) {
            this.showNotification('Failed to create room configuration!', 'error');
            return false;
        }

        console.log('Room config from form:', roomConfig);

        // Generate room code
        roomConfig.code = this.generateRoomCode();

        // Create room in database
        return await this.createRoomInDatabase(roomConfig);
    }

    getDefaultRoomConfig() {
        console.log('=== GETTING DEFAULT ROOM CONFIG ===');

        // Use default configuration for 5 players
        const config = {
            maxPlayers: 5,
            roles: {
                merlin: true, // Always required
                percival: true,
                assassin: true, // Always required
                morgana: true,
                mordred: false,
                oberon: false,
                loyalServants: 0,
                minions: 0
            },
            ladyOfLake: true,
            chaosForMerlin: false
        };

        console.log('Default room config:', config);
        return config;
    }

    getRoomConfigFromForm() {
        console.log('=== GETTING ROOM CONFIG FROM FORM ===');

        const playerCount = parseInt(document.getElementById('playerCount')?.value);
        const rolePercival = document.getElementById('rolePercival')?.checked;
        const roleMorgana = document.getElementById('roleMorgana')?.checked;
        const roleMordred = document.getElementById('roleMordred')?.checked;
        const roleOberon = document.getElementById('roleOberon')?.checked;
        const ladyOfLake = document.getElementById('ladyOfLake')?.checked;
        const chaosMode = document.getElementById('chaosMode')?.checked;

        if (!playerCount || playerCount < 5 || playerCount > 10) {
            console.error('Invalid player count:', playerCount);
            return null;
        }

        const config = {
            maxPlayers: playerCount,
            roles: {
                merlin: true, // Always required
                percival: rolePercival,
                assassin: true, // Always required
                morgana: roleMorgana,
                mordred: roleMordred,
                oberon: roleOberon,
                loyalServants: Math.max(0, playerCount - 2 - (rolePercival ? 1 : 0) - (roleMorgana ? 1 : 0) - (roleMordred ? 1 : 0) - (roleOberon ? 1 : 0)),
                minions: 0
            },
            ladyOfLake: ladyOfLake,
            chaosForMerlin: chaosMode
        };

        console.log('Room config created:', config);
        return config;
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        console.log('Generated room code:', result);
        return result;
    }

    async createRoomInDatabase(roomConfig) {
        let roomId = null;
        
        // At the start of createRoomInDatabase function
        console.log('🚀 Starting room creation process...');
        console.log('📋 Input parameters:', { roomConfig });
        
        try {
            const user = supabaseAuthSystem.getCurrentUser();
            console.log('👤 Current user:', { 
                id: user?.id, 
                email: user?.email, 
                profile: user?.profile 
            });
            
            if (!user) {
                this.showNotification('Please login to create a room!', 'error');
                return false;
            }

            // Create room in database
            const { data: room, error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .insert({
                    code: roomConfig.code,
                    host_id: user.id,
                    host_name: user.profile?.display_name || user.email,
                    original_host_id: user.id, // Track the original host (room creator)
                    max_players: roomConfig.maxPlayers,
                    roles: roomConfig.roles,
                    lady_of_lake: roomConfig.ladyOfLake,
                    chaos_for_merlin: roomConfig.chaosForMerlin,
                    status: GAME_STATUS.WAITING,
                    is_public: true // Explicitly set as public room
                })
                .select()
                .single();

            if (error) {
                this.showNotification('Failed to create room: ' + error.message, 'error');
                return false;
            }

            roomId = room.id;
            console.log('✅ Room created successfully with ID:', roomId);

            // Set current room before adding player (needed for optimistic updates)
            this.currentRoom = room;
            this.currentRoom.players = [];
            this.currentRoom.current_players = 0;
            console.log('🔧 Initialized currentRoom for player addition');

            // Add host as first player
            console.log('🔄 About to add host as first player...');
            console.log('🔍 Player data being sent:', {
                room_id: room.id,
                player_id: user.id,
                player_name: user.profile?.display_name || user.email,
                player_avatar: user.profile?.avatar || '👤',
                is_host: true
            });
            
            try {
                await this.addPlayerToRoom(room.id, user, true, room);
                
                // Update connection status for host
                await this.updatePlayerConnectionStatus(room.id, true);
                
                console.log('✅ Host added successfully');
            } catch (playerError) {
                console.error('🚨 HOST ADD ERROR:', {
                    message: playerError?.message || 'No message',
                    code: playerError?.code || 'No code',
                    details: playerError?.details || 'No details',
                    hint: playerError?.hint || 'No hint',
                    full_error: playerError
                });
                throw playerError;
            }

            // Fetch the complete room data with players
            const { data: completeRoom, error: fetchError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select(`
                    *,
                    room_players (
                        id,
                        player_id,
                        player_name,
                        player_avatar,
                        is_host,
                        joined_at
                    )
                `)
                .eq('id', room.id)
                .single();

            if (fetchError) {
                console.error('Error fetching complete room data:', fetchError);
                // Keep the current room data we already have
                console.log('Keeping existing currentRoom data due to fetch error');
            } else {
                // Update with fresh data but preserve any optimistic updates
                this.currentRoom = completeRoom;
                this.currentRoom.players = completeRoom.room_players || [];
                this.currentRoom.current_players = this.currentRoom.players.length;
                console.log('Updated currentRoom with fresh database data');
            }

            this.isHost = true;
            console.log('=== ROOM CREATED ===');
            console.log('isHost set to:', this.isHost);
            console.log('Current room:', this.currentRoom);

            this.showNotification(`Room created! Code: ${roomConfig.code}`, 'success');

            // Close the room creation modal
            const roomModal = document.getElementById('roomModal');
            if (roomModal) {
                roomModal.style.display = 'none';
            }

            // Show room interface
            await this.showRoomInterface();

            // Fetch initial state before subscribing to real-time updates
            const initialRoomState = await this.fetchCompleteRoomState(room.id);
            if (initialRoomState) {
                console.log('✅ Initial room state loaded');
                this.currentRoom = initialRoomState;
                
                // Update UI with initial state
                this.setupRoomInterface();
                this.positionPlayersOnCircle();
                this.updateRoomStatus();
            }
            
            // Subscribe to real-time updates with new connection manager
            this.initializeRoomConnection(room.id);

            return true;
        } catch (error) {
            // ADD COMPREHENSIVE ERROR LOGGING
            console.error('🚨 CRITICAL ERROR DETAILS:', {
                error_message: error?.message || 'No message',
                error_code: error?.code || 'No code',
                error_details: error?.details || 'No details',
                error_hint: error?.hint || 'No hint',
                error_name: error?.name || 'No name',
                error_stack: error?.stack || 'No stack',
                full_error: error
            });
            
            console.error('❌ Room creation failed, cleaning up...');
            
            // Clean up any partial data
            if (roomId) {
                console.log('🧹 Cleaning up partial room data for room ID:', roomId);
                try {
                    await this.supabase.from(TABLES.ROOM_PLAYERS).delete().eq('room_id', roomId);
                    await this.supabase.from(TABLES.GAME_ROOMS).delete().eq('id', roomId);
                    console.log('✅ Cleanup completed');
                } catch (cleanupError) {
                    console.error('❌ Cleanup failed:', cleanupError);
                }
            }
            
            this.showNotification('Failed to create room.', 'error');
            return false;
        }
    }

    // Load active rooms for the current user
    async loadActiveRooms() {
        try {
            const user = supabaseAuthSystem.getCurrentUser();
            if (!user) {
                console.log('No user logged in, cannot load active rooms');
                return { myRooms: [], joinableRooms: [] };
            }

            console.log('📋 Loading active rooms...');

            // Get all rooms player can access
            const { data: accessibleRooms, error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select(`
                    *,
                    room_players!inner(player_id, player_name, is_host)
                `)
                .in('status', ['waiting', 'playing', 'role_distribution']);

            if (error) {
                console.error('❌ Failed to load rooms:', error);
                return { myRooms: [], joinableRooms: [] };
            }

            // Separate rooms by player's relationship to them
            const myRooms = [];
            const joinableRooms = [];

            accessibleRooms.forEach(room => {
                const isPlayerInRoom = room.room_players.some(p => p.player_id === user.id);

                if (isPlayerInRoom) {
                    myRooms.push({...room, canRejoin: true});
                } else if (room.status === 'waiting' && room.current_players < room.max_players) {
                    joinableRooms.push({...room, canJoin: true});
                }
            });

            console.log('📊 Active rooms loaded:', { myRooms: myRooms.length, joinableRooms: joinableRooms.length });
            return { myRooms, joinableRooms };

        } catch (error) {
            console.error('❌ Error loading active rooms:', error);
            return { myRooms: [], joinableRooms: [] };
        }
    }

    // Display active rooms in UI
    displayActiveRoomsList(myRooms, joinableRooms) {
        const container = document.getElementById('activeRoomsContainer');
        if (!container) {
            console.log('Active rooms container not found');
            return;
        }

        let html = '<div class="active-rooms">';

        // My Rooms (can rejoin)
        if (myRooms.length > 0) {
            html += '<h3>🔄 My Rooms (Rejoin)</h3>';
            html += '<div class="rooms-grid">';

            myRooms.forEach(room => {
                const statusBadge = room.status === 'playing' ? 
                    '<span class="badge badge-success">In Progress</span>' : 
                    room.status === 'role_distribution' ?
                    '<span class="badge badge-warning">Role Distribution</span>' :
                    '<span class="badge badge-info">Waiting</span>';

                html += `
                    <div class="room-card rejoin-room" onclick="supabaseRoomsSystem.rejoinRoom('${room.code}')">
                        <div class="room-header">
                            <h4>Room ${room.code}</h4>
                            ${statusBadge}
                        </div>
                        <div class="room-info">
                            <p>Host: ${room.host_name}</p>
                            <p>Players: ${room.current_players}/${room.max_players}</p>
                            <p>Status: ${room.status}</p>
                        </div>
                        <button class="btn btn-primary">Rejoin Game</button>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Joinable Rooms (new)
        if (joinableRooms.length > 0) {
            html += '<h3>🎮 Available Rooms</h3>';
            html += '<div class="rooms-grid">';

            joinableRooms.forEach(room => {
                html += `
                    <div class="room-card join-room" onclick="supabaseRoomsSystem.joinRoomByCode('${room.code}')">
                        <div class="room-header">
                            <h4>Room ${room.code}</h4>
                            <span class="badge badge-info">Open</span>
                        </div>
                        <div class="room-info">
                            <p>Host: ${room.host_name}</p>
                            <p>Players: ${room.current_players}/${room.max_players}</p>
                        </div>
                        <button class="btn btn-secondary">Join Room</button>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (myRooms.length === 0 && joinableRooms.length === 0) {
            html += '<p class="no-rooms">No active rooms available</p>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    // Rejoin room function
    async rejoinRoom(roomCode) {
        console.log('🔄 Rejoining room:', roomCode);
        return await this.joinRoomByCode(roomCode);
    }

    // Room refresh functionality
    roomsRefreshInterval = null;

    startRoomListRefresh() {
        // Refresh every 10 seconds
        this.roomsRefreshInterval = setInterval(async () => {
            const { myRooms, joinableRooms } = await this.loadActiveRooms();
            this.displayActiveRoomsList(myRooms, joinableRooms);
        }, 10000);
        console.log('🔄 Started room list refresh');
    }

    stopRoomListRefresh() {
        if (this.roomsRefreshInterval) {
            clearInterval(this.roomsRefreshInterval);
            this.roomsRefreshInterval = null;
            console.log('⏹️ Stopped room list refresh');
        }
    }

    // Show lobby with active rooms
    async showLobby() {
        console.log('🏠 Showing lobby with active rooms');
        
        // Load and display active rooms
        const { myRooms, joinableRooms } = await this.loadActiveRooms();
        this.displayActiveRoomsList(myRooms, joinableRooms);
        
        // Start auto-refresh
        this.startRoomListRefresh();
    }

    // Leave lobby
    leaveLobby() {
        this.stopRoomListRefresh();
        console.log('🚪 Left lobby');
    }

    // Cleanup all connections when leaving
    cleanup() {
        console.log('🧹 Cleaning up room system...');
        
        // Stop room list refresh
        this.stopRoomListRefresh();
        
        // Clean up connection manager
        if (window.subscriptionManager) {
            window.subscriptionManager.unsubscribeAll();
        }
        
        // Clean up connection manager
        if (window.connectionManager) {
            window.connectionManager.cleanup();
        }
        
        // Clear current room
        this.currentRoom = null;
        this.isHost = false;
        
        console.log('✅ Room system cleanup completed');
    }

    // Setup event listeners for UI elements
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Refresh Rooms Button
        const refreshRoomsBtn = document.getElementById('refreshRoomsBtn');
        if (refreshRoomsBtn) {
            refreshRoomsBtn.onclick = null; // Clear any existing handler
            refreshRoomsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔄 Refresh rooms button clicked');
                
                if (this.loadActiveRooms) {
                    this.loadActiveRooms().then(({myRooms, joinableRooms}) => {
                        this.displayActiveRoomsList(myRooms, joinableRooms);
                    }).catch(error => {
                        console.error('❌ Error refreshing rooms:', error);
                    });
                } else {
                    console.error('❌ loadActiveRooms method not available');
                }
            });
            console.log('✅ Refresh rooms button event listener added');
        } else {
            console.warn('⚠️ Refresh rooms button not found');
        }
        
        // Create Room Button (if exists)
        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.onclick = null; // Clear any existing handler
            createRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🎮 Create room button clicked');
                
                if (typeof this.createRoom === 'function') {
                    this.createRoom();
                } else {
                    console.error('❌ createRoom method not available');
                    alert('Create room function not available.');
                }
            });
            console.log('✅ Create room button event listener added');
        }
        
        console.log('✅ Event listeners setup completed');
    }

    // Update player connection status (placeholder - columns don't exist yet)
    async updatePlayerConnectionStatus(roomId, isConnected) {
        try {
            const user = supabaseAuthSystem.getCurrentUser();
            if (!user) return;

            // TODO: Add is_connected and last_seen columns to room_players table
            // For now, just log the connection status
            console.log(`📡 Player connection status: ${isConnected ? 'connected' : 'disconnected'} for room ${roomId}`);
            
            // When columns are added, use this:
            // await this.supabase
            //     .from(TABLES.ROOM_PLAYERS)
            //     .update({
            //         is_connected: isConnected,
            //         last_seen: new Date().toISOString()
            //     })
            //     .eq('room_id', roomId)
            //     .eq('player_id', user.id);

        } catch (error) {
            console.error('❌ Failed to update connection status:', error);
        }
    }

    async joinRoomByCode(roomCode) {
        try {
            const user = supabaseAuthSystem.getCurrentUser();
            if (!user) {
                this.showNotification('Please login to join a room!', 'error');
                return false;
            }

            // Validate room code format
            if (!roomCode || typeof roomCode !== 'string') {
                this.showNotification('Room code is required', 'error');
                return false;
            }

            const cleanCode = roomCode.trim().toUpperCase();
            const codeRegex = /^[A-Z0-9]{6}$/;
            
            if (!codeRegex.test(cleanCode)) {
                this.showNotification('Invalid room code format', 'error');
                return false;
            }

            console.log('🔍 Looking up room by code:', cleanCode);

            // Find room by code (allow joining rooms in any state for rejoining)
            const { data: room, error: roomError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('*')
                .eq('code', cleanCode)
                .in('status', ['waiting', 'playing', 'role_distribution']) // Allow joining active games
                .single();

            console.log('📊 Room lookup result:', { room, roomError });

            if (roomError) {
                console.error('❌ Room lookup failed:', roomError);
                this.showNotification(`Room lookup failed: ${roomError.message}`, 'error');
                return false;
            }

            if (!room) {
                console.error('❌ Room not found for code:', cleanCode);
                this.showNotification('Room not found or not available', 'error');
                return false;
            }

            console.log('✅ Room found:', room);

            // Check if room is full
            if (room.current_players >= room.max_players) {
                this.showNotification('Room is full!', 'error');
                return false;
            }

            // Check if game has finished
            if (room.status === 'finished') {
                this.showNotification('This game has already finished!', 'error');
                return false;
            }

            // Check if already in room
            const { data: existingPlayers } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', room.id)
                .eq('player_id', user.id);

            const existingPlayer = existingPlayers && existingPlayers.length > 0 ? existingPlayers[0] : null;

            if (existingPlayer) {
                console.log('🔄 Player already in room, rejoining with fresh data...');
                this.showNotification('Rejoining your room...', 'info');

                // Update player connection status
                await this.updatePlayerConnectionStatus(room.id, true);

                // ALWAYS fetch complete fresh data from database
                const freshRoomData = await this.fetchCompleteRoomState(room.id);
                if (!freshRoomData) {
                    this.showNotification('Failed to fetch room data', 'error');
                    return false;
                }

                // Set current room data with fresh data
                this.currentRoom = freshRoomData;
                this.currentRoom.players = freshRoomData.room_players || [];
                this.currentRoom.current_players = this.currentRoom.players.length;

                // Update host status from fresh data
                this.isHost = existingPlayer.is_host;

                // Show room interface
                await this.showRoomInterface();

                // Subscribe to real-time updates with new connection manager
                this.initializeRoomConnection(room.id);

                // Check if room is in role distribution status
                if (freshRoomData.status === GAME_STATUS.ROLE_DISTRIBUTION) {
                    console.log('Room is in role distribution, showing role information');
                    this.showRoleInformation();
                }

                // Check if room is in playing state and show appropriate UI
                if (freshRoomData.status === GAME_STATUS.PLAYING) {
                    console.log('Room is in playing state, restoring game UI');
                    this.updateTeamBuildingUI();
                }

                return true;
            }

            // Add player to room with room object
            await this.addPlayerToRoom(room.id, user, false, room);

            // Update connection status
            await this.updatePlayerConnectionStatus(room.id, true);

            // Set host status
            this.isHost = room.host_id === user.id;

            this.showNotification(`Joined room ${roomCode}!`, 'success');
            await this.showRoomInterface();
            
            // Subscribe to real-time updates with new connection manager
            this.initializeRoomConnection(room.id);

            return true;
        } catch (error) {
            this.showNotification('Failed to join room.', 'error');
            return false;
        }
    }

    async addPlayerToRoom(roomId, user, isHost = false, roomObject = null) {
        console.log('🔍 Adding player to room:', { roomId, playerData: user, hasRoomObject: !!roomObject });
        
        // Log state update
        this.logStateUpdate('api-call', 'join', {
            playerId: user.id,
            playerName: user.profile?.display_name || user.email,
            isHost,
            roomId
        });
        
        // Handle room object - use provided object or fetch from database
        let room = roomObject;
        
        if (!room) {
            console.log('🔍 Room object not provided, fetching from database...');
            
            const { data: fetchedRoom, error: fetchError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('*')
                .eq('id', roomId)
                .single();
            
            if (fetchError) {
                console.error('❌ Failed to fetch room:', fetchError);
                throw new Error(`Room fetch failed: ${fetchError.message}`);
            }
            
            if (!fetchedRoom) {
                console.error('❌ Room not found for ID:', roomId);
                throw new Error('Room not found');
            }
            
            room = fetchedRoom;
        }
        
        console.log('✅ Using room object:', room);
        
        // Set current room if not already set
        if (!this.currentRoom) {
            this.currentRoom = room;
            this.currentRoom.players = this.currentRoom.players || [];
            this.currentRoom.current_players = this.currentRoom.players.length;
            console.log('🔧 Initialized currentRoom from provided/fetched room object');
        }
        
        // Ensure user profile exists before adding to room
        await this.ensureUserProfile(user);
        
        // Check if player already exists in room to prevent duplicates
        console.log('🔍 Checking if player exists in room:', {
            roomId,
            playerId: user.id,
            playerName: user.profile?.display_name || user.email
        });
        
        const { data: existingPlayers, error: checkError } = await this.supabase
            .from(TABLES.ROOM_PLAYERS)
            .select('*')
            .eq('room_id', roomId)
            .eq('player_id', user.id);
            
        const existingPlayer = existingPlayers && existingPlayers.length > 0 ? existingPlayers[0] : null;
            
        if (checkError) {
            console.error('❌ Error checking for existing player:', {
                error: checkError,
                code: checkError.code,
                message: checkError.message,
                details: checkError.details,
                hint: checkError.hint
            });
            // Skip the check and proceed with insert
            console.log('⚠️ Skipping duplicate check due to error, proceeding with insert');
        } else if (existingPlayer) {
            console.log('Player already exists in room, updating existing record');
            // Update existing player record instead of creating duplicate
            const { error: updateError } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .update({
                    player_name: user.profile?.display_name || user.email,
                    player_avatar: user.profile?.avatar || '👤',
                    is_host: isHost,
                    updated_at: new Date().toISOString()
                })
                .eq('room_id', roomId)
                .eq('player_id', user.id);
                
            if (updateError) {
                console.error('Error updating existing player:', updateError);
                throw updateError;
            }
            
            // Update game_rooms table to trigger real-time
            await this.updateGameRoomsPlayersArray(roomId);
            return;
        }
        
        // If we get here, either no existing player was found or there was an error
        console.log('🔄 Proceeding with player insert...');

        // Check if room has no host (host_id is null) and get original host info
        const { data: roomData } = await this.supabase
            .from(TABLES.GAME_ROOMS)
            .select('host_id, current_players, original_host_id')
            .eq('id', roomId)
            .single();

        // Determine if this player should become host
        if (roomData && !roomData.host_id) {
            // Room has no current host
            if (roomData.current_players === 0) {
                // No players left, first rejoining player becomes host
                isHost = true;
                console.log('Room has no host and no players, making first rejoining player the new host');
            } else if (roomData.original_host_id === user.id) {
                // Original host is rejoining, they get priority to become host again
                isHost = true;
                console.log('Original host is rejoining, giving them host status back');
            }
        } else if (roomData && roomData.original_host_id === user.id && roomData.host_id !== user.id) {
            // Original host is rejoining but room already has a host
            // Give original host priority and transfer host status
            isHost = true;
            console.log('Original host rejoining, transferring host status back to them');
        }

        // Optimistic UI update - show player immediately
        const optimisticPlayer = {
            id: user.id,
            name: user.profile?.display_name || user.email,
            avatar: user.profile?.avatar || '👤',
            is_host: isHost
        };
        
        // Add to local state immediately for responsive UI
        console.log('🔍 DEBUG - About to access players property');
        console.log('🔍 Current room object:', this.currentRoom);
        console.log('🔍 Current room type:', typeof this.currentRoom);
        console.log('🔍 Current room is null?', this.currentRoom === null);
        console.log('🔍 Current room players property:', this.currentRoom?.players);
        
        if (!this.currentRoom) {
            console.error('❌ Current room is null, cannot access players property');
            throw new Error('Current room object is null');
        }
        
        if (!this.currentRoom.players || !Array.isArray(this.currentRoom.players)) {
            console.log('🔧 Initializing empty players array');
            this.currentRoom.players = [];
        }
        
        this.currentRoom.players.push(optimisticPlayer);
        this.currentRoom.current_players = this.currentRoom.players.length;
        
        // Update UI immediately
        this.setupRoomInterface();
        this.positionPlayersOnCircle();
        this.updateRoomStatus();
        
        // Verify room exists before adding player
        console.log('🔍 Verifying room exists before adding player');
        const { data: roomCheck, error: roomCheckError } = await this.supabase
            .from(TABLES.GAME_ROOMS)
            .select('id, code, host_id, current_players')
            .eq('id', roomId);

        console.log('🏠 Room verification:', { roomCheck, roomCheckError });

        if (roomCheckError || !roomCheck || roomCheck.length === 0) {
            console.error('❌ Room does not exist, cannot add player');
            throw new Error('Room was not created properly');
        }

        // Verify player profile exists
        console.log('🔍 Verifying player profile exists');
        const { data: profileCheck, error: profileCheckError } = await this.supabase
            .from('profiles')
            .select('id, username, display_name, avatar')
            .eq('id', user.id);

        console.log('👤 Profile verification:', { profileCheck, profileCheckError });

        if (profileCheckError || !profileCheck || profileCheck.length === 0) {
            console.error('❌ Player profile does not exist');
            throw new Error('Player profile not found');
        }

        // Prepare insert data with exact field names
        const insertData = {
                room_id: roomId,
                player_id: user.id,
                player_name: user.profile?.display_name || user.email,
            player_avatar: user.profile?.avatar || '👤',
            is_host: isHost
        };

        console.log('🔍 Checking exact field names for insert');
        console.log('Schema expects:', ['room_id', 'player_id', 'player_name', 'player_avatar', 'is_host']);
        console.log('Insert data keys:', Object.keys(insertData));
        console.log('Insert data values:', insertData);

        // Perform database operation with upsert to handle duplicates gracefully
        console.log('🔄 About to upsert player into room_players table');
        
        const { data: insertResult, error } = await this.supabase
            .from(TABLES.ROOM_PLAYERS)
            .upsert(insertData, {
                onConflict: 'room_id,player_id',
                ignoreDuplicates: false // Update existing record if it exists
            })
            .select();

        console.log('📊 Upsert result:', insertResult);
        console.log('❌ Upsert error:', error);
        
        if (insertResult && insertResult.length > 0) {
            console.log('✅ Player upserted successfully:', insertResult[0]);
        }

        if (error) {
            console.error('🚨 DETAILED INSERT ERROR:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                full_error: error
            });
            
            console.error('🚨 ROOM CREATION FAILED:', {
                error_message: error.message,
                error_code: error.code,
                error_details: error.details,
                full_error: error,
                insert_data: insertData,
                room_id: roomId,
                player_id: user.id
            });
            
            // Rollback optimistic update for any errors
            this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== user.id);
            this.currentRoom.current_players = this.currentRoom.players.length;
            this.setupRoomInterface();
            this.positionPlayersOnCircle();
            this.updateRoomStatus();
            throw error;
        }

        // CRITICAL: Update game_rooms table to trigger real-time subscriptions
        // This ensures all players receive real-time updates when someone joins
        // First, get all current players to update the players column
        // Update game_rooms table with current players
        console.log('🔄 Updating game_rooms table with players array...');
        try {
            await this.updateGameRoomsPlayersArray(roomId);
            console.log('✅ Successfully updated game_rooms table');
        } catch (error) {
            console.error('❌ Error updating game_rooms table:', error);
            throw error;
        }

        // If this player became the new host, update the room's host_id
        if (isHost) {
            console.log('🔄 Updating host information...');
            try {
                if (room && !room.host_id) {
                    // Room had no host, set this player as host
                    console.log('Setting player as new host (room had no host)');
                    const { error: hostError } = await this.supabase
                        .from(TABLES.GAME_ROOMS)
                        .update({
                            host_id: user.id,
                            host_name: user.profile?.display_name || user.email,
                            updated_at: new Date().toISOString(),
                            version: room?.version ? room.version + 1 : 1
                        })
                        .eq('id', roomId);

                    if (hostError) {
                        console.error('❌ Error setting host:', hostError);
                        throw hostError;
                    }
                    console.log('✅ Updated room host_id to new rejoining player');
                } else if (room && room.host_id !== user.id) {
                    // Room already has a host, but original host is rejoining
                    // Transfer host status to original host
                    console.log('Transferring host status back to original host');
                    const { error: transferError } = await this.supabase
                        .from(TABLES.GAME_ROOMS)
                        .update({
                            host_id: user.id,
                            host_name: user.profile?.display_name || user.email,
                            updated_at: new Date().toISOString(),
                            version: room?.version ? room.version + 1 : 1
                        })
                        .eq('id', roomId);

                    if (transferError) {
                        console.error('❌ Error transferring host:', transferError);
                        throw transferError;
                    }

                    // Remove host status from previous host
                    const { error: removeHostError } = await this.supabase
                        .from(TABLES.ROOM_PLAYERS)
                        .update({ is_host: false })
                        .eq('room_id', roomId)
                        .eq('is_host', true);

                    if (removeHostError) {
                        console.error('❌ Error removing previous host status:', removeHostError);
                        throw removeHostError;
                    }

                    console.log('✅ Transferred host status back to original host');
                }
                console.log('✅ Host information updated successfully');
            } catch (error) {
                console.error('❌ Error updating host information:', error);
                throw error;
            }
        }
    }

    async leaveRoom() {
        if (!this.currentRoom) return;

        try {
            const user = supabaseAuthSystem.getCurrentUser();
            
            // Update connection status before leaving
            await this.updatePlayerConnectionStatus(this.currentRoom.id, false);
            
            // Remove player from room
            const { error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .delete()
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', user.id);

            if (error) {
                console.error('Error leaving room:', error);
            } else {
                // Update room player count
                const { data: remainingPlayers } = await this.supabase
                    .from(TABLES.ROOM_PLAYERS)
                    .select('*')
                    .eq('room_id', this.currentRoom.id);

                const newPlayerCount = remainingPlayers ? remainingPlayers.length : 0;

                // Update room's current_players count and players list to trigger real-time updates
                await this.supabase
                    .from(TABLES.GAME_ROOMS)
                    .update({
                        current_players: newPlayerCount,
                        players: remainingPlayers || [],
                        updated_at: new Date().toISOString(),
                        version: this.currentRoom.version ? this.currentRoom.version + 1 : 1
                    })
                    .eq('id', this.currentRoom.id);

                console.log('✅ Updated game_rooms table to trigger real-time subscriptions for player leave');

                console.log(`Player left room. New player count: ${newPlayerCount}`);
            }

            // If host is leaving, transfer host or delete room
            const isHost = await this.isCurrentUserHost();
            if (isHost) {
                await this.handleHostLeaving();
            }

            // Unsubscribe from real-time updates with new connection manager
            if (window.subscriptionManager) {
                window.subscriptionManager.unsubscribeFromRoom(this.currentRoom.id);
            } else {
                // Fallback to old cleanup method
                if (this.roomSubscription) {
                    this.roomSubscription.unsubscribe();
                    this.roomSubscription = null;
                    this.subscriptionStatus = 'disconnected';
                }
            }

            // Clear all timers
            if (this.subscriptionDebounceTimer) {
                clearTimeout(this.subscriptionDebounceTimer);
                this.subscriptionDebounceTimer = null;
            }
            if (this.updateDebounceTimer) {
                clearTimeout(this.updateDebounceTimer);
                this.updateDebounceTimer = null;
            }
            
            // Reset subscription flags
            this.isSubscribing = false;
            this.lastUpdateTime = 0;
            
        // Reset performance metrics
        this.performanceMetrics = {
            subscriptionCount: 0,
            updateCount: 0,
            lastPerformanceCheck: Date.now()
        };
        
        // Reset state tracking
        this.stateUpdateLog = [];

            this.currentRoom = null;
            this.isHost = false;

            this.showNotification('Left the room', 'info');
            this.closeRoomInterface();
        } catch (error) {
            this.showNotification('Failed to leave room.', 'error');
        }
    }

    async handleHostLeaving() {
        if (!this.currentRoom) return;

        try {
            // Get remaining players
            const { data: remainingPlayers } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', this.currentRoom.id)
                .order('joined_at', { ascending: true });

            if (remainingPlayers && remainingPlayers.length > 0) {
                // Transfer host to first remaining player
                const newHost = remainingPlayers[0];
                await this.supabase
                    .from(TABLES.GAME_ROOMS)
                    .update({
                        host_id: newHost.player_id,
                        host_name: newHost.player_name,
                        players: remainingPlayers,
                        updated_at: new Date().toISOString(),
                        version: this.currentRoom.version ? this.currentRoom.version + 1 : 1
                    })
                    .eq('id', this.currentRoom.id);

                // Update the new host's is_host flag
                await this.supabase
                    .from(TABLES.ROOM_PLAYERS)
                    .update({ is_host: true })
                    .eq('room_id', this.currentRoom.id)
                    .eq('player_id', newHost.player_id);

                console.log(`Host transferred to: ${newHost.player_name}`);
            } else {
                // No players left, but keep room persistent for rejoining
                // Just set host_id to NULL instead of deleting the room
                await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                        host_id: null,
                        host_name: 'Room Available',
                        current_players: 0,
                        players: [],
                        status: 'waiting',
                        updated_at: new Date().toISOString(),
                        version: this.currentRoom.version ? this.currentRoom.version + 1 : 1
                })
                .eq('id', this.currentRoom.id);

                console.log('Room kept persistent - no players left but room remains for rejoining');
            }
        } catch (error) {
            console.error('Error handling host leaving:', error);
        }
    }



    async updateRoomDisplay() {
        if (!this.currentRoom) return;

        try {
            // Get latest room data
            const { data: room, error: roomError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('*')
                .eq('id', this.currentRoom.id)
                .single();

            if (roomError) {
                console.error('Error fetching room:', roomError);
                return;
            }

            // Get room players
            const { data: players, error: playersError } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', this.currentRoom.id)
                .order('joined_at', { ascending: true });

            if (playersError) {
                console.error('Error fetching players:', playersError);
                return;
            }

            // Debug logging for synchronization issues
            console.log('=== UPDATE ROOM DISPLAY ===');
            console.log('Room data from DB:', {
                id: room.id,
                current_players: room.current_players,
                max_players: room.max_players,
                status: room.status,
                status_message: room.status_message
            });
            console.log('Players data from DB:', players.length, players.map(p => p.player_name));

            // ALWAYS use fresh data from database - no local caching
            this.currentRoom = room;
            this.currentRoom.players = players;
            this.currentRoom.current_players = players.length; // Update player count

            console.log('Using fresh database data - no local preservation');

            // Update UI in correct sequence
            this.setupRoomInterface();
            this.positionPlayersOnCircle();

            // Update status message after player positioning to avoid race conditions
            if (this.currentRoom.status_message) {
                this.displayStatusMessage(this.currentRoom.status_message, this.currentRoom.status_message_type || 'waiting');
            }

            await this.updateRoomStatus();
        } catch (error) {
            console.error('Error updating room display:', error);
        }
    }

    async getActiveRooms() {
        try {
            console.log('=== FETCHING ACTIVE ROOMS ===');
            console.log('Filtering for status: waiting, role_distribution, playing');
            console.log('Filtering for is_public: true');

            const { data: rooms, error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('*')
                .in('status', ['waiting', 'role_distribution', 'playing'])
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Error fetching active rooms:', error);
                return [];
            }

            console.log('Found rooms:', rooms?.length || 0);
            console.log('Room details:', rooms);

            // If no rooms found, let's check if there are rooms without is_public set
            if (!rooms || rooms.length === 0) {
                console.log('No public rooms found, checking for rooms without is_public...');
                const { data: allRooms, error: allError } = await this.supabase
                    .from(TABLES.GAME_ROOMS)
                    .select('*')
                    .eq('status', GAME_STATUS.WAITING)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (!allError && allRooms) {
                    console.log('All waiting rooms (including non-public):', allRooms.length);
                    console.log('Room statuses:', allRooms.map(r => ({
                        code: r.code,
                        status: r.status,
                        is_public: r.is_public,
                        created_at: r.created_at
                    })));
                }
            }

            return rooms || [];
        } catch (error) {
            console.error('Error fetching active rooms:', error);
            return [];
        }
    }

    // UI Methods (similar to original room system)

    closeRoomInterface() {
        const gameInterface = document.getElementById('gameInterface');
        if (gameInterface) {
            gameInterface.style.display = 'none';
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.id !== 'gameInterface') {
                modal.style.display = 'none';
            }
        });
    }

    async initializeRoomDisplay() {
        this.setupRoomInterface();
        this.positionPlayersOnCircle();
        await this.updateRoomStatus();
        this.setupGameEventListeners();
    }

    setupRoomInterface() {
        const room = this.currentRoom;
        if (!room) return;
        
        // Update game title
        const gameTitle = document.getElementById('gameTitle');
        if (gameTitle) {
            gameTitle.textContent = 'Game Room';
        }
        
        // Update room info display
        const roomCodeElement = document.getElementById('roomCodeDisplay');
        if (roomCodeElement) {
            roomCodeElement.textContent = `Room: ${room.code}`;
        }
        
        // Update player count
        const playerCountElement = document.getElementById('playerCountDisplay');
        if (playerCountElement) {
            playerCountElement.textContent = `${room.current_players}/${room.max_players} players`;
        }
        
        // Game status panel removed - no longer needed
    }

    positionPlayersOnCircle() {
        const room = this.currentRoom;
        if (!room || !room.players) return;
        
        // Get game table
        const gameTable = document.getElementById('gameTable');
        if (!gameTable) return;

        // Debug logging for synchronization issues
        console.log('=== POSITIONING PLAYERS ON CIRCLE ===');
        console.log('Room players:', room.players.length);
        console.log('Room current_players:', room.current_players);
        console.log('Room max_players:', room.max_players);
        console.log('Room status:', room.status);
        console.log('Players data:', room.players.map(p => ({ name: p.player_name, id: p.player_id })));

        // Preserve status message element and only clear player slots
        console.log('Recreating player slots for room state sync');

        // Find and preserve the status message and rejection tracker elements
        const statusMessage = document.getElementById('statusMessage');
        const rejectionTracker = document.getElementById('rejectionTracker');
        const statusMessageHTML = statusMessage ? statusMessage.outerHTML : '';
        const rejectionTrackerHTML = rejectionTracker ? rejectionTracker.outerHTML : '';

        // Clear the game table
            gameTable.innerHTML = '';

        // Restore the status message element if it existed
        if (statusMessageHTML) {
            gameTable.insertAdjacentHTML('afterbegin', statusMessageHTML);
            console.log('Preserved status message element during player positioning');
        }

        // Restore the rejection tracker element if it existed
        if (rejectionTrackerHTML) {
            gameTable.insertAdjacentHTML('afterbegin', rejectionTrackerHTML);
            console.log('Preserved rejection tracker element during player positioning');
        }

        // Get responsive circle dimensions
        const gameTableRect = gameTable.getBoundingClientRect();
        const circleWidth = gameTableRect.width;
        const circleHeight = gameTableRect.height;
        const centerX = circleWidth / 2;
        const centerY = circleHeight / 2;

        // Calculate responsive radius based on viewport size
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const minDimension = Math.min(viewportWidth, viewportHeight);

        // Use a more conservative radius calculation that accounts for responsive design
        const baseRadius = Math.min(circleWidth, circleHeight) / 2;
        const radius = baseRadius * 0.85; // 85% of radius to move players closer to circle border

        console.log('Responsive positioning:', {
            viewportWidth,
            viewportHeight,
            minDimension,
            circleWidth,
            circleHeight,
            baseRadius,
            radius
        });

        // Position actual players on the circle
        room.players.forEach((player, index) => {
            // Calculate angle: start from top (12 o'clock) and distribute evenly
            const angle = (index * 2 * Math.PI) / room.players.length - Math.PI / 2;
            
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot';

            // Calculate responsive slot dimensions based on viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const minDimension = Math.min(viewportWidth, viewportHeight);

            // More responsive slot sizing
            const slotWidth = Math.min(
                circleWidth * 0.12,  // 12% of circle width
                minDimension * 0.08, // 8% of smallest viewport dimension
                80                   // Maximum 80px
            );
            const slotHeight = Math.min(
                circleHeight * 0.16, // 16% of circle height
                minDimension * 0.11, // 11% of smallest viewport dimension
                110                  // Maximum 110px
            );

            playerSlot.style.left = `${x - slotWidth / 2}px`; // Center the slot
            playerSlot.style.top = `${y - slotHeight / 2}px`; // Center the slot
            playerSlot.setAttribute('data-player-id', player.player_id);

            // Check if this player is the mission leader
            const isMissionLeader = this.currentRoom.mission_leader === player.player_id;
            
            playerSlot.innerHTML = `
                <div class="player-avatar">${player.player_avatar}</div>
                <div class="player-name">${player.player_name}</div>
                ${isMissionLeader ? '<div class="mission-leader-token">👑</div>' : ''}
            `;
            
            if (gameTable) {
                gameTable.appendChild(playerSlot);
            }
        });
        
        // Add empty slots for remaining players
        for (let i = room.players.length; i < room.max_players; i++) {
            // Calculate angle: start from top (12 o'clock) and distribute evenly
            const angle = (i * 2 * Math.PI) / room.max_players - Math.PI / 2;
            
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            // Calculate responsive slot dimensions for empty slots too
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const minDimension = Math.min(viewportWidth, viewportHeight);

            const slotWidth = Math.min(
                circleWidth * 0.12,
                minDimension * 0.08,
                80
            );
            const slotHeight = Math.min(
                circleHeight * 0.16,
                minDimension * 0.11,
                110
            );
            
            const emptySlot = document.createElement('div');
            emptySlot.className = 'player-slot empty-slot';
            emptySlot.style.left = `${x - slotWidth / 2}px`; // Center the slot
            emptySlot.style.top = `${y - slotHeight / 2}px`; // Center the slot
            
            emptySlot.innerHTML = `
                <div class="player-avatar">?</div>
                <div class="player-name">Waiting...</div>
            `;
            
            if (gameTable) {
                gameTable.appendChild(emptySlot);
            }
        }
    }

    async updateRoomStatus() {
        const room = this.currentRoom;
        if (!room) return;
        
        const isRoomFull = room.current_players >= room.max_players;

        // Browser detection for debugging
        const userAgent = navigator.userAgent;
        const isOpera = userAgent.includes('Opera') || userAgent.includes('OPR');
        const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
        console.log('Browser info:', { userAgent, isOpera, isSafari });

        console.log('=== UPDATE ROOM STATUS ===');
        console.log('Room:', room);
        console.log('isHost:', this.isHost);
        console.log('isRoomFull:', isRoomFull);
        console.log('current_players:', room.current_players);
        console.log('max_players:', room.max_players);
        console.log('room.status:', room.status);

        // Don't show start game button if game has already started
        if (room.status !== GAME_STATUS.WAITING) {
            console.log('Game has already started, not showing start game button');
            // Button overlay no longer created, so no need to remove it
            return;
        }
        
        // Update start game button
        const startGameBtn = document.getElementById('startGameBtn');
        console.log('=== START GAME BUTTON DEBUG ===');
        console.log('startGameBtn element:', startGameBtn);
        console.log('isRoomFull:', isRoomFull);
        console.log('Current user:', supabaseAuthSystem.getCurrentUser()?.email);

        if (startGameBtn) {
            // Check if current user is host from database with fallback
            let isHost = false;

            // Use synchronous check for Opera/Safari to avoid async issues
            if (isOpera || isSafari) {
                console.log('Using synchronous host check for Opera/Safari');
                isHost = this.isCurrentUserHostSync();
            } else {
                try {
                    isHost = await this.isCurrentUserHost();
                    console.log('Database check - isHost:', isHost);
                } catch (error) {
                    console.error('Error checking host status:', error);
                    // Fallback to synchronous check
                    isHost = this.isCurrentUserHostSync();
                    console.log('Fallback to sync check:', isHost);
                }
            }

            console.log('Final isHost value:', isHost, 'isRoomFull:', isRoomFull);
            console.log('Button should be visible:', isHost && isRoomFull);

            if (isHost && isRoomFull) {
                console.log('Showing Start Game button');

                // More robust DOM manipulation for Opera/Safari
                startGameBtn.style.display = 'inline-block';
                startGameBtn.style.visibility = 'visible';
                startGameBtn.style.opacity = '1';
                startGameBtn.textContent = 'Start Game';

                // Force reflow for Opera/Safari
                startGameBtn.offsetHeight;

                // Additional retry for Opera/Safari if button still not visible
                if (isOpera || isSafari) {
                    setTimeout(() => {
                        const computedStyle = window.getComputedStyle(startGameBtn);
                        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                            console.log('Retrying button visibility for Opera/Safari');
                            startGameBtn.style.display = 'inline-block';
                            startGameBtn.style.visibility = 'visible';
                            startGameBtn.style.opacity = '1';
                        }
                    }, 100);
                }

                // Debug button visibility
                const computedStyle = window.getComputedStyle(startGameBtn);
                console.log('Button computed styles:', {
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    position: computedStyle.position,
                    zIndex: computedStyle.zIndex,
                    width: computedStyle.width,
                    height: computedStyle.height,
                    top: computedStyle.top,
                    left: computedStyle.left
                });

                // Check parent container
                const gameControls = startGameBtn.parentElement;
                const gameControlsStyle = window.getComputedStyle(gameControls);
                console.log('Parent game-controls styles:', {
                    display: gameControlsStyle.display,
                    visibility: gameControlsStyle.visibility,
                    opacity: gameControlsStyle.opacity,
                    width: gameControlsStyle.width,
                    height: gameControlsStyle.height
                });

                // Check if game controls container is visible
                const gameControlsRect = gameControls.getBoundingClientRect();
                console.log('Game controls bounding rect:', gameControlsRect);
                console.log('Game controls is visible:', gameControlsRect.width > 0 && gameControlsRect.height > 0);

                // Check if the game interface is visible
                const gameInterface = document.getElementById('gameInterface');
                if (gameInterface) {
                    const gameInterfaceStyle = window.getComputedStyle(gameInterface);
                    const gameInterfaceRect = gameInterface.getBoundingClientRect();
                    console.log('Game interface styles:', {
                        display: gameInterfaceStyle.display,
                        visibility: gameInterfaceStyle.visibility,
                        opacity: gameInterfaceStyle.opacity
                    });
                    console.log('Game interface bounding rect:', gameInterfaceRect);
                }

                // Check the game-content container
                const gameContent = document.querySelector('.game-content');
                if (gameContent) {
                    const gameContentStyle = window.getComputedStyle(gameContent);
                    const gameContentRect = gameContent.getBoundingClientRect();
                    console.log('Game content styles:', {
                        display: gameContentStyle.display,
                        visibility: gameContentStyle.visibility,
                        opacity: gameContentStyle.opacity,
                        flexDirection: gameContentStyle.flexDirection,
                        height: gameContentStyle.height,
                        width: gameContentStyle.width
                    });
                    console.log('Game content bounding rect:', gameContentRect);
                }

                // Check if button is actually visible
                const rect = startGameBtn.getBoundingClientRect();
                console.log('Button bounding rect:', rect);
                console.log('Button is visible:', rect.width > 0 && rect.height > 0);

                // If button is not visible, try to fix it
                if (rect.width === 0 || rect.height === 0) {
                    console.log('Button has zero dimensions, attempting to fix...');

                    // Force the button to have dimensions
                    startGameBtn.style.width = '150px';
                    startGameBtn.style.height = '40px';
                    startGameBtn.style.minWidth = '150px';
                    startGameBtn.style.minHeight = '40px';

                    // Force the parent container to be visible
                    if (gameControls) {
                        gameControls.style.display = 'flex';
                        gameControls.style.visibility = 'visible';
                        gameControls.style.opacity = '1';
                        gameControls.style.width = 'auto';
                        gameControls.style.height = 'auto';
                        gameControls.style.position = 'relative';
                        gameControls.style.zIndex = '1001';
                    }

                    // Force the game-content container to be visible
                    if (gameContent) {
                        gameContent.style.display = 'flex';
                        gameContent.style.visibility = 'visible';
                        gameContent.style.opacity = '1';
                        gameContent.style.height = 'auto';
                        gameContent.style.minHeight = '200px';
                    }

                    // Check again after fixes
                    const newRect = startGameBtn.getBoundingClientRect();
                    console.log('Button bounding rect after fix:', newRect);
                    console.log('Button is visible after fix:', newRect.width > 0 && newRect.height > 0);

                    // Button should now be visible after fixes
                    if (newRect.width === 0 || newRect.height === 0) {
                        console.log('Button still not visible after all fixes - this may be a browser compatibility issue');
                    }
                }

                // Button should now be visible after all fixes
                console.log('Start Game button visibility fixes applied');

                // Also ensure parent is visible
                if (gameControls) {
                    gameControls.style.display = 'flex';
                    gameControls.style.visibility = 'visible';
                    gameControls.style.opacity = '1';
                }
            } else {
                console.log('Hiding Start Game button - isHost:', isHost, 'isRoomFull:', isRoomFull);
                startGameBtn.style.display = 'none';
            }
        } else {
            console.error('Start Game button element not found!');
        }

        // Update status message based on room state
        const roomState = 'waiting'; // Always use 'waiting' status, but show different messages
        await this.updateRoomState(roomState, { isRoomFull });
    }

    setupGameEventListeners() {
        // Start game button
        const startGameBtn = document.getElementById('startGameBtn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => this.startGame());
        }

        // Leave game button
        const leaveGameBtn = document.getElementById('leaveGameBtn');
        if (leaveGameBtn) {
            leaveGameBtn.addEventListener('click', () => this.leaveRoom());
        }

        // Team proposal button
        const proposeTeamBtn = document.getElementById('proposeTeamBtn');
        if (proposeTeamBtn) {
            proposeTeamBtn.addEventListener('click', () => this.proposeTeam());
        }

        // Vote team button
        const voteTeamBtn = document.getElementById('voteTeamBtn');
        if (voteTeamBtn) {
            voteTeamBtn.addEventListener('click', () => this.showVotingModal());
        }

        // Add player selection event listeners
        this.setupPlayerSelectionListeners();
    }

    // Setup player selection event listeners
    setupPlayerSelectionListeners() {
        // Use event delegation for player slots
        const gameTable = document.getElementById('gameTable');
        if (gameTable) {
            gameTable.addEventListener('click', (event) => {
                const playerSlot = event.target.closest('.player-slot');
                if (playerSlot && playerSlot.dataset.playerId) {
                    const playerId = playerSlot.dataset.playerId;
                    this.selectPlayerForTeam(playerId);
                }
            });
        }
    }

    async startGame() {
        console.log('=== STARTING GAME ===');

        if (!this.currentRoom) {
            this.showNotification('No room available!', 'error');
            return;
        }

        // Check if current user is host from database
        const isHost = await this.isCurrentUserHost();
        if (!isHost) {
            this.showNotification('Only the room host can start the game!', 'error');
            return;
        }

        try {
            // Update room status to ROLE_DISTRIBUTION
            const { error: updateError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    status: GAME_STATUS.ROLE_DISTRIBUTION,
                    started_at: new Date().toISOString()
                })
                .eq('id', this.currentRoom.id);

            if (updateError) {
                console.error('Error updating room status:', updateError);
                this.showNotification('Failed to start game: ' + updateError.message, 'error');
                return;
            }

            // Update local room status
            this.currentRoom.status = GAME_STATUS.ROLE_DISTRIBUTION;
            this.currentRoom.started_at = new Date().toISOString();

            // Button overlay no longer created, so no need to remove it

            // Hide original start game button
            const startGameBtn = document.getElementById('startGameBtn');
            if (startGameBtn) {
                startGameBtn.style.display = 'none';
            }

            // Update room state to role distribution
            await this.updateRoomState('role_distribution');

            // Force immediate update for all players via polling
            await this.immediateRoomStateUpdate();

            // Start role distribution for all players
            this.startRoleDistribution();

            // Start monitoring for all players to see their roles
            this.monitorRoleDistributionCompletion();

        } catch (error) {
            console.error('Exception starting game:', error);
            this.showNotification('Failed to start game.', 'error');
        }
    }

    async monitorRoleDistributionCompletion() {
        console.log('=== MONITORING ROLE DISTRIBUTION COMPLETION ===');
        console.log('Current room ID:', this.currentRoom?.id);
        console.log('Current user:', supabaseAuthSystem.getCurrentUser()?.email);

        const checkCompletion = async () => {
            try {
                console.log('🔍 Checking role completion...');

                // Check if all players have seen their roles
                const { data: players, error } = await this.supabase
                    .from(TABLES.ROOM_PLAYERS)
                    .select('player_id, player_name, has_role_seen')
                    .eq('room_id', this.currentRoom.id);

                if (error) {
                    console.error('Error checking role completion:', error);
                    return;
                }

                console.log('📊 Players role seen status:', players.map(p => ({
                    name: p.player_name,
                    has_seen: p.has_role_seen,
                    player_id: p.player_id
                })));

                // Check if all players have seen their roles
                const allPlayersSeenRoles = players.every(p => p.has_role_seen === true);
                const seenCount = players.filter(p => p.has_role_seen === true).length;
                const totalCount = players.length;

                console.log(`📈 Progress: ${seenCount}/${totalCount} players have seen their roles`);
                console.log(`✅ All players seen: ${allPlayersSeenRoles}`);

                if (allPlayersSeenRoles) {
                    console.log('🎉 All players have seen their roles - starting actual game!');

                    // Update status message with progress info
                    await this.updateRoomState('role_distribution', {
                        playersSeenRoles: seenCount,
                        totalPlayers: totalCount
                    });

                    // Wait longer for the message to be seen
                    await new Promise(resolve => setTimeout(resolve, 4000));

                    // Start the actual game
                    await this.startActualGame();
                } else {
                    console.log('⏳ Still waiting for players to see their roles...');
                    console.log(`Missing: ${players.filter(p => p.has_role_seen !== true).map(p => p.player_name).join(', ')}`);

                    // Update status message with current progress
                    await this.updateRoomState('role_distribution', {
                        playersSeenRoles: seenCount,
                        totalPlayers: totalCount
                    });

                    // Check again in 2 seconds
                    setTimeout(checkCompletion, 2000);
                }

            } catch (error) {
                console.error('Error in role distribution monitoring:', error);
                // Continue monitoring even if there's an error
                setTimeout(checkCompletion, 2000);
            }
        };

        // Start checking
        checkCompletion();
    }

    async startActualGame() {
        console.log('=== STARTING ACTUAL GAME ===');

        try {
            // 1. Randomize player positions
            this.randomizePlayerPositions();

            // 2. Select random mission leader
            this.selectRandomMissionLeader();

            // 3. Update room status to PLAYING
            const { error: updateError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    status: GAME_STATUS.PLAYING,
                    mission_leader: this.currentRoom.mission_leader,
                    current_mission: this.currentRoom.current_mission,
                    players: this.currentRoom.players
                })
                .eq('id', this.currentRoom.id);

            if (updateError) {
                console.error('Error updating room to playing status:', updateError);
                return;
            }

            // Update local room status
            this.currentRoom.status = GAME_STATUS.PLAYING;

            // Update room state to playing
            await this.updateRoomState('playing', { currentMission: 1 });

            // Wait a moment for the database update to propagate
            await new Promise(resolve => setTimeout(resolve, 500));

            // Force refresh status message to ensure it's displayed
            await this.forceRefreshStatusMessage();

            // Wait a moment for the message to be seen
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Update the display
            this.positionPlayersOnCircle();

            // Start team building phase
            await this.startTeamBuildingPhase();

            console.log('✅ Game successfully started!');

        } catch (error) {
            console.error('Error starting actual game:', error);
        }
    }

    async startRoleDistribution() {
        console.log('=== STARTING ROLE DISTRIBUTION ===');

        if (!this.currentRoom) {
            console.error('No room available for role distribution');
            return;
        }

        // Clear any previous role seen flags for this room
        await this.clearRoleSeenFlags();

        try {
            // Fetch all players from database to ensure we have complete data
            console.log('Fetching all players from database...');
            const { data: allPlayers, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', this.currentRoom.id);

            if (error) {
                console.error('Error fetching players for role distribution:', error);
                return;
            }

            if (!allPlayers || allPlayers.length === 0) {
                console.error('No players found in database');
                return;
            }

            // Update current room with all players
            this.currentRoom.players = allPlayers;
            console.log('All players fetched:', allPlayers.map(p => ({ name: p.player_name, id: p.player_id })));

            // Assign roles based on room configuration (but don't randomize positions yet)
            this.assignRoles();

            // Save roles to database so all players can receive them
            await this.saveRolesToDatabase();

            // Wait a moment for database to be fully updated and then verify
            console.log('Waiting for database to be fully updated...');
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify roles are actually stored before showing role information
            await this.verifyRolesStored();

            // Show role information to current player
            this.showRoleInformation();

        } catch (error) {
            console.error('Exception in startRoleDistribution:', error);
        }
    }

    async verifyRolesStored() {
        console.log('=== VERIFYING ROLES ARE STORED ===');

        try {
            // Fetch all players from database to verify roles are stored
            const { data: players, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('player_id, player_name, role, alignment')
                .eq('room_id', this.currentRoom.id);

            if (error) {
                console.error('Error verifying roles:', error);
                return false;
            }

            console.log('Players from database:', players);

            // Check if any player has null role or alignment
            const playersWithNullRoles = players.filter(p => !p.role || !p.alignment);

            if (playersWithNullRoles.length > 0) {
                console.warn('Some players still have null roles:', playersWithNullRoles);
                console.log('Waiting additional time for database consistency...');
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Try one more time
                const { data: retryPlayers, error: retryError } = await this.supabase
                    .from(TABLES.ROOM_PLAYERS)
                    .select('player_id, player_name, role, alignment')
                    .eq('room_id', this.currentRoom.id);

                if (!retryError && retryPlayers) {
                    const retryNullRoles = retryPlayers.filter(p => !p.role || !p.alignment);
                    if (retryNullRoles.length > 0) {
                        console.error('Roles still not stored after retry:', retryNullRoles);
                        return false;
                    }
                }
            }

            console.log('✅ All roles verified and stored in database');
            return true;

        } catch (error) {
            console.error('Exception verifying roles:', error);
            return false;
        }
    }

    async saveRolesToDatabase() {
        console.log('=== SAVING ROLES TO DATABASE ===');
        console.log('Room ID:', this.currentRoom.id);
        console.log('Players to save:', this.currentRoom.players.map(p => ({
            name: p.player_name,
            id: p.player_id,
            role: p.role,
            alignment: p.alignment
        })));

        try {
            // Update each player's role in the database
            for (const player of this.currentRoom.players) {
                console.log(`Saving role for ${player.player_name} (ID: ${player.player_id}): ${player.role} (${player.alignment})`);

                if (!player.role || !player.alignment) {
                    console.error(`Player ${player.player_name} has missing role data:`, player);
                    continue;
                }

                const { data, error } = await this.supabase
                    .from(TABLES.ROOM_PLAYERS)
                    .update({
                        role: player.role,
                        alignment: player.alignment
                    })
                    .eq('room_id', this.currentRoom.id)
                    .eq('player_id', player.player_id)
                    .select();

                if (error) {
                    console.error(`Error updating role for player ${player.player_name}:`, error);
                } else {
                    console.log(`Successfully updated role for ${player.player_name}: ${player.role} (${player.alignment})`);
                    console.log(`Database response:`, data);

                    // Verify the update actually worked
                    if (data && data.length > 0) {
                        const updatedPlayer = data[0];
                        console.log(`Verification - Updated player role: ${updatedPlayer.role}, alignment: ${updatedPlayer.alignment}`);
                    } else {
                        console.error(`WARNING: No data returned from update for ${player.player_name}`);
                    }
                }
            }

            // Update room with mission leader and current mission
            const { error: roomError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    mission_leader: this.currentRoom.mission_leader,
                    current_mission: this.currentRoom.current_mission,
                    players: this.currentRoom.players // Save the complete player data
                })
                .eq('id', this.currentRoom.id);

            if (roomError) {
                console.error('Error updating room with mission data:', roomError);
            } else {
                console.log('Room updated with mission leader and player roles');
            }

            // Verify all roles were saved correctly by fetching from database
            console.log('=== VERIFYING ROLES IN DATABASE ===');
            const { data: verifyData, error: verifyError } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', this.currentRoom.id);

            if (verifyError) {
                console.error('Error verifying roles:', verifyError);
            } else {
                console.log('Database verification - All players in room:');
                verifyData.forEach(player => {
                    console.log(`${player.player_name}: role=${player.role}, alignment=${player.alignment}`);
                });
            }

        } catch (error) {
            console.error('Exception saving roles to database:', error);
        }
    }

    randomizePlayerPositions() {
        console.log('=== RANDOMIZING PLAYER POSITIONS ===');

        // Shuffle players array using Fisher-Yates algorithm
        const players = [...this.currentRoom.players];
        for (let i = players.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [players[i], players[j]] = [players[j], players[i]];
        }

        this.currentRoom.players = players;
        console.log('Player positions randomized:', players.map(p => p.player_name));

        // Update the display
        this.positionPlayersOnCircle();
    }

    // Update existing player positions without recreating elements (performance optimization)
    updateExistingPlayerPositions() {
        const room = this.currentRoom;
        if (!room || !room.players) return;

        const gameTable = document.getElementById('gameTable');
        if (!gameTable) return;

        // Responsive circle dimensions (same as positionPlayersOnCircle)
        const gameTableRect = gameTable.getBoundingClientRect();
        const circleWidth = gameTableRect.width;
        const circleHeight = gameTableRect.height;
        const centerX = circleWidth / 2;
        const centerY = circleHeight / 2;
        const radius = (circleWidth / 2) - (circleWidth * 0.1);

        // Update positions of existing players
        room.players.forEach((player, index) => {
            const angle = (index * 2 * Math.PI) / room.players.length - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            const playerSlot = gameTable.querySelector(`[data-player-id="${player.player_id}"]`);
            if (playerSlot) {
            // Calculate responsive slot dimensions based on viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const minDimension = Math.min(viewportWidth, viewportHeight);

            // More responsive slot sizing
            const slotWidth = Math.min(
                circleWidth * 0.12,  // 12% of circle width
                minDimension * 0.08, // 8% of smallest viewport dimension
                80                   // Maximum 80px
            );
            const slotHeight = Math.min(
                circleHeight * 0.16, // 16% of circle height
                minDimension * 0.11, // 11% of smallest viewport dimension
                110                  // Maximum 110px
            );

                playerSlot.style.left = `${x - slotWidth / 2}px`;
                playerSlot.style.top = `${y - slotHeight / 2}px`;
            }
        });
    }

    assignRoles() {
        console.log('=== ASSIGNING ROLES ===');

        const players = this.currentRoom.players;
        const roles = this.currentRoom.roles;
        const playerCount = players.length;

        console.log('Players array:', players);
        console.log('Player count:', playerCount);
        console.log('Roles config:', roles);

        // Define correct evil/good distribution for each player count
        const evilCounts = {
            5: 2,  // 2 evil, 3 good
            6: 2,  // 2 evil, 4 good
            7: 3,  // 3 evil, 4 good
            8: 3,  // 3 evil, 5 good
            9: 3,  // 3 evil, 6 good
            10: 4  // 4 evil, 6 good
        };

        const evilCount = evilCounts[playerCount] || Math.floor(playerCount / 2);
        const goodCount = playerCount - evilCount;

        console.log(`Player count: ${playerCount}, Evil: ${evilCount}, Good: ${goodCount}`);

        // Create role assignments
        const roleAssignments = [];

        // Always assign Merlin and Assassin
        roleAssignments.push({ role: 'merlin', alignment: 'good' });
        roleAssignments.push({ role: 'assassin', alignment: 'evil' });

        // Add optional roles based on configuration
        if (roles.percival) roleAssignments.push({ role: 'percival', alignment: 'good' });
        if (roles.morgana) roleAssignments.push({ role: 'morgana', alignment: 'evil' });
        if (roles.mordred) roleAssignments.push({ role: 'mordred', alignment: 'evil' });
        if (roles.oberon) roleAssignments.push({ role: 'oberon', alignment: 'evil' });

        // Count current good and evil roles
        let currentGood = roleAssignments.filter(r => r.alignment === 'good').length;
        let currentEvil = roleAssignments.filter(r => r.alignment === 'evil').length;

        // Add loyal servants (good players) to reach target good count
        const loyalServants = Math.max(0, goodCount - currentGood);
        for (let i = 0; i < loyalServants; i++) {
            roleAssignments.push({ role: 'loyal_servant', alignment: 'good' });
        }

        // Add minions (evil players) to reach target evil count
        const minions = Math.max(0, evilCount - currentEvil);
        for (let i = 0; i < minions; i++) {
            roleAssignments.push({ role: 'minion', alignment: 'evil' });
        }

        // Verify we have the correct counts
        const finalGood = roleAssignments.filter(r => r.alignment === 'good').length;
        const finalEvil = roleAssignments.filter(r => r.alignment === 'evil').length;
        console.log(`Final counts - Good: ${finalGood}, Evil: ${finalEvil}`);

        // Shuffle role assignments
        for (let i = roleAssignments.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roleAssignments[i], roleAssignments[j]] = [roleAssignments[j], roleAssignments[i]];
        }

        // Assign roles to players
        players.forEach((player, index) => {
            player.role = roleAssignments[index].role;
            player.alignment = roleAssignments[index].alignment;
        });

        console.log('Roles assigned:', players.map(p => ({ name: p.player_name, role: p.role, alignment: p.alignment })));
        console.log('Role assignments array:', roleAssignments);
    }

    selectRandomMissionLeader() {
        console.log('=== SELECTING RANDOM MISSION LEADER ===');

        const players = this.currentRoom.players;
        const randomIndex = Math.floor(Math.random() * players.length);
        const missionLeader = players[randomIndex];

        this.currentRoom.mission_leader = missionLeader.player_id;
        this.currentRoom.current_mission = 1;

        console.log('Mission leader selected:', missionLeader.player_name);
    }

    async showRoleInformation() {
        console.log('=== SHOWING ROLE INFORMATION ===');

        // Prevent multiple simultaneous calls
        if (this.showingRoleInformation) {
            console.log('Already showing role information, skipping');
            return;
        }

        // Always check database to determine if role information should be shown
        const hasSeenInDB = await this.hasSeenRoleInformation();
        console.log('Database role information check:', {
            hasSeenInDB: hasSeenInDB,
            currentUser: supabaseAuthSystem.getCurrentUser()?.email
        });

        if (hasSeenInDB) {
            console.log('Database shows role information already seen, skipping');
            return;
        }

        // Check if modal already exists to prevent duplicates
        const existingModal = document.getElementById('roleModal');
        if (existingModal) {
            console.log('Role modal already exists, removing it first');
            existingModal.remove();
        }

        // Set flag to prevent multiple calls
        this.showingRoleInformation = true;

        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser) {
            console.log('No current user found');
            this.showingRoleInformation = false; // Reset flag
            return;
        }

        if (!this.currentRoom) {
            console.log('No current room found');
            this.showingRoleInformation = false; // Reset flag
            return;
        }

        try {
            // Fetch fresh role data directly from database
            console.log('Fetching fresh role data from database...');
            console.log('Room ID:', this.currentRoom.id);
            let { data: roomPlayers, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', this.currentRoom.id);

            if (error) {
                console.error('Error fetching role data:', error);
                this.showingRoleInformation = false; // Reset flag
                return;
            }

            // Find current player's role from database
            const currentPlayer = roomPlayers.find(p => p.player_id === currentUser.id);
            if (!currentPlayer) {
                console.log('Current player not found in database');
                this.showingRoleInformation = false; // Reset flag
                return;
            }

            console.log('Current player found in database:', currentPlayer);
            console.log('Player role:', currentPlayer.role);
            console.log('Player alignment:', currentPlayer.alignment);
            console.log('All players in database:', roomPlayers.map(p => ({ name: p.player_name, role: p.role, alignment: p.alignment })));

            // Check if roles are still null (race condition)
            if (!currentPlayer.role || !currentPlayer.alignment) {
                console.warn('⚠️ Role information is null - waiting for roles to be stored...');
                console.log('Current player role data:', { role: currentPlayer.role, alignment: currentPlayer.alignment });

                // Wait and retry up to 3 times
                for (let attempt = 1; attempt <= 3; attempt++) {
                    console.log(`Retry attempt ${attempt}/3 - waiting 1 second...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // Fetch fresh data again
                    const { data: retryPlayers, error: retryError } = await this.supabase
                        .from(TABLES.ROOM_PLAYERS)
                        .select('*')
                        .eq('room_id', this.currentRoom.id);

                    if (retryError) {
                        console.error('Error in retry fetch:', retryError);
                        continue;
                    }

                    const retryCurrentPlayer = retryPlayers.find(p => p.player_id === currentUser.id);
                    console.log(`Retry ${attempt} - Player role:`, retryCurrentPlayer?.role, 'alignment:', retryCurrentPlayer?.alignment);

                    if (retryCurrentPlayer && retryCurrentPlayer.role && retryCurrentPlayer.alignment) {
                        console.log('✅ Roles found on retry, updating current player data');
                        currentPlayer.role = retryCurrentPlayer.role;
                        currentPlayer.alignment = retryCurrentPlayer.alignment;
                        roomPlayers = retryPlayers; // Update the full list
                        break;
                    }
                }

                // Final check - if still null, show error
                if (!currentPlayer.role || !currentPlayer.alignment) {
                    console.error('❌ Roles still null after retries - showing error message');
                    this.showNotification('Role information is not ready yet. Please wait a moment and refresh the page.', 'error');
                    this.showingRoleInformation = false;
                    return;
                }
            }

            console.log('✅ Role information ready:', { role: currentPlayer.role, alignment: currentPlayer.alignment });

            // Update local room data with fresh database data
            this.currentRoom.players = roomPlayers;

            // Create role information modal with high z-index and pointer events
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'roleModal';
            modal.style.display = 'block';
            modal.style.zIndex = '10001'; // Higher than notifications
            modal.style.pointerEvents = 'auto';

            const roleInfo = this.getRoleInformation(currentPlayer);

            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Your Role: ${roleInfo.roleName}</h2>
                    <div class="role-description">
                        <p><strong>Alignment:</strong> ${roleInfo.alignment}</p>
                        <p><strong>Description:</strong> ${roleInfo.description}</p>
                        ${roleInfo.specialInfo ? `<p><strong>Special Information:</strong> ${roleInfo.specialInfo}</p>` : ''}
                    </div>
                    <button class="btn btn-primary" id="understandRoleBtn">I Understand</button>
                </div>
            `;

            document.body.appendChild(modal);

            // Add event listener for the understand button with comprehensive debugging
        setTimeout(() => {
                const understandBtn = document.getElementById('understandRoleBtn');
                console.log('=== DEBUGGING UNDERSTAND BUTTON ===');
                console.log('Looking for understand button:', understandBtn);
                console.log('Button element:', understandBtn);
                console.log('Button text content:', understandBtn?.textContent);
                console.log('Button disabled:', understandBtn?.disabled);
                console.log('Button style:', understandBtn?.style);
                console.log('Modal element:', modal);
                console.log('Modal display style:', modal?.style?.display);
                console.log('Modal z-index:', modal?.style?.zIndex);
                console.log('Modal pointer-events:', modal?.style?.pointerEvents);

                // Check for overlapping elements
                const rect = understandBtn.getBoundingClientRect();
                const elementAtPoint = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
                console.log('Element at button center:', elementAtPoint);
                console.log('Is element at point the button?', elementAtPoint === understandBtn);

                if (understandBtn) {
                    console.log('Button found, adding event listener...');

                    // Create a robust click handler function with click prevention
                    let isProcessing = false;
                    const handleButtonClick = async (e) => {
                        console.log('=== BUTTON CLICKED ===');
                        console.log('Event:', e);
                        console.log('Event target:', e.target);
                        console.log('Event currentTarget:', e.currentTarget);
                        console.log('Event type:', e.type);

                        // Prevent multiple clicks
                        if (isProcessing) {
                            console.log('Already processing click, ignoring');
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            return;
                        }

                        isProcessing = true;

                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();

                        console.log('Role information understood, setting flag');
                        this.roleInformationShown = true;

                        // Remove modal immediately to prevent double-clicks
                        console.log('Removing modal immediately...');
                        modal.remove();
                        console.log('Modal removed successfully');

                        // Reset flag to allow future calls
                        this.showingRoleInformation = false;

                        // Handle database update asynchronously (don't await)
                        console.log('Calling markRoleInformationAsSeen asynchronously...');
                        this.markRoleInformationAsSeen().then(() => {
                            console.log('markRoleInformationAsSeen completed successfully');
                        }).catch((error) => {
                            console.error('Error in markRoleInformationAsSeen:', error);
                        });
                    };

                    // Add only click event listener to avoid double-firing
                    understandBtn.addEventListener('click', handleButtonClick, true);

                    // Add event delegation to the modal as backup (but only for click events)
                    modal.addEventListener('click', (e) => {
                        if (e.target.id === 'understandRoleBtn' || e.target.closest('#understandRoleBtn')) {
                            console.log('Modal click delegation triggered');
                            handleButtonClick(e);
                        }
                    }, true);

                    console.log('Event listeners added successfully');
                } else {
                    console.error('Understand button not found!');
                    console.log('Available elements with ID containing "understand":',
                        document.querySelectorAll('[id*="understand"]'));
                    console.log('All buttons in modal:', modal.querySelectorAll('button'));
                }
            }, 100);

        } catch (error) {
            console.error('Exception in showRoleInformation:', error);
            // Reset flag in case of error
            this.showingRoleInformation = false;
        }
    }

    // Database-only role information check - always checks database, never uses local state
    async checkAndShowRoleInformationFromDatabase() {
        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser || !this.currentRoom) {
            console.log('No current user or room for role information check');
            return;
        }

        try {
            console.log('=== CHECKING ROLE INFORMATION FROM DATABASE ===');

            // Always fetch fresh data from database
            const { data: playerDataArray, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('has_role_seen, role, alignment')
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', currentUser.id);

            if (error) {
                console.error('Error fetching player role data:', error);
                return;
            }

            const playerData = playerDataArray && playerDataArray.length > 0 ? playerDataArray[0] : null;

            console.log('Database role data:', {
                has_role_seen: playerData.has_role_seen,
                role: playerData.role,
                alignment: playerData.alignment,
                user: currentUser.email
            });

            // Only show role information if database says it hasn't been seen
            if (!playerData.has_role_seen) {
                console.log('Database shows role not seen, showing role information');
                this.showRoleInformation();
            } else {
                console.log('Database shows role already seen, not showing role information');
            }

        } catch (error) {
            console.error('Exception checking role information from database:', error);
        }
    }

    // Helper methods for database-based role seen tracking
    async hasSeenRoleInformation() {
        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser || !this.currentRoom) return false;

        try {
            const { data: roleSeenDataArray, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('has_role_seen')
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', currentUser.id);

            if (error) {
                console.error('Error checking role seen status:', error);
                return false;
            }

            const roleSeenData = roleSeenDataArray && roleSeenDataArray.length > 0 ? roleSeenDataArray[0] : null;
            return roleSeenData?.has_role_seen || false;
        } catch (error) {
            console.error('Exception checking role seen status:', error);
            return false;
        }
    }

    async markRoleInformationAsSeen() {
        console.log('=== MARKING ROLE AS SEEN ===');
        const currentUser = supabaseAuthSystem.getCurrentUser();
        console.log('Current user:', currentUser);
        console.log('Current room:', this.currentRoom);

        if (!currentUser || !this.currentRoom) {
            console.log('Missing user or room, returning early');
            return;
        }

        try {
            console.log('Updating database with has_role_seen = true');
            console.log('Room ID:', this.currentRoom.id);
            console.log('Player ID:', currentUser.id);
            console.log('Current user email:', currentUser.email);
            console.log('Is current user the host?', this.currentRoom.host_id === currentUser.id);

            // First, let's check if the user can read their own record
            console.log('Checking if user can read their own record...');
            const { data: readDataArray, error: readError } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', currentUser.id);

            const readData = readDataArray && readDataArray.length > 0 ? readDataArray[0] : null;
            console.log('Read test result:', { readData, readError });

            if (readError) {
                console.error('User cannot read their own record - RLS issue:', readError);
                return;
            }

            // Now try the update
            const { data, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .update({ has_role_seen: true })
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', currentUser.id)
                .select();

            console.log('Database response:', { data, error });

            if (error) {
                console.error('❌ Error marking role as seen:', error);
                console.error('Error details:', error.message, error.details, error.hint);
            } else {
                console.log('✅ Successfully marked role information as seen for user:', currentUser.email);
                console.log('Updated data:', data);

                // Verify the update by reading the record again
                const { data: verifyDataArray, error: verifyError } = await this.supabase
                    .from(TABLES.ROOM_PLAYERS)
                    .select('has_role_seen')
                    .eq('room_id', this.currentRoom.id)
                    .eq('player_id', currentUser.id);

                const verifyData = verifyDataArray && verifyDataArray.length > 0 ? verifyDataArray[0] : null;
                console.log('🔍 Verification read:', { verifyData, verifyError });
            }
        } catch (error) {
            console.error('Exception marking role as seen:', error);
        }
    }

    async clearRoleSeenFlags() {
        if (!this.currentRoom) return;

        try {
            const { error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .update({ has_role_seen: false })
                .eq('room_id', this.currentRoom.id);

            if (error) {
                console.error('Error clearing role seen flags:', error);
            } else {
                console.log(`Cleared role seen flags for all players in room ${this.currentRoom.id}`);
            }
        } catch (error) {
            console.error('Exception clearing role seen flags:', error);
        }
    }

    // Check if current user is the host by querying the database
    async isCurrentUserHost() {
        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser || !this.currentRoom) return false;

        // First try to use already loaded room_players data (more efficient)
        if (this.currentRoom.players && Array.isArray(this.currentRoom.players)) {
            const currentPlayerData = this.currentRoom.players.find(p => p.player_id === currentUser.id);
            if (currentPlayerData) {
                console.log('Using loaded room_players data for host check:', currentPlayerData.is_host);
                return currentPlayerData.is_host || false;
            }
        }

        // Fallback to database query if room_players data not available
        try {
            const { data: hostDataArray, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('is_host')
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', currentUser.id);

            if (error) {
                console.error('Error checking host status:', error);
                return false;
            }

            const hostData = hostDataArray && hostDataArray.length > 0 ? hostDataArray[0] : null;
            console.log('Using database query for host check:', hostData?.is_host);
            return hostData?.is_host || false;
        } catch (error) {
            console.error('Exception checking host status:', error);
            return false;
        }
    }

    // Synchronous fallback for host check (for browser compatibility)
    isCurrentUserHostSync() {
        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser || !this.currentRoom) return false;

        // First try to use already loaded room_players data
        if (this.currentRoom.players && Array.isArray(this.currentRoom.players)) {
            const currentPlayerData = this.currentRoom.players.find(p => p.player_id === currentUser.id);
            if (currentPlayerData && currentPlayerData.hasOwnProperty('is_host')) {
                console.log('Using loaded room_players data for sync host check:', currentPlayerData.is_host);
                return currentPlayerData.is_host || false;
            }
        }

        // Check if we have the host info in current room data
        if (this.currentRoom.host_id) {
            return this.currentRoom.host_id === currentUser.id;
        }

        // Fallback to local isHost (should now be accurate due to refreshRoomData fix)
        return this.isHost;
    }

    // REAL-TIME ONLY: No polling systems - all updates via Supabase subscriptions
    // Removed all polling mechanisms to enforce real-time-first approach

    // DEBUG: Manual test function to trigger database updates
    async testRealTimeUpdates() {
        if (!this.currentRoom) {
            console.error('No current room for testing');
            return;
        }
        
        console.log('=== TESTING REAL-TIME UPDATES ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Current room ID:', this.currentRoom.id);
        
        // Get current players
        const { data: allPlayers, error } = await this.supabase
            .from(TABLES.ROOM_PLAYERS)
            .select('*')
            .eq('room_id', this.currentRoom.id);
        
        if (error) {
            console.error('Error fetching players for test:', error);
            return;
        }
        
        console.log('Current players:', allPlayers);
        
        // Update game_rooms table to trigger real-time
        const { error: updateError } = await this.supabase
            .from(TABLES.GAME_ROOMS)
            .update({
                players: allPlayers || [],
                updated_at: new Date().toISOString(),
                version: this.currentRoom.version ? this.currentRoom.version + 1 : 1
            })
            .eq('id', this.currentRoom.id);
        
        if (updateError) {
            console.error('Error updating game_rooms for test:', updateError);
        } else {
            console.log('✅ Test update sent - should trigger real-time events');
        }
    }


    // COMPREHENSIVE fresh data fetch - always gets latest state from database
    async fetchCompleteRoomState(roomId) {
        console.log('=== FETCHING COMPLETE FRESH ROOM STATE ===');
        console.log('Room ID:', roomId);

        try {
            // Fetch ALL room data fresh from database - no caching
            const { data: room, error: roomError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select(`
                    *,
                    room_players (
                        id,
                        player_id,
                        player_name,
                        player_avatar,
                        is_host,
                        role,
                        alignment,
                        has_role_seen,
                        joined_at
                    )
                `)
                .eq('id', roomId)
                .single();

            if (roomError) {
                console.error('Error fetching complete room state:', roomError);
                return null;
            }

            console.log('Fresh room data fetched:', {
                id: room.id,
                status: room.status,
                status_message: room.status_message,
                current_players: room.current_players,
                rejection_count: room.rejection_count,
                team_proposal_state: room.team_proposal_state,
                mission_leader: room.mission_leader,
                current_mission: room.current_mission,
                players_count: room.room_players?.length || 0
            });

            return room;
        } catch (error) {
            console.error('Exception fetching complete room state:', error);
            return null;
        }
    }

    // Fast room state check - restored working version
    async fastRoomStateCheck() {
        if (!this.currentRoom) return;

        try {
            // ALWAYS fetch complete fresh data - no partial fetching
            const freshRoomData = await this.fetchCompleteRoomState(this.currentRoom.id);

            if (!freshRoomData) {
                console.error('Failed to fetch fresh room data');
                return;
            }

            // ALWAYS update with fresh data - no state comparison or caching
            console.log('=== UPDATING WITH FRESH DATABASE DATA ===');
            console.log('Previous status:', this.currentRoom.status);
            console.log('Fresh status:', freshRoomData.status);
            console.log('Previous message:', this.currentRoom.status_message);
            console.log('Fresh message:', freshRoomData.status_message);
            console.log('Status changed:', this.currentRoom.status !== freshRoomData.status);
            console.log('Message changed:', this.currentRoom.status_message !== freshRoomData.status_message);

            // Update current room with fresh data
            this.currentRoom = freshRoomData;
            this.currentRoom.players = freshRoomData.room_players || [];
            this.currentRoom.current_players = this.currentRoom.players.length;

            // Update host status
            const currentUser = supabaseAuthSystem.getCurrentUser();
            if (currentUser) {
                const playerData = this.currentRoom.players.find(p => p.player_id === currentUser.id);
                this.isHost = playerData ? playerData.is_host : false;
            }

            // No local flag management - always check database for role information state

            // Always update UI with fresh data
            this.updateRejectionCounter(this.currentRoom.rejection_count || 0);

            // Update team building UI if in team building phase
            if (this.currentRoom.team_proposal_state !== TEAM_PROPOSAL_STATE.NONE) {
                this.updateTeamBuildingUI();
            }

            // Check if room is in role distribution status and show role information
            if (this.currentRoom.status === GAME_STATUS.ROLE_DISTRIBUTION) {
                console.log('=== ROLE DISTRIBUTION DETECTED IN POLLING ===');
                console.log('Room status:', this.currentRoom.status);
                console.log('Current user:', supabaseAuthSystem.getCurrentUser()?.email);
                console.log('Is host:', this.isHost);

                // Always check database to determine if role information should be shown
                this.checkAndShowRoleInformationFromDatabase();
            }

            // Update room display UI directly (no additional DB call needed)
            this.setupRoomInterface();
            this.positionPlayersOnCircle();
            this.updateRoomStatus();

            // Always update status message with fresh data
            if (this.currentRoom.status_message) {
                this.displayStatusMessage(this.currentRoom.status_message, this.currentRoom.status_message_type || 'waiting');
            }

        } catch (error) {
            console.error('Exception in fast room state check:', error);
        }
    }

    // Create a lightweight hash of only critical fields (CPU optimized)
    createLightweightStateHash(roomData) {
        // Only hash the most critical fields to reduce CPU usage
        const criticalState = {
            status: roomData.status,
            current_players: roomData.current_players,
            status_message: roomData.status_message,
            player_count: roomData.room_players?.length || 0
        };

        return JSON.stringify(criticalState);
    }

    // Create a hash of room state to detect changes efficiently (legacy - kept for compatibility)
    createStateHash(roomData) {
        const state = {
            status: roomData.status,
            current_players: roomData.current_players,
            status_message: roomData.status_message,
            status_message_type: roomData.status_message_type,
            players: roomData.room_players?.map(p => ({
                id: p.id,
                player_id: p.player_id,
                player_name: p.player_name,
                is_host: p.is_host,
                role: p.role,
                alignment: p.alignment,
                has_role_seen: p.has_role_seen
            })) || []
        };

        return JSON.stringify(state);
    }

    // Immediate room state update for critical actions
    async immediateRoomStateUpdate() {
        if (!this.currentRoom) return;

        console.log('=== PERFORMING IMMEDIATE ROOM STATE UPDATE ===');
        console.log('Current room ID:', this.currentRoom.id);
        console.log('Current user:', supabaseAuthSystem.getCurrentUser()?.email);

        await this.fastRoomStateCheck();

        console.log('Immediate room state update completed');
    }


    // Update room state and automatically set corresponding status message
    async updateRoomState(newState, additionalInfo = {}) {
        if (!this.currentRoom) return;

        try {
            // Get the appropriate status message for this state
            const statusMessage = this.getStatusMessageForState(newState, additionalInfo);
            const statusMessageType = this.getStatusMessageType(newState);

            console.log('🔄 Updating room state:', {
                from: this.currentRoom.status,
                to: newState,
                message: statusMessage,
                type: statusMessageType,
                additionalInfo
            });

            // Update database with new state and corresponding message
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    status: newState,
                    status_message: statusMessage,
                    status_message_type: statusMessageType,
                    updated_at: new Date().toISOString(),
                    version: this.currentRoom.version ? this.currentRoom.version + 1 : 1
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error updating room state:', error);
            } else {
                console.log('✅ Successfully updated room state:', newState);
                // Update local cache
                this.currentRoom.status = newState;
                this.currentRoom.status_message = statusMessage;
                this.currentRoom.status_message_type = statusMessageType;

                // Immediately update the display
                this.displayStatusMessage(statusMessage, statusMessageType);
            }
        } catch (error) {
            console.error('Exception updating room state:', error);
        }
    }

    // Get status message type based on room state
    getStatusMessageType(roomState) {
        const typeMapping = {
            'waiting': 'waiting',
            'role_distribution': 'playing',
            'playing': 'playing',
            'finished': 'finished',
            'cancelled': 'error'
        };

        return typeMapping[roomState] || 'waiting';
    }

    // Database-driven room state management methods (legacy - use updateRoomState instead)
    async updateRoomStatusMessage(message, type = 'waiting') {
        if (!this.currentRoom) return;

        try {
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    status_message: message,
                    status_message_type: type,
                    updated_at: new Date().toISOString(),
                    version: this.currentRoom.version ? this.currentRoom.version + 1 : 1
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error updating room status message:', error);
            } else {
                console.log('Updated room status message:', message, 'type:', type);
                // Update local cache
                this.currentRoom.status_message = message;
                this.currentRoom.status_message_type = type;

                // Immediately update the display
                this.displayStatusMessage(message, type);
            }
        } catch (error) {
            console.error('Exception updating room status message:', error);
        }
    }

    async updateRoomGameState(gameState) {
        if (!this.currentRoom) return;

        try {
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({ game_state: gameState })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error updating room game state:', error);
            } else {
                console.log('Updated room game state:', gameState);
                // Update local cache
                this.currentRoom.game_state = gameState;
            }
        } catch (error) {
            console.error('Exception updating room game state:', error);
        }
    }

    async updateRoomDisplayState(displayState) {
        if (!this.currentRoom) return;

        try {
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({ display_state: displayState })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error updating room display state:', error);
            } else {
                console.log('Updated room display state:', displayState);
                // Update local cache
                this.currentRoom.display_state = displayState;
            }
        } catch (error) {
            console.error('Exception updating room display state:', error);
        }
    }

    // Get current room state from database (ensures consistency)
    async getRoomState() {
        if (!this.currentRoom) return null;

        try {
            const { data, error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('status_message, status_message_type, game_state, display_state, state_updated_at')
                .eq('id', this.currentRoom.id)
                .single();

            if (error) {
                console.error('Error getting room state:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Exception getting room state:', error);
            return null;
        }
    }

    // Update and display room status message (database-driven)
    async updateAndDisplayRoomStatusMessage(room, isRoomFull) {
        let message, messageType;

        // Calculate appropriate status message
        if (room.status === 'waiting') {
            if (isRoomFull) {
                message = 'Room is full! Ready to start.';
                messageType = 'waiting';
            } else {
                const playersNeeded = room.max_players - room.current_players;
                message = `Waiting for ${playersNeeded} more player${playersNeeded === 1 ? '' : 's'}...`;
                messageType = 'waiting';
            }
        } else if (room.status === 'role_distribution') {
            message = 'Game starting... Role distribution in progress.';
            messageType = 'playing';
        } else if (room.status === 'playing') {
            message = 'Game in progress...';
            messageType = 'playing';
        } else if (room.status === 'finished') {
            message = 'Game finished!';
            messageType = 'finished';
        } else {
            message = 'Unknown status';
            messageType = 'waiting';
        }

        // Update database with new status message (only if different)
        if (room.status_message !== message || room.status_message_type !== messageType) {
            await this.updateRoomStatusMessage(message, messageType);
        }

        // Display the status message from database (ensures consistency)
        this.displayStatusMessage(room.status_message || message, room.status_message_type || messageType);
    }

    // Display status message in UI with debouncing
    displayStatusMessage(message, messageType) {
        // Debounce status message updates to prevent rapid changes
        if (this.updateDebounceTimer) {
            clearTimeout(this.updateDebounceTimer);
        }
        
        this.updateDebounceTimer = setTimeout(() => {
            this._performStatusMessageUpdate(message, messageType);
        }, 150); // 150ms debounce
    }

    _performStatusMessageUpdate(message, messageType) {
        let statusMessage = document.getElementById('statusMessage');

        // If element doesn't exist, try to create it or find the game table
        if (!statusMessage) {
            console.log('Status message element not found, attempting to create it...');
            const gameTable = document.getElementById('gameTable');
            if (gameTable) {
                // Create the status message element inside the game table
                statusMessage = document.createElement('div');
                statusMessage.id = 'statusMessage';
                statusMessage.className = `status-message-center ${messageType}`;
                statusMessage.textContent = this.getShortStatusMessage(message, messageType);
                gameTable.insertAdjacentElement('afterbegin', statusMessage);
                console.log('Created status message element inside game table');
            } else {
                console.error('Game table not found, cannot create status message element!');
                return;
            }
        }

        if (statusMessage) {
            // Make messages shorter for center display
            const shortMessage = this.getShortStatusMessage(message, messageType);

            statusMessage.textContent = shortMessage;
            statusMessage.className = `status-message-center ${messageType}`;

            // Force visibility with simple styling
            statusMessage.style.display = 'block';
            statusMessage.style.visibility = 'visible';
            statusMessage.style.opacity = '1';

        // Removed excessive logging
        } else {
            console.error('Status message element not found and could not be created!');
        }
    }

    // Get status message based on room state (database-driven)
    getStatusMessageForState(roomState, additionalInfo = {}) {
        const statusMessages = {
            'waiting': 'Waiting for players...',
            'role_distribution': 'Role distribution in progress...',
            'playing': 'Game in progress...',
            'finished': 'Game over!',
            'cancelled': 'Game cancelled'
        };

        // Get base message
        let message = statusMessages[roomState] || 'Unknown state...';

        // Add specific information based on state and additional info
        if (roomState === 'waiting') {
            const { isRoomFull = false } = additionalInfo;
            if (isRoomFull) {
                message = 'Room is full! Ready to start.';
            }
        } else if (roomState === 'role_distribution') {
            const { playersSeenRoles = 0, totalPlayers = 0 } = additionalInfo;
            if (totalPlayers > 0) {
                message = `Role distribution in progress... (${playersSeenRoles}/${totalPlayers} ready)`;
            }
        } else if (roomState === 'playing') {
            const { currentMission = 1 } = additionalInfo;
            message = `Mission ${currentMission} in progress...`;
        }

        return message;
    }

    // Convert long status messages to shorter versions for center display
    getShortStatusMessage(message, messageType) {
        const shortMessages = {
            'Waiting for players...': 'Waiting...',
            'Room is full! Ready to start.': 'Ready to Start!',
            'Role distribution in progress...': 'Check Your Role!',
            'Role distribution in progress... (1/5 ready)': 'Check Your Role!',
            'Role distribution in progress... (2/5 ready)': 'Check Your Role!',
            'Role distribution in progress... (3/5 ready)': 'Check Your Role!',
            'Role distribution in progress... (4/5 ready)': 'Check Your Role!',
            'Role distribution in progress... (5/5 ready)': 'Check Your Role!',
            'All players ready! Starting game...': 'Starting Game!',
            'Game started! Mission 1 begins.': 'Mission 1',
            'Mission 1 in progress...': 'Mission 1',
            'Mission 2 in progress...': 'Mission 2',
            'Mission 3 in progress...': 'Mission 3',
            'Mission 4 in progress...': 'Mission 4',
            'Mission 5 in progress...': 'Mission 5',
            'Waiting for team proposal...': 'Propose Team',
            'Voting on team...': 'Vote Now',
            'Mission in progress...': 'Mission Active',
            'Mission completed!': 'Mission Done',
            'Game over!': 'Game Over'
        };

        // Return short version if available, otherwise truncate the original
        return shortMessages[message] || message.substring(0, 20) + (message.length > 20 ? '...' : '');
    }

    // Show/hide rejection tracker
    showRejectionTracker() {
        const rejectionTracker = document.getElementById('rejectionTracker');
        console.log('🟢 Showing rejection tracker:', !!rejectionTracker);
        if (rejectionTracker) {
            rejectionTracker.style.display = 'block';
            console.log('Rejection tracker display set to block');
        }
    }

    hideRejectionTracker() {
        const rejectionTracker = document.getElementById('rejectionTracker');
        console.log('🔴 Hiding rejection tracker:', !!rejectionTracker);
        if (rejectionTracker) {
            rejectionTracker.style.display = 'none';
            console.log('Rejection tracker display set to none');
        }
    }

    // Update rejection counter
    updateRejectionCounter(count) {
        console.log('🔄 Updating rejection counter:', count);

        const rejectionCount = document.getElementById('rejectionCount');
        const rejectionWarning = document.getElementById('rejectionWarning');
        const rejectionTracker = document.getElementById('rejectionTracker');

        console.log('Rejection elements found:', {
            rejectionCount: !!rejectionCount,
            rejectionWarning: !!rejectionWarning,
            rejectionTracker: !!rejectionTracker
        });

        if (rejectionCount) {
            rejectionCount.textContent = count;
        }

        if (rejectionWarning) {
            if (count >= 4) {
                rejectionWarning.style.display = 'block';
            } else {
                rejectionWarning.style.display = 'none';
            }
        }

        // Always show the rejection tracker - it's a permanent part of the game room
        this.showRejectionTracker();
    }

    // Handle team rejection
    async handleTeamRejection() {
        if (!this.currentRoom) return;

        try {
            const newRejectionCount = (this.currentRoom.rejection_count || 0) + 1;

            // Update database
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    rejection_count: newRejectionCount,
                    is_voting_phase: false // End voting phase
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error updating rejection count:', error);
                return;
            }

            // Update local state
            this.currentRoom.rejection_count = newRejectionCount;

            // Update UI
            this.updateRejectionCounter(newRejectionCount);

            // Check if Evil wins (5 rejections)
            if (newRejectionCount >= 5) {
                await this.handleEvilWinByRejections();
                return;
            }

            // Pass leadership to next player
            await this.passLeadershipToNext();

            console.log(`Team rejected! Rejection count: ${newRejectionCount}/5`);

        } catch (error) {
            console.error('Error handling team rejection:', error);
        }
    }

    // Handle team acceptance
    async handleTeamAcceptance() {
        if (!this.currentRoom) return;

        try {
            // Reset rejection count when team is accepted
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    rejection_count: 0,
                    is_voting_phase: false // End voting phase
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error resetting rejection count:', error);
                return;
            }

            // Update local state
            this.currentRoom.rejection_count = 0;

            // Update UI
            this.updateRejectionCounter(0);

            console.log('Team accepted! Rejection count reset to 0');

        } catch (error) {
            console.error('Error handling team acceptance:', error);
        }
    }

    // Handle Evil win by 5 rejections
    async handleEvilWinByRejections() {
        try {
            // Update room status to finished with Evil win
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    status: 'finished',
                    finished_at: new Date().toISOString()
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error updating room status for Evil win:', error);
                return;
            }

            // Show Evil win message
            this.displayStatusMessage('Evil wins! 5 team rejections!', 'error');

            console.log('Evil wins by 5 team rejections!');

        } catch (error) {
            console.error('Error handling Evil win by rejections:', error);
        }
    }

    // Pass leadership to next player
    async passLeadershipToNext() {
        if (!this.currentRoom || !this.currentRoom.players) return;

        try {
            const currentLeaderIndex = this.currentRoom.players.findIndex(p => p.player_id === this.currentRoom.mission_leader);
            const nextLeaderIndex = (currentLeaderIndex + 1) % this.currentRoom.players.length;
            const nextLeader = this.currentRoom.players[nextLeaderIndex];

            // Update mission leader in database
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    mission_leader: nextLeader.player_id,
                    is_voting_phase: true // Start new voting phase
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error updating mission leader:', error);
                return;
            }

            // Update local state
            this.currentRoom.mission_leader = nextLeader.player_id;

            // Update UI
            this.positionPlayersOnCircle();

            // Show new leader message
            this.displayStatusMessage(`${nextLeader.player_name} is now the mission leader`, 'playing');

            console.log(`Leadership passed to: ${nextLeader.player_name}`);

        } catch (error) {
            console.error('Error passing leadership:', error);
        }
    }

    // Initialize rejection tracker when room loads
    initializeRejectionTracker() {
        console.log('🎯 Initializing rejection tracker...');

        // Always show the rejection tracker
        this.showRejectionTracker();

        // Initialize with current room state
        if (this.currentRoom) {
            const rejectionCount = this.currentRoom.rejection_count || 0;
            this.updateRejectionCounter(rejectionCount);
            console.log('Rejection tracker initialized with count:', rejectionCount);
        } else {
            // Default to 0 if no room data yet
            this.updateRejectionCounter(0);
            console.log('Rejection tracker initialized with default count: 0');
        }
    }

    // Get required team size for current mission
    getRequiredTeamSize() {
        if (!this.currentRoom || !this.currentRoom.players) return 0;

        const playerCount = this.currentRoom.players.length;
        const currentMission = this.currentRoom.current_mission || 1;

        const teamSizes = MISSION_TEAM_SIZES[playerCount];
        if (!teamSizes) {
            console.error('No team size configuration for', playerCount, 'players');
            return 0;
        }

        const requiredSize = teamSizes[currentMission - 1] || 0;
        console.log(`Mission ${currentMission} with ${playerCount} players requires ${requiredSize} team members`);
        return requiredSize;
    }

    // Check if current user is mission leader
    isCurrentUserMissionLeader() {
        if (!this.currentRoom || !this.currentRoom.mission_leader) return false;

        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser) return false;

        return this.currentRoom.mission_leader === currentUser.id;
    }

    // Start team building phase
    async startTeamBuildingPhase() {
        if (!this.currentRoom) return;

        try {
            console.log('🏗️ Starting team building phase...');

            const requiredTeamSize = this.getRequiredTeamSize();
            if (requiredTeamSize === 0) {
                console.error('Invalid team size for current mission');
                return;
            }

            // Update room state to team building
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    team_proposal_state: TEAM_PROPOSAL_STATE.SELECTING,
                    selected_team_members: [],
                    team_proposal_attempts: 0
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error starting team building phase:', error);
                return;
            }

            // Update local state
            this.currentRoom.team_proposal_state = TEAM_PROPOSAL_STATE.SELECTING;
            this.currentRoom.selected_team_members = [];
            this.currentRoom.team_proposal_attempts = 0;

            // Update UI
            this.updateTeamBuildingUI();

            // Show status message
            const missionLeader = this.currentRoom.players.find(p => p.player_id === this.currentRoom.mission_leader);
            this.displayStatusMessage(`${missionLeader?.player_name || 'Mission Leader'} is selecting team for Mission ${this.currentRoom.current_mission}`, 'playing');

            console.log('Team building phase started successfully');

        } catch (error) {
            console.error('Error starting team building phase:', error);
        }
    }

    // Update team building UI
    updateTeamBuildingUI() {
        console.log('🎨 Updating team building UI...');

        // Show team selection interface for mission leader
        if (this.isCurrentUserMissionLeader()) {
            this.showTeamSelectionInterface();
        } else {
            this.showTeamSelectionWaiting();
        }

        // Update player slots to show selection state
        this.updatePlayerSelectionUI();
    }

    // Show team selection interface for mission leader
    showTeamSelectionInterface() {
        console.log('👑 Showing team selection interface for mission leader');

        const requiredTeamSize = this.getRequiredTeamSize();
        const selectedCount = this.currentRoom.selected_team_members?.length || 0;

        // Show team selection status
        this.displayStatusMessage(`Select ${requiredTeamSize} players for Mission ${this.currentRoom.current_mission} (${selectedCount}/${requiredTeamSize} selected)`, 'playing');

        // Enable team proposal button if enough players selected
        this.updateTeamProposalButton(selectedCount >= requiredTeamSize);
    }

    // Show waiting message for non-leaders
    showTeamSelectionWaiting() {
        const missionLeader = this.currentRoom.players.find(p => p.player_id === this.currentRoom.mission_leader);
        this.displayStatusMessage(`Waiting for ${missionLeader?.player_name || 'Mission Leader'} to select team...`, 'playing');
    }

    // Update team proposal button
    updateTeamProposalButton(enabled) {
        const proposeTeamBtn = document.getElementById('proposeTeamBtn');
        if (proposeTeamBtn) {
            proposeTeamBtn.style.display = enabled ? 'block' : 'none';
            proposeTeamBtn.disabled = !enabled;
        }
    }

    // Update player selection UI
    updatePlayerSelectionUI() {
        if (!this.currentRoom || !this.currentRoom.players) return;

        const selectedTeamMembers = this.currentRoom.selected_team_members || [];

        // Update each player slot
        this.currentRoom.players.forEach(player => {
            const playerSlot = document.querySelector(`[data-player-id="${player.player_id}"]`);
            if (playerSlot) {
                const isSelected = selectedTeamMembers.includes(player.player_id);
                const isLeader = player.player_id === this.currentRoom.mission_leader;

                // Update selection state
                if (isSelected) {
                    playerSlot.classList.add('selected');
                } else {
                    playerSlot.classList.remove('selected');
                }

                // Update leader state
                if (isLeader) {
                    playerSlot.classList.add('leader');
                } else {
                    playerSlot.classList.remove('leader');
                }
            }
        });
    }

    // Handle player selection for team building
    async selectPlayerForTeam(playerId) {
        if (!this.isCurrentUserMissionLeader()) {
            console.log('Only mission leader can select players');
            return;
        }

        if (this.currentRoom.team_proposal_state !== TEAM_PROPOSAL_STATE.SELECTING) {
            console.log('Not in team selection phase');
            return;
        }

        try {
            const selectedTeamMembers = this.currentRoom.selected_team_members || [];
            const requiredTeamSize = this.getRequiredTeamSize();

            let newSelectedMembers;

            if (selectedTeamMembers.includes(playerId)) {
                // Deselect player
                newSelectedMembers = selectedTeamMembers.filter(id => id !== playerId);
            } else {
                // Select player (if not at limit)
                if (selectedTeamMembers.length >= requiredTeamSize) {
                    console.log('Team size limit reached');
                    return;
                }
                newSelectedMembers = [...selectedTeamMembers, playerId];
            }

            // Update database
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    selected_team_members: newSelectedMembers
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error updating team selection:', error);
                return;
            }

            // Update local state
            this.currentRoom.selected_team_members = newSelectedMembers;

            // Update UI
            this.updateTeamBuildingUI();

            console.log('Team selection updated:', newSelectedMembers);

        } catch (error) {
            console.error('Error selecting player for team:', error);
        }
    }

    // Propose the selected team
    async proposeTeam() {
        if (!this.isCurrentUserMissionLeader()) {
            console.log('Only mission leader can propose team');
            return;
        }

        if (this.currentRoom.team_proposal_state !== TEAM_PROPOSAL_STATE.SELECTING) {
            console.log('Not in team selection phase');
            return;
        }

        const selectedTeamMembers = this.currentRoom.selected_team_members || [];
        const requiredTeamSize = this.getRequiredTeamSize();

        if (selectedTeamMembers.length !== requiredTeamSize) {
            console.log('Team size does not match requirement');
            return;
        }

        try {
            console.log('🏗️ Proposing team:', selectedTeamMembers);

            const currentUser = supabaseAuthSystem.getCurrentUser();

            // Update database
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    team_proposal_state: TEAM_PROPOSAL_STATE.PROPOSED,
                    team_proposer_id: currentUser.id,
                    team_proposal_attempts: (this.currentRoom.team_proposal_attempts || 0) + 1
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                console.error('Error proposing team:', error);
                return;
            }

            // Update local state
            this.currentRoom.team_proposal_state = TEAM_PROPOSAL_STATE.PROPOSED;
            this.currentRoom.team_proposer_id = currentUser.id;
            this.currentRoom.team_proposal_attempts = (this.currentRoom.team_proposal_attempts || 0) + 1;

            // Update UI
            this.updateTeamProposalUI();

            // Show status message
            const selectedPlayerNames = selectedTeamMembers.map(playerId => {
                const player = this.currentRoom.players.find(p => p.player_id === playerId);
                return player?.player_name || 'Unknown';
            });

            this.displayStatusMessage(`Team proposed: ${selectedPlayerNames.join(', ')}`, 'playing');

            console.log('Team proposed successfully');

        } catch (error) {
            console.error('Error proposing team:', error);
        }
    }

    // Update team proposal UI
    updateTeamProposalUI() {
        // Hide team proposal button
        this.updateTeamProposalButton(false);

        // Update player selection UI to show proposed team
        this.updatePlayerSelectionUI();

        // Show voting interface (next phase)
        this.showVotingInterface();
    }

    // Show voting interface
    showVotingInterface() {
        console.log('🗳️ Showing voting interface');

        // Show vote buttons for all players
        const voteTeamBtn = document.getElementById('voteTeamBtn');
        if (voteTeamBtn) {
            voteTeamBtn.style.display = 'block';
        }

        // Update status message
        this.displayStatusMessage('Vote on the proposed team: Accept or Reject', 'playing');
    }

    // Show voting modal (placeholder for now)
    showVotingModal() {
        console.log('🗳️ Showing voting modal (placeholder)');
        // TODO: Implement voting modal
        this.showNotification('Voting functionality coming soon!', 'info');
    }

    // Force refresh status message from database
    async forceRefreshStatusMessage() {
        if (!this.currentRoom) return;

        try {
            console.log('🔄 Force refreshing status message from database...');

            const { data, error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('status_message, status_message_type, status')
                .eq('id', this.currentRoom.id)
                .single();

            if (error) {
                console.error('Error force refreshing status message:', error);
                return;
            }

            console.log('📊 Database status data:', data);
            console.log('📊 Current local status:', {
                status: this.currentRoom.status,
                status_message: this.currentRoom.status_message,
                status_message_type: this.currentRoom.status_message_type
            });

            // Update local cache
            this.currentRoom.status_message = data.status_message;
            this.currentRoom.status_message_type = data.status_message_type;
            this.currentRoom.status = data.status;

            // Force display update
            this.displayStatusMessage(data.status_message, data.status_message_type || 'waiting');

            console.log('✅ Status message force refreshed');

        } catch (error) {
            console.error('Exception force refreshing status message:', error);
        }
    }


    getRoleInformation(player) {
        const roleInfo = {
            merlin: {
                roleName: 'Merlin',
                alignment: 'Good',
                description: 'You are Merlin, the wise wizard. You know the identities of all evil players, but you must be careful not to reveal yourself.',
                specialInfo: `You can see these evil players: ${this.getEvilPlayers().map(p => p.player_name).join(', ')}`
            },
            assassin: {
                roleName: 'Assassin',
                alignment: 'Evil',
                description: 'You are the Assassin. Your goal is to identify and eliminate Merlin at the end of the game.',
                specialInfo: `Your evil teammates are: ${this.getEvilTeammates(player).map(p => p.player_name).join(', ')}`
            },
            percival: {
                roleName: 'Percival',
                alignment: 'Good',
                description: 'You are Percival, the loyal knight. You can see Merlin and Morgana, but you do not know which is which.',
                specialInfo: `You can see these players (one is Merlin, one is Morgana): ${this.getMerlinAndMorgana().map(p => p.player_name).join(', ')}`
            },
            morgana: {
                roleName: 'Morgana',
                alignment: 'Evil',
                description: 'You are Morgana, the evil sorceress. You appear as Merlin to Percival.',
                specialInfo: `Your evil teammates are: ${this.getEvilTeammates(player).map(p => p.player_name).join(', ')}`
            },
            mordred: {
                roleName: 'Mordred',
                alignment: 'Evil',
                description: 'You are Mordred, the evil knight. Merlin cannot see you.',
                specialInfo: `Your evil teammates are: ${this.getEvilTeammates(player).map(p => p.player_name).join(', ')}`
            },
            oberon: {
                roleName: 'Oberon',
                alignment: 'Evil',
                description: 'You are Oberon, the evil sorcerer. You do not know who your evil teammates are.',
                specialInfo: 'You do not know who your evil teammates are.'
            },
            loyal_servant: {
                roleName: 'Loyal Servant of Arthur',
                alignment: 'Good',
                description: 'You are a loyal servant of King Arthur. You have no special abilities, but you must help the good side win.'
            },
            minion: {
                roleName: 'Minion of Mordred',
                alignment: 'Evil',
                description: 'You are a minion of Mordred. You must help the evil side win.',
                specialInfo: `Your evil teammates are: ${this.getEvilTeammates(player).map(p => p.player_name).join(', ')}`
            }
        };

        return roleInfo[player.role] || {
            roleName: 'Unknown',
            alignment: 'Unknown',
            description: 'Your role information is not available.'
        };
    }

    getEvilPlayers() {
        return this.currentRoom.players.filter(p => p.alignment === 'evil' && p.role !== 'mordred');
    }

    getEvilTeammates(player) {
        return this.currentRoom.players.filter(p =>
            p.alignment === 'evil' &&
            p.player_id !== player.player_id &&
            p.role !== 'oberon'
        );
    }

    getMerlinAndMorgana() {
        const merlin = this.currentRoom.players.find(p => p.role === 'merlin');
        const morgana = this.currentRoom.players.find(p => p.role === 'morgana');
        return [merlin, morgana].filter(Boolean);
    }



    async ensureUserProfile(user) {
        console.log('=== ENSURING USER PROFILE EXISTS ===');
        console.log('User:', user);

        try {
            // Check if profile already exists
            const { data: existingProfiles, error: checkError } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id);

            const existingProfile = existingProfiles && existingProfiles.length > 0 ? existingProfiles[0] : null;

            if (existingProfile) {
                console.log('Profile already exists:', existingProfile);
                return true;
            }

            // Create profile if it doesn't exist
            console.log('Creating new profile for user:', user.id);
            const { data: newProfile, error: createError } = await this.supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    display_name: user.profile?.display_name || user.email.split('@')[0],
                    avatar: user.profile?.avatar || '👤',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating profile:', createError);
                throw createError;
            }

            console.log('Profile created successfully:', newProfile);

            // Update user object with new profile
            user.profile = newProfile;

            return true;
        } catch (error) {
            console.error('Exception ensuring user profile:', error);
            throw error;
        }
    }

    async showRoomInterface() {
        console.log('=== SHOWING ROOM INTERFACE ===');

        // Hide the room creation modal
        const roomModal = document.getElementById('roomModal');
        if (roomModal) {
            roomModal.style.display = 'none';
        }

        // Show the game interface (main circle) instead of lobby
        const gameInterface = document.getElementById('gameInterface');
        if (gameInterface) {
            gameInterface.style.display = 'block';
            console.log('Game interface opened');

            // Check if Start Game button exists in this modal
            const startGameBtn = document.getElementById('startGameBtn');
            console.log('Start Game button in gameInterface:', startGameBtn);

            // Initialize the room display with the main circle
            await this.initializeRoomDisplay();

            // Initialize rejection tracker
            this.initializeRejectionTracker();
        } else {
            console.error('gameInterface modal not found!');
        }
    }

    // Performance monitoring function
    getPerformanceMetrics() {
        const now = Date.now();
        const timeSinceLastCheck = now - this.performanceMetrics.lastPerformanceCheck;
        
        return {
            subscriptionCount: this.performanceMetrics.subscriptionCount,
            updateCount: this.performanceMetrics.updateCount,
            timeSinceLastCheck,
            subscriptionStatus: this.subscriptionStatus,
            isSubscribing: this.isSubscribing
        };
    }

    // Comprehensive state logging for debugging
    logStateUpdate(source, operation, details = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            source, // 'real-time-game-rooms', 'real-time-room-players', 'api-call', 'local-update'
            operation, // 'join', 'leave', 'room-update', 'status-change'
            playersBefore: this.currentRoom?.players?.length || 0,
            playersAfter: details.playersAfter || this.currentRoom?.players?.length || 0,
            currentPlayers: this.currentRoom?.current_players || 0,
            roomStatus: this.currentRoom?.status || 'unknown',
            details
        };
        
        this.stateUpdateLog.push(logEntry);
        
        // Keep only recent entries
        if (this.stateUpdateLog.length > this.maxStateLogEntries) {
            this.stateUpdateLog = this.stateUpdateLog.slice(-this.maxStateLogEntries);
        }
        
        console.log('🔍 STATE UPDATE:', logEntry);
        
        // Warn about potential conflicts
        if (this.stateUpdateLog.length > 1) {
            const lastEntry = this.stateUpdateLog[this.stateUpdateLog.length - 2];
            const timeDiff = new Date(logEntry.timestamp) - new Date(lastEntry.timestamp);
            
            if (timeDiff < 100 && lastEntry.source !== source) {
                console.warn('⚠️ RAPID STATE CONFLICT DETECTED:', {
                    source1: lastEntry.source,
                    source2: source,
                    timeDiff: timeDiff + 'ms'
                });
            }
        }
    }

    // Get state update history for debugging
    getStateUpdateHistory() {
        return this.stateUpdateLog;
    }

    // State validation and consistency checks
    async validateRoomState(roomId) {
        try {
            // Get room data from both tables
            const { data: roomData } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('*')
                .eq('id', roomId)
                .single();
                
            const { data: playersData } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', roomId);
            
            if (!roomData || !playersData) {
                console.warn('⚠️ Room state validation failed: Missing data');
                return false;
            }
            
            // Check consistency
            const roomPlayersCount = roomData.current_players || 0;
            const actualPlayersCount = playersData.length;
            const roomPlayersArray = roomData.players || [];
            
            const inconsistencies = [];
            
            if (roomPlayersCount !== actualPlayersCount) {
                inconsistencies.push(`Player count mismatch: room.current_players=${roomPlayersCount}, actual=${actualPlayersCount}`);
            }
            
            if (roomPlayersArray.length !== actualPlayersCount) {
                inconsistencies.push(`Players array length mismatch: room.players.length=${roomPlayersArray.length}, actual=${actualPlayersCount}`);
            }
            
            if (inconsistencies.length > 0) {
                console.warn('⚠️ Room state inconsistencies detected:', inconsistencies);
                
                // Auto-correct the inconsistencies
                await this.correctRoomStateInconsistencies(roomId, roomData, playersData);
                return false;
            }
            
            console.log('✅ Room state validation passed');
            return true;
            
        } catch (error) {
            console.error('Error validating room state:', error);
            return false;
        }
    }
    
    // Auto-correct room state inconsistencies
    async correctRoomStateInconsistencies(roomId, roomData, playersData) {
        console.log('🔧 Auto-correcting room state inconsistencies...');
        
        try {
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    current_players: playersData.length,
                    players: playersData,
                    updated_at: new Date().toISOString(),
                    version: (roomData.version || 0) + 1
                })
                .eq('id', roomId);
                
            if (error) {
                console.error('Failed to correct room state:', error);
            } else {
                console.log('✅ Room state corrected successfully');
            }
        } catch (error) {
            console.error('Exception correcting room state:', error);
        }
    }

    // Centralized function to update game_rooms players array
    async updateGameRoomsPlayersArray(roomId) {
        try {
            // Fetch all current players from room_players table
            const { data: allPlayers, error: playersError } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', roomId);

            if (playersError) {
                console.error('Error fetching players for room update:', playersError);
                return;
            }

            // Rate limiting: Only update if enough time has passed since last update
            const now = Date.now();
            if (now - this.lastUpdateTime < 500) { // 500ms rate limit for DB updates
                return;
            }
            this.lastUpdateTime = now;
            
            console.log('=== UPDATING GAME_ROOMS TABLE ===');
            console.log('Players count:', allPlayers?.length || 0);
            
            // Log database update
            this.logStateUpdate('api-call', 'room-update', {
                playersCount: allPlayers?.length || 0,
                operation: 'update-game-rooms-table'
            });
            
            // Get current room version for optimistic locking
            const { data: room } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('version')
                .eq('id', roomId)
                .single();
            
            const { error: roomUpdateError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    players: allPlayers || [],
                    current_players: allPlayers?.length || 0,
                    updated_at: new Date().toISOString(),
                    version: room?.version ? room.version + 1 : 1
                })
                .eq('id', roomId);

            if (roomUpdateError) {
                console.error('❌ Error updating game_rooms:', roomUpdateError);
            } else {
                console.log('✅ Updated game_rooms table');
            }
        } catch (error) {
            console.error('Exception in updateGameRoomsPlayersArray:', error);
        }
    }

    // Global debugging functions
    debugRoomState() {
        console.log('=== ROOM STATE DEBUG INFO ===');
        console.log('Current room:', this.currentRoom);
        console.log('Is host:', this.isHost);
        console.log('Subscription status:', this.subscriptionStatus);
        console.log('Performance metrics:', this.getPerformanceMetrics());
        console.log('State update history:', this.getStateUpdateHistory());
        console.log('================================');
    }
    
    // Force state validation
    async debugValidateState() {
        if (this.currentRoom) {
            console.log('=== FORCING STATE VALIDATION ===');
            await this.validateRoomState(this.currentRoom.id);
        } else {
            console.log('No current room to validate');
        }
    }

    // Initialize room connection with new robust connection manager
    initializeRoomConnection(roomId) {
        try {
            console.log('🎮 Initializing room connection:', roomId);
            
            // Add connection status indicator
            if (typeof addConnectionStatusIndicator === 'function') {
                addConnectionStatusIndicator();
            }
            if (typeof addConnectionStatusCSS === 'function') {
                addConnectionStatusCSS();
            }
            
            // Use new subscription manager
            if (window.subscriptionManager) {
                window.subscriptionManager.subscribeToRoom(roomId);
            } else {
                console.warn('⚠️ Subscription manager not available, falling back to old method');
                this.subscribeToRoomUpdates(roomId);
            }
            
        } catch (error) {
            console.error('❌ Room connection initialization failed:', error);
            // Fallback to old method
            this.subscribeToRoomUpdates(roomId);
        }
    }

    // Centralized subscription manager with deduplication and debouncing (LEGACY - kept for fallback)
    subscribeToRoomUpdates(roomId) {
        // Prevent duplicate subscription calls
        if (this.isSubscribing) {
            console.log('⚠️ Subscription already in progress, skipping...');
            return;
        }

        // Debounce subscription calls to prevent rapid re-subscriptions
        if (this.subscriptionDebounceTimer) {
            clearTimeout(this.subscriptionDebounceTimer);
        }

        this.subscriptionDebounceTimer = setTimeout(() => {
            this._performSubscription(roomId);
        }, 100); // 100ms debounce
    }

    _performSubscription(roomId) {
        console.log('=== SUBSCRIBING TO REAL-TIME UPDATES ===');
        console.log('Room ID:', roomId);
        
        this.isSubscribing = true;
        this.performanceMetrics.subscriptionCount++;
        
        // Performance monitoring: Warn if too many subscriptions
        if (this.performanceMetrics.subscriptionCount > 5) {
            console.warn('⚠️ High subscription count detected:', this.performanceMetrics.subscriptionCount);
        }
        
        // Clean up any existing subscription first
        if (this.roomSubscription) {
            console.log('Cleaning up existing subscription...');
            this.roomSubscription.unsubscribe();
            this.roomSubscription = null;
        }
        
        // Create comprehensive real-time subscription for all game state changes
        this.roomSubscription = this.supabase
            .channel(`room_${roomId}_${Date.now()}`) // Add timestamp to avoid conflicts
            
            // Subscribe to game_rooms changes (status, messages, game state, etc.)
            // This is the primary subscription that should always work
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_rooms',
                filter: `id=eq.${roomId}`
            }, async (payload) => {
                // Rate limiting: Only process updates if enough time has passed
                const now = Date.now();
                if (now - this.lastUpdateTime < 200) { // 200ms rate limit
                    return;
                }
                this.lastUpdateTime = now;
                
                // Performance monitoring
                this.performanceMetrics.updateCount++;
                if (this.performanceMetrics.updateCount % 10 === 0) {
                    console.log('📊 Performance: Updates processed:', this.performanceMetrics.updateCount);
                }
                
                console.log('=== REAL-TIME: Game room updated ===');
                
                // Log real-time update
                this.logStateUpdate('real-time-game-rooms', 'room-update', {
                    playersCount: payload.new?.current_players || 0,
                    status: payload.new?.status,
                    eventType: 'UPDATE'
                });
                
                await this.handleGameRoomChange(payload);
                
                // Validate state after real-time update
                await this.validateRoomState(roomId);
            })
            
            // Subscribe to room_players changes (player joins/leaves, role updates, etc.)
            // This may fail due to RLS policies, but we'll try it anyway
            .on('postgres_changes', {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'room_players',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                // Rate limiting: Only process updates if enough time has passed
                const now = Date.now();
                if (now - this.lastUpdateTime < 200) { // 200ms rate limit
                    return;
                }
                this.lastUpdateTime = now;
                
                console.log('=== REAL-TIME: Room players changed ===');
                
                // Log real-time update
                this.logStateUpdate('real-time-room-players', payload.eventType.toLowerCase(), {
                    playerId: payload.new?.player_id || payload.old?.player_id,
                    playerName: payload.new?.player_name || payload.old?.player_name,
                    eventType: payload.eventType
                });
                
                this.handleRoomPlayersChange(payload);
            })
            
            // Monitor system events for connection health
            .on('system', {}, (status) => {
                if (status.status === 'error') {
                    console.error('❌ REAL-TIME SYSTEM ERROR:', status.message);
                }
            })
            
            .subscribe((status) => {
                this.subscriptionStatus = status;
                this.isSubscribing = false; // Reset subscription flag
                
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time connected');
                    this.reconnectAttempts = 0;
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('❌ Real-time connection failed');
                    this.handleSubscriptionError();
                } else if (status === 'CLOSED') {
                    this.subscriptionStatus = 'disconnected';
                }
            });
    }

    handleSubscriptionError() {
        console.error('=== HANDLING SUBSCRIPTION ERROR ===');
        this.reconnectAttempts++;

        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.showNotification(`Reconnecting to real-time updates... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'warning');

            // Wait before reconnecting
            setTimeout(() => {
                if (this.currentRoom) {
                    this.subscribeToRoomUpdates(this.currentRoom.id);
                }
            }, 2000 * this.reconnectAttempts); // Exponential backoff
        } else {
            console.error('Max reconnection attempts reached');
            this.showNotification('Real-time connection failed. Please refresh the page.', 'error');
        }
    }

    handleRoomPlayersChange(payload) {
        console.log('=== HANDLING ROOM PLAYERS CHANGE ===');
        console.log('Payload:', payload);

        // Update UI directly from real-time event - no polling needed
        this.updateUIFromRealTimeEvent(payload);
    }

    async updateUIFromRealTimeEvent(payload) {
        console.log('=== UPDATING UI FROM REAL-TIME EVENT ===');
        console.log('Event type:', payload.eventType);
        console.log('Table:', payload.table);
        console.log('New data:', payload.new);
        console.log('Old data:', payload.old);

        // Handle different types of player changes
        if (payload.eventType === 'INSERT') {
            console.log('Player joined:', payload.new.player_name);
            // Player joined - update UI directly without refreshing room data
            // This prevents conflicts with the game_rooms subscription
            this.setupRoomInterface();
            this.positionPlayersOnCircle();
            this.updateRoomStatus();
        } else if (payload.eventType === 'DELETE') {
            console.log('Player left:', payload.old.player_name);
            // Player left - refresh room data
            await this.refreshRoomData();
        } else if (payload.eventType === 'UPDATE') {
            console.log('Player updated:', payload.new.player_name);
            // Player data updated (role, alignment, etc.) - refresh room data
            await this.refreshRoomData();
        }

        // Update UI components
        this.setupRoomInterface();
        this.positionPlayersOnCircle();
        this.updateRoomStatus();
    }

    async handleGameRoomChange(payload) {
        console.log('=== HANDLING COMPREHENSIVE GAME ROOM CHANGE ===');
        console.log('Payload:', payload);
        console.log('New status:', payload.new.status);
        console.log('New status_message:', payload.new.status_message);
        console.log('New status_message_type:', payload.new.status_message_type);
        console.log('New rejection_count:', payload.new.rejection_count);
        console.log('New team_proposal_state:', payload.new.team_proposal_state);
        console.log('New mission_leader:', payload.new.mission_leader);
        console.log('New current_mission:', payload.new.current_mission);
        console.log('New players:', payload.new.players);
        console.log('New current_players:', payload.new.current_players);
        
        // Update local room data with all new information
        this.currentRoom = { ...this.currentRoom, ...payload.new };
        
        // Update UI components based on what changed
        await this.updateUIFromRealTimeChange(payload);
    }

    async updateUIFromRealTimeChange(payload) {
        console.log('=== UPDATING UI FROM REAL-TIME CHANGE ===');

        // Always update status message if it changed
        if (payload.new.status_message) {
            console.log('Updating status message from real-time:', payload.new.status_message);
            this.displayStatusMessage(payload.new.status_message, payload.new.status_message_type || 'waiting');
        }

        // Update rejection counter if it changed
        if (payload.new.rejection_count !== undefined) {
            console.log('Updating rejection counter from real-time:', payload.new.rejection_count);
            this.updateRejectionCounter(payload.new.rejection_count);
        }
        
        // Update players if the players array changed
        if (payload.new.players && Array.isArray(payload.new.players)) {
            console.log('=== REAL-TIME: Players array updated ===');
            console.log('New players:', payload.new.players);
            console.log('Current players:', this.currentRoom.players);
            
            // Log the state change
            this.logStateUpdate('real-time-game-rooms', 'players-update', {
                playersAfter: payload.new.players.length,
                playersArray: payload.new.players
            });
            
            // Update local room data with new players
            this.currentRoom.players = payload.new.players;
            
            // Force UI update to show new players
            this.setupRoomInterface();
            this.positionPlayersOnCircle();
            this.updateRoomStatus();
        }

        // Update team building UI if team proposal state changed
        if (payload.new.team_proposal_state && payload.new.team_proposal_state !== TEAM_PROPOSAL_STATE.NONE) {
            console.log('Updating team building UI from real-time:', payload.new.team_proposal_state);
            this.updateTeamBuildingUI();
        }

        // Handle role distribution status change
        if (payload.new.status === GAME_STATUS.ROLE_DISTRIBUTION) {
            console.log('=== REAL-TIME: Role distribution detected ===');

            // Hide start game button for non-host players
            const startGameBtn = document.getElementById('startGameBtn');
            if (startGameBtn) {
                startGameBtn.style.display = 'none';
            }

            // Check and show role information from database
            this.checkAndShowRoleInformationFromDatabase();
        }

        // Handle playing status change
        if (payload.new.status === GAME_STATUS.PLAYING) {
            console.log('=== REAL-TIME: Game playing status detected ===');
            this.updateTeamBuildingUI();
        }

        // Update room display with fresh data
        this.setupRoomInterface();
        this.positionPlayersOnCircle();
        this.updateRoomStatus();
    }

    async refreshRoomData() {
        if (!this.currentRoom) return;

        try {
            console.log('=== REFRESHING ROOM DATA ===');

            // Fetch updated room data with players and state information
            const { data: room, error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select(`
                    *,
                    room_players (
                        id,
                        player_id,
                        player_name,
                        player_avatar,
                        is_host,
                        joined_at,
                        role,
                        alignment,
                        has_role_seen
                    )
                `)
                .eq('id', this.currentRoom.id)
                .single();

            if (error) {
                console.error('Error refreshing room data:', error);
                return;
            }

            console.log('Updated room data:', room);

            // Check if there are actual changes before updating
            const newPlayers = room.room_players || [];
            const currentPlayers = this.currentRoom.players || [];
            const playersChanged = JSON.stringify(newPlayers) !== JSON.stringify(currentPlayers);
            const statusChanged = room.status !== this.currentRoom.status;

            // Update current room
            this.currentRoom = room;
            this.currentRoom.players = newPlayers;
            this.currentRoom.current_players = newPlayers.length;

            // CRITICAL FIX: Update host status when room data is refreshed
            const currentUser = supabaseAuthSystem.getCurrentUser();
            if (currentUser) {
                this.isHost = room.host_id === currentUser.id;
                console.log('Updated isHost status:', this.isHost, 'for user:', currentUser.email);
            }

            // Only update display if there are actual changes
            if (playersChanged || statusChanged) {
                console.log('Room data changed, updating display');
                this.updateRoomDisplay();

            // Check if we need to show role information
            if (room.status === GAME_STATUS.ROLE_DISTRIBUTION) {
                console.log('Room status is ROLE_DISTRIBUTION, showing role information');
                console.log('Current user:', supabaseAuthSystem.getCurrentUser()?.email);
                this.showRoleInformation();
            }
            } else {
                console.log('No changes detected, skipping display update');

                // Even if no changes, check if we need to show role information
                if (room.status === GAME_STATUS.ROLE_DISTRIBUTION) {
                    console.log('No changes but room status is ROLE_DISTRIBUTION, showing role information');
                    console.log('Current user:', supabaseAuthSystem.getCurrentUser()?.email);
                    this.showRoleInformation();
                }
            }

        } catch (error) {
            console.error('Exception refreshing room data:', error);
        }
    }

    // REMOVED: All polling functions - using real-time subscriptions only

    async checkForExistingRoom() {
        console.log('=== CHECKING FOR EXISTING ROOM ===');

        // Check if user is logged in
        if (!supabaseAuthSystem.isUserLoggedIn()) {
            console.log('User not logged in, skipping room check');
            return;
        }

        const user = supabaseAuthSystem.getCurrentUser();
        if (!user) {
            console.log('No user data available, skipping room check');
            return;
        }

        try {
            console.log('Checking for existing room for user:', user.id);

            // Find the LATEST room the user is in (ordered by joined_at DESC)
            const { data: playerRooms, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select(`
                    *,
                    game_rooms (
                        id,
                        code,
                        status,
                        host_id,
                        host_name,
                        max_players,
                        current_players,
                        created_at,
                        started_at,
                        status_message,
                        status_message_type,
                        rejection_count,
                        team_proposal_state,
                        selected_team_members,
                        team_proposer_id,
                        team_proposal_attempts,
                        current_mission,
                        voting_leader_id,
                        is_voting_phase
                    )
                `)
                .eq('player_id', user.id)
                .order('joined_at', { ascending: false }); // Get the LATEST room first

            if (error) {
                console.error('Error checking for existing room:', error);
                return;
            }

            if (!playerRooms || playerRooms.length === 0) {
                console.log('User is not in any room');
                return;
            }

            // Find the latest active room (not finished)
            for (const playerRoom of playerRooms) {
                const room = playerRoom.game_rooms;
                if (!room) {
                    console.log('No room data for player room:', playerRoom.room_id);
                    continue;
                }

                console.log('Checking room:', room.id, 'Status:', room.status, 'Joined at:', playerRoom.joined_at);

                // Check if room is in any active status (not finished)
                if (room.status !== GAME_STATUS.FINISHED) {
                    console.log('Found latest active room:', room);

                    // ALWAYS fetch complete fresh data from database
                    const freshRoomData = await this.fetchCompleteRoomState(room.id);
                    if (!freshRoomData) {
                        console.error('Failed to fetch fresh room data for latest room');
                        continue;
                    }

                    // Set current room data with fresh data
                    this.currentRoom = freshRoomData;
                    this.currentRoom.players = freshRoomData.room_players || [];
                    this.currentRoom.current_players = this.currentRoom.players.length;
                    this.isHost = playerRoom.is_host;

                    // Show room interface
                    await this.showRoomInterface();

                    // Subscribe to real-time updates with new connection manager
                    this.initializeRoomConnection(this.currentRoom.id);

                    // Show notification
                    this.showNotification(`Welcome back to room ${this.currentRoom.code}!`, 'success');

                    // Check if room is already in role distribution status
                    if (freshRoomData.status === GAME_STATUS.ROLE_DISTRIBUTION) {
                        console.log('Room is already in role distribution, showing role information');
                        this.showRoleInformation();
                    }

                    // Check if room is in playing state and show appropriate UI
                    if (freshRoomData.status === GAME_STATUS.PLAYING) {
                        console.log('Room is in playing state, restoring game UI');
                        this.updateTeamBuildingUI();
                    }

                    console.log('Successfully restored LATEST room state with fresh data');
                    return; // Exit after finding the latest active room
                } else {
                    console.log('Room is finished, current status:', room.status);
                }
            }

            console.log('No active rooms found for user');

        } catch (error) {
            console.error('Exception checking for existing room:', error);
        }
    }
}

// ✅ PROPER GLOBAL INITIALIZATION
console.log('🔧 Initializing supabaseRoomsSystem...');

// Wait for DOM and auth system to be ready
const initializeRoomsSystem = () => {
  if (window.supabaseAuthSystem) {
    window.supabaseRoomsSystem = new SupabaseRoomSystem(window.supabaseAuthSystem);
    console.log('✅ supabaseRoomsSystem initialized and available globally');
    
    // Expose it explicitly with alternative reference
    window.roomsSystem = window.supabaseRoomsSystem;
    
    // Expose the class globally for manual initialization if needed
    window.SupabaseRoomSystem = SupabaseRoomSystem;
    
    // Dispatch event to notify other scripts
    window.dispatchEvent(new CustomEvent('roomsSystemReady', {
      detail: { roomsSystem: window.supabaseRoomsSystem }
    }));
    
    // Setup event listeners after initialization
    setTimeout(() => {
      if (window.supabaseRoomsSystem && typeof window.supabaseRoomsSystem.setupEventListeners === 'function') {
        window.supabaseRoomsSystem.setupEventListeners();
      }
    }, 100);
    
  } else {
    console.warn('⚠️ supabaseAuthSystem not ready, retrying...');
    setTimeout(initializeRoomsSystem, 100); // Retry after 100ms
  }
};

// Enhanced initialization with debug functions
const enhancedInitializeRoomsSystem = () => {
  initializeRoomsSystem();
  // Setup debug functions after initialization
  setTimeout(() => {
    if (window.setupDebugFunctions) {
      window.setupDebugFunctions();
    }
  }, 100);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhancedInitializeRoomsSystem);
} else {
  enhancedInitializeRoomsSystem();
}

// Expose debugging functions globally (will be set after initialization)
window.setupDebugFunctions = () => {
    if (window.supabaseRoomsSystem) {
        window.debugRoomState = () => window.supabaseRoomsSystem.debugRoomState();
        window.debugValidateState = () => window.supabaseRoomsSystem.debugValidateState();
        window.getStateHistory = () => window.supabaseRoomsSystem.getStateUpdateHistory();
        console.log('✅ Debug functions exposed globally');
    }
};

// Add debug function for rooms system
window.debugRoomsSystem = () => {
    console.log('🔍 Debugging rooms system:');
    console.log('supabaseRoomsSystem exists:', !!window.supabaseRoomsSystem);
    console.log('createRoom method exists:', !!window.supabaseRoomsSystem?.createRoom);
    console.log('setupEventListeners method exists:', !!window.supabaseRoomsSystem?.setupEventListeners);
    
    if (window.supabaseRoomsSystem) {
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(window.supabaseRoomsSystem))
            .filter(name => name !== 'constructor');
        console.log('Available methods:', methods);
        console.log('System object:', window.supabaseRoomsSystem);
    }
    
    // Check for buttons
    const createRoomBtn = document.getElementById('createRoomBtn');
    const refreshRoomsBtn = document.getElementById('refreshRoomsBtn');
    console.log('createRoomBtn found:', !!createRoomBtn);
    console.log('refreshRoomsBtn found:', !!refreshRoomsBtn);
};
// Debug functions setup is now handled in enhancedInitializeRoomsSystem above

// Export the class for module usage
export default SupabaseRoomSystem;
