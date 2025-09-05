-- Add is_host column to room_players table
-- Run this in your Supabase SQL editor

ALTER TABLE public.room_players 
ADD COLUMN is_host BOOLEAN DEFAULT FALSE;

-- Add a comment to the column
COMMENT ON COLUMN public.room_players.is_host IS 'Whether this player is the room host';
