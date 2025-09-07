-- Add comprehensive room state management fields to game_rooms table
-- This will store all game state in the database instead of local storage

-- Add room status message field
ALTER TABLE public.game_rooms 
ADD COLUMN status_message TEXT DEFAULT 'Waiting for players...';

-- Add room status message type for styling
ALTER TABLE public.game_rooms 
ADD COLUMN status_message_type TEXT DEFAULT 'waiting' CHECK (status_message_type IN ('waiting', 'ready', 'playing', 'finished', 'error'));

-- Add game state tracking
ALTER TABLE public.game_rooms 
ADD COLUMN game_state JSONB DEFAULT '{}';

-- Add room display state (UI state that should be consistent across all players)
ALTER TABLE public.game_rooms 
ADD COLUMN display_state JSONB DEFAULT '{}';

-- Add last updated timestamp for state changes
ALTER TABLE public.game_rooms 
ADD COLUMN state_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to automatically update state_updated_at
CREATE OR REPLACE FUNCTION update_room_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update timestamp if status_message, status_message_type, game_state, or display_state changed
    IF (OLD.status_message IS DISTINCT FROM NEW.status_message) OR
       (OLD.status_message_type IS DISTINCT FROM NEW.status_message_type) OR
       (OLD.game_state IS DISTINCT FROM NEW.game_state) OR
       (OLD.display_state IS DISTINCT FROM NEW.display_state) THEN
        NEW.state_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update state timestamp
CREATE TRIGGER update_room_state_timestamp_trigger
    BEFORE UPDATE ON public.game_rooms
    FOR EACH ROW EXECUTE FUNCTION update_room_state_timestamp();

-- Create index for better performance on state queries
CREATE INDEX IF NOT EXISTS idx_game_rooms_state_updated ON public.game_rooms(state_updated_at);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status_message_type ON public.game_rooms(status_message_type);

-- Add comments to document the new columns
COMMENT ON COLUMN public.game_rooms.status_message IS 'Current status message displayed to all players in the room';
COMMENT ON COLUMN public.game_rooms.status_message_type IS 'Type of status message for UI styling (waiting, ready, playing, finished, error)';
COMMENT ON COLUMN public.game_rooms.game_state IS 'JSON object storing current game state (missions, votes, etc.)';
COMMENT ON COLUMN public.game_rooms.display_state IS 'JSON object storing UI display state consistent across all players';
COMMENT ON COLUMN public.game_rooms.state_updated_at IS 'Timestamp when room state was last updated';
