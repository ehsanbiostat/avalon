-- Add missing columns to game_rooms table for real-time updates and optimistic locking

-- Add updated_at column to game_rooms
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column to room_players  
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add version column to game_rooms (if not already added)
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add version column to room_players (if not already added)
ALTER TABLE public.room_players ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for game_rooms updated_at
DROP TRIGGER IF EXISTS update_game_rooms_updated_at ON public.game_rooms;
CREATE TRIGGER update_game_rooms_updated_at 
    BEFORE UPDATE ON public.game_rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for room_players updated_at
DROP TRIGGER IF EXISTS update_room_players_updated_at ON public.room_players;
CREATE TRIGGER update_room_players_updated_at 
    BEFORE UPDATE ON public.room_players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have updated_at set to created_at
UPDATE public.game_rooms SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE public.room_players SET updated_at = joined_at WHERE updated_at IS NULL;