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
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }

    setupEventListeners() {
        console.log('=== SETTING UP ROOM EVENT LISTENERS ===');
        console.log('Document ready state:', document.readyState);
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

            this.currentRoom = room;
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

    setupEventListeners() {
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
}

// Initialize the room system
const supabaseRoomSystem = new SupabaseRoomSystem();

// Make it globally available
window.supabaseRoomSystem = supabaseRoomSystem;

export default supabaseRoomSystem;
