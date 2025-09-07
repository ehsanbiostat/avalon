-- Add missing columns to room_players table
-- This migration adds the role, alignment, and is_host columns

-- Add role column
ALTER TABLE public.room_players 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('merlin', 'assassin', 'percival', 'morgana', 'mordred', 'oberon', 'loyal_servant', 'minion'));

-- Add alignment column  
ALTER TABLE public.room_players 
ADD COLUMN IF NOT EXISTS alignment TEXT CHECK (alignment IN ('good', 'evil'));

-- Add is_host column (if not already exists)
ALTER TABLE public.room_players 
ADD COLUMN IF NOT EXISTS is_host BOOLEAN DEFAULT FALSE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_room_players_role ON public.room_players(role);
CREATE INDEX IF NOT EXISTS idx_room_players_alignment ON public.room_players(alignment);
CREATE INDEX IF NOT EXISTS idx_room_players_is_host ON public.room_players(is_host);
