// Game System
class GameSystem {
    constructor() {
        this.currentGame = null;
        this.players = [];
        this.playerRoles = {};
        this.currentMission = 1;
        this.missionResults = [];
        this.selectedPlayers = [];
        this.votes = [];
        this.rejectedTeams = 0;
        this.gamePhase = 'waiting';
        this.currentLeader = 0;
        this.ladyOfLakeHolder = null;
        this.chaosForMerlin = false;
        this.fakeOberon = null;
        
        // Game configuration
        this.teamSize = {
            5: [2, 3, 2, 3, 3],
            6: [2, 3, 4, 3, 4],
            7: [2, 3, 3, 4, 4],
            8: [3, 4, 4, 5, 5],
            9: [3, 4, 4, 5, 5],
            10: [3, 4, 4, 5, 5]
        };
        
        this.failsRequired = {
            5: [1, 1, 1, 1, 1],
            6: [1, 1, 1, 1, 1],
            7: [1, 1, 1, 2, 1],
            8: [1, 1, 1, 2, 1],
            9: [1, 1, 1, 2, 1],
            10: [1, 1, 1, 2, 1]
        };
        
        this.initializeGameSystem();
    }

    initializeGameSystem() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Game control buttons
        const proposeTeamBtn = document.getElementById('proposeTeamBtn');
        if (proposeTeamBtn) {
            proposeTeamBtn.addEventListener('click', () => this.proposeTeam());
        }

        const voteTeamBtn = document.getElementById('voteTeamBtn');
        if (voteTeamBtn) {
            voteTeamBtn.addEventListener('click', () => this.showVotingInterface());
        }

        const executeMissionBtn = document.getElementById('executeMissionBtn');
        if (executeMissionBtn) {
            executeMissionBtn.addEventListener('click', () => this.showMissionInterface());
        }

        const revealRoleBtn = document.getElementById('revealRoleBtn');
        if (revealRoleBtn) {
            revealRoleBtn.addEventListener('click', () => this.showPlayerRole());
        }
    }

    startGame(roomConfig) {
        this.currentGame = roomConfig;
        
        // Check if we need to add AI players for testing
        if (roomConfig.players.length === 1) {
            this.players = this.addAIPlayers(roomConfig);
            authSystem.showNotification('Debug mode: Added AI players for testing', 'info');
        } else {
            this.players = roomConfig.players;
        }
        
        this.currentMission = 1;
        this.missionResults = [];
        this.selectedPlayers = [];
        this.votes = [];
        this.rejectedTeams = 0;
        this.gamePhase = 'team_building';
        this.chaosForMerlin = roomConfig.chaosForMerlin;
        this.playerVotes = {}; // Track individual player votes
        this.votesReceived = 0; // Count how many votes we've received
        this.missionVotes = {}; // Track mission votes
        this.missionVotesReceived = 0; // Count mission votes received
        
        // Lady of the Lake system
        this.ladyOfLake = {
            enabled: roomConfig.ladyOfLake || false,
            currentHolder: null,
            previousHolders: [], // Track who has used it
            usesRemaining: 3,
            canUseAfterMission: [2, 3, 4] // Missions where it can be used
        };
        
        // Assign roles based on room configuration
        this.assignRolesFromConfig(roomConfig);
        
        // Setup Lady of the Lake if enabled
        console.log('=== LADY OF LAKE INITIALIZATION ===');
        console.log('Room config ladyOfLake:', roomConfig.ladyOfLake);
        console.log('this.ladyOfLake.enabled:', this.ladyOfLake.enabled);
        console.log('Current leader index:', this.currentLeader);
        console.log('Total players:', this.players.length);
        
        if (this.ladyOfLake.enabled) {
            // Give Lady of the Lake token to the player on the Leader's right
            const leaderIndex = this.currentLeader;
            const ladyOfLakeIndex = (leaderIndex + 1) % this.players.length;
            this.ladyOfLake.currentHolder = this.players[ladyOfLakeIndex].id;
            
            const ladyOfLakePlayer = this.players[ladyOfLakeIndex];
            authSystem.showNotification(`${ladyOfLakePlayer.name} receives the Lady of the Lake token!`, 'info');
            
            console.log(`Lady of the Lake: ${ladyOfLakePlayer.name} (${ladyOfLakePlayer.id}) receives the token`);
            console.log('Lady of Lake object after setup:', this.ladyOfLake);
        } else {
            console.log('Lady of Lake not enabled in this game');
        }
        
        // Show game interface
        this.showGameInterface();
        
        // Position players on table
        this.positionPlayers();
        
        // Start role distribution phase
        this.startRoleDistribution();
        
        // Initialize rejection counter
        this.updateRejectionCounter();
        
        // Debug: Show all roles in console
        this.debugShowAllRoles();
    }

    assignRolesFromConfig(roomConfig) {
        const playerCount = this.players.length; // Use this.players instead of roomConfig.players
        const evilCount = Math.ceil(playerCount / 3);
        const goodCount = playerCount - evilCount;
        
        console.log(`Debug: Assigning roles for ${playerCount} players - ${goodCount} good, ${evilCount} evil`);
        
        // Build role pool
        let goodRoles = ['Merlin'];
        let evilRoles = ['Assassin'];
        
        if (roomConfig.roles.percival) goodRoles.push('Percival');
        if (roomConfig.roles.morgana) evilRoles.push('Morgana');
        if (roomConfig.roles.mordred) evilRoles.push('Mordred');
        if (roomConfig.roles.oberon) evilRoles.push('Oberon');
        
        console.log(`Debug: Initial roles - Good: ${goodRoles.join(', ')}, Evil: ${evilRoles.join(', ')}`);
        
        // Fill remaining slots with generic roles
        while (goodRoles.length < goodCount) {
            goodRoles.push('Loyal Servant');
        }
        while (evilRoles.length < evilCount) {
            evilRoles.push('Minion');
        }
        
        console.log(`Debug: After filling - Good: ${goodRoles.join(', ')}, Evil: ${evilRoles.join(', ')}`);
        
        // Combine and shuffle
        const allRoles = [...goodRoles, ...evilRoles];
        const shuffled = allRoles.sort(() => Math.random() - 0.5);
        
        console.log(`Debug: Final shuffled roles: ${shuffled.join(', ')}`);
        
        // Assign roles
        this.playerRoles = {};
        this.players.forEach((player, index) => {
            this.playerRoles[player.id] = shuffled[index];
        });
        
        // Verify role distribution
        const finalEvilCount = this.players.filter(p => 
            ['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(this.playerRoles[p.id])
        ).length;
        const finalGoodCount = this.players.length - finalEvilCount;
        
        console.log(`Debug: Final verification - ${finalGoodCount} Good, ${finalEvilCount} Evil`);
        
        if (finalEvilCount !== evilCount || finalGoodCount !== goodCount) {
            console.error(`ERROR: Role distribution mismatch! Expected ${goodCount} Good, ${evilCount} Evil but got ${finalGoodCount} Good, ${finalEvilCount} Evil`);
        }
        
        // Handle Chaos for Merlin
        if (roomConfig.chaosForMerlin) {
            // Select a random good player (not Merlin) to appear as fake Oberon
            const goodPlayers = roomConfig.players.filter(p => 
                ['Loyal Servant', 'Percival'].includes(this.playerRoles[p.id])
            );
            if (goodPlayers.length > 0) {
                const fakeOberon = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
                this.fakeOberon = fakeOberon.id;
            }
        }
    }

    showGameInterface() {
        // Close lobby
        const gameLobby = document.getElementById('gameLobby');
        if (gameLobby) {
            gameLobby.style.display = 'none';
        }
        
        // Show game interface
        const gameInterface = document.getElementById('gameInterface');
        if (gameInterface) {
            gameInterface.style.display = 'block';
        }
        
        // Show debug panel in development
        const debugPanel = document.getElementById('debugPanel');
        if (debugPanel) {
            debugPanel.style.display = 'block';
        }
    }

    positionPlayers() {
        const table = document.getElementById('gameTable');
        if (!table) return;
        
        // Clear existing content
        table.innerHTML = '';
        
        // Create center display
        const centerDisplay = document.createElement('div');
        centerDisplay.className = 'center-display';
        centerDisplay.innerHTML = `
            <div style="font-size: 1.2rem; color: #ffd700; margin-bottom: 1rem;">Current Mission</div>
            <div class="mission-number" id="missionNumber">1</div>
            <div class="team-size-display" id="teamSizeDisplay">Team Size: 2</div>
            
            <!-- Rejection Counter -->
            <div class="rejection-counter" style="margin-top: 1.5rem;">
                <div style="font-size: 1rem; color: #ffd700; margin-bottom: 0.5rem;">Team Rejections</div>
                <div class="rejection-bar">
                    <div class="rejection-fill" id="rejectionFill" style="width: 0%;"></div>
                </div>
                <div class="rejection-text" id="rejectionText" style="color: #ffffff; font-size: 0.9rem; margin-top: 0.25rem;">
                    0 / 5 rejections
                </div>
            </div>
        `;
        table.appendChild(centerDisplay);
        
        // Update mission tokens to show team sizes instead of mission numbers
        this.updateMissionTokens();
        
        // Debug: Check if rejection counter elements were created
        console.log('=== REJECTION COUNTER CREATION DEBUG ===');
        console.log('Center display created:', centerDisplay);
        console.log('Looking for rejection counter elements...');
        const debugRejectionFill = document.getElementById('rejectionFill');
        const debugRejectionText = document.getElementById('rejectionText');
        console.log('rejectionFill found:', debugRejectionFill);
        console.log('rejectionText found:', debugRejectionText);
        if (debugRejectionFill) {
            console.log('rejectionFill styles:', debugRejectionFill.style.cssText);
        }
        if (debugRejectionText) {
            console.log('rejectionText content:', debugRejectionText.textContent);
        }
        
        // Position players around the table
        const radius = 250;
        const centerX = 300;
        const centerY = 300;
        
        console.log(`Positioning ${this.players.length} players around the table`);
        
        this.players.forEach((player, index) => {
            const angle = (index * 360 / this.players.length - 90) * Math.PI / 180;
            const x = centerX + radius * Math.cos(angle) - 40;
            const y = centerY + radius * Math.sin(angle) - 40;
            
            const slot = document.createElement('div');
            slot.className = 'player-slot';
            slot.style.left = x + 'px';
            slot.style.top = y + 'px';
            slot.dataset.playerId = player.id;
            
            slot.innerHTML = `
                <div class="player-avatar">${player.avatar}</div>
                <div class="player-name">${player.name}</div>
            `;
            
            // Add Lady of the Lake token if this player has it
            if (this.ladyOfLake.enabled && this.ladyOfLake.currentHolder === player.id) {
                const ladyToken = document.createElement('div');
                ladyToken.className = 'lady-of-lake-token';
                ladyToken.innerHTML = '🕵️';
                ladyToken.title = 'Lady of the Lake';
                slot.appendChild(ladyToken);
                console.log(`Added Lady of the Lake token to ${player.name}`);
            }
            
            // Debug: Add a temporary visible indicator
            console.log(`Created player slot for ${player.name} at position (${x}, ${y})`);
            
            // Add click event for team selection
            slot.addEventListener('click', () => this.selectPlayer(slot));
            
            table.appendChild(slot);
        });
        
        // Update game status panel
        this.updateGameStatusPanel();
    }

    startRoleDistribution() {
        console.log('=== STARTING ROLE DISTRIBUTION PHASE ===');
        console.log('Showing role information to all players...');
        
        // Set game phase to role distribution
        this.gamePhase = 'role_distribution';
        
        // Show notification about role distribution
        authSystem.showNotification('🎭 Role Distribution Phase - All players will see their roles privately', 'info');
        
        // Show role information to the current player (human player)
        this.showPlayerRole();
        
        // For AI players, we'll simulate them seeing their roles
        this.simulateAIRoleDistribution();
        
        // Update game status panel
        this.updateGameStatusPanel();
    }

    simulateAIRoleDistribution() {
        console.log('=== SIMULATING AI ROLE DISTRIBUTION ===');
        
        // Simulate AI players seeing their roles
        this.players.forEach(player => {
            if (player.isAI) {
                const role = this.playerRoles[player.id];
                const isEvil = ['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(role);
                
                console.log(`AI Player ${player.name} (${role}) sees their role information`);
                
                // Log what this AI player can see (for debugging)
                this.logPlayerRoleInfo(player, role);
            }
        });
    }

    logPlayerRoleInfo(player, role) {
        console.log(`--- ${player.name} (${role}) Role Information ---`);
        
        switch (role) {
            case 'Merlin':
                const evilPlayersVisibleToMerlin = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Morgana', 'Assassin', 'Minion', 'Oberon'].includes(playerRole);
                });
                console.log(`Merlin can see these evil players: ${evilPlayersVisibleToMerlin.map(p => p.name).join(', ')}`);
                console.log(`Merlin CANNOT see Mordred`);
                break;
                
            case 'Percival':
                const merlin = this.players.find(p => this.playerRoles[p.id] === 'Merlin');
                const morgana = this.players.find(p => this.playerRoles[p.id] === 'Morgana');
                const merlinCandidates = [merlin, morgana].filter(p => p);
                console.log(`Percival can see these Merlin candidates: ${merlinCandidates.map(p => p.name).join(', ')}`);
                break;
                
            case 'Morgana':
                const morganaTeammates = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Assassin', 'Minion', 'Mordred'].includes(playerRole);
                });
                console.log(`Morgana can see these evil teammates: ${morganaTeammates.map(p => p.name).join(', ')}`);
                break;
                
            case 'Assassin':
                const assassinTeammates = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Morgana', 'Minion', 'Mordred'].includes(playerRole);
                });
                console.log(`Assassin can see these evil teammates: ${assassinTeammates.map(p => p.name).join(', ')}`);
                break;
                
            case 'Mordred':
                const mordredTeammates = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Morgana', 'Assassin', 'Minion'].includes(playerRole);
                });
                console.log(`Mordred can see these evil teammates: ${mordredTeammates.map(p => p.name).join(', ')}`);
                break;
                
            case 'Oberon':
                console.log(`Oberon works alone - cannot see any other evil players`);
                break;
                
            case 'Minion':
                const minionTeammates = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Morgana', 'Assassin', 'Mordred'].includes(playerRole);
                });
                console.log(`Minion can see these evil teammates: ${minionTeammates.map(p => p.name).join(', ')}`);
                break;
                
            case 'Loyal Servant':
                console.log(`Loyal Servant cannot see any other players`);
                break;
        }
    }

    updateMissionTokens() {
        console.log('=== UPDATE MISSION TOKENS ===');
        console.log(`Updating mission tokens for ${this.players.length} players`);
        
        // Get team sizes for this player count
        const teamSizes = this.teamSize[this.players.length];
        console.log('Team sizes:', teamSizes);
        
        // Update each mission token to show team size instead of mission number
        for (let i = 1; i <= 5; i++) {
            const token = document.getElementById(`mission${i}`);
            if (token) {
                const teamSize = teamSizes[i - 1];
                token.textContent = teamSize;
                token.title = `Mission ${i} - Team Size: ${teamSize}`;
                console.log(`Mission ${i} token updated to show team size: ${teamSize}`);
            } else {
                console.error(`Mission token ${i} not found!`);
            }
        }
    }

    selectPlayer(element) {
        if (this.gamePhase !== 'team_building') return;
        
        const playerId = element.dataset.playerId;
        const teamSize = this.teamSize[this.players.length][this.currentMission - 1];
        
        if (this.selectedPlayers.includes(playerId)) {
            // Deselect
            this.selectedPlayers = this.selectedPlayers.filter(id => id !== playerId);
            element.classList.remove('selected');
        } else if (this.selectedPlayers.length < teamSize) {
            // Select
            this.selectedPlayers.push(playerId);
            element.classList.add('selected');
        } else {
            authSystem.showNotification(`You can only select ${teamSize} players for this mission.`);
        }
    }

    proposeTeam() {
        const teamSize = this.teamSize[this.players.length][this.currentMission - 1];
        if (this.selectedPlayers.length !== teamSize) {
            authSystem.showNotification(`Please select exactly ${teamSize} players for the mission.`);
            return;
        }
        
        this.gamePhase = 'voting';
        this.playerVotes = {}; // Reset votes for new team
        this.votesReceived = 0; // Reset vote counter
        
        const selectedNames = this.selectedPlayers.map(id => 
            this.players.find(p => p.id === id).name
        ).join(', ');
        
        authSystem.showNotification(`Team proposed: ${selectedNames}. All players must now vote!`);
        this.updateGameStatusPanel();
        this.updateVoteButton();
    }

    updateVoteButton() {
        const voteBtn = document.getElementById('voteTeamBtn');
        if (!voteBtn) return;
        
        if (this.gamePhase === 'voting') {
            voteBtn.innerHTML = `
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-success" onclick="gameSystem.vote(true)" style="flex: 1; padding: 0.5rem; font-size: 0.9rem;">Approve</button>
                    <button class="btn btn-danger" onclick="gameSystem.vote(false)" style="flex: 1; padding: 0.5rem; font-size: 0.9rem;">Reject</button>
                </div>
            `;
        } else {
            voteBtn.textContent = 'Vote';
        }
    }

    updateMissionButton() {
        const executeBtn = document.getElementById('executeMissionBtn');
        if (!executeBtn) {
            console.log('Execute mission button not found!');
            return;
        }
        
        console.log(`Updating mission button. Game phase: ${this.gamePhase}, Selected players: ${this.selectedPlayers.join(', ')}`);
        
        if (this.gamePhase === 'mission') {
            // Check if current player is in the mission team
            const currentPlayer = this.players[0]; // For now, assume first player
            const isInTeam = this.selectedPlayers.includes(currentPlayer.id);
            
            console.log(`Current player: ${currentPlayer.name} (${currentPlayer.id}), Is in team: ${isInTeam}`);
            
            if (isInTeam) {
                console.log('Setting Success/Fail buttons for team member');
                executeBtn.innerHTML = `
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-success" onclick="gameSystem.executeMission(true)" style="flex: 1; padding: 0.5rem; font-size: 0.9rem;">Success</button>
                        <button class="btn btn-danger" onclick="gameSystem.executeMission(false)" style="flex: 1; padding: 0.5rem; font-size: 0.9rem;">Fail</button>
                    </div>
                `;
            } else {
                console.log('Setting waiting message for non-team member');
                executeBtn.textContent = 'Waiting for team...';
                executeBtn.disabled = true;
            }
        } else {
            console.log('Setting default execute mission button');
            executeBtn.textContent = 'Execute Mission';
            executeBtn.disabled = false;
        }
    }

    resetVoteButton() {
        console.log('=== RESET VOTE BUTTON ===');
        const voteBtn = document.getElementById('voteTeamBtn');
        if (!voteBtn) {
            console.log('Vote button not found!');
            return;
        }
        
        // Reset to default state
        voteBtn.innerHTML = 'Vote';
        voteBtn.disabled = false;
        console.log('Vote button reset to default state');
    }

    resetMissionButton() {
        console.log('=== RESET MISSION BUTTON ===');
        const executeBtn = document.getElementById('executeMissionBtn');
        if (!executeBtn) {
            console.log('Execute mission button not found!');
            return;
        }
        
        // Reset to default state
        executeBtn.innerHTML = 'Execute Mission';
        executeBtn.disabled = false;
        console.log('Mission button reset to default state');
    }

    showVotingInterface() {
        if (this.gamePhase !== 'voting') {
            authSystem.showNotification('No team has been proposed yet!');
            return;
        }
        
        const modalContent = `
            <div class="voting-interface">
                <h2 style="color: #ffd700;">Vote on Team</h2>
                <p>Team members: ${this.selectedPlayers.map(id => 
                    this.players.find(p => p.id === id).name
                ).join(', ')}</p>
                <div class="vote-buttons">
                    <button class="vote-btn vote-approve" onclick="gameSystem.vote(true)">Approve</button>
                    <button class="vote-btn vote-reject" onclick="gameSystem.vote(false)">Reject</button>
                </div>
            </div>
        `;
        
        authSystem.showModal(modalContent);
    }

    vote(approved) {
        // Get current player (in a real app, this would be the logged-in user)
        const currentPlayer = this.players[0]; // For now, assume first player is voting
        
        // Check if this player already voted
        if (this.playerVotes[currentPlayer.id] !== undefined) {
            authSystem.showNotification('You have already voted!');
            return;
        }
        
        // Record the vote
        this.playerVotes[currentPlayer.id] = approved;
        this.votesReceived++;
        
        // Show vote confirmation
        const voteText = approved ? 'approved' : 'rejected';
        authSystem.showNotification(`${currentPlayer.name} ${voteText} the team.`);
        
        // Update status panel to show voting progress
        this.updateGameStatusPanel();
        
        // Check if all players have voted
        if (this.votesReceived >= this.players.length) {
            this.processVoteResults();
        }
    }
    
    processVoteResults() {
        console.log('=== PROCESS VOTE RESULTS ===');
        console.log('Player votes:', this.playerVotes);
        console.log('Votes received:', this.votesReceived);
        console.log('Total players:', this.players.length);
        
        // Count the votes
        const approvedVotes = Object.values(this.playerVotes).filter(vote => vote).length;
        const totalVotes = this.players.length;
        const teamApproved = approvedVotes > totalVotes / 2;
        
        console.log(`Approved votes: ${approvedVotes}, Total: ${totalVotes}, Team approved: ${teamApproved}`);
        
        // Show detailed vote results
        console.log('Calling showVoteResults()...');
        this.showVoteResults();
        
        // Show vote results
        const approveText = teamApproved ? 'APPROVED' : 'REJECTED';
        const color = teamApproved ? '#00b894' : '#d63031';
        
        authSystem.showNotification(`Team ${approveText}! (${approvedVotes}/${totalVotes} votes)`, 'info');
        
        if (teamApproved) {
            console.log('Team approved! Switching to mission phase');
            this.gamePhase = 'mission';
            this.rejectedTeams = 0;
            this.missionVotes = {}; // Reset mission votes
            this.missionVotesReceived = 0; // Reset mission vote counter
            this.updateGameStatusPanel();
            this.updateMissionButton();
            this.showMissionInterface();
        } else {
            this.rejectedTeams++;
            console.log(`Team rejected! Rejection count: ${this.rejectedTeams}/5`);
            
            // Update rejection counter immediately
            this.updateRejectionCounter();
            
            if (this.rejectedTeams >= 5) {
                this.endGame(false);
            } else {
                // Pass leadership to next player
                this.currentLeader = (this.currentLeader + 1) % this.players.length;
                const nextLeader = this.players[this.currentLeader];
                authSystem.showNotification(`Team rejected! ${5 - this.rejectedTeams} rejections remaining. ${nextLeader.name} is now the leader.`);
                this.startRound();
            }
        }
        
        // Reset vote button to default state
        this.resetVoteButton();
    }

    showMissionInterface() {
        if (this.gamePhase !== 'mission') {
            authSystem.showNotification('No mission in progress!');
            return;
        }
        
        const modalContent = `
            <div class="mission-interface">
                <h2 style="color: #ffd700;">Execute Mission</h2>
                <p>Team members must secretly choose Success or Fail.</p>
                <p>Good players must choose Success. Evil players can choose either.</p>
                <div class="mission-buttons">
                    <button class="mission-btn mission-success" onclick="gameSystem.executeMission(true)">Success</button>
                    <button class="mission-btn mission-fail" onclick="gameSystem.executeMission(false)">Fail</button>
                </div>
            </div>
        `;
        
        authSystem.showModal(modalContent);
    }

    executeMission(success) {
        console.log('=== EXECUTE MISSION ===');
        console.log(`Success: ${success}`);
        
        // Get current player (in a real app, this would be the logged-in user)
        const currentPlayer = this.players[0]; // For now, assume first player
        
        console.log(`Current player: ${currentPlayer.name} (${currentPlayer.id})`);
        console.log(`Selected players: ${this.selectedPlayers.join(', ')}`);
        console.log(`Player in team: ${this.selectedPlayers.includes(currentPlayer.id)}`);
        
        // Check if this player already voted
        if (this.missionVotes[currentPlayer.id] !== undefined) {
            authSystem.showNotification('You have already voted on this mission!');
            return;
        }
        
        // Check if player is in the mission team
        if (!this.selectedPlayers.includes(currentPlayer.id)) {
            authSystem.showNotification('You are not part of this mission team!');
            return;
        }
        
        // Record the vote
        this.missionVotes[currentPlayer.id] = success;
        this.missionVotesReceived++;
        
        console.log(`Mission votes received: ${this.missionVotesReceived}/${this.selectedPlayers.length}`);
        console.log(`Mission votes:`, this.missionVotes);
        
        // Show vote confirmation (private)
        const voteText = success ? 'Success' : 'Fail';
        authSystem.showNotification(`${currentPlayer.name} voted ${voteText} (private)`, 'info');
        
        // Update status panel to show voting progress
        this.updateGameStatusPanel();
        
        // Check if all team members have voted
        if (this.missionVotesReceived >= this.selectedPlayers.length) {
            console.log('All team members voted, calling processMissionResults()');
            this.processMissionResults();
        } else {
            console.log('Not all team members voted yet');
        }
    }
    
    processMissionResults() {
        console.log('Processing mission results...');
        
        // Count the mission votes
        const successVotes = Object.values(this.missionVotes).filter(vote => vote).length;
        const failVotes = Object.values(this.missionVotes).filter(vote => !vote).length;
        const totalVotes = this.selectedPlayers.length;
        
        console.log(`Mission votes - Success: ${successVotes}, Fail: ${failVotes}, Total: ${totalVotes}`);
        
        // Determine if mission succeeds (fails required depends on player count and mission)
        const failsRequired = this.failsRequired[this.players.length][this.currentMission - 1];
        const missionSuccess = failVotes < failsRequired;
        
        console.log(`Mission ${this.currentMission} - Fails required: ${failsRequired}, Mission success: ${missionSuccess}`);
        
        // Update mission token FIRST
        const token = document.getElementById(`mission${this.currentMission}`);
        if (token) {
            token.classList.add(missionSuccess ? 'success' : 'fail');
            token.innerHTML = missionSuccess ? '✓' : '✗';
        }
        
        // Show fail count under mission token AFTER updating the token
        setTimeout(() => {
            this.showMissionFailCount(failVotes);
        }, 100);
        
        this.missionResults.push(missionSuccess);
        
        // Check for game end
        const successes = this.missionResults.filter(r => r).length;
        const failures = this.missionResults.filter(r => !r).length;
        
        // Check if Lady of the Lake can be used after this mission
        console.log('=== LADY OF LAKE CHECK ===');
        console.log('Mission completed:', this.currentMission);
        console.log('Lady of Lake enabled:', this.ladyOfLake.enabled);
        console.log('Uses remaining:', this.ladyOfLake.usesRemaining);
        console.log('Can use after missions:', this.ladyOfLake.canUseAfterMission);
        console.log('Current mission in allowed list:', this.ladyOfLake.canUseAfterMission.includes(this.currentMission));
        
        if (this.ladyOfLake.enabled && this.ladyOfLake.usesRemaining > 0 && 
            this.ladyOfLake.canUseAfterMission.includes(this.currentMission)) {
            console.log(`Mission ${this.currentMission} completed - Lady of the Lake can be used`);
            this.triggerLadyOfLake();
        } else {
            console.log('Lady of Lake NOT triggered because:');
            if (!this.ladyOfLake.enabled) console.log('- Lady of Lake not enabled');
            if (this.ladyOfLake.usesRemaining <= 0) console.log('- No uses remaining');
            if (!this.ladyOfLake.canUseAfterMission.includes(this.currentMission)) console.log('- Mission not in allowed list');
        }
        
        if (successes >= 3) {
            // Good wins (unless assassin identifies Merlin)
            this.assassinPhase();
        } else if (failures >= 3) {
            this.endGame(false);
        } else {
            // Add 15-second delay before starting next mission
            this.showMissionTransition();
        }
        
        // Update game status panel
        this.updateGameStatusPanel();
        this.updateMissionButton();
        
        // Reset mission button to default state
        this.resetMissionButton();
    }

    showVoteResults() {
        console.log('=== SHOW VOTE RESULTS ===');
        console.log('Showing vote results inline on player slots...');
        
        // Count votes
        const approvedVotes = Object.values(this.playerVotes).filter(vote => vote).length;
        const rejectedVotes = Object.values(this.playerVotes).filter(vote => !vote).length;
        const totalVotes = this.players.length;
        const teamApproved = approvedVotes > totalVotes / 2;
        
        console.log(`Vote counts - Approved: ${approvedVotes}, Rejected: ${rejectedVotes}, Total: ${totalVotes}, Team approved: ${teamApproved}`);
        
        // Show team result notification
        const resultText = teamApproved ? 'APPROVED' : 'REJECTED';
        const resultColor = teamApproved ? '#00b894' : '#d63031';
        authSystem.showNotification(`Team ${resultText}! (${approvedVotes}/${totalVotes} votes)`, 'info');
        
        // Add vote indicators to each player slot
        this.players.forEach(player => {
            const vote = this.playerVotes[player.id];
            const playerSlot = document.querySelector(`[data-player-id="${player.id}"]`);
            
            if (playerSlot) {
                // Remove any existing vote indicator
                const existingIndicator = playerSlot.querySelector('.vote-indicator');
                if (existingIndicator) {
                    existingIndicator.remove();
                }
                
                // Create vote indicator
                const voteIndicator = document.createElement('div');
                voteIndicator.className = 'vote-indicator';
                voteIndicator.style.cssText = `
                    position: absolute;
                    top: -10px;
                    right: -10px;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: bold;
                    color: white;
                    border: 2px solid white;
                    z-index: 10;
                    animation: voteIndicatorAppear 0.5s ease-out;
                `;
                
                if (vote) {
                    voteIndicator.style.background = '#00b894';
                    voteIndicator.textContent = '✓';
                    voteIndicator.title = 'Approved';
                } else {
                    voteIndicator.style.background = '#d63031';
                    voteIndicator.textContent = '✗';
                    voteIndicator.title = 'Rejected';
                }
                
                playerSlot.appendChild(voteIndicator);
                console.log(`Added vote indicator for ${player.name}: ${vote ? 'Approve' : 'Reject'}`);
            }
        });
        
        // Auto-remove vote indicators after 10 seconds
        setTimeout(() => {
            this.players.forEach(player => {
                const playerSlot = document.querySelector(`[data-player-id="${player.id}"]`);
                if (playerSlot) {
                    const voteIndicator = playerSlot.querySelector('.vote-indicator');
                    if (voteIndicator) {
                        voteIndicator.remove();
                        console.log(`Removed vote indicator for ${player.name}`);
                    }
                }
            });
        }, 10000);
    }
    
    showMissionFailCount(failVotes) {
        console.log(`=== SHOW MISSION FAIL COUNT ===`);
        console.log(`Current mission: ${this.currentMission}`);
        console.log(`Fail votes: ${failVotes}`);
        
        // Find the mission token
        const token = document.getElementById(`mission${this.currentMission}`);
        console.log(`Looking for token with ID: mission${this.currentMission}`);
        console.log(`Token found:`, token);
        
        if (!token) {
            console.log(`Mission token ${this.currentMission} not found!`);
            // Let's check what mission tokens exist
            const allTokens = document.querySelectorAll('.mission-token');
            console.log(`All mission tokens found:`, allTokens);
            allTokens.forEach((t, i) => {
                console.log(`Token ${i}: id="${t.id}", text="${t.textContent}"`);
            });
            return;
        }
        
        console.log(`Showing fail count: ${failVotes} fails for mission ${this.currentMission}`);
        
        // Create a fail count display under the token
        const failDisplay = document.createElement('div');
        failDisplay.className = 'mission-fail-count';
        failDisplay.textContent = `${failVotes} fail${failVotes !== 1 ? 's' : ''}`;
        failDisplay.style.cssText = `
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(214, 48, 49, 0.95);
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.9rem;
            font-weight: bold;
            z-index: 1000;
            border: 2px solid #d63031;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6);
            white-space: nowrap;
            min-width: 40px;
            text-align: center;
        `;
        
        console.log(`Created fail display element:`, failDisplay);
        console.log(`Fail display text: "${failDisplay.textContent}"`);
        
        // Add to the token container
        token.appendChild(failDisplay);
        
        console.log(`Fail count display added to mission ${this.currentMission}`);
        console.log(`Token now has ${token.children.length} children`);
        
        // Remove after 10 seconds
        setTimeout(() => {
            if (failDisplay.parentNode) {
                failDisplay.parentNode.removeChild(failDisplay);
                console.log(`Fail count display removed from mission ${this.currentMission}`);
            }
        }, 10000);
        
        // Show notification
        const missionResult = failVotes < this.failsRequired[this.players.length][this.currentMission - 1] ? 'SUCCESS' : 'FAIL';
        authSystem.showNotification(`Mission ${this.currentMission}: ${missionResult} (${failVotes} fail${failVotes !== 1 ? 's' : ''})`, 'info');
    }

    showMissionTransition() {
        const nextMission = this.currentMission + 1;
        const nextLeader = this.players[(this.currentLeader + 1) % this.players.length];
        
        // Set game phase to transition
        this.gamePhase = 'transition';
        
        // Show transition message (removed the 15-second notification)
        authSystem.showNotification(`Mission ${this.currentMission} completed!`, 'info');
        
        // Create a countdown display
        const countdownDisplay = document.createElement('div');
        countdownDisplay.className = 'mission-countdown';
        countdownDisplay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #ffd700;
            padding: 2rem;
            border-radius: 15px;
            border: 2px solid #ffd700;
            font-size: 1.5rem;
            font-weight: bold;
            text-align: center;
            z-index: 2000;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        `;
        
        document.body.appendChild(countdownDisplay);
        
        // Update status panel
        this.updateGameStatusPanel();
        
        let countdown = 15;
        const updateCountdown = () => {
            if (countdown > 0) {
                countdownDisplay.innerHTML = `
                    <div style="margin-bottom: 1rem;">Mission ${this.currentMission} Complete!</div>
                    <div style="font-size: 2rem; margin-bottom: 1rem;">${countdown}</div>
                    <div>Next mission starting...</div>
                    <div style="font-size: 1rem; margin-top: 1rem; color: #ffffff;">
                        ${nextLeader.name} will be the next leader
                    </div>
                `;
                countdown--;
                setTimeout(updateCountdown, 1000);
            } else {
                // Remove countdown display
                if (countdownDisplay.parentNode) {
                    countdownDisplay.parentNode.removeChild(countdownDisplay);
                }
                
                // Start next mission
                this.currentMission++;
                this.currentLeader = (this.currentLeader + 1) % this.players.length;
                this.startRound();
            }
        };
        
        updateCountdown();
    }

    assassinPhase() {
        const assassin = this.players.find(p => this.playerRoles[p.id] === 'Assassin');
        if (assassin) {
            authSystem.showNotification('Good has succeeded! But the Assassin may still identify Merlin...');
            
            // Show assassin interface
            setTimeout(() => {
                this.showAssassinInterface();
            }, 2000);
        } else {
            this.endGame(true);
        }
    }

    showAssassinInterface() {
        const modalContent = `
            <div class="assassin-interface">
                <h2 style="color: #ff6b6b;">Assassin Phase</h2>
                <p>Good has won three quests! The Assassin must identify Merlin to win.</p>
                <div class="player-selection">
                    <h3>Select who you think is Merlin:</h3>
                    ${this.players.map(player => `
                        <button class="btn btn-secondary" onclick="gameSystem.assassinateMerlin('${player.id}')" 
                                style="margin: 0.5rem; display: block; width: 100%;">
                            ${player.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        authSystem.showModal(modalContent);
    }

    assassinateMerlin(playerId) {
        const merlin = this.players.find(p => this.playerRoles[p.id] === 'Merlin');
        const assassinatedPlayer = this.players.find(p => p.id === playerId);
        
        authSystem.closeModals();
        
        if (merlin && merlin.id === playerId) {
            authSystem.showNotification(`The Assassin correctly identified Merlin! Evil wins!`, 'error');
            this.endGame(false);
        } else {
            authSystem.showNotification(`The Assassin failed! Good wins!`, 'success');
            this.endGame(true);
        }
    }

    startRound() {
        this.gamePhase = 'team_building';
        this.selectedPlayers = []; // Clear previous selections
        
        const leader = this.players[this.currentLeader];
        authSystem.showNotification(`${leader.name} is the leader. Select ${this.teamSize[this.players.length][this.currentMission - 1]} players for the mission.`);
        
        // Update display
        const missionNumber = document.getElementById('missionNumber');
        const teamSizeDisplay = document.getElementById('teamSizeDisplay');
        
        if (missionNumber) missionNumber.textContent = this.currentMission;
        if (teamSizeDisplay) teamSizeDisplay.textContent = `Team Size: ${this.teamSize[this.players.length][this.currentMission - 1]}`;
        
        // Update mission tokens to show team sizes
        this.updateMissionTokens();
        
        // Clear any previous selections from UI
        this.clearPlayerSelections();
        
        // Reset buttons to default state
        this.resetVoteButton();
        this.resetMissionButton();
        
        // Highlight current leader
        this.highlightLeader();
        
        // Update game status panel
        this.updateGameStatusPanel();
    }

    highlightLeader() {
        // Remove previous leader highlighting
        const playerSlots = document.querySelectorAll('.player-slot');
        playerSlots.forEach(slot => slot.classList.remove('leader'));
        
        // Highlight current leader
        const leaderSlot = document.querySelector(`[data-player-id="${this.players[this.currentLeader].id}"]`);
        if (leaderSlot) {
            leaderSlot.classList.add('leader');
        }
    }

    clearPlayerSelections() {
        // Remove selected class from all player slots
        const playerSlots = document.querySelectorAll('.player-slot');
        playerSlots.forEach(slot => slot.classList.remove('selected'));
        
        // Clear the selected players array
        this.selectedPlayers = [];
        
        console.log('Cleared all player selections');
    }

    updateGameStatusPanel() {
        const statusPanel = document.getElementById('gameStatusPanel');
        const statusContent = document.getElementById('gameStatusContent');
        if (!statusPanel || !statusContent) return;
        
        let statusHTML = '';
        
        switch (this.gamePhase) {
            case 'role_distribution':
                statusHTML = `
                    <p><strong>🎭 Role Distribution Phase</strong></p>
                    <div class="role-info">
                        <p>All players are now seeing their roles privately.</p>
                        <p>Each player can see:</p>
                        <ul style="text-align: left; margin: 1rem 0;">
                            <li><strong>Merlin:</strong> Evil players (except Mordred)</li>
                            <li><strong>Percival:</strong> Merlin and Morgana candidates</li>
                            <li><strong>Evil players:</strong> Their evil teammates</li>
                            <li><strong>Loyal Servant:</strong> No one</li>
                        </ul>
                        <p style="color: #ffd700; font-style: italic;">Click "Start Game" in your role popup when ready!</p>
                    </div>
                `;
                break;
                
            case 'team_building':
                const leader = this.players[this.currentLeader];
                const teamSize = this.teamSize[this.players.length][this.currentMission - 1];
                const selectedNames = this.selectedPlayers.map(id => 
                    this.players.find(p => p.id === id).name
                ).join(', ');
                
                statusHTML = `
                    <p><strong>Current Leader:</strong> <span class="current-leader">${leader.name}</span> 👑</p>
                    <div class="team-info">
                        <p><strong>Team Building Phase</strong></p>
                        <p>Select ${teamSize} players for Mission ${this.currentMission}</p>
                        <p>Selected: ${this.selectedPlayers.length}/${teamSize}</p>
                        ${this.selectedPlayers.length > 0 ? `<p><strong>Selected Players:</strong></p><p>${selectedNames}</p>` : ''}
                    </div>
                    <p><strong>Mission ${this.currentMission}</strong> of 5</p>
                    <p><strong>Rejected Teams:</strong> ${this.rejectedTeams}/5</p>
                    ${this.ladyOfLake.enabled ? `<p><strong>🕵️ Lady of the Lake:</strong> ${this.players.find(p => p.id === this.ladyOfLake.currentHolder)?.name || 'None'} (${this.ladyOfLake.usesRemaining}/3 uses remaining)</p>` : ''}
                    <p style="color: #ffd700; font-style: italic;">💡 Click on player circles to select/deselect them</p>
                `;
                break;
                
            case 'voting':
                const proposedTeamNames = this.selectedPlayers.map(id => 
                    this.players.find(p => p.id === id).name
                ).join(', ');
                statusHTML = `
                    <p><strong>Voting Phase</strong></p>
                    <div class="vote-info">
                        <p><strong>Proposed Team:</strong></p>
                        <p>${proposedTeamNames}</p>
                    </div>
                    <p>Votes received: ${this.votesReceived}/${this.players.length}</p>
                    <p>All players must vote to approve or reject this team.</p>
                    <p><strong>Rejected Teams:</strong> ${this.rejectedTeams}/5</p>
                    ${this.ladyOfLake.enabled ? `<p><strong>🕵️ Lady of the Lake:</strong> ${this.players.find(p => p.id === this.ladyOfLake.currentHolder)?.name || 'None'} (${this.ladyOfLake.usesRemaining}/3 uses remaining)</p>` : ''}
                `;
                break;
                
            case 'mission':
                const teamNames = this.selectedPlayers.map(id => 
                    this.players.find(p => p.id === id).name
                ).join(', ');
                statusHTML = `
                    <p><strong>Mission Phase</strong></p>
                    <div class="mission-info">
                        <p><strong>Mission ${this.currentMission}</strong></p>
                        <p><strong>Team:</strong> ${teamNames}</p>
                        <p>Mission votes: ${this.missionVotesReceived}/${this.selectedPlayers.length}</p>
                        <p>Team members must secretly choose Success or Fail.</p>
                        <p>Good players must choose Success.</p>
                        <p>Evil players can choose either.</p>
                    </div>
                `;
                break;
                
            case 'transition':
                const nextLeader = this.players[(this.currentLeader + 1) % this.players.length];
                statusHTML = `
                    <p><strong>Mission Transition</strong></p>
                    <div class="mission-info">
                        <p><strong>Mission ${this.currentMission} Complete!</strong></p>
                        <p>Next mission starting in 15 seconds...</p>
                        <p><strong>Next Leader:</strong> ${nextLeader.name}</p>
                        <p>Check mission results below!</p>
                    </div>
                `;
                break;
                
            default:
                statusHTML = `
                    <p>Game is ready to begin!</p>
                    <p>Click "Propose Team" to start building your team.</p>
                `;
        }
        
        statusContent.innerHTML = statusHTML;
        
        // Update rejection counter
        this.updateRejectionCounter();
    }

    updateRejectionCounter() {
        console.log('=== UPDATE REJECTION COUNTER ===');
        console.log('Looking for rejection counter elements...');
        
        const rejectionFill = document.getElementById('rejectionFill');
        const rejectionText = document.getElementById('rejectionText');
        
        console.log('rejectionFill element:', rejectionFill);
        console.log('rejectionText element:', rejectionText);
        
        if (!rejectionFill || !rejectionText) {
            console.error('Rejection counter elements not found!');
            console.log('Available elements with "rejection" in ID:');
            document.querySelectorAll('[id*="rejection"]').forEach(el => {
                console.log('Found element:', el.id, el);
            });
            return;
        }
        
        const maxRejections = 5;
        const currentRejections = this.rejectedTeams || 0;
        const percentage = (currentRejections / maxRejections) * 100;
        
        console.log(`Current rejections: ${currentRejections}, Percentage: ${percentage}%`);
        
        // Update the progress bar
        rejectionFill.style.width = `${percentage}%`;
        console.log('Updated progress bar width to:', rejectionFill.style.width);
        
        // Update the text
        rejectionText.textContent = `${currentRejections} / ${maxRejections} rejections`;
        console.log('Updated text to:', rejectionText.textContent);
        
        // Change color based on rejection count
        if (currentRejections >= 4) {
            rejectionFill.style.background = '#d63031'; // Red - danger
            rejectionText.style.color = '#d63031';
            console.log('Set colors to RED (danger)');
        } else if (currentRejections >= 2) {
            rejectionFill.style.background = '#f39c12'; // Orange - warning
            rejectionText.style.color = '#f39c12';
            console.log('Set colors to ORANGE (warning)');
        } else {
            rejectionFill.style.background = '#00b894'; // Green - safe
            rejectionText.style.color = '#00b894';
            console.log('Set colors to GREEN (safe)');
        }
        
        console.log(`Successfully updated rejection counter: ${currentRejections}/${maxRejections} (${percentage}%)`);
    }

    triggerLadyOfLake() {
        console.log('=== TRIGGER LADY OF LAKE ===');
        console.log('Function called successfully');
        
        if (!this.ladyOfLake.enabled) {
            console.log('Lady of the Lake not enabled');
            return;
        }
        
        if (this.ladyOfLake.usesRemaining <= 0) {
            console.log('No uses remaining');
            return;
        }
        
        const currentHolder = this.players.find(p => p.id === this.ladyOfLake.currentHolder);
        if (!currentHolder) {
            console.error('Lady of the Lake holder not found');
            console.log('Current holder ID:', this.ladyOfLake.currentHolder);
            console.log('Available players:', this.players.map(p => ({id: p.id, name: p.name})));
            return;
        }
        
        console.log(`Triggering Lady of the Lake for ${currentHolder.name}`);
        console.log('About to call showLadyOfLakeInterface...');
        
        // Show notification to human player
        if (currentHolder.isAI) {
            authSystem.showNotification(`🕵️ ${currentHolder.name} has the Lady of Lake token and can examine a player's loyalty!`, 'info');
        } else {
            authSystem.showNotification(`🕵️ ${currentHolder.name}, you can now use the Lady of Lake token to examine a player's loyalty!`, 'info');
        }
        
        // Show Lady of the Lake interface
        this.showLadyOfLakeInterface(currentHolder);
        
        console.log('showLadyOfLakeInterface called');
    }

    showLadyOfLakeInterface(ladyOfLakePlayer) {
        console.log('=== SHOW LADY OF LAKE INTERFACE ===');
        console.log('Function called with player:', ladyOfLakePlayer);
        console.log('Available players:', this.players.map(p => ({id: p.id, name: p.name})));
        console.log('Previous holders:', this.ladyOfLake.previousHolders);
        
        // Filter available players
        const availablePlayers = this.players.filter(player => 
            player.id !== ladyOfLakePlayer.id && 
            !this.ladyOfLake.previousHolders.includes(player.id)
        );
        
        console.log('Available players for selection:', availablePlayers.map(p => p.name));
        
        const modalContent = `
            <div class="lady-of-lake-interface">
                <h2 style="color: #ffd700;">🕵️ Lady of the Lake</h2>
                <p><strong>${ladyOfLakePlayer.name}</strong> has the Lady of the Lake token.</p>
                ${ladyOfLakePlayer.isAI ? 
                    `<p style="color: #ffd700; font-style: italic;">💡 Since ${ladyOfLakePlayer.name} is an AI player, you will make this decision for them.</p>` : 
                    `<p>Choose a player to examine their loyalty (Good or Evil).</p>`
                }
                <p><em>Note: You cannot choose someone who has already used the Lady of the Lake.</em></p>
                
                <div class="player-selection">
                    <h3>Select Player to Examine:</h3>
                    <div class="player-options">
                        ${availablePlayers.map(player => `
                            <button class="player-option" onclick="gameSystem.examinePlayerLoyalty('${player.id}')">
                                <span class="player-avatar">${player.avatar}</span>
                                <span class="player-name">${player.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="lady-info">
                    <p><strong>Uses Remaining:</strong> ${this.ladyOfLake.usesRemaining}/3</p>
                    <p><strong>Previous Holders:</strong> ${this.ladyOfLake.previousHolders.length > 0 ? 
                        this.ladyOfLake.previousHolders.map(id => this.players.find(p => p.id === id)?.name).join(', ') : 'None'}</p>
                </div>
            </div>
        `;
        
        console.log('Modal content created, calling authSystem.showModal...');
        console.log('Modal content length:', modalContent.length);
        
        // Create a dedicated modal for Lady of the Lake instead of reusing auth modal
        console.log('Creating dedicated Lady of Lake modal...');
        
        // Remove any existing Lady of Lake modal
        const existingModal = document.getElementById('ladyOfLakeModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create new modal
        const modal = document.createElement('div');
        modal.id = 'ladyOfLakeModal';
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content';
        modalContentDiv.innerHTML = modalContent;
        modalContentDiv.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #ffd700;
            border-radius: 15px;
            padding: 2rem;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
        `;
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 20px;
            font-size: 28px;
            font-weight: bold;
            color: #ffd700;
            cursor: pointer;
            z-index: 10;
        `;
        closeBtn.onclick = () => modal.remove();
        
        modalContentDiv.appendChild(closeBtn);
        modal.appendChild(modalContentDiv);
        document.body.appendChild(modal);
        
        console.log('Dedicated Lady of Lake modal created successfully');
        console.log('Modal element:', modal);
        console.log('Modal display style:', modal.style.display);
        console.log('Modal z-index:', modal.style.zIndex);
    }

    examinePlayerLoyalty(targetPlayerId) {
        const targetPlayer = this.players.find(p => p.id === targetPlayerId);
        const currentHolder = this.players.find(p => p.id === this.ladyOfLake.currentHolder);
        
        if (!targetPlayer || !currentHolder) {
            console.error('Player not found for loyalty examination');
            return;
        }
        
        console.log(`Lady of the Lake: ${currentHolder.name} wants to examine ${targetPlayer.name}`);
        
        // First, show notification to the target player asking for permission
        this.showLoyaltyPermissionRequest(targetPlayer, currentHolder);
    }
    
    showLoyaltyPermissionRequest(targetPlayer, currentHolder) {
        console.log(`=== SHOW LADY OF LAKE EXAMINATION NOTIFICATION ===`);
        console.log(`Showing loyalty examination notification for ${targetPlayer.name} (${targetPlayer.isAI ? 'AI' : 'Human'} player)`);
        console.log(`Current holder: ${currentHolder.name}`);
        console.log(`This is the MANDATORY examination - no refusal allowed!`);
        
        // The Lady of the Lake examination is mandatory - no refusal allowed
        const notificationContent = `
            <div class="loyalty-examination-notification">
                <h2 style="color: #ffd700;">🕵️ Lady of the Lake</h2>
                <div class="examination-message">
                    <p><strong>${currentHolder.name}</strong> is examining <strong>${targetPlayer.name}</strong>'s loyalty using the Lady of the Lake.</p>
                    <p style="color: #ffd700; font-style: italic;">This will reveal whether ${targetPlayer.name} is Good or Evil to ${currentHolder.name}.</p>
                    <p><em>The examination is mandatory - ${targetPlayer.name} cannot refuse.</em></p>
                    ${targetPlayer.isAI ? '<p style="color: #ffd700; font-size: 0.9rem;">💡 Since this is an AI player, you are witnessing this examination.</p>' : ''}
                </div>
                <div class="examination-buttons">
                    <button class="btn btn-primary" onclick="gameSystem.proceedWithLoyaltyExamination('${targetPlayer.id}')" style="margin: 0 auto; display: block;">
                        Proceed with Mandatory Examination
                    </button>
                </div>
            </div>
        `;
        
        // Create dedicated modal for examination notification
        console.log('Creating loyalty examination notification modal...');
        
        // Remove any existing examination modal
        const existingModal = document.getElementById('loyaltyExaminationModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create new modal
        const modal = document.createElement('div');
        modal.id = 'loyaltyExaminationModal';
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content';
        modalContentDiv.innerHTML = notificationContent;
        modalContentDiv.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #ffd700;
            border-radius: 15px;
            padding: 2rem;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
        `;
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 20px;
            font-size: 28px;
            font-weight: bold;
            color: #ffd700;
            cursor: pointer;
            z-index: 10;
        `;
        closeBtn.onclick = () => modal.remove();
        
        modalContentDiv.appendChild(closeBtn);
        modal.appendChild(modalContentDiv);
        document.body.appendChild(modal);
        
        console.log('Loyalty examination notification modal created successfully');
    }
    
    proceedWithLoyaltyExamination(targetPlayerId) {
        console.log(`Proceeding with loyalty examination for player ${targetPlayerId}`);
        
        // Close examination notification modal
        const examinationModal = document.getElementById('loyaltyExaminationModal');
        if (examinationModal) {
            examinationModal.remove();
        }
        
        // Now show the loyalty result
        this.showLoyaltyResult(targetPlayerId);
    }
    
    showLoyaltyResult(targetPlayerId) {
        const targetPlayer = this.players.find(p => p.id === targetPlayerId);
        const currentHolder = this.players.find(p => p.id === this.ladyOfLake.currentHolder);
        
        if (!targetPlayer || !currentHolder) {
            console.error('Player not found for loyalty examination');
            return;
        }
        
        // Get the target player's role and determine if they're good or evil
        const targetRole = this.playerRoles[targetPlayerId];
        const isEvil = ['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(targetRole);
        const loyalty = isEvil ? 'Evil' : 'Good';
        
        console.log(`Lady of the Lake: ${currentHolder.name} examines ${targetPlayer.name} - ${loyalty}`);
        
        // Show loyalty result to the current holder
        const resultContent = `
            <div class="loyalty-result">
                <h3 style="color: #ffd700;">Loyalty Examination Result</h3>
                <div class="result-display">
                    <div class="player-info">
                        <span class="player-avatar">${targetPlayer.avatar}</span>
                        <span class="player-name">${targetPlayer.name}</span>
                    </div>
                    <div class="loyalty-result-text">
                        <span class="loyalty-label">Loyalty:</span>
                        <span class="loyalty-value ${isEvil ? 'evil' : 'good'}">${loyalty}</span>
                    </div>
                </div>
                <p style="margin-top: 1rem; font-style: italic; color: #ffd700;">
                    The Lady of the Lake token will now be passed to ${targetPlayer.name}.
                </p>
                <button class="btn btn-primary" onclick="gameSystem.passLadyOfLakeToken('${targetPlayerId}')">
                    Pass Token to ${targetPlayer.name}
                </button>
            </div>
        `;
        
        // Create dedicated modal for loyalty result
        console.log('Creating loyalty result modal...');
        
        // Remove any existing loyalty result modal
        const existingModal = document.getElementById('loyaltyResultModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create new modal
        const modal = document.createElement('div');
        modal.id = 'loyaltyResultModal';
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content';
        modalContentDiv.innerHTML = resultContent;
        modalContentDiv.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #ffd700;
            border-radius: 15px;
            padding: 2rem;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
        `;
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 20px;
            font-size: 28px;
            font-weight: bold;
            color: #ffd700;
            cursor: pointer;
            z-index: 10;
        `;
        closeBtn.onclick = () => modal.remove();
        
        modalContentDiv.appendChild(closeBtn);
        modal.appendChild(modalContentDiv);
        document.body.appendChild(modal);
        
        console.log('Loyalty result modal created successfully');
    }

    passLadyOfLakeToken(newHolderId) {
        console.log('=== PASS LADY OF LAKE TOKEN ===');
        console.log('Function called with newHolderId:', newHolderId);
        console.log('Current holder before passing:', this.ladyOfLake.currentHolder);
        
        const oldHolder = this.players.find(p => p.id === this.ladyOfLake.currentHolder);
        const newHolder = this.players.find(p => p.id === newHolderId);
        
        console.log('Old holder found:', oldHolder);
        console.log('New holder found:', newHolder);
        
        if (!oldHolder || !newHolder) {
            console.error('Player not found for token passing');
            console.log('Old holder:', oldHolder);
            console.log('New holder:', newHolder);
            return;
        }
        
        // Check if trying to pass to same player
        if (oldHolder.id === newHolder.id) {
            console.error('Cannot pass token to the same player!');
            authSystem.showNotification('Cannot pass token to the same player!', 'error');
            return;
        }
        
        // Add old holder to previous holders list
        this.ladyOfLake.previousHolders.push(this.ladyOfLake.currentHolder);
        
        // Update current holder
        this.ladyOfLake.currentHolder = newHolderId;
        
        // Decrease uses remaining
        this.ladyOfLake.usesRemaining--;
        
        console.log(`Lady of the Lake token passed from ${oldHolder.name} to ${newHolder.name}`);
        console.log(`Uses remaining: ${this.ladyOfLake.usesRemaining}`);
        console.log(`Previous holders: ${this.ladyOfLake.previousHolders.map(id => this.players.find(p => p.id === id)?.name).join(', ')}`);
        
        // Show notification
        authSystem.showNotification(`Lady of the Lake token passed to ${newHolder.name}!`, 'info');
        
        // Close only the Lady of Lake modals, not the game interface
        console.log('Closing Lady of Lake modals...');
        
        // Check if game interface is still visible before closing modals
        const gameInterface = document.getElementById('gameInterface');
        console.log('Game interface before closing modals:', gameInterface);
        console.log('Game interface display style:', gameInterface?.style.display);
        
        // Close the Lady of Lake selection modal
        const ladyOfLakeModal = document.getElementById('ladyOfLakeModal');
        if (ladyOfLakeModal) {
            ladyOfLakeModal.remove();
            console.log('Removed ladyOfLakeModal');
        }
        
        // Close the loyalty result modal
        const resultModal = document.getElementById('loyaltyResultModal');
        if (resultModal) {
            resultModal.remove();
            console.log('Removed loyaltyResultModal');
        }
        
        // Close the examination notification modal if it exists
        const examinationModal = document.getElementById('loyaltyExaminationModal');
        if (examinationModal) {
            examinationModal.remove();
            console.log('Removed loyaltyExaminationModal');
        }
        
        // Also try to close any other Lady of Lake related modals
        const ladyModals = document.querySelectorAll('[id*="lady"], [id*="loyalty"]');
        ladyModals.forEach(modal => {
            if (modal.id !== 'gameInterface') { // Don't close the main game interface
                modal.remove();
                console.log('Removed modal:', modal.id);
            }
        });
        
        // Check if game interface is still visible after closing modals
        console.log('Game interface after closing modals:', document.getElementById('gameInterface'));
        console.log('Game interface display style after:', document.getElementById('gameInterface')?.style.display);
        
        // Update player display to show new token holder
        this.updateLadyOfLakeDisplay();
    }

    updateLadyOfLakeDisplay() {
        console.log('=== UPDATE LADY OF LAKE DISPLAY ===');
        console.log('Removing old tokens...');
        
        // Remove old tokens
        const oldTokens = document.querySelectorAll('.lady-of-lake-token');
        console.log('Found old tokens:', oldTokens.length);
        oldTokens.forEach(token => {
            console.log('Removing token:', token);
            token.remove();
        });
        
        // Add new token to current holder
        if (this.ladyOfLake.enabled && this.ladyOfLake.currentHolder) {
            console.log('Adding new token to holder:', this.ladyOfLake.currentHolder);
            const playerSlot = document.querySelector(`[data-player-id="${this.ladyOfLake.currentHolder}"]`);
            if (playerSlot) {
                console.log('Found player slot:', playerSlot);
                const ladyToken = document.createElement('div');
                ladyToken.className = 'lady-of-lake-token';
                ladyToken.innerHTML = '🕵️';
                ladyToken.title = 'Lady of the Lake';
                playerSlot.appendChild(ladyToken);
                console.log(`Updated Lady of the Lake token display for ${this.players.find(p => p.id === this.ladyOfLake.currentHolder)?.name}`);
            } else {
                console.error('Player slot not found for ID:', this.ladyOfLake.currentHolder);
                console.log('Available player slots:', document.querySelectorAll('[data-player-id]').length);
            }
        } else {
            console.log('Lady of Lake not enabled or no current holder');
        }
    }

    showPlayerRole() {
        if (!authSystem.getCurrentUser()) return;
        
        const currentUserId = authSystem.getCurrentUser().id;
        const role = this.playerRoles[currentUserId];
        const isEvil = ['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(role);
        
        console.log(`=== SHOWING ROLE FOR ${authSystem.getCurrentUser().name} ===`);
        console.log(`Role: ${role}`);
        console.log(`Is Evil: ${isEvil}`);
        
        let roleInfo = '';
        let specialInfo = '';
        
        // Implement proper Avalon rulebook role visibility
        switch (role) {
            case 'Merlin':
                // Merlin sees all evil players EXCEPT Mordred
                const evilPlayersVisibleToMerlin = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Morgana', 'Assassin', 'Minion', 'Oberon'].includes(playerRole);
                });
                
                roleInfo = `<div class="role-info">
                    <h4>🔍 You can see these EVIL players:</h4>
                    <p style="color: #ccc; font-size: 0.9rem; margin: 0.5rem 0;">📝 = Player Name | 🏷️ = Loyalty</p>
                    <div class="player-list evil-players" style="width: 100%; min-width: 400px;">
                        ${evilPlayersVisibleToMerlin.map(p => `
                            <div class="player-item evil" style="display: flex; align-items: center; gap: 10px; padding: 10px; margin: 5px 0; background: rgba(255, 107, 107, 0.1); border-radius: 8px; border: 1px solid rgba(255, 107, 107, 0.5); width: 100%; min-width: 300px; max-width: none;">
                                <span class="player-name" style="flex: 1; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: visible; min-width: 0; font-size: 1.2rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); display: block; width: 100%; max-width: none;">${p.name}</span>
                                <span class="role-badge" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: #fff; flex-shrink: 0;">Evil</span>
                            </div>
                        `).join('')}
                    </div>
                    <p class="warning-text">⚠️ You CANNOT see Mordred - they appear as Good to you!</p>
                </div>`;
                break;
                
            case 'Percival':
                // Percival sees Merlin and Morgana (but can't tell which is which)
                const merlin = this.players.find(p => this.playerRoles[p.id] === 'Merlin');
                const morgana = this.players.find(p => this.playerRoles[p.id] === 'Morgana');
                const merlinCandidates = [merlin, morgana].filter(p => p);
                
                roleInfo = `<div class="role-info">
                    <h4>👑 You can see these players (one is Merlin, one is Morgana):</h4>
                    <p style="color: #ccc; font-size: 0.9rem; margin: 0.5rem 0;">📝 = Player Name | 🏷️ = Loyalty</p>
                    <div class="player-list merlin-candidates" style="width: 100%; min-width: 400px;">
                        ${merlinCandidates.map(p => `
                            <div class="player-item merlin-candidate" style="display: flex; align-items: center; gap: 10px; padding: 10px; margin: 5px 0; background: rgba(255, 215, 0, 0.1); border-radius: 8px; border: 1px solid rgba(255, 215, 0, 0.5); width: 100%; min-width: 300px; max-width: none;">
                                <span class="player-name" style="flex: 1; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: visible; min-width: 0; font-size: 1.2rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); display: block; width: 100%; max-width: none;">${p.name}</span>
                                <span class="role-badge" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; background: linear-gradient(135deg, #ffd700, #ffed4e); color: #000; flex-shrink: 0;">Merlin or Morgana</span>
                            </div>
                        `).join('')}
                    </div>
                    <p class="info-text">💡 You must figure out which one is the real Merlin!</p>
                </div>`;
                break;
                
            case 'Morgana':
                // Morgana sees all evil teammates except Oberon
                const morganaTeammates = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Assassin', 'Minion', 'Mordred'].includes(playerRole);
                });
                
                roleInfo = `<div class="role-info">
                    <h4>👥 Your evil teammates:</h4>
                    <p style="color: #ccc; font-size: 0.9rem; margin: 0.5rem 0;">📝 = Player Name | 🏷️ = Loyalty</p>
                    <div class="player-list evil-teammates" style="width: 100%; min-width: 400px;">
                        ${morganaTeammates.map(p => `
                            <div class="player-item evil" style="display: flex; align-items: center; gap: 10px; padding: 10px; margin: 5px 0; background: rgba(255, 107, 107, 0.1); border-radius: 8px; border: 1px solid rgba(255, 107, 107, 0.5); width: 100%; min-width: 300px; max-width: none;">
                                <span class="player-name" style="flex: 1; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: visible; min-width: 0; font-size: 1.2rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); display: block; width: 100%; max-width: none;">${p.name}</span>
                                <span class="role-badge" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: #fff; flex-shrink: 0;">Evil</span>
                            </div>
                        `).join('')}
                    </div>
                    <p class="info-text">🎭 You appear as Merlin to Percival!</p>
                </div>`;
                break;
                
            case 'Assassin':
                // Assassin sees all evil teammates except Oberon
                const assassinTeammates = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Morgana', 'Minion', 'Mordred'].includes(playerRole);
                });
                
                roleInfo = `<div class="role-info">
                    <h4>👥 Your evil teammates:</h4>
                    <p style="color: #ccc; font-size: 0.9rem; margin: 0.5rem 0;">📝 = Player Name | 🏷️ = Loyalty</p>
                    <div class="player-list evil-teammates" style="width: 100%; min-width: 400px;">
                        ${assassinTeammates.map(p => `
                            <div class="player-item evil" style="display: flex; align-items: center; gap: 10px; padding: 10px; margin: 5px 0; background: rgba(255, 107, 107, 0.1); border-radius: 8px; border: 1px solid rgba(255, 107, 107, 0.5); width: 100%; min-width: 300px; max-width: none;">
                                <span class="player-name" style="flex: 1; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: visible; min-width: 0; font-size: 1.2rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); display: block; width: 100%; max-width: none;">${p.name}</span>
                                <span class="role-badge" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: #fff; flex-shrink: 0;">Evil</span>
                            </div>
                        `).join('')}
                    </div>
                    <p class="warning-text">🗡️ If Good wins, you can still win by identifying Merlin!</p>
                </div>`;
                break;
                
            case 'Mordred':
                // Mordred sees all evil teammates except Oberon
                const mordredTeammates = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Morgana', 'Assassin', 'Minion'].includes(playerRole);
                });
                
                roleInfo = `<div class="role-info">
                    <h4>👥 Your evil teammates:</h4>
                    <p style="color: #ccc; font-size: 0.9rem; margin: 0.5rem 0;">📝 = Player Name | 🏷️ = Loyalty</p>
                    <div class="player-list evil-teammates" style="width: 100%; min-width: 400px;">
                        ${mordredTeammates.map(p => `
                            <div class="player-item evil" style="display: flex; align-items: center; gap: 10px; padding: 10px; margin: 5px 0; background: rgba(255, 107, 107, 0.1); border-radius: 8px; border: 1px solid rgba(255, 107, 107, 0.5); width: 100%; min-width: 300px; max-width: none;">
                                <span class="player-name" style="flex: 1; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: visible; min-width: 0; font-size: 1.2rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); display: block; width: 100%; max-width: none;">${p.name}</span>
                                <span class="role-badge" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: #fff; flex-shrink: 0;">Evil</span>
                            </div>
                        `).join('')}
                    </div>
                    <p class="warning-text">👻 You are invisible to Merlin - they cannot see you!</p>
                </div>`;
                break;
                
            case 'Oberon':
                // Oberon sees no one (works alone)
                roleInfo = `<div class="role-info">
                    <h4>🕴️ You work alone:</h4>
                    <p class="info-text">You don't know who the other evil players are, and they don't know you.</p>
                    <p class="warning-text">⚠️ You must figure out who your teammates are through gameplay!</p>
                </div>`;
                break;
                
            case 'Minion':
                // Minion sees all evil teammates except Oberon
                const minionTeammates = this.players.filter(p => {
                    const playerRole = this.playerRoles[p.id];
                    return ['Morgana', 'Assassin', 'Mordred'].includes(playerRole);
                });
                
                roleInfo = `<div class="role-info">
                    <h4>👥 Your evil teammates:</h4>
                    <p style="color: #ccc; font-size: 0.9rem; margin: 0.5rem 0;">📝 = Player Name | 🏷️ = Loyalty</p>
                    <div class="player-list evil-teammates" style="width: 100%; min-width: 400px;">
                        ${minionTeammates.map(p => `
                            <div class="player-item evil" style="display: flex; align-items: center; gap: 10px; padding: 10px; margin: 5px 0; background: rgba(255, 107, 107, 0.1); border-radius: 8px; border: 1px solid rgba(255, 107, 107, 0.5); width: 100%; min-width: 300px; max-width: none;">
                                <span class="player-name" style="flex: 1; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: visible; min-width: 0; font-size: 1.2rem; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); display: block; width: 100%; max-width: none;">${p.name}</span>
                                <span class="role-badge" style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: #fff; flex-shrink: 0;">Evil</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
                break;
                
            case 'Loyal Servant':
                // Loyal Servant sees no one
                roleInfo = `<div class="role-info">
                    <h4>🛡️ You are a loyal servant of Good:</h4>
                    <p class="info-text">You don't know who the other players are. Use your deduction skills to identify the evil players!</p>
                </div>`;
                break;
                
            default:
                roleInfo = `<div class="role-info">
                    <h4>❓ Unknown role</h4>
                </div>`;
        }
        
        // Determine button text based on game phase
        const buttonText = this.gamePhase === 'role_distribution' ? 'Start Game' : 'Continue';
        const buttonAction = this.gamePhase === 'role_distribution' ? 'gameSystem.startFirstRound()' : 'authSystem.closeModals()';
        
        const modalContent = `
            <div class="role-modal">
                <h2 style="color: ${isEvil ? '#ff6b6b' : '#00b894'};">Your Role</h2>
                <div class="role-name ${isEvil ? 'evil' : 'good'}">${role}</div>
                <div class="role-description">${this.getRoleDescription(role)}</div>
                ${roleInfo}
                ${this.gamePhase === 'role_distribution' ? 
                    '<p style="color: #ffd700; font-style: italic; margin: 1rem 0;">🎭 All players are now seeing their roles privately. When ready, click "Start Game" to begin!</p>' : 
                    ''
                }
                <button class="btn btn-primary" onclick="${buttonAction}">${buttonText}</button>
            </div>
        `;
        
        // Create dedicated modal for role display instead of using auth modal
        this.createRoleModal(modalContent);
    }

    createRoleModal(content) {
        console.log('=== CREATING ROLE MODAL ===');
        
        // Remove any existing role modal
        const existingModal = document.getElementById('roleModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create new modal
        const modal = document.createElement('div');
        modal.id = 'roleModal';
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContentDiv = document.createElement('div');
        modalContentDiv.className = 'modal-content';
        modalContentDiv.innerHTML = content;
        modalContentDiv.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #ffd700;
            border-radius: 15px;
            padding: 2rem;
            max-width: 800px;
            min-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            overflow-x: visible;
            position: relative;
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
        `;
        
        // Add close button
        const closeBtn = document.createElement('span');
        closeBtn.className = 'close';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 20px;
            font-size: 28px;
            font-weight: bold;
            color: #ffd700;
            cursor: pointer;
            z-index: 10;
        `;
        closeBtn.onclick = () => {
            if (this.gamePhase === 'role_distribution') {
                this.startFirstRound();
            } else {
                modal.remove();
            }
        };
        
        modalContentDiv.appendChild(closeBtn);
        modal.appendChild(modalContentDiv);
        document.body.appendChild(modal);
        
        console.log('Role modal created successfully');
    }

    startFirstRound() {
        console.log('=== STARTING FIRST ROUND ===');
        console.log('Player has seen their role and is ready to start the game');
        
        // Close the role modal
        const roleModal = document.getElementById('roleModal');
        if (roleModal) {
            roleModal.remove();
        }
        
        // Set game phase to team building
        this.gamePhase = 'team_building';
        
        // Show notification that the game is starting
        authSystem.showNotification('🎮 Game Starting! The first leader will now select players for Mission 1', 'success');
        
        // Start the first round
        this.startRound();
    }

    getRoleDescription(role) {
        const descriptions = {
            'Merlin': 'You know who the evil players are (except Mordred). Keep your identity hidden from the Assassin!',
            'Percival': 'You know who Merlin is (but Morgana also appears as Merlin to you).',
            'Morgana': 'You are evil. You appear as Merlin to Percival. Fail missions and protect the Assassin.',
            'Assassin': 'You are evil. If Good wins, you can still win by correctly identifying Merlin.',
            'Mordred': 'You are evil but invisible to Merlin. Use this to infiltrate Good\'s plans.',
            'Oberon': 'You are evil but work alone. You don\'t know other evil players and they don\'t know you.',
            'Loyal Servant': 'You are good. Deduce who to trust and succeed in quests.',
            'Minion': 'You are evil. Work with your evil teammates to fail quests.'
        };
        return descriptions[role] || 'Unknown role';
    }

    endGame(goodWins) {
        this.gamePhase = 'game_over';
        
        // Update stats
        this.updateGameStats(goodWins);
        
        const modalContent = `
            <h2 style="color: ${goodWins ? '#00b894' : '#ff6b6b'};">
                ${goodWins ? 'Good Wins!' : 'Evil Wins!'}
            </h2>
            <div style="margin: 2rem 0;">
                <h3>Final Roles:</h3>
                ${this.players.map(p => 
                    `<p>${p.name}: ${this.playerRoles[p.id]}</p>`
                ).join('')}
            </div>
            <button class="btn btn-primary" onclick="gameSystem.resetGame()">Play Again</button>
            <button class="btn btn-secondary" onclick="gameSystem.leaveGame()">Leave Game</button>
        `;
        
        authSystem.showModal(modalContent);
    }

    updateGameStats(goodWins) {
        const currentUser = authSystem.getCurrentUser();
        if (!currentUser) return;
        
        const userRole = this.playerRoles[currentUser.id];
        const isGood = !['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(userRole);
        
        const stats = authSystem.getUserStats() || {};
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        
        if (goodWins && isGood) {
            stats.wins = (stats.wins || 0) + 1;
        } else if (!goodWins && !isGood) {
            stats.wins = (stats.wins || 0) + 1;
        }
        
        if (userRole === 'Merlin') {
            stats.timesAsMerlin = (stats.timesAsMerlin || 0) + 1;
        }
        
        if (userRole === 'Assassin' && !goodWins) {
            stats.successfulAssassinations = (stats.successfulAssassinations || 0) + 1;
        }
        
        authSystem.updateUserStats(stats);
    }

    resetGame() {
        authSystem.closeModals();
        this.startGame(this.currentGame);
    }

    leaveGame() {
        authSystem.closeModals();
        
        // Close game interface
        const gameInterface = document.getElementById('gameInterface');
        if (gameInterface) {
            gameInterface.style.display = 'none';
        }
        
        // Reset game state
        this.currentGame = null;
        this.players = [];
        this.playerRoles = {};
        this.currentMission = 1;
        this.missionResults = [];
        this.selectedPlayers = [];
        this.votes = [];
        this.rejectedTeams = 0;
        this.gamePhase = 'waiting';
        this.currentLeader = 0;
        this.ladyOfLakeHolder = null;
        this.chaosForMerlin = false;
        this.fakeOberon = null;
        
        authSystem.showNotification('Game ended', 'info');
    }

    getCurrentGame() {
        return this.currentGame;
    }

    getPlayerRole(playerId) {
        return this.playerRoles[playerId];
    }

    isGameActive() {
        return this.gamePhase !== 'waiting' && this.gamePhase !== 'game_over';
    }

    // Add AI players for testing
    addAIPlayers(roomConfig) {
        const aiNames = [
            'Arthur', 'Lancelot', 'Guinevere', 'Morgan', 'Gawain', 
            'Tristan', 'Isolde', 'Percival', 'Galahad', 'Bedivere'
        ];
        
        const players = [...roomConfig.players]; // Start with the real player
        const neededPlayers = roomConfig.maxPlayers - players.length;
        
        for (let i = 0; i < neededPlayers; i++) {
            const aiName = aiNames[i];
            const aiPlayer = {
                name: aiName,
                id: `ai_${i + 1}`,
                avatar: aiName.charAt(0),
                isAI: true
            };
            players.push(aiPlayer);
        }
        
        return players;
    }

    // Debug functions for testing
    debugShowAllRoles() {
        console.log('🎭 === AVALON GAME DEBUG === 🎭');
        console.log(`Players: ${this.players.length}`);
        console.log('Role Distribution:');
        
        if (!this.players || this.players.length === 0) {
            console.log('No players found!');
            return;
        }
        
        this.players.forEach(player => {
            const role = this.playerRoles[player.id];
            const isEvil = ['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(role);
            const aiIndicator = player.isAI ? ' (AI)' : '';
            console.log(`  ${player.name}${aiIndicator}: ${role} (${isEvil ? 'Evil' : 'Good'})`);
        });
        
        const evilCount = this.players.filter(p => 
            ['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(this.playerRoles[p.id])
        ).length;
        const goodCount = this.players.length - evilCount;
        
        console.log(`\nTotal: ${goodCount} Good, ${evilCount} Evil`);
        console.log('Current Mission:', this.currentMission);
        console.log('Game Phase:', this.gamePhase);
        console.log('===============================');
        
        // Also show in a notification
        authSystem.showNotification(`Debug: ${goodCount} Good, ${evilCount} Evil players`, 'info');
    }

    // Simulate a full game for testing
    debugSimulateGame() {
        console.log('🎮 Starting game simulation...');
        
        // Simulate through all 5 missions
        for (let mission = 1; mission <= 5; mission++) {
            console.log(`\n--- Mission ${mission} ---`);
            
            // Simulate team building
            const teamSize = this.teamSize[this.players.length][mission - 1];
            console.log(`Team size: ${teamSize}`);
            
            // Simulate voting (random)
            const votePassed = Math.random() > 0.3;
            console.log(`Vote: ${votePassed ? 'PASSED' : 'FAILED'}`);
            
            if (votePassed) {
                // Simulate mission (random)
                const missionSuccess = Math.random() > 0.4;
                console.log(`Mission: ${missionSuccess ? 'SUCCESS' : 'FAIL'}`);
                
                if (missionSuccess) {
                    this.missionResults.push(true);
                } else {
                    this.missionResults.push(false);
                }
                
                // Check for game end
                const successes = this.missionResults.filter(r => r).length;
                const failures = this.missionResults.filter(r => !r).length;
                
                if (successes >= 3) {
                    console.log('🎉 Good wins! (3 successes)');
                    break;
                } else if (failures >= 3) {
                    console.log('💀 Evil wins! (3 failures)');
                    break;
                }
            } else {
                console.log('Vote failed, moving to next leader');
            }
        }
        
        console.log('\nFinal mission results:', this.missionResults);
    }

    // Function to simulate AI votes for testing
    simulateAIVotes() {
        if (this.gamePhase !== 'voting') {
            authSystem.showNotification('No voting in progress!');
            return;
        }
        
        // Simulate votes for all AI players
        this.players.forEach(player => {
            if (player.isAI && this.playerVotes[player.id] === undefined) {
                // AI players vote randomly but with some strategy
                const isEvil = ['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(this.playerRoles[player.id]);
                let vote;
                
                if (isEvil) {
                    // Evil players are more likely to reject teams
                    vote = Math.random() > 0.4;
                } else {
                    // Good players are more likely to approve teams
                    vote = Math.random() > 0.3;
                }
                
                this.playerVotes[player.id] = vote;
                this.votesReceived++;
                
                const voteText = vote ? 'approved' : 'rejected';
                console.log(`AI ${player.name} ${voteText} the team`);
            }
        });
        
        // Update status panel
        this.updateGameStatusPanel();
        
        // Check if all players have voted
        if (this.votesReceived >= this.players.length) {
            this.processVoteResults();
        }
    }

    // Function to simulate AI mission votes for testing
    simulateAIMissionVotes() {
        console.log('=== SIMULATE AI MISSION VOTES ===');
        console.log(`Game phase: ${this.gamePhase}`);
        console.log(`Selected players: ${this.selectedPlayers.join(', ')}`);
        
        if (this.gamePhase !== 'mission') {
            authSystem.showNotification('No mission in progress!');
            return;
        }
        
        // Simulate mission votes for AI players in the team
        this.players.forEach(player => {
            if (player.isAI && this.selectedPlayers.includes(player.id) && this.missionVotes[player.id] === undefined) {
                // AI players vote based on their role
                const isEvil = ['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(this.playerRoles[player.id]);
                let vote;
                
                if (isEvil) {
                    // Evil players can choose to fail (with some probability)
                    vote = Math.random() > 0.3; // 70% chance to fail
                } else {
                    // Good players must choose success
                    vote = true;
                }
                
                this.missionVotes[player.id] = vote;
                this.missionVotesReceived++;
                
                const voteText = vote ? 'Success' : 'Fail';
                console.log(`AI ${player.name} voted ${voteText} on mission`);
            }
        });
        
        console.log(`Mission votes received: ${this.missionVotesReceived}/${this.selectedPlayers.length}`);
        console.log(`Mission votes:`, this.missionVotes);
        
        // Update status panel
        this.updateGameStatusPanel();
        
        // Check if all team members have voted
        if (this.missionVotesReceived >= this.selectedPlayers.length) {
            console.log('All team members voted, calling processMissionResults()');
            this.processMissionResults();
        } else {
            console.log('Not all team members voted yet');
        }
    }
}

// Initialize game system
const gameSystem = new GameSystem();
