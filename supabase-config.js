// Supabase Configuration
// Replace these with your actual Supabase project credentials

export const supabaseConfig = {
    url: '[https://osgygcmgtzpsdiravuct.supabase.co](https://osgygcmgtzpsdiravuct.supabase.co)', // e.g., 'https://your-project.supabase.co'
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZ3lnY21ndHpwc2RpcmF2dWN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNjgzNDcsImV4cCI6MjA3MjY0NDM0N30.lEx6gI1XiAllLziRimQ-BWFg7gxppgQDYuIbm49efcQ', // Your public anon key
    serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZ3lnY21ndHpwc2RpcmF2dWN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA2ODM0NywiZXhwIjoyMDcyNjQ0MzQ3fQ.uyHzs28hBDt9JJXmKphJZoQklKKrOaiHcZlj9PmIjJ4' // Your service role key (keep secret)
};

// Database table names
export const TABLES = {
    PROFILES: 'profiles',
    GAME_ROOMS: 'game_rooms',
    ROOM_PLAYERS: 'room_players',
    GAMES: 'games',
    GAME_PLAYERS: 'game_players',
    GAME_EVENTS: 'game_events'
};

// Real-time subscriptions
export const REALTIME_CHANNELS = {
    ROOM_UPDATES: 'room_updates',
    GAME_UPDATES: 'game_updates',
    PLAYER_UPDATES: 'player_updates'
};

// Game statuses
export const GAME_STATUS = {
    WAITING: 'waiting',
    ROLE_DISTRIBUTION: 'role_distribution',
    PLAYING: 'playing',
    FINISHED: 'finished',
    CANCELLED: 'cancelled'
};

// Player alignments
export const ALIGNMENT = {
    GOOD: 'good',
    EVIL: 'evil'
};

// Game winners
export const WINNER = {
    GOOD: 'good',
    EVIL: 'evil'
};
