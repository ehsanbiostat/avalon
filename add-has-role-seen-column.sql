-- Add has_role_seen column to room_players table
-- This column tracks whether a player has seen their role information

-- Add the new column with default value false
ALTER TABLE public.room_players 
ADD COLUMN has_role_seen BOOLEAN DEFAULT FALSE;

-- Add an index for better performance when querying by has_role_seen
CREATE INDEX IF NOT EXISTS idx_room_players_has_role_seen ON public.room_players(has_role_seen);

-- Add a comment to document the column purpose
COMMENT ON COLUMN public.room_players.has_role_seen IS 'Tracks whether the player has seen their role information popup';
