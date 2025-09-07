-- Avalon Game Database Schema for Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar TEXT DEFAULT '👤',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00
);

-- Game rooms table
CREATE TABLE public.game_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    host_name TEXT NOT NULL,
    max_players INTEGER NOT NULL CHECK (max_players >= 5 AND max_players <= 10),
    current_players INTEGER DEFAULT 1,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'role_distribution', 'playing', 'finished', 'cancelled')),
    
    -- Game configuration
    roles JSONB NOT NULL DEFAULT '{}',
    lady_of_lake BOOLEAN DEFAULT FALSE,
    chaos_for_merlin BOOLEAN DEFAULT FALSE,
    
    -- Game state
    current_mission INTEGER DEFAULT 1,
    mission_leader UUID REFERENCES public.profiles(id),
    players JSONB DEFAULT '[]', -- Store complete player data with roles
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    
    -- Room settings
    is_public BOOLEAN DEFAULT TRUE,
    password TEXT, -- Optional room password
    
    CONSTRAINT valid_player_count CHECK (current_players <= max_players)
);

-- Room players table (many-to-many relationship)
CREATE TABLE public.room_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    player_name TEXT NOT NULL,
    player_avatar TEXT DEFAULT '👤',
    position INTEGER, -- Position on the game circle
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_ready BOOLEAN DEFAULT FALSE,
    is_host BOOLEAN DEFAULT FALSE,
    
    -- Role and alignment (assigned during role distribution)
    role TEXT CHECK (role IN ('merlin', 'assassin', 'percival', 'morgana', 'mordred', 'oberon', 'loyal_servant', 'minion')),
    alignment TEXT CHECK (alignment IN ('good', 'evil')),
    
    UNIQUE(room_id, player_id)
);

-- Games table (stores completed game results)
CREATE TABLE public.games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
    game_config JSONB NOT NULL, -- Store the complete game configuration
    
    -- Game results
    winner TEXT CHECK (winner IN ('good', 'evil')),
    mission_results JSONB, -- Array of mission results
    final_vote_results JSONB, -- Final voting results
    
    -- Game statistics
    total_rounds INTEGER DEFAULT 0,
    failed_teams INTEGER DEFAULT 0,
    lady_of_lake_uses INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER
);

-- Game players table (stores player roles and performance)
CREATE TABLE public.game_players (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    player_name TEXT NOT NULL,
    player_avatar TEXT DEFAULT '👤',
    
    -- Role information
    role TEXT NOT NULL,
    alignment TEXT NOT NULL CHECK (alignment IN ('good', 'evil')),
    
    -- Performance metrics
    missions_participated INTEGER DEFAULT 0,
    missions_succeeded INTEGER DEFAULT 0,
    votes_cast INTEGER DEFAULT 0,
    votes_correct INTEGER DEFAULT 0,
    
    -- Special actions
    lady_of_lake_used BOOLEAN DEFAULT FALSE,
    assassination_attempted BOOLEAN DEFAULT FALSE,
    
    UNIQUE(game_id, player_id)
);

-- Game events table (for detailed game logging)
CREATE TABLE public.game_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    round_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_game_rooms_code ON public.game_rooms(code);
CREATE INDEX idx_game_rooms_status ON public.game_rooms(status);
CREATE INDEX idx_game_rooms_host ON public.game_rooms(host_id);
CREATE INDEX idx_room_players_room ON public.room_players(room_id);
CREATE INDEX idx_room_players_player ON public.room_players(player_id);
CREATE INDEX idx_games_room ON public.games(room_id);
CREATE INDEX idx_game_players_game ON public.game_players(game_id);
CREATE INDEX idx_game_players_player ON public.game_players(player_id);
CREATE INDEX idx_game_events_game ON public.game_events(game_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Game rooms policies
CREATE POLICY "Anyone can view public rooms" ON public.game_rooms FOR SELECT USING (is_public = true);
CREATE POLICY "Hosts can update their rooms" ON public.game_rooms FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their rooms" ON public.game_rooms FOR DELETE USING (auth.uid() = host_id);
CREATE POLICY "Authenticated users can create rooms" ON public.game_rooms FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Room players policies
CREATE POLICY "Anyone can view room players" ON public.room_players FOR SELECT USING (true);
CREATE POLICY "Players can join rooms" ON public.room_players FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "Players can leave rooms" ON public.room_players FOR DELETE USING (auth.uid() = player_id);
CREATE POLICY "Players can update their own status" ON public.room_players FOR UPDATE USING (auth.uid() = player_id);

-- Games policies
CREATE POLICY "Anyone can view completed games" ON public.games FOR SELECT USING (true);
CREATE POLICY "Game hosts can create games" ON public.games FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT host_id FROM public.game_rooms WHERE id = room_id)
);

-- Game players policies
CREATE POLICY "Anyone can view game players" ON public.game_players FOR SELECT USING (true);
CREATE POLICY "Game hosts can insert game players" ON public.game_players FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT host_id FROM public.game_rooms WHERE id = (SELECT room_id FROM public.games WHERE id = game_id))
);

-- Game events policies
CREATE POLICY "Anyone can view game events" ON public.game_events FOR SELECT USING (true);
CREATE POLICY "Game participants can create events" ON public.game_events FOR INSERT WITH CHECK (
    auth.uid() IN (
        SELECT player_id FROM public.room_players 
        WHERE room_id = (SELECT room_id FROM public.games WHERE id = game_id)
    )
);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update room player count
CREATE OR REPLACE FUNCTION update_room_player_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.game_rooms 
        SET current_players = current_players + 1 
        WHERE id = NEW.room_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.game_rooms 
        SET current_players = current_players - 1 
        WHERE id = OLD.room_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to automatically update player count
CREATE TRIGGER update_room_player_count_trigger
    AFTER INSERT OR DELETE ON public.room_players
    FOR EACH ROW EXECUTE FUNCTION update_room_player_count();

-- Function to calculate win rate
CREATE OR REPLACE FUNCTION calculate_win_rate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.games_played > 0 THEN
        NEW.win_rate = (NEW.games_won::DECIMAL / NEW.games_played::DECIMAL) * 100;
    ELSE
        NEW.win_rate = 0.00;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically calculate win rate
CREATE TRIGGER calculate_win_rate_trigger
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION calculate_win_rate();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_room_players_role ON public.room_players(role);
CREATE INDEX IF NOT EXISTS idx_room_players_alignment ON public.room_players(alignment);
CREATE INDEX IF NOT EXISTS idx_room_players_is_host ON public.room_players(is_host);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON public.game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON public.game_rooms(code);
