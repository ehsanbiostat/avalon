// Room Management System
class RoomSystem {
    constructor() {
        this.gameRooms = JSON.parse(localStorage.getItem('avalonRooms')) || {};
        this.currentRoom = null;
        this.isHost = false;
        this.lobbyPolling = null;
        
        // Predefined game setups
        this.presetConfigs = {
            'classic10': {
                name: 'Classic 10 player',
                playerCount: 10,
                roles: {
                    merlin: true,
                    percival: true,
                    morgana: true,
                    assassin: true,
                    mordred: true,
                    oberon: true,
                    loyalServants: 4,
                    minions: 0
                },
                ladyOfLake: false,
                chaosForMerlin: false
            },
            'classic10Lady': {
                name: 'Classic 10 player & Lady of the Lake',
                playerCount: 10,
                roles: {
                    merlin: true,
                    percival: true,
                    morgana: true,
                    assassin: true,
                    mordred: true,
                    oberon: true,
                    loyalServants: 4,
                    minions: 0
                },
                ladyOfLake: true,
                chaosForMerlin: false
            },
            'chaos10': {
                name: 'Chaos for Merlin - 10 player',
                playerCount: 10,
                roles: {
                    merlin: true,
                    percival: true,
                    morgana: true,
                    assassin: true,
                    mordred: true,
                    oberon: true,
                    loyalServants: 4,
                    minions: 0
                },
                ladyOfLake: false,
                chaosForMerlin: true
            },
            'chaos10Lady': {
                name: 'Chaos for Merlin - 10 player & Lady of the Lake',
                playerCount: 10,
                roles: {
                    merlin: true,
                    percival: true,
                    morgana: true,
                    assassin: true,
                    mordred: true,
                    oberon: true,
                    loyalServants: 4,
                    minions: 0
                },
                ladyOfLake: true,
                chaosForMerlin: true
            },
            'custom': {
                name: 'Custom Setup',
                playerCount: 5,
                roles: {
                    merlin: true,
                    percival: false,
                    morgana: false,
                    assassin: true,
                    mordred: false,
                    oberon: false,
                    loyalServants: 2,
                    minions: 1
                },
                ladyOfLake: false,
                chaosForMerlin: false
            }
        };
        
        this.initializeRoomSystem();
    }

    initializeRoomSystem() {
        this.setupEventListeners();
        this.loadRoomCreationContent();
    }

    setupEventListeners() {
        // Room creation button
        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => this.showCreateRoom());
        }

        // Join room button
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => this.showJoinRoom());
        }

        // Join room submit
        const joinRoomSubmitBtn = document.getElementById('joinRoomSubmitBtn');
        if (joinRoomSubmitBtn) {
            joinRoomSubmitBtn.addEventListener('click', () => this.joinRoomByCode());
        }

        // Start game button
        const startGameBtn = document.getElementById('startGameBtn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => this.startGameFromLobby());
        }

        // Leave lobby button
        const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
        if (leaveLobbyBtn) {
            leaveLobbyBtn.addEventListener('click', () => this.leaveLobby());
        }

        // Leave game button
        const leaveGameBtn = document.getElementById('leaveGameBtn');
        if (leaveGameBtn) {
            leaveGameBtn.addEventListener('click', () => this.leaveGame());
        }
    }

    loadRoomCreationContent() {
        const content = document.getElementById('roomCreationContent');
        if (!content) return;

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
                           onchange="roomSystem.updatePlayerCount()" style="width: 100%;">
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

                <button class="btn btn-primary" onclick="roomSystem.createRoom()">Create Room</button>
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
    }

    showCreateRoom() {
        if (!authSystem.isUserLoggedIn()) {
            authSystem.showNotification('Please login to create a game room!', 'error');
            authSystem.toggleAuthModal();
            return;
        }
        
        const roomModal = document.getElementById('roomModal');
        if (roomModal) {
            roomModal.style.display = 'block';
        }
    }

    showJoinRoom() {
        if (!authSystem.isUserLoggedIn()) {
            authSystem.showNotification('Please login to join a game room!', 'error');
            authSystem.toggleAuthModal();
            return;
        }
        
        const joinModal = document.getElementById('joinModal');
        if (joinModal) {
            joinModal.style.display = 'block';
            this.displayActiveRooms();
        }
    }

    loadPreset(presetName) {
        const preset = this.presetConfigs[presetName];
        if (!preset) return;
        
        // Update player count
        const playerCountInput = document.getElementById('playerCount');
        if (playerCountInput) {
            playerCountInput.value = preset.playerCount;
            this.updatePlayerCount();
        }
        
        // Update roles
        const roleCheckboxes = {
            'rolePercival': preset.roles.percival,
            'roleMorgana': preset.roles.morgana,
            'roleMordred': preset.roles.mordred,
            'roleOberon': preset.roles.oberon
        };
        
        Object.entries(roleCheckboxes).forEach(([id, checked]) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = checked;
            }
        });
        
        // Update special options
        const ladyOfLakeCheckbox = document.getElementById('ladyOfLake');
        if (ladyOfLakeCheckbox) {
            ladyOfLakeCheckbox.checked = preset.ladyOfLake;
        }
        
        const chaosModeCheckbox = document.getElementById('chaosMode');
        if (chaosModeCheckbox) {
            chaosModeCheckbox.checked = preset.chaosForMerlin;
        }
        
        authSystem.showNotification(`Loaded preset: ${preset.name}`, 'success');
    }

    updatePlayerCount() {
        const playerCountInput = document.getElementById('playerCount');
        const playerCountDisplay = document.getElementById('playerCountDisplay');
        
        if (playerCountInput && playerCountDisplay) {
            const count = playerCountInput.value;
            playerCountDisplay.textContent = count;
            this.updateRoleBalance();
        }
    }

    updateRoleBalance() {
        const playerCount = parseInt(document.getElementById('playerCount')?.value || 5);
        const evilCount = Math.ceil(playerCount / 3);
        const goodCount = playerCount - evilCount;
        
        const goodCountElement = document.querySelector('.good-count');
        const evilCountElement = document.querySelector('.evil-count');
        
        if (goodCountElement) {
            goodCountElement.textContent = `Good: ${goodCount} players`;
        }
        if (evilCountElement) {
            evilCountElement.textContent = `Evil: ${evilCount} players`;
        }
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    createRoom() {
        const playerCount = parseInt(document.getElementById('playerCount')?.value || 5);
        const roomCode = this.generateRoomCode();
        
        const roomConfig = {
            code: roomCode,
            host: authSystem.getCurrentUser().name,
            hostId: authSystem.getCurrentUser().id,
            playerCount: playerCount,
            maxPlayers: playerCount,
            players: [authSystem.getCurrentUser()],
            roles: {
                merlin: true,
                percival: document.getElementById('rolePercival')?.checked || false,
                morgana: document.getElementById('roleMorgana')?.checked || false,
                assassin: true,
                mordred: document.getElementById('roleMordred')?.checked || false,
                oberon: document.getElementById('roleOberon')?.checked || false
            },
            ladyOfLake: document.getElementById('ladyOfLake')?.checked || false,
            chaosForMerlin: document.getElementById('chaosMode')?.checked || false,
            status: 'waiting',
            createdAt: new Date().toISOString()
        };
        
        // Validate role distribution
        const evilCount = Math.ceil(playerCount / 3);
        const goodCount = playerCount - evilCount;
        
        let evilRoles = 1; // Assassin is always included
        if (roomConfig.roles.morgana) evilRoles++;
        if (roomConfig.roles.mordred) evilRoles++;
        if (roomConfig.roles.oberon) evilRoles++;
        
        if (evilRoles > evilCount) {
            authSystem.showNotification(`Too many evil roles selected! Maximum ${evilCount} evil players for ${playerCount} players.`, 'error');
            return;
        }
        
        // Save room to database
        this.gameRooms[roomCode] = roomConfig;
        localStorage.setItem('avalonRooms', JSON.stringify(this.gameRooms));
        
        // Join the room as host
        this.currentRoom = roomConfig;
        this.isHost = true;
        
        authSystem.showNotification(`Room created! Code: ${roomCode}`, 'success');
        this.showLobby();
    }

    joinRoomByCode() {
        const code = document.getElementById('roomCode')?.value.toUpperCase();
        
        if (!code) {
            authSystem.showNotification('Please enter a room code!', 'error');
            return;
        }
        
        const room = this.gameRooms[code];
        
        if (!room) {
            authSystem.showNotification('Room not found! Please check the code.', 'error');
            return;
        }
        
        if (room.status !== 'waiting') {
            authSystem.showNotification('This game has already started!', 'error');
            return;
        }
        
        if (room.players.length >= room.maxPlayers) {
            authSystem.showNotification('Room is full!', 'error');
            return;
        }
        
        // Check if already in room
        if (room.players.some(p => p.id === authSystem.getCurrentUser().id)) {
            authSystem.showNotification('You are already in this room!', 'info');
            this.currentRoom = room;
            this.isHost = room.hostId === authSystem.getCurrentUser().id;
            this.showLobby();
            return;
        }
        
        // Add player to room
        room.players.push(authSystem.getCurrentUser());
        this.gameRooms[code] = room;
        localStorage.setItem('avalonRooms', JSON.stringify(this.gameRooms));
        
        this.currentRoom = room;
        this.isHost = false;
        
        authSystem.showNotification(`Joined room ${code}!`, 'success');
        this.showLobby();
    }

    displayActiveRooms() {
        const container = document.getElementById('activeRoomsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        const activeRooms = Object.values(this.gameRooms).filter(room => 
            room.status === 'waiting' && 
            new Date() - new Date(room.createdAt) < 3600000 // 1 hour timeout
        );
        
        if (activeRooms.length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No active rooms available. Create one!</p>';
            return;
        }
        
        activeRooms.forEach(room => {
            const roomCard = document.createElement('div');
            roomCard.className = 'room-item';
            roomCard.innerHTML = `
                <div class="room-info">
                    <div class="room-code">Room ${room.code}</div>
                    <div class="room-details">
                        Host: ${room.host} | Players: ${room.players.length}/${room.maxPlayers}
                    </div>
                </div>
                <button class="btn btn-primary" onclick="roomSystem.joinRoomByCode('${room.code}')">Join</button>
            `;
            container.appendChild(roomCard);
        });
    }

    showLobby() {
        const gameLobby = document.getElementById('gameLobby');
        if (gameLobby) {
            gameLobby.style.display = 'block';
        }
        
        this.updateLobbyDisplay();
        
        // Show start button for host
        const startGameBtn = document.getElementById('startGameBtn');
        const waitingMessage = document.getElementById('waitingMessage');
        
        if (this.isHost) {
            if (startGameBtn) startGameBtn.style.display = 'inline-block';
            if (waitingMessage) waitingMessage.style.display = 'none';
        } else {
            if (startGameBtn) startGameBtn.style.display = 'none';
            if (waitingMessage) waitingMessage.style.display = 'block';
        }
        
        // Start polling for updates
        if (!this.lobbyPolling) {
            this.lobbyPolling = setInterval(() => this.updateLobbyDisplay(), 2000);
        }
    }

    updateLobbyDisplay() {
        if (!this.currentRoom) return;
        
        const room = this.gameRooms[this.currentRoom.code];
        if (!room) return;
        
        this.currentRoom = room;
        
        // Update room code
        const lobbyRoomCode = document.getElementById('lobbyRoomCode');
        if (lobbyRoomCode) {
            lobbyRoomCode.textContent = room.code;
        }
        
        // Update player count
        const playerCountLobby = document.getElementById('playerCountLobby');
        const maxPlayersLobby = document.getElementById('maxPlayersLobby');
        if (playerCountLobby) playerCountLobby.textContent = room.players.length;
        if (maxPlayersLobby) maxPlayersLobby.textContent = room.maxPlayers;
        
        // Update players list
        this.updateLobbyPlayersList(room);
        
        // Update settings display
        this.updateLobbySettings(room);
        
        // Check if game started
        if (room.status === 'playing') {
            this.stopLobbyPolling();
            if (window.gameSystem) {
                window.gameSystem.startGame(room);
            }
        }
    }

    updateLobbyPlayersList(room) {
        const playersList = document.getElementById('lobbyPlayersList');
        if (!playersList) return;
        
        playersList.innerHTML = '';
        room.players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            playerDiv.innerHTML = `
                <div class="player-avatar">${player.avatar}</div>
                <div class="player-name">
                    ${player.name}
                    ${player.id === room.hostId ? '<span class="player-host">(Host)</span>' : ''}
                </div>
            `;
            playersList.appendChild(playerDiv);
        });
    }

    updateLobbySettings(room) {
        const settingsDiv = document.getElementById('lobbySettings');
        if (!settingsDiv) return;
        
        settingsDiv.innerHTML = `
            <p><strong>Players:</strong> ${room.maxPlayers}</p>
            <p><strong>Good Roles:</strong> Merlin${room.roles.percival ? ', Percival' : ''}</p>
            <p><strong>Evil Roles:</strong> Assassin${room.roles.morgana ? ', Morgana' : ''}${room.roles.mordred ? ', Mordred' : ''}${room.roles.oberon ? ', Oberon' : ''}</p>
            ${room.ladyOfLake ? '<p><strong>Special:</strong> Lady of the Lake enabled</p>' : ''}
            ${room.chaosForMerlin ? '<p><strong>Special:</strong> Chaos for Merlin enabled</p>' : ''}
        `;
    }

    startGameFromLobby() {
        if (!this.isHost) {
            authSystem.showNotification('Only the host can start the game!', 'error');
            return;
        }
        
        const room = this.currentRoom;
        
        if (room.players.length < room.maxPlayers) {
            authSystem.showNotification(`Need ${room.maxPlayers - room.players.length} more players to start!`, 'warning');
            return;
        }
        
        // Update room status
        room.status = 'playing';
        this.gameRooms[room.code] = room;
        localStorage.setItem('avalonRooms', JSON.stringify(this.gameRooms));
        
        // Start the actual game
        if (window.gameSystem) {
            window.gameSystem.startGame(room);
        }
    }

    leaveLobby() {
        this.stopLobbyPolling();
        
        const room = this.currentRoom;
        if (room) {
            // Remove player from room
            room.players = room.players.filter(p => p.id !== authSystem.getCurrentUser().id);
            
            // If host leaves, assign new host or delete room
            if (this.isHost) {
                if (room.players.length > 0) {
                    room.hostId = room.players[0].id;
                    room.host = room.players[0].name;
                } else {
                    delete this.gameRooms[room.code];
                }
            } else {
                this.gameRooms[room.code] = room;
            }
            
            localStorage.setItem('avalonRooms', JSON.stringify(this.gameRooms));
        }
        
        this.currentRoom = null;
        this.isHost = false;
        
        // Close lobby modal
        const gameLobby = document.getElementById('gameLobby');
        if (gameLobby) {
            gameLobby.style.display = 'none';
        }
        
        authSystem.showNotification('Left the lobby', 'info');
    }

    leaveGame() {
        // Implementation will be added when game system is created
        authSystem.showNotification('Game ended', 'info');
    }

    stopLobbyPolling() {
        if (this.lobbyPolling) {
            clearInterval(this.lobbyPolling);
            this.lobbyPolling = null;
        }
    }

    getCurrentRoom() {
        return this.currentRoom;
    }

    isUserHost() {
        return this.isHost;
    }
}

// Initialize room system
const roomSystem = new RoomSystem();
