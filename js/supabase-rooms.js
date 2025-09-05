// Supabase Room Management System
console.log('=== LOADING SUPABASE ROOMS SYSTEM ===');
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
        console.log('All elements with createRoomBtn ID:', document.querySelectorAll('#createRoomBtn'));
        console.log('All elements with joinRoomBtn ID:', document.querySelectorAll('#joinRoomBtn'));
        
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

    showNotification(message, type = 'info') {
        console.log(`Notification (${type}): ${message}`);
        // For now, just log to console
        // TODO: Implement proper notification system
    }

    async createRoom(roomConfig) {
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
                .maybeSingle();

            if (checkError) {
                console.error('Error checking existing player:', checkError);
                // Continue anyway, might be a new player
            } else if (existingPlayer) {
                console.log('Player already in room:', existingPlayer);
                return true; // Player already exists, that's fine
            }

            // Ensure user profile exists before adding to room
            await this.ensureUserProfile(user);

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
                    
                    // Start role distribution
                    this.startRoleDistribution();
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
            
            // Find if user is in any active room
            const { data: playerRoom, error } = await this.supabase
                .from(TABLES.ROOM_PLAYERS)
                .select(`
                    *,
                    game_rooms (
                        *,
                        room_players (
                            id,
                            player_id,
                            player_name,
                            player_avatar,
                            is_host,
                            joined_at
                        )
                    )
                `)
                .eq('player_id', user.id)
                .eq('game_rooms.status', GAME_STATUS.WAITING)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('User is not in any active room');
                    return;
                }
                console.error('Error checking for existing room:', error);
                return;
            }

            if (playerRoom && playerRoom.game_rooms) {
                console.log('Found existing room:', playerRoom.game_rooms);
                
                // Set current room data
                this.currentRoom = playerRoom.game_rooms;
                this.currentRoom.players = playerRoom.game_rooms.room_players || [];
                this.currentRoom.current_players = this.currentRoom.players.length;
                this.isHost = playerRoom.is_host;
                
                // Show room interface
                this.showRoomInterface();
                
                // Subscribe to room updates
                this.subscribeToRoomUpdates(this.currentRoom.id);
                
                // Show notification
                this.showNotification(`Welcome back to room ${this.currentRoom.code}!`, 'success');
                
                console.log('Successfully restored room state');
            }
            
        } catch (error) {
            console.error('Exception checking for existing room:', error);
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

    startRoleDistribution() {
        console.log('=== STARTING ROLE DISTRIBUTION ===');
        
        if (!this.currentRoom || !this.currentRoom.players) {
            console.error('No room or players available for role distribution');
            return;
        }

        // Randomize player positions
        this.randomizePlayerPositions();
        
        // Assign roles based on room configuration
        this.assignRoles();
        
        // Select random mission leader
        this.selectRandomMissionLeader();
        
        // Show role information to all players
        this.showRoleInformation();
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
        
        // Add loyal servants (good players)
        const goodRoles = roleAssignments.filter(r => r.alignment === 'good').length;
        const evilRoles = roleAssignments.filter(r => r.alignment === 'evil').length;
        const loyalServants = Math.max(0, playerCount - goodRoles - evilRoles);
        
        for (let i = 0; i < loyalServants; i++) {
            roleAssignments.push({ role: 'loyal_servant', alignment: 'good' });
        }
        
        // Add minions (evil players)
        const minions = Math.max(0, playerCount - roleAssignments.length);
        for (let i = 0; i < minions; i++) {
            roleAssignments.push({ role: 'minion', alignment: 'evil' });
        }
        
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

    showRoleInformation() {
        console.log('=== SHOWING ROLE INFORMATION ===');
        
        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser) return;
        
        // Find current player's role
        const currentPlayer = this.currentRoom.players.find(p => p.player_id === currentUser.id);
        if (!currentPlayer) return;
        
        // Create role information modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'roleModal';
        modal.style.display = 'block';
        
        const roleInfo = this.getRoleInformation(currentPlayer);
        
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Your Role: ${roleInfo.roleName}</h2>
                <div class="role-description">
                    <p><strong>Alignment:</strong> ${roleInfo.alignment}</p>
                    <p><strong>Description:</strong> ${roleInfo.description}</p>
                    ${roleInfo.specialInfo ? `<p><strong>Special Information:</strong> ${roleInfo.specialInfo}</p>` : ''}
                </div>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">I Understand</button>
            </div>
        `;
        
        document.body.appendChild(modal);
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

    async startRoleDistribution() {
        console.log('=== STARTING ROLE DISTRIBUTION ===');
        
        if (!this.currentRoom || !this.currentRoom.players) {
            console.error('No room or players available for role distribution');
            return;
        }

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
    }

    async saveRolesToDatabase() {
        console.log('=== SAVING ROLES TO DATABASE ===');
        
        try {
            // Update each player's role in the database
            for (const player of this.currentRoom.players) {
                const { error } = await this.supabase
                    .from(TABLES.ROOM_PLAYERS)
                    .update({
                        role: player.role,
                        alignment: player.alignment
                    })
                    .eq('room_id', this.currentRoom.id)
                    .eq('player_id', player.player_id);

                if (error) {
                    console.error(`Error updating role for player ${player.player_name}:`, error);
                } else {
                    console.log(`Updated role for ${player.player_name}: ${player.role} (${player.alignment})`);
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
        const playerCount = players.length;
        
        // Clear existing roles
        players.forEach(player => {
            player.role = null;
            player.alignment = null;
        });
        
        // Assign roles based on room configuration
        const roles = this.currentRoom.roles || [];
        
        // Always assign Merlin and Assassin
        const merlinIndex = Math.floor(Math.random() * playerCount);
        const assassinIndex = Math.floor(Math.random() * playerCount);
        
        players[merlinIndex].role = 'merlin';
        players[merlinIndex].alignment = 'good';
        
        players[assassinIndex].role = 'assassin';
        players[assassinIndex].alignment = 'evil';
        
        // Assign other roles based on configuration
        if (roles.includes('percival')) {
            const percivalIndex = Math.floor(Math.random() * playerCount);
            if (players[percivalIndex].role === null) {
                players[percivalIndex].role = 'percival';
                players[percivalIndex].alignment = 'good';
            }
        }
        
        if (roles.includes('morgana')) {
            const morganaIndex = Math.floor(Math.random() * playerCount);
            if (players[morganaIndex].role === null) {
                players[morganaIndex].role = 'morgana';
                players[morganaIndex].alignment = 'evil';
            }
        }
        
        if (roles.includes('mordred')) {
            const mordredIndex = Math.floor(Math.random() * playerCount);
            if (players[mordredIndex].role === null) {
                players[mordredIndex].role = 'mordred';
                players[mordredIndex].alignment = 'evil';
            }
        }
        
        if (roles.includes('oberon')) {
            const oberonIndex = Math.floor(Math.random() * playerCount);
            if (players[oberonIndex].role === null) {
                players[oberonIndex].role = 'oberon';
                players[oberonIndex].alignment = 'evil';
            }
        }
        
        // Fill remaining slots with loyal servants and minions
        const remainingPlayers = players.filter(p => p.role === null);
        const evilCount = Math.floor(playerCount / 2);
        const goodCount = playerCount - evilCount;
        
        let assignedEvil = players.filter(p => p.alignment === 'evil').length;
        let assignedGood = players.filter(p => p.alignment === 'good').length;
        
        for (const player of remainingPlayers) {
            if (assignedEvil < evilCount) {
                player.role = 'minion';
                player.alignment = 'evil';
                assignedEvil++;
            } else {
                player.role = 'loyal_servant';
                player.alignment = 'good';
                assignedGood++;
            }
        }
        
        console.log('Roles assigned:', players.map(p => `${p.player_name}: ${p.role} (${p.alignment})`));
    }

    selectRandomMissionLeader() {
        console.log('=== SELECTING RANDOM MISSION LEADER ===');
        
        const missionLeader = this.currentRoom.players[Math.floor(Math.random() * this.currentRoom.players.length)];
        this.currentRoom.mission_leader = missionLeader.player_id;
        this.currentRoom.current_mission = 1;
        
        console.log('Mission leader selected:', missionLeader.player_name);
    }

    showRoleInformation() {
        console.log('=== SHOWING ROLE INFORMATION ===');
        
        const currentUser = supabaseAuthSystem.getCurrentUser();
        if (!currentUser) {
            console.log('No current user found');
            return;
        }
        
        console.log('Current user:', currentUser);
        console.log('Current room players:', this.currentRoom.players);
        
        // Find current player's role
        const currentPlayer = this.currentRoom.players.find(p => p.player_id === currentUser.id);
        if (!currentPlayer) {
            console.log('Current player not found in room players');
            return;
        }
        
        console.log('Current player found:', currentPlayer);
        console.log('Player role:', currentPlayer.role);
        console.log('Player alignment:', currentPlayer.alignment);
        
        // Create role information modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'roleModal';
        modal.style.display = 'block';
        
        const roleInfo = this.getRoleInformation(currentPlayer);
        
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Your Role: ${roleInfo.roleName}</h2>
                <div class="role-description">
                    <p><strong>Alignment:</strong> ${roleInfo.alignment}</p>
                    <p><strong>Description:</strong> ${roleInfo.description}</p>
                    ${roleInfo.specialInfo ? `<p><strong>Special Information:</strong> ${roleInfo.specialInfo}</p>` : ''}
                </div>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">I Understand</button>
            </div>
        `;
        
        document.body.appendChild(modal);
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
                description: 'You are Percival. You know the identities of Merlin and Morgana, but you cannot tell which is which.',
                specialInfo: `You can see these players (one is Merlin, one is Morgana): ${this.getMerlinAndMorgana().map(p => p.player_name).join(', ')}`
            },
            morgana: {
                roleName: 'Morgana',
                alignment: 'Evil',
                description: 'You are Morgana. You appear as Merlin to Percival, confusing the good players.',
                specialInfo: `Your evil teammates are: ${this.getEvilTeammates(player).map(p => p.player_name).join(', ')}`
            },
            mordred: {
                roleName: 'Mordred',
                alignment: 'Evil',
                description: 'You are Mordred. You are invisible to Merlin, making you a powerful hidden threat.',
                specialInfo: `Your evil teammates are: ${this.getEvilTeammates(player).map(p => p.player_name).join(', ')}`
            },
            oberon: {
                roleName: 'Oberon',
                alignment: 'Evil',
                description: 'You are Oberon. You do not know the identities of other evil players, and they do not know you.',
                specialInfo: 'You are alone in your knowledge of being evil.'
            },
            loyal_servant: {
                roleName: 'Loyal Servant of Arthur',
                alignment: 'Good',
                description: 'You are a loyal servant of King Arthur. You know nothing special, but you must help the good players succeed.',
                specialInfo: 'You have no special information, but your loyalty is your strength.'
            },
            minion: {
                roleName: 'Minion of Mordred',
                alignment: 'Evil',
                description: 'You are a minion of Mordred. You know the identities of other evil players and must help them fail the missions.',
                specialInfo: `Your evil teammates are: ${this.getEvilTeammates(player).map(p => p.player_name).join(', ')}`
            }
        };
        
        return roleInfo[player.role] || {
            roleName: 'Unknown',
            alignment: 'Unknown',
            description: 'Your role is not recognized.',
            specialInfo: ''
        };
    }

    getEvilPlayers() {
        return this.currentRoom.players.filter(p => p.alignment === 'evil' && p.role !== 'mordred');
    }

    getEvilTeammates(player) {
        if (player.role === 'oberon') {
            return []; // Oberon doesn't know other evil players
        }
        return this.currentRoom.players.filter(p => p.alignment === 'evil' && p.player_id !== player.player_id);
    }
}

// Initialize the room system
const supabaseRoomSystem = new SupabaseRoomSystem();

// Make it globally available
window.supabaseRoomSystem = supabaseRoomSystem;

export default supabaseRoomSystem;
