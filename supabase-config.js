// Supabase Configuration
// Replace these with your actual Supabase project credentials

export const supabaseConfig = {
    url: 'YOUR_SUPABASE_URL', // e.g., 'https://your-project.supabase.co'
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // Your public anon key
    serviceRoleKey: 'YOUR_SUPABASE_SERVICE_ROLE_KEY' // Your service role key (keep secret)
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
