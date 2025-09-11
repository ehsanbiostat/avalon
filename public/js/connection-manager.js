// Real-time Connection Manager with Robust Reconnection
class RealTimeConnectionManager {
    constructor() {
        this.maxRetries = 10;
        this.retryCount = 0;
        this.baseDelay = 1000; // 1 second
        this.maxDelay = 30000; // 30 seconds
        this.isReconnecting = false;
        this.activeChannels = new Map();
        this.pollingInterval = null;
        this.healthCheckInterval = null;
    }

    async handleConnectionError(error, channelName) {
        console.error(`❌ Real-time connection failed for ${channelName}:`, error);
        
        if (this.isReconnecting) {
            console.log('🔄 Already reconnecting, skipping...');
            return;
        }
        
        this.isReconnecting = true;
        await this.attemptReconnection(channelName);
    }

    async attemptReconnection(channelName) {
        while (this.retryCount < this.maxRetries) {
            const delay = Math.min(
                this.baseDelay * Math.pow(2, this.retryCount), 
                this.maxDelay
            );
            
            console.log(`🔄 Attempting reconnection ${this.retryCount + 1}/${this.maxRetries} in ${delay}ms`);
            
            await this.wait(delay);
            
            try {
                // Remove failed channel
                const oldChannel = this.activeChannels.get(channelName);
                if (oldChannel) {
                    supabase.removeChannel(oldChannel);
                    this.activeChannels.delete(channelName);
                }
                
                // Create new channel
                await this.recreateChannel(channelName);
                
                console.log('✅ Reconnection successful');
                this.resetRetryState();
                return;
                
            } catch (error) {
                console.error(`❌ Reconnection attempt ${this.retryCount + 1} failed:`, error);
                this.retryCount++;
            }
        }
        
        console.error('❌ Max reconnection attempts reached');
        this.handleMaxRetriesReached();
    }

    async recreateChannel(channelName) {
        if (channelName.includes('room-')) {
            const roomId = channelName.replace('room-', '');
            await this.setupRoomSubscription(roomId);
        } else if (channelName.includes('players-')) {
            const roomId = channelName.replace('players-', '');
            await this.setupPlayersSubscription(roomId);
        } else if (channelName.includes('game-')) {
            const roomId = channelName.replace('game-', '');
            await this.setupCombinedSubscription(roomId);
        }
    }

    async setupCombinedSubscription(roomId) {
        const channel = supabase
            .channel(`game-${roomId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_rooms',
                filter: `id=eq.${roomId}`
            }, (payload) => {
                console.log('🔄 Room updated via real-time:', payload.new);
                if (window.supabaseRoomsSystem) {
                    window.supabaseRoomsSystem.handleGameRoomChange(payload);
                }
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'room_players',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                console.log('🔄 Players updated via real-time:', payload);
                if (window.supabaseRoomsSystem) {
                    window.supabaseRoomsSystem.handleRoomPlayersChange(payload);
                }
            })
            .on('system', {}, (payload) => {
                if (payload.extension === 'postgres_changes') {
                    console.log('📡 Combined subscription status:', payload.status);
                    this.updateConnectionStatus(payload.status);
                }
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Combined subscription active');
                    this.activeChannels.set(`game-${roomId}`, channel);
                    this.updateConnectionStatus('connected');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('❌ Combined subscription failed:', err);
                    this.handleConnectionError(err, `game-${roomId}`);
                }
            });
    }

    async setupRoomSubscription(roomId) {
        const channel = supabase
            .channel(`room-${roomId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'game_rooms',
                filter: `id=eq.${roomId}`
            }, (payload) => {
                console.log('🔄 Room updated via real-time:', payload.new);
                if (window.supabaseRoomsSystem) {
                    window.supabaseRoomsSystem.handleGameRoomChange(payload);
                }
            })
            .on('system', {}, (payload) => {
                if (payload.extension === 'postgres_changes') {
                    console.log('📡 Room subscription status:', payload.status);
                    this.updateConnectionStatus(payload.status);
                }
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Room subscription active');
                    this.activeChannels.set(`room-${roomId}`, channel);
                    this.updateConnectionStatus('connected');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('❌ Room subscription failed:', err);
                    this.handleConnectionError(err, `room-${roomId}`);
                }
            });
    }

    async setupPlayersSubscription(roomId) {
        const channel = supabase
            .channel(`players-${roomId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'room_players',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                console.log('🔄 Players updated via real-time:', payload);
                if (window.supabaseRoomsSystem) {
                    window.supabaseRoomsSystem.handleRoomPlayersChange(payload);
                }
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Players subscription active');
                    this.activeChannels.set(`players-${roomId}`, channel);
                    this.updateConnectionStatus('connected');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('❌ Players subscription failed:', err);
                    this.handleConnectionError(err, `players-${roomId}`);
                }
            });
    }

    handleMaxRetriesReached() {
        console.log('🔄 Switching to polling fallback');
        this.startPollingFallback();
        
        // Show user notification
        this.updateConnectionStatus('error', 'Using backup sync');
        if (window.supabaseRoomsSystem && window.supabaseRoomsSystem.showNotification) {
            window.supabaseRoomsSystem.showNotification(
                'Connection issues detected. Using backup sync method.', 
                'warning'
            );
        }
    }

    startPollingFallback() {
        // Fallback to periodic updates every 5 seconds
        this.pollingInterval = setInterval(async () => {
            try {
                await this.refreshGameState();
            } catch (error) {
                console.error('❌ Polling fallback failed:', error);
            }
        }, 5000);
    }

    async refreshGameState() {
        if (!window.supabaseRoomsSystem || !window.supabaseRoomsSystem.currentRoom) return;
        
        const currentRoom = window.supabaseRoomsSystem.currentRoom;
        
        try {
            // Fetch latest room state
            const { data: room } = await supabase
                .from('game_rooms')
                .select('*')
                .eq('id', currentRoom.id)
                .single();
            
            if (room) {
                console.log('🔄 Polling: Room state refreshed');
                if (window.supabaseRoomsSystem.handleGameRoomChange) {
                    window.supabaseRoomsSystem.handleGameRoomChange({ new: room });
                }
            }
            
            // Fetch latest players
            const { data: players } = await supabase
                .from('room_players')
                .select('*')
                .eq('room_id', currentRoom.id);
            
            if (players) {
                console.log('🔄 Polling: Players state refreshed');
                if (window.supabaseRoomsSystem.handleRoomPlayersChange) {
                    window.supabaseRoomsSystem.handleRoomPlayersChange({ 
                        new: players, 
                        eventType: 'UPDATE' 
                    });
                }
            }
        } catch (error) {
            console.error('❌ Polling refresh failed:', error);
        }
    }

    resetRetryState() {
        this.retryCount = 0;
        this.isReconnecting = false;
        
        // Stop polling if it was active
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    updateConnectionStatus(status, message = '') {
        const indicator = document.getElementById('connectionStatus');
        if (!indicator) return;
        
        const dot = indicator.querySelector('.status-dot');
        const text = indicator.querySelector('.status-text');
        
        if (!dot || !text) return;
        
        // Remove all status classes
        dot.className = 'status-dot';
        
        switch (status) {
            case 'connected':
            case 'SUBSCRIBED':
                dot.classList.add('connected');
                text.textContent = 'Connected';
                break;
            case 'connecting':
            case 'CONNECTING':
                dot.classList.add('connecting');
                text.textContent = 'Connecting...';
                break;
            case 'disconnected':
            case 'CLOSED':
                dot.classList.add('disconnected');
                text.textContent = 'Disconnected';
                break;
            case 'error':
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
                dot.classList.add('error');
                text.textContent = message || 'Connection Error';
                break;
        }
    }

    startConnectionHealthCheck(roomId) {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.healthCheckInterval = setInterval(() => {
            const hasActiveChannel = this.activeChannels.has(`game-${roomId}`) || 
                                   this.activeChannels.has(`room-${roomId}`);
            
            if (!hasActiveChannel) {
                console.log('🔄 No active channel found, attempting to reconnect...');
                this.setupCombinedSubscription(roomId);
            }
        }, 10000); // Check every 10 seconds
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanup() {
        // Clean up all channels
        this.activeChannels.forEach((channel, name) => {
            console.log(`🧹 Cleaning up channel: ${name}`);
            supabase.removeChannel(channel);
        });
        this.activeChannels.clear();
        
        // Stop polling
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        // Stop health check
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        this.resetRetryState();
    }
}

// Subscription Manager for centralized subscription handling
class SubscriptionManager {
    constructor() {
        this.activeSubscriptions = new Map();
        this.connectionManager = new RealTimeConnectionManager();
    }

    async subscribeToRoom(roomId) {
        // Clean up existing subscription first
        this.unsubscribeFromRoom(roomId);
        
        console.log('📡 Setting up room subscriptions for:', roomId);
        
        try {
            // Use combined subscription for efficiency
            await this.connectionManager.setupCombinedSubscription(roomId);
            
            this.activeSubscriptions.set(roomId, {
                roomId,
                status: 'connecting',
                lastUpdate: Date.now()
            });
            
            // Start health monitoring
            this.connectionManager.startConnectionHealthCheck(roomId);
            
        } catch (error) {
            console.error('❌ Failed to create subscription:', error);
            this.connectionManager.handleConnectionError(error, `game-${roomId}`);
        }
    }

    unsubscribeFromRoom(roomId) {
        const subscription = this.activeSubscriptions.get(roomId);
        if (subscription) {
            console.log('🔌 Unsubscribing from room:', roomId);
            this.connectionManager.cleanup();
            this.activeSubscriptions.delete(roomId);
        }
    }

    unsubscribeAll() {
        console.log('🔌 Unsubscribing from all rooms');
        this.connectionManager.cleanup();
        this.activeSubscriptions.clear();
    }

    getConnectionStatus(roomId) {
        const subscription = this.activeSubscriptions.get(roomId);
        return subscription ? subscription.status : 'disconnected';
    }
}

// Connection Status Indicator
function addConnectionStatusIndicator() {
    // Remove existing indicator if present
    const existing = document.getElementById('connectionStatus');
    if (existing) {
        existing.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.id = 'connectionStatus';
    indicator.className = 'connection-status';
    indicator.innerHTML = `
        <div class="status-dot connecting"></div>
        <span class="status-text">Connecting...</span>
    `;
    
    // Add to page
    document.body.appendChild(indicator);
}

function addConnectionStatusCSS() {
    // Remove existing styles if present
    const existing = document.getElementById('connectionStatusCSS');
    if (existing) {
        existing.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'connectionStatusCSS';
    style.textContent = `
        .connection-status {
            position: fixed;
            top: 10px;
            right: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 1000;
            font-family: Arial, sans-serif;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #666;
        }
        
        .status-dot.connected { background: #4CAF50; }
        .status-dot.connecting { 
            background: #FF9800; 
            animation: pulse 1s infinite;
        }
        .status-dot.disconnected { background: #757575; }
        .status-dot.error { background: #F44336; }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    document.head.appendChild(style);
}

// Global instances
window.connectionManager = new RealTimeConnectionManager();
window.subscriptionManager = new SubscriptionManager();

console.log('🔧 Connection Manager initialized');
