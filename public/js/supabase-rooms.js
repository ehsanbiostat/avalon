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
        
        // Add a small delay to ensure DOM is fully ready
        console.log('Setting up setTimeout for event listeners...');
        setTimeout(() => {
            console.log('setTimeout callback executing...');
            console.log('About to call setupEventListeners...');
            try {
                console.log('Calling setupEventListeners method...');
                this.setupEventListeners();
                console.log('setupEventListeners completed successfully');
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

    updatePlayerCount() {
        // For compatibility with old room system
        console.log('updatePlayerCount called (compatibility method)');
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
            await this.addPlayerToRoom(room.id, user);

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
            await this.addPlayerToRoom(room.id, user);

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

    async addPlayerToRoom(roomId, user) {
        const { error } = await this.supabase
            .from(TABLES.ROOM_PLAYERS)
            .insert({
                room_id: roomId,
                player_id: user.id,
                player_name: user.profile?.display_name || user.email,
                player_avatar: user.profile?.avatar || '👤'
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

    async startGame() {
        if (!this.isHost || !this.currentRoom) {
            this.showNotification('Only the host can start the game!', 'error');
            return;
        }

        if (this.currentRoom.current_players < this.currentRoom.max_players) {
            this.showNotification(`Need ${this.currentRoom.max_players - this.currentRoom.current_players} more players!`, 'warning');
            return;
        }

        try {
            // Update room status
            const { error } = await this.supabase
                .from(TABLES.GAME_ROOMS)
                .update({
                    status: GAME_STATUS.ROLE_DISTRIBUTION,
                    started_at: new Date().toISOString()
                })
                .eq('id', this.currentRoom.id);

            if (error) {
                this.showNotification('Failed to start game.', 'error');
                return;
            }

            // Start the game
            if (window.gameSystem) {
                window.gameSystem.startRoleDistribution(this.currentRoom);
            }
        } catch (error) {
            this.showNotification('Failed to start game.', 'error');
        }
    }

    subscribeToRoomUpdates(roomId) {
        if (this.roomSubscription) {
            this.roomSubscription.unsubscribe();
        }

        this.roomSubscription = this.supabase
            .channel(`room-${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: TABLES.ROOM_PLAYERS,
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                console.log('Room players updated:', payload);
                this.updateRoomDisplay();
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: TABLES.GAME_ROOMS,
                filter: `id=eq.${roomId}`
            }, (payload) => {
                console.log('Room updated:', payload);
                this.currentRoom = payload.new;
                this.updateRoomDisplay();
                
                // Check if game started
                if (payload.new.status === GAME_STATUS.ROLE_DISTRIBUTION) {
                    if (window.gameSystem) {
                        window.gameSystem.startRoleDistribution(payload.new);
                    }
                }
            })
            .subscribe();
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
    showRoomInterface() {
        this.closeAllModals();
        
        const gameInterface = document.getElementById('gameInterface');
        if (gameInterface) {
            gameInterface.style.display = 'block';
        }
        
        this.initializeRoomDisplay();
    }

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
        
        // Position players on the circle
        room.players.forEach((player, index) => {
            const angle = (index * 2 * Math.PI) / room.max_players;
            const radius = 200;
            const centerX = 300;
            const centerY = 300;
            
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot';
            playerSlot.style.left = `${x}px`;
            playerSlot.style.top = `${y}px`;
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
            const angle = (i * 2 * Math.PI) / room.max_players;
            const radius = 200;
            const centerX = 300;
            const centerY = 300;
            
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            const emptySlot = document.createElement('div');
            emptySlot.className = 'player-slot empty-slot';
            emptySlot.style.left = `${x}px`;
            emptySlot.style.top = `${y}px`;
            
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
        
        // Update start game button
        const startGameBtn = document.getElementById('startGameBtn');
        if (startGameBtn) {
            if (this.isHost && isRoomFull) {
                startGameBtn.style.display = 'inline-block';
                startGameBtn.textContent = 'Start Game';
            } else {
                startGameBtn.style.display = 'none';
            }
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

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    async addPlayerToRoom(roomId, user) {
        console.log('=== ADDING PLAYER TO ROOM ===');
        console.log('Room ID:', roomId);
        console.log('User:', user);
        
        try {
            // First check if player is already in the room
            const { data: existingPlayer, error: checkError } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select('*')
                .eq('room_id', roomId)
                .eq('player_id', user.id)
                .single();

            if (existingPlayer) {
                console.log('Player already in room:', existingPlayer);
                return true; // Player already exists, that's fine
            }

            // If not found, add the player
            const { data, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .insert({
                    room_id: roomId,
                    player_id: user.id,
                    player_name: user.profile?.display_name || user.email,
                    player_avatar: user.profile?.avatar || '👤',
                    is_host: true // First player is always host
                })
                .select()
                .single();

            if (error) {
                console.error('Error adding player to room:', error);
                this.showNotification('Failed to add player to room: ' + error.message, 'error');
                return false;
            }

            console.log('Player added to room successfully:', data);
            return true;
        } catch (error) {
            console.error('Exception adding player to room:', error);
            this.showNotification('Failed to add player to room.', 'error');
            return false;
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
                        joined_at
                    )
                `)
                .eq('id', this.currentRoom.id)
                .single();

            if (error) {
                console.error('Error refreshing room data:', error);
                return;
            }

            console.log('Updated room data:', room);
            
            // Update current room
            this.currentRoom = room;
            this.currentRoom.players = room.room_players || [];
            this.currentRoom.current_players = this.currentRoom.players.length;
            
            // Update the display
            this.updateRoomDisplay();
            
        } catch (error) {
            console.error('Exception refreshing room data:', error);
        }
    }

    startRoomPolling(roomId) {
        // Poll every 3 seconds as backup
        this.roomPolling = setInterval(() => {
            this.refreshRoomData();
        }, 3000);
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
}

// Initialize the room system
const supabaseRoomSystem = new SupabaseRoomSystem();

// Make it globally available
window.supabaseRoomSystem = supabaseRoomSystem;

export default supabaseRoomSystem;
