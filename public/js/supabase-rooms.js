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
        this.roomSubscription = null;
        this.lobbyPolling = null; // For compatibility with old room system
        this.roleInformationShown = false; // Flag to prevent multiple role popups
        this.showingRoleInformation = false; // Flag to prevent multiple calls to showRoleInformation
        
        // Fast polling system for real-time updates
        this.fastPolling = null;
        this.pollingInterval = 1000; // 1 second polling
        this.lastStateHash = null;
        this.pollingActive = false;
        
        // Add a small delay to ensure DOM is fully ready
        console.log('Setting up setTimeout for event listeners...');
        setTimeout(() => {
            console.log('setTimeout callback executing...');
            console.log('About to call setupEventListeners...');
            try {
                console.log('Calling setupEventListeners method...');
        this.setupEventListeners();
                console.log('setupEventListeners completed successfully');
                
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
        
        // Read form data
        const roomConfig = this.getRoomConfigFromForm();
        if (!roomConfig) {
            this.showNotification('Please fill in all required fields!', 'error');
            return false;
        }
        
        console.log('Room config from form:', roomConfig);
        
        // Generate room code
        roomConfig.code = this.generateRoomCode();
        
        // Create room in database
        return await this.createRoomInDatabase(roomConfig);
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
        try {
            const user = supabaseAuthSystem.getCurrentUser();
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

            // Add host as first player
            await this.addPlayerToRoom(room.id, user, true);

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
            this.currentRoom = room;
            } else {
                this.currentRoom = completeRoom;
                this.currentRoom.players = completeRoom.room_players || [];
                this.currentRoom.current_players = this.currentRoom.players.length;
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
            
            // Start fast polling for real-time updates
            this.startFastPolling();

            return true;
        } catch (error) {
            this.showNotification('Failed to create room.', 'error');
            return false;
        }
    }

    async joinRoomByCode(roomCode) {
        try {
            const user = supabaseAuthSystem.getCurrentUser();
            if (!user) {
                this.showNotification('Please login to join a room!', 'error');
                return false;
            }

            // Find room by code (allow joining rooms in any state for rejoining)
            const { data: room, error: roomError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('*')
                .eq('code', roomCode.toUpperCase())
                .single();

            if (roomError || !room) {
                this.showNotification('Room not found!', 'error');
                return false;
            }

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
            const { data: existingPlayer } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', room.id)
                .eq('player_id', user.id)
                .single();

            if (existingPlayer) {
                this.showNotification('You are already in this room!', 'info');
                this.currentRoom = room;
                this.isHost = room.host_id === user.id;
                await this.showRoomInterface();
                this.startFastPolling();
                return true;
            }

            // Add player to room
            await this.addPlayerToRoom(room.id, user, false);

            this.currentRoom = room;
            this.isHost = room.host_id === user.id;

            this.showNotification(`Joined room ${roomCode}!`, 'success');
            await this.showRoomInterface();
            
            // Start fast polling for real-time updates
            this.startFastPolling();

            return true;
        } catch (error) {
            this.showNotification('Failed to join room.', 'error');
            return false;
        }
    }

    async addPlayerToRoom(roomId, user, isHost = false) {
        // Ensure user profile exists before adding to room
        await this.ensureUserProfile(user);
        
        // Check if room has no host (host_id is null) and get original host info
        const { data: room } = await this.supabase
            .from(TABLES.GAME_ROOMS)
            .select('host_id, current_players, original_host_id')
            .eq('id', roomId)
            .single();
            
        // Determine if this player should become host
        if (room && !room.host_id) {
            // Room has no current host
            if (room.current_players === 0) {
                // No players left, first rejoining player becomes host
                isHost = true;
                console.log('Room has no host and no players, making first rejoining player the new host');
            } else if (room.original_host_id === user.id) {
                // Original host is rejoining, they get priority to become host again
                isHost = true;
                console.log('Original host is rejoining, giving them host status back');
            }
        } else if (room && room.original_host_id === user.id && room.host_id !== user.id) {
            // Original host is rejoining but room already has a host
            // Give original host priority and transfer host status
            isHost = true;
            console.log('Original host rejoining, transferring host status back to them');
        }
        
        const { error } = await this.supabase
            .from(TABLES.ROOM_PLAYERS)
            .insert({
                room_id: roomId,
                player_id: user.id,
                player_name: user.profile?.display_name || user.email,
                player_avatar: user.profile?.avatar || '👤',
                is_host: isHost
            });

        if (error) {
            console.error('Error adding player to room:', error);
            throw error;
        }
        
        // If this player became the new host, update the room's host_id
        if (isHost) {
            if (room && !room.host_id) {
                // Room had no host, set this player as host
                await this.supabase
                    .from(TABLES.GAME_ROOMS)
                    .update({
                        host_id: user.id,
                        host_name: user.profile?.display_name || user.email
                    })
                    .eq('id', roomId);
                    
                console.log('Updated room host_id to new rejoining player');
            } else if (room && room.host_id !== user.id) {
                // Room already has a host, but original host is rejoining
                // Transfer host status to original host
                await this.supabase
                    .from(TABLES.GAME_ROOMS)
                    .update({
                        host_id: user.id,
                        host_name: user.profile?.display_name || user.email
                    })
                    .eq('id', roomId);
                
                // Remove host status from previous host
                await this.supabase
                    .from(TABLES.ROOM_PLAYERS)
                    .update({ is_host: false })
                    .eq('room_id', roomId)
                    .eq('is_host', true);
                    
                console.log('Transferred host status back to original host');
            }
        }
    }

    async leaveRoom() {
        if (!this.currentRoom) return;

        try {
            const user = supabaseAuthSystem.getCurrentUser();
            
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
                
                // Update room's current_players count
                await this.supabase
                    .from(TABLES.GAME_ROOMS)
                    .update({ current_players: newPlayerCount })
                    .eq('id', this.currentRoom.id);
                
                console.log(`Player left room. New player count: ${newPlayerCount}`);
            }

            // If host is leaving, transfer host or delete room
            const isHost = await this.isCurrentUserHost();
            if (isHost) {
                await this.handleHostLeaving();
            }

            // Stop fast polling
            this.stopFastPolling();
            
            // Unsubscribe from room updates (backup)
            if (this.roomSubscription) {
                this.roomSubscription.unsubscribe();
                this.roomSubscription = null;
            }

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
                        host_name: newHost.player_name
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
                        status: 'waiting'
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
            
            // Preserve the status message that was just updated locally
            const preservedStatusMessage = this.currentRoom.status_message;
            const preservedStatusMessageType = this.currentRoom.status_message_type;

            this.currentRoom = room;
            this.currentRoom.players = players;
            this.currentRoom.current_players = players.length; // Update player count
            
            // Restore the preserved status message if it was more recent
            if (preservedStatusMessage && preservedStatusMessage !== room.status_message) {
                console.log('Preserving local status message:', preservedStatusMessage);
                this.currentRoom.status_message = preservedStatusMessage;
                this.currentRoom.status_message_type = preservedStatusMessageType;
            }

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
        
        // Check if role information has already been shown (in memory or database)
        if (this.roleInformationShown || await this.hasSeenRoleInformation()) {
            console.log('Role information already shown, skipping');
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

    // Helper methods for database-based role seen tracking
    async hasSeenRoleInformation() {
        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser || !this.currentRoom) return false;
        
        try {
            const { data, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('has_role_seen')
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', currentUser.id)
                .single();
            
            if (error) {
                console.error('Error checking role seen status:', error);
                return false;
            }
            
            return data?.has_role_seen || false;
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
            const { data: readData, error: readError } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', currentUser.id)
                .single();
            
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
                const { data: verifyData, error: verifyError } = await this.supabase
                    .from(TABLES.ROOM_PLAYERS)
                    .select('has_role_seen')
                    .eq('room_id', this.currentRoom.id)
                    .eq('player_id', currentUser.id)
                    .single();
                
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
            const { data, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('is_host')
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', currentUser.id)
                .single();
            
            if (error) {
                console.error('Error checking host status:', error);
                return false;
            }
            
            console.log('Using database query for host check:', data?.is_host);
            return data?.is_host || false;
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

    // Fast polling system for real-time updates (restored working version)
    startFastPolling() {
        if (this.pollingActive || !this.currentRoom) return;
        
        console.log('Starting fast polling for room:', this.currentRoom.id);
        this.pollingActive = true;
        this.pollingInterval = 1000; // 1 second polling
        
        const poll = async () => {
            if (!this.pollingActive || !this.currentRoom) return;
            
            try {
                await this.fastRoomStateCheck();
            } catch (error) {
                console.error('Error in fast polling:', error);
            }
            
            // Schedule next poll
            if (this.pollingActive) {
                this.fastPolling = setTimeout(poll, this.pollingInterval);
            }
        };
        
        // Start polling immediately
        poll();
    }

    stopFastPolling() {
        console.log('Stopping smart polling');
        this.pollingActive = false;
        if (this.fastPolling) {
            clearTimeout(this.fastPolling);
            this.fastPolling = null;
        }
    }


    // Fast room state check - restored working version
    async fastRoomStateCheck() {
        if (!this.currentRoom) return;
        
        try {
            // Only fetch essential fields for speed
            const { data, error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select(`
                    id,
                    status,
                    current_players,
                    max_players,
                    status_message,
                    status_message_type,
                    rejection_count,
                    is_voting_phase,
                    mission_leader,
                    current_mission,
                    team_proposal_state,
                    selected_team_members,
                    team_proposer_id,
                    team_proposal_attempts,
                    state_updated_at,
                    room_players (
                        id,
                        player_id,
                        player_name,
                        player_avatar,
                        is_host,
                        role,
                        alignment,
                        has_role_seen
                    )
                `)
                .eq('id', this.currentRoom.id)
                .single();
            
            if (error) {
                console.error('Error in fast room state check:', error);
                return;
            }
            
            // Create a hash of the current state to detect changes
            const stateHash = this.createStateHash(data);
            
            // Check for status message changes specifically
            if (data.status_message !== this.currentRoom.status_message) {
                console.log('=== STATUS MESSAGE CHANGE DETECTED IN POLLING ===');
                console.log('Old message:', this.currentRoom.status_message);
                console.log('New message:', data.status_message);
                console.log('Old type:', this.currentRoom.status_message_type);
                console.log('New type:', data.status_message_type);
                console.log('Current user:', supabaseAuthSystem.getCurrentUser()?.email);
                
                // Update local cache first
                this.currentRoom.status_message = data.status_message;
                this.currentRoom.status_message_type = data.status_message_type;
                
                // Immediately update the status message display
                console.log('Immediately updating status message display');
                this.displayStatusMessage(data.status_message, data.status_message_type || 'waiting');
            } else {
                console.log('No status message change detected');
                console.log('Current message:', this.currentRoom.status_message);
                console.log('Database message:', data.status_message);
            }
            
            // Only update if state actually changed
            if (stateHash !== this.lastStateHash) {
                console.log('Room state changed, updating display');
                this.lastStateHash = stateHash;
                
                // Update local room data
                this.currentRoom.status = data.status;
                this.currentRoom.current_players = data.current_players;
                this.currentRoom.status_message = data.status_message;
                this.currentRoom.status_message_type = data.status_message_type;
                this.currentRoom.rejection_count = data.rejection_count || 0;
                this.currentRoom.is_voting_phase = data.is_voting_phase || false;
                this.currentRoom.mission_leader = data.mission_leader;
                this.currentRoom.current_mission = data.current_mission || 1;
                this.currentRoom.team_proposal_state = data.team_proposal_state || TEAM_PROPOSAL_STATE.NONE;
                this.currentRoom.selected_team_members = data.selected_team_members || [];
                this.currentRoom.team_proposer_id = data.team_proposer_id;
                this.currentRoom.team_proposal_attempts = data.team_proposal_attempts || 0;
                this.currentRoom.players = data.room_players || [];
                
                // Update rejection tracker UI (always update from database)
                this.updateRejectionCounter(this.currentRoom.rejection_count || 0);
                
                // Update team building UI if in team building phase
                if (this.currentRoom.team_proposal_state !== TEAM_PROPOSAL_STATE.NONE) {
                    this.updateTeamBuildingUI();
                }
                
                // Update host status
                const currentUser = supabaseAuthSystem.getCurrentUser();
                if (currentUser) {
                    this.isHost = data.room_players?.find(p => p.player_id === currentUser.id)?.is_host || false;
                }
                
                // Update UI
                await this.updateRoomDisplay();
                
                // Check for role distribution
                if (data.status === 'role_distribution' && !this.roleInformationShown) {
                    this.showRoleInformation();
                }
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
                    status_message_type: statusMessageType
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
                    status_message_type: type
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

    // Display status message in UI
    displayStatusMessage(message, messageType) {
        let statusMessage = document.getElementById('statusMessage');
        console.log('=== DISPLAYING STATUS MESSAGE ===');
        console.log('Status message element:', statusMessage);
        console.log('Message:', message);
        console.log('Message type:', messageType);
        console.log('Current user:', supabaseAuthSystem.getCurrentUser()?.email);
        console.log('Current room status:', this.currentRoom?.status);
        console.log('Current room status_message:', this.currentRoom?.status_message);
        
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
            
            console.log('Status message updated:', {
                textContent: statusMessage.textContent,
                className: statusMessage.className,
                display: statusMessage.style.display,
                visibility: statusMessage.style.visibility,
                opacity: statusMessage.style.opacity
            });
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
            const { data: existingProfile, error: checkError } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

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

    subscribeToRoomUpdates(roomId) {
        console.log('=== SUBSCRIBING TO ROOM UPDATES ===');
        console.log('Room ID:', roomId);
        
        // Subscribe to room_players changes for this room
        this.roomSubscription = this.supabase
            .channel(`room_${roomId}`)
            .on('postgres_changes', {
                event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
                schema: 'public',
                table: 'room_players',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                console.log('Room players changed:', payload);
                this.handleRoomPlayersChange(payload);
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_rooms',
                filter: `id=eq.${roomId}`
            }, async (payload) => {
                console.log('=== REAL-TIME ROOM STATUS CHANGE RECEIVED ===');
                console.log('Room status changed:', payload);
                console.log('Current user:', supabaseAuthSystem.getCurrentUser()?.email);
                console.log('Payload new status:', payload.new.status);
                console.log('Payload new status_message:', payload.new.status_message);
                await this.handleRoomStatusChange(payload);
            })
            .subscribe();

        // Note: Using smart polling instead of backup polling for better performance
    }

    handleRoomPlayersChange(payload) {
        console.log('=== HANDLING ROOM PLAYERS CHANGE ===');
        console.log('Payload:', payload);
        
        // Refresh the room data and update display
        this.refreshRoomData();
    }

    async handleRoomStatusChange(payload) {
        console.log('=== HANDLING ROOM STATUS CHANGE ===');
        console.log('Payload:', payload);
        console.log('New status:', payload.new.status);
        console.log('New status_message:', payload.new.status_message);
        console.log('New status_message_type:', payload.new.status_message_type);
        console.log('GAME_STATUS.ROLE_DISTRIBUTION:', GAME_STATUS.ROLE_DISTRIBUTION);
        
        // Update local room data
        this.currentRoom = payload.new;
        
        // Always update status message display when room data changes
        if (payload.new.status_message) {
            console.log('Updating status message from real-time update:', payload.new.status_message);
            this.displayStatusMessage(payload.new.status_message, payload.new.status_message_type || 'waiting');
        }
        
        // Check if game started (role distribution)
        if (payload.new.status === GAME_STATUS.ROLE_DISTRIBUTION) {
            console.log('Game started! Role distribution beginning...');
            
            // Button overlay no longer created, so no need to remove it
            
            // Hide start game button for non-host players
            const startGameBtn = document.getElementById('startGameBtn');
            if (startGameBtn) {
                startGameBtn.style.display = 'none';
            }
            
            // Trigger immediate state update for all players
            await this.immediateRoomStateUpdate();
            
            // Show role information to current player
            this.showRoleInformation();
        } else {
            console.log('Room status is not ROLE_DISTRIBUTION, current status:', payload.new.status);
        }
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

    startRoomPolling(roomId) {
        // Poll every 30 seconds as backup (much less frequent)
        // Real-time subscriptions should handle most updates
        this.roomPolling = setInterval(() => {
            this.refreshRoomData();
        }, 30000);
    }

    stopRoomPolling() {
        if (this.roomPolling) {
            clearInterval(this.roomPolling);
            this.roomPolling = null;
        }
        
        if (this.roomSubscription) {
            this.supabase.removeChannel(this.roomSubscription);
            this.roomSubscription = null;
        }
    }

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
            
            // Find if user is in any room (without join)
            const { data: playerRooms, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('player_id', user.id);

            if (error) {
                console.error('Error checking for existing room:', error);
                return;
            }

            if (!playerRooms || playerRooms.length === 0) {
                console.log('User is not in any room');
                return;
            }

            // Check each room the user is in
            for (const playerRoom of playerRooms) {
                console.log('Checking room:', playerRoom.room_id);
                
                // Get the room data
                const { data: room, error: roomError } = await this.supabase
                    .from(TABLES.GAME_ROOMS)
                    .select('*')
                    .eq('id', playerRoom.room_id)
                    .single();
                
                if (roomError) {
                    console.error('Error fetching room data:', roomError);
                    continue;
                }
                
                // Check if room is in any active status (not finished)
                if (room.status !== GAME_STATUS.FINISHED) {
                    console.log('Found active room:', room);
                    
                    // Set current room data
                    this.currentRoom = room;
                    this.isHost = playerRoom.is_host;
                    
                    // Fetch room players separately
                    const { data: roomPlayers, error: playersError } = await this.supabase
                        .from(TABLES.ROOM_PLAYERS)
                        .select('*')
                        .eq('room_id', this.currentRoom.id);
                    
                    if (playersError) {
                        console.error('Error fetching room players:', playersError);
                        this.currentRoom.players = [];
                    } else {
                        this.currentRoom.players = roomPlayers || [];
                    }
                    
                    this.currentRoom.current_players = this.currentRoom.players.length;
                    
                    // Show room interface
                    await this.showRoomInterface();
                    
                    // Subscribe to room updates
                    this.subscribeToRoomUpdates(this.currentRoom.id);
                    
                    // Show notification
                    this.showNotification(`Welcome back to room ${this.currentRoom.code}!`, 'success');
                    
                    // Check if room is already in role distribution status
                    if (this.currentRoom.status === GAME_STATUS.ROLE_DISTRIBUTION) {
                        console.log('Room is already in role distribution, showing role information');
                        this.showRoleInformation();
                    }
                    
                    // Check if room is in playing state and show appropriate UI
                    if (this.currentRoom.status === GAME_STATUS.PLAYING) {
                        console.log('Room is in playing state, restoring game UI');
                        this.updateTeamBuildingUI();
                    }
                    
                    console.log('Successfully restored room state');
                    return; // Exit after finding the first active room
                } else {
                    console.log('Room is finished, current status:', room.status);
                }
            }
            
        } catch (error) {
            console.error('Exception checking for existing room:', error);
        }
    }
}

// Initialize the room system
const supabaseRoomSystem = new SupabaseRoomSystem();

// Make it globally available
window.supabaseRoomSystem = supabaseRoomSystem;

export default supabaseRoomSystem;

