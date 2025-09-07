// Supabase Room Management System
console.log('=== LOADING SUPABASE ROOMS SYSTEM ===');
console.log('Script is being executed!');
import { supabaseAuthSystem } from './supabase-auth.js';
import { TABLES, GAME_STATUS } from '../supabase-config.js';
console.log('Supabase rooms system imports loaded');

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
        
        // Add a small delay to ensure DOM is fully ready
        console.log('Setting up setTimeout for event listeners...');
        setTimeout(() => {
            console.log('setTimeout callback executing...');
            console.log('About to call setupEventListeners...');
            try {
                console.log('Calling setupEventListeners method...');
        this.setupEventListeners();
                console.log('setupEventListeners completed successfully');
                
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
                
                roomCard.innerHTML = `
                    <div class="room-info">
                        <div style="font-weight: bold; color: #ffd700;">Room ${room.code}</div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 0.9em;">
                            Host: ${host ? host.player_name : room.host_name} | 
                            Players: ${playerCount}/${room.max_players}
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
                    max_players: roomConfig.maxPlayers,
                    roles: roomConfig.roles,
                    lady_of_lake: roomConfig.ladyOfLake,
                    chaos_for_merlin: roomConfig.chaosForMerlin,
                    status: GAME_STATUS.WAITING
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
            this.showRoomInterface();
            
            // Subscribe to room updates
            this.subscribeToRoomUpdates(room.id);

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

            // Find room by code
            const { data: room, error: roomError } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('*')
                .eq('code', roomCode.toUpperCase())
                .eq('status', GAME_STATUS.WAITING)
                .single();

            if (roomError || !room) {
                this.showNotification('Room not found or game already started!', 'error');
                return false;
            }

            // Check if room is full
            if (room.current_players >= room.max_players) {
                this.showNotification('Room is full!', 'error');
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
                this.showRoomInterface();
                this.subscribeToRoomUpdates(room.id);
                return true;
            }

            // Add player to room
            await this.addPlayerToRoom(room.id, user, false);

            this.currentRoom = room;
            this.isHost = room.host_id === user.id;

            this.showNotification(`Joined room ${roomCode}!`, 'success');
            this.showRoomInterface();
            
            // Subscribe to room updates
            this.subscribeToRoomUpdates(room.id);

            return true;
        } catch (error) {
            this.showNotification('Failed to join room.', 'error');
            return false;
        }
    }

    async addPlayerToRoom(roomId, user, isHost = false) {
        // Ensure user profile exists before adding to room
        await this.ensureUserProfile(user);
        
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
            }

            // If host is leaving, transfer host or delete room
            if (this.isHost) {
                await this.handleHostLeaving();
            }

            // Unsubscribe from room updates
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
            } else {
                // No players left, delete room
                await this.supabase
                    .from(TABLES.GAME_ROOMS)
                    .delete()
                    .eq('id', this.currentRoom.id);
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

            this.currentRoom = room;
            this.currentRoom.players = players;
            this.currentRoom.current_players = players.length; // Update player count

            // Update UI
            this.setupRoomInterface();
            this.positionPlayersOnCircle();
            this.updateRoomStatus();
        } catch (error) {
            console.error('Error updating room display:', error);
        }
    }

    async getActiveRooms() {
        try {
            const { data: rooms, error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .select('*')
                .eq('status', GAME_STATUS.WAITING)
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Error fetching active rooms:', error);
                return [];
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

    initializeRoomDisplay() {
        this.setupRoomInterface();
        this.positionPlayersOnCircle();
        this.updateRoomStatus();
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
        
        // Update game status panel
        const gameStatusPanel = document.getElementById('gameStatusPanel');
        if (gameStatusPanel) {
            gameStatusPanel.innerHTML = `
                <div class="status-item">
                    <span class="status-label">Room Status:</span>
                    <span class="status-value">Waiting for players</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Players:</span>
                    <span class="status-value">${room.current_players}/${room.max_players}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Room Code:</span>
                    <span class="status-value">${room.code}</span>
                </div>
            `;
        }
    }

    positionPlayersOnCircle() {
        const room = this.currentRoom;
        if (!room || !room.players) return;
        
        // Clear existing players
        const gameTable = document.getElementById('gameTable');
        if (gameTable) {
            gameTable.innerHTML = '';
        }
        
        // Circle dimensions (game table is 600x600px)
        const circleWidth = 600;
        const circleHeight = 600;
        const centerX = circleWidth / 2; // 300px
        const centerY = circleHeight / 2; // 300px
        const radius = (circleWidth / 2) - 60; // 240px (leave space for player slots)
        
        // Position actual players on the circle
        room.players.forEach((player, index) => {
            // Calculate angle: start from top (12 o'clock) and distribute evenly
            const angle = (index * 2 * Math.PI) / room.players.length - Math.PI / 2;
            
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot';
            playerSlot.style.left = `${x - 40}px`; // Center the slot (slot width is 80px)
            playerSlot.style.top = `${y - 55}px`; // Center the slot (slot height is 110px)
            playerSlot.setAttribute('data-player-id', player.player_id);
            
            playerSlot.innerHTML = `
                <div class="player-avatar">${player.player_avatar}</div>
                <div class="player-name">${player.player_name}</div>
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
            
            const emptySlot = document.createElement('div');
            emptySlot.className = 'player-slot empty-slot';
            emptySlot.style.left = `${x - 40}px`; // Center the slot
            emptySlot.style.top = `${y - 55}px`; // Center the slot
            
            emptySlot.innerHTML = `
                <div class="player-avatar">?</div>
                <div class="player-name">Waiting...</div>
            `;
            
            if (gameTable) {
                gameTable.appendChild(emptySlot);
            }
        }
    }

    updateRoomStatus() {
        const room = this.currentRoom;
        if (!room) return;
        
        const isRoomFull = room.current_players >= room.max_players;
        
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
            // Remove any existing button overlay
            const buttonContainer = document.getElementById('startGameButtonContainer');
            if (buttonContainer) {
                buttonContainer.remove();
            }
            return;
        }
        
        // Update start game button
        const startGameBtn = document.getElementById('startGameBtn');
        console.log('startGameBtn element:', startGameBtn);
        
        if (startGameBtn) {
            if (this.isHost && isRoomFull) {
                console.log('Showing Start Game button');
                startGameBtn.style.display = 'inline-block';
                startGameBtn.textContent = 'Start Game';
                
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
                
                // Check if button is actually visible
                const rect = startGameBtn.getBoundingClientRect();
                console.log('Button bounding rect:', rect);
                console.log('Button is visible:', rect.width > 0 && rect.height > 0);
                
                // Try moving the button to a more prominent location
                const statusMessage = document.getElementById('statusMessage');
                if (statusMessage && statusMessage.parentElement) {
                    // Create a new container for the button
                    let buttonContainer = document.getElementById('startGameButtonContainer');
                    if (!buttonContainer) {
                        buttonContainer = document.createElement('div');
                        buttonContainer.id = 'startGameButtonContainer';
                        buttonContainer.style.cssText = `
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            z-index: 10000;
                            background: rgba(0, 0, 0, 0.8);
                            padding: 20px;
                            border-radius: 10px;
                            text-align: center;
                        `;
                        document.body.appendChild(buttonContainer);
                    }
                    
                    // Move button to new container
                    buttonContainer.innerHTML = `
                        <h3 style="color: white; margin-bottom: 15px;">Room is Full!</h3>
                        <button class="btn btn-primary" id="startGameBtn" style="
                            display: inline-block !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                            position: relative !important;
                            z-index: 10001 !important;
                            width: 200px !important;
                            height: 50px !important;
                            min-width: 200px !important;
                            min-height: 50px !important;
                            padding: 15px 30px !important;
                            margin: 10px !important;
                            font-size: 18px !important;
                            font-weight: bold !important;
                            background: #007bff !important;
                            color: white !important;
                            border: none !important;
                            border-radius: 5px !important;
                            cursor: pointer !important;
                        ">Start Game</button>
                    `;
                    
                    // Re-attach event listener to the new button
                    const newButton = buttonContainer.querySelector('#startGameBtn');
                    if (newButton) {
                        newButton.addEventListener('click', () => this.startGame());
                    }
                }
                
                // Also ensure parent is visible
                if (gameControls) {
                    gameControls.style.display = 'flex';
                    gameControls.style.visibility = 'visible';
                    gameControls.style.opacity = '1';
                }
            } else {
                console.log('Hiding Start Game button - isHost:', this.isHost, 'isRoomFull:', isRoomFull);
                startGameBtn.style.display = 'none';
            }
        } else {
            console.error('Start Game button element not found!');
        }
        
        // Update status message
        const statusMessage = document.getElementById('statusMessage');
        if (statusMessage) {
            if (isRoomFull) {
                statusMessage.textContent = 'Room is full! Ready to start.';
                statusMessage.className = 'status-message ready';
            } else {
                statusMessage.textContent = `Waiting for ${room.max_players - room.current_players} more players...`;
                statusMessage.className = 'status-message waiting';
            }
        }
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
    }

    async startGame() {
        console.log('=== STARTING GAME ===');
        
        if (!this.currentRoom || !this.isHost) {
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

            // Remove the button overlay
            const buttonContainer = document.getElementById('startGameButtonContainer');
            if (buttonContainer) {
                buttonContainer.remove();
            }

            // Hide original start game button
            const startGameBtn = document.getElementById('startGameBtn');
            if (startGameBtn) {
                startGameBtn.style.display = 'none';
            }

            // Update status message
            const statusMessage = document.getElementById('statusMessage');
            if (statusMessage) {
                statusMessage.textContent = 'Game starting... Role distribution in progress.';
                statusMessage.className = 'status-message ready';
            }

            // Start role distribution for all players
            this.startRoleDistribution();

        } catch (error) {
            console.error('Exception starting game:', error);
            this.showNotification('Failed to start game.', 'error');
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

            // Randomize player positions
            this.randomizePlayerPositions();
            
            // Assign roles based on room configuration
            this.assignRoles();
            
            // Select random mission leader
            this.selectRandomMissionLeader();
            
            // Save roles to database so all players can receive them
            await this.saveRolesToDatabase();
            
            // Show role information to current player
            this.showRoleInformation();
            
        } catch (error) {
            console.error('Exception in startRoleDistribution:', error);
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
        
        // Check if role information has already been shown (in memory or database)
        if (this.roleInformationShown || await this.hasSeenRoleInformation()) {
            console.log('Role information already shown, skipping');
            return;
        }
        
        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser) {
            console.log('No current user found');
            return;
        }
        
        if (!this.currentRoom) {
            console.log('No current room found');
            return;
        }
        
        try {
            // Fetch fresh role data directly from database
            console.log('Fetching fresh role data from database...');
            console.log('Room ID:', this.currentRoom.id);
            const { data: roomPlayers, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', this.currentRoom.id);
            
            if (error) {
                console.error('Error fetching role data:', error);
                return;
            }
            
            // Find current player's role from database
            const currentPlayer = roomPlayers.find(p => p.player_id === currentUser.id);
            if (!currentPlayer) {
                console.log('Current player not found in database');
                return;
            }
            
            console.log('Current player found in database:', currentPlayer);
            console.log('Player role:', currentPlayer.role);
            console.log('Player alignment:', currentPlayer.alignment);
            console.log('All players in database:', roomPlayers.map(p => ({ name: p.player_name, role: p.role, alignment: p.alignment })));
            
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
                    
                    // Create a robust click handler function
                    const handleButtonClick = async (e) => {
                        console.log('=== BUTTON CLICKED ===');
                        console.log('Event:', e);
                        console.log('Event target:', e.target);
                        console.log('Event currentTarget:', e.currentTarget);
                        console.log('Event type:', e.type);
                        
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        console.log('Role information understood, setting flag');
                        this.roleInformationShown = true;
                        
                        try {
                            console.log('Calling markRoleInformationAsSeen...');
                            await this.markRoleInformationAsSeen();
                            console.log('markRoleInformationAsSeen completed successfully');
                        } catch (error) {
                            console.error('Error in markRoleInformationAsSeen:', error);
                        }
                        
                        console.log('Removing modal...');
                        modal.remove();
                        console.log('Modal removed successfully');
                    };
                    
                    // Add multiple event listeners for better compatibility
                    understandBtn.addEventListener('click', handleButtonClick, true); // Use capture phase
                    understandBtn.addEventListener('mousedown', handleButtonClick, true);
                    understandBtn.addEventListener('touchend', handleButtonClick, true); // For mobile
                    
                    // Also add mousedown and mouseup listeners for debugging
                    understandBtn.addEventListener('mousedown', (e) => {
                        console.log('Button mousedown event fired');
                    });
                    
                    understandBtn.addEventListener('mouseup', (e) => {
                        console.log('Button mouseup event fired');
                    });
                    
                    // Add event delegation to the modal as backup
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
            
            const { data, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .update({ has_role_seen: true })
                .eq('room_id', this.currentRoom.id)
                .eq('player_id', currentUser.id)
                .select();
            
            console.log('Database response:', { data, error });
            
            if (error) {
                console.error('Error marking role as seen:', error);
            } else {
                console.log('Successfully marked role information as seen for user:', currentUser.email);
                console.log('Updated data:', data);
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

    showRoomInterface() {
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
            this.initializeRoomDisplay();
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
            }, (payload) => {
                console.log('Room status changed:', payload);
                this.handleRoomStatusChange(payload);
            })
            .subscribe();

        // Also set up polling as backup
        this.startRoomPolling(roomId);
    }

    handleRoomPlayersChange(payload) {
        console.log('=== HANDLING ROOM PLAYERS CHANGE ===');
        console.log('Payload:', payload);
        
        // Refresh the room data and update display
        this.refreshRoomData();
    }

    handleRoomStatusChange(payload) {
        console.log('=== HANDLING ROOM STATUS CHANGE ===');
        console.log('Payload:', payload);
        console.log('New status:', payload.new.status);
        console.log('GAME_STATUS.ROLE_DISTRIBUTION:', GAME_STATUS.ROLE_DISTRIBUTION);
        
        // Update local room data
        this.currentRoom = payload.new;
        
        // Check if game started (role distribution)
        if (payload.new.status === GAME_STATUS.ROLE_DISTRIBUTION) {
            console.log('Game started! Role distribution beginning...');
            
            // Remove any existing button overlay
            const buttonContainer = document.getElementById('startGameButtonContainer');
            if (buttonContainer) {
                console.log('Removing button overlay');
                buttonContainer.remove();
            }
            
            // Update status message
            const statusMessage = document.getElementById('statusMessage');
            if (statusMessage) {
                statusMessage.textContent = 'Game starting... Role distribution in progress.';
                statusMessage.className = 'status-message ready';
            }
            
            // Refresh room data to get updated player roles
            this.refreshRoomData().then(() => {
                console.log('Room data refreshed after game start');
                // Show role information to current player
                this.showRoleInformation();
            });
        } else {
            console.log('Room status is not ROLE_DISTRIBUTION, current status:', payload.new.status);
        }
    }

    async refreshRoomData() {
        if (!this.currentRoom) return;
        
        try {
            console.log('=== REFRESHING ROOM DATA ===');
            
            // Fetch updated room data with players
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
                        alignment
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
                
                // Check if room is in waiting status
                if (room.status === GAME_STATUS.WAITING) {
                    console.log('Found active waiting room:', room);
                    
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
                    this.showRoomInterface();
                    
                    // Subscribe to room updates
                    this.subscribeToRoomUpdates(this.currentRoom.id);
                    
                    // Show notification
                    this.showNotification(`Welcome back to room ${this.currentRoom.code}!`, 'success');
                    
                    // Check if room is already in role distribution status
                    if (this.currentRoom.status === GAME_STATUS.ROLE_DISTRIBUTION) {
                        console.log('Room is already in role distribution, showing role information');
                        this.showRoleInformation();
                    }
                    
                    console.log('Successfully restored room state');
                    return; // Exit after finding the first waiting room
                } else {
                    console.log('Room is not in waiting status, current status:', room.status);
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
