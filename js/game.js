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
        
        // Assign roles based on room configuration
        this.assignRolesFromConfig(roomConfig);
        
        // Setup Lady of the Lake if enabled
        if (roomConfig.ladyOfLake) {
            const randomPlayer = Math.floor(Math.random() * this.players.length);
            this.ladyOfLakeHolder = this.players[randomPlayer].id;
            authSystem.showNotification(`${this.players[randomPlayer].name} receives the Lady of the Lake token!`, 'info');
        }
        
        // Show game interface
        this.showGameInterface();
        
        // Position players on table
        this.positionPlayers();
        
        // Show role to current player
        this.showPlayerRole();
        
        // Start first round
        this.startRound();
        
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
        `;
        table.appendChild(centerDisplay);
        
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
            
            // Debug: Add a temporary visible indicator
            console.log(`Created player slot for ${player.name} at position (${x}, ${y})`);
            
            // Add click event for team selection
            slot.addEventListener('click', () => this.selectPlayer(slot));
            
            table.appendChild(slot);
        });
        
        // Update game status panel
        this.updateGameStatusPanel();
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
    }

    showVoteResults() {
        console.log('=== SHOW VOTE RESULTS ===');
        console.log('Creating vote results overlay...');
        
        // Create a voting results overlay
        const overlay = document.createElement('div');
        overlay.className = 'vote-results-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1500;
            backdrop-filter: blur(5px);
        `;
        
        // Count votes
        console.log('Counting votes in showVoteResults...');
        console.log('this.playerVotes:', this.playerVotes);
        console.log('this.players:', this.players);
        
        const approvedVotes = Object.values(this.playerVotes).filter(vote => vote).length;
        const rejectedVotes = Object.values(this.playerVotes).filter(vote => !vote).length;
        const totalVotes = this.players.length;
        const teamApproved = approvedVotes > totalVotes / 2;
        
        console.log(`Vote counts - Approved: ${approvedVotes}, Rejected: ${rejectedVotes}, Total: ${totalVotes}, Team approved: ${teamApproved}`);
        
        // Create vote results content
        const resultsContent = document.createElement('div');
        resultsContent.className = 'vote-results-content';
        resultsContent.style.cssText = `
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.8));
            border: 2px solid ${teamApproved ? '#00b894' : '#d63031'};
            border-radius: 15px;
            padding: 2rem;
            text-align: center;
            min-width: 500px;
            max-width: 600px;
            box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
        `;
        
        // Create header
        const header = document.createElement('h2');
        header.style.cssText = `
            color: #ffd700;
            margin-bottom: 1.5rem;
            font-size: 1.8rem;
        `;
        header.textContent = 'Team Vote Results';
        
        // Create vote summary
        const summary = document.createElement('div');
        summary.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            padding: 1rem;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(255, 215, 0, 0.3);
        `;
        
        const resultText = teamApproved ? 'APPROVED' : 'REJECTED';
        const resultColor = teamApproved ? '#00b894' : '#d63031';
        
        summary.innerHTML = `
            <div style="font-size: 1.5rem; font-weight: bold; color: ${resultColor}; margin-bottom: 0.5rem;">
                Team ${resultText}
            </div>
            <div style="color: #ffffff; font-size: 1.1rem;">
                ${approvedVotes} Approve • ${rejectedVotes} Reject
            </div>
        `;
        
        // Create individual vote display
        const voteList = document.createElement('div');
        voteList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        `;
        
        this.players.forEach(player => {
            const vote = this.playerVotes[player.id];
            const voteDisplay = document.createElement('div');
            voteDisplay.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border-left: 4px solid ${vote ? '#00b894' : '#d63031'};
            `;
            
            voteDisplay.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">${player.avatar}</span>
                    <span style="color: #ffffff; font-weight: bold;">${player.name}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="color: ${vote ? '#00b894' : '#d63031'}; font-weight: bold; font-size: 1.1rem;">
                        ${vote ? '✓ Approve' : '✗ Reject'}
                    </span>
                </div>
            `;
            
            voteList.appendChild(voteDisplay);
        });
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.style.cssText = `
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #000;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        `;
        closeButton.textContent = 'Continue';
        closeButton.onclick = () => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        };
        
        // Assemble the content
        resultsContent.appendChild(header);
        resultsContent.appendChild(summary);
        resultsContent.appendChild(voteList);
        resultsContent.appendChild(closeButton);
        
        console.log('Content assembled, adding to overlay...');
        overlay.appendChild(resultsContent);
        
        console.log('Adding overlay to document body...');
        document.body.appendChild(overlay);
        
        console.log('Overlay added to DOM. Checking if it exists...');
        console.log('Overlay in DOM:', document.querySelector('.vote-results-overlay'));
        console.log('Overlay styles:', overlay.style.cssText);
        console.log('Overlay dimensions:', overlay.offsetWidth, 'x', overlay.offsetHeight);
        
        // Add a temporary test element to see if anything is visible
        const testElement = document.createElement('div');
        testElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: red;
            color: white;
            padding: 20px;
            z-index: 10000;
            font-size: 24px;
            font-weight: bold;
        `;
        testElement.textContent = 'VOTE RESULTS TEST - CLICK TO REMOVE';
        testElement.onclick = () => testElement.remove();
        document.body.appendChild(testElement);
        console.log('Test element added:', testElement);
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                console.log('Overlay auto-closed after 10 seconds');
            }
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
        
        // Clear any previous selections from UI
        this.clearPlayerSelections();
        
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
    }

    showPlayerRole() {
        if (!authSystem.getCurrentUser()) return;
        
        const role = this.playerRoles[authSystem.getCurrentUser().id];
        const isEvil = ['Morgana', 'Assassin', 'Mordred', 'Oberon', 'Minion'].includes(role);
        
        let roleInfo = '';
        if (role === 'Merlin') {
            const evilPlayers = this.players.filter(p => {
                const playerRole = this.playerRoles[p.id];
                return ['Morgana', 'Assassin', 'Minion', 'Oberon'].includes(playerRole) && playerRole !== 'Mordred';
            });
            roleInfo = `<div class="role-info">
                <h4>Evil players you can see:</h4>
                <p>${evilPlayers.map(p => p.name).join(', ')}</p>
            </div>`;
        } else if (isEvil && role !== 'Oberon') {
            const evilTeammates = this.players.filter(p => {
                const playerRole = this.playerRoles[p.id];
                return ['Morgana', 'Assassin', 'Minion', 'Mordred'].includes(playerRole) && 
                       playerRole !== 'Oberon' && 
                       p.id !== authSystem.getCurrentUser().id;
            });
            roleInfo = `<div class="role-info">
                <h4>Your evil teammates:</h4>
                <p>${evilTeammates.map(p => p.name).join(', ')}</p>
            </div>`;
        }
        
        const modalContent = `
            <div class="role-modal">
                <h2 style="color: ${isEvil ? '#ff6b6b' : '#00b894'};">Your Role</h2>
                <div class="role-name ${isEvil ? 'evil' : 'good'}">${role}</div>
                <div class="role-description">${this.getRoleDescription(role)}</div>
                ${roleInfo}
                <button class="btn btn-primary" onclick="authSystem.closeModals()">Continue</button>
            </div>
        `;
        
        authSystem.showModal(modalContent);
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
