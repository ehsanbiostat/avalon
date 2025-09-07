-- Add missing columns to game_rooms table
-- This migration adds the current_mission, mission_leader, and players columns

-- Add current_mission column
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS current_mission INTEGER DEFAULT 1;

-- Add mission_leader column
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS mission_leader UUID REFERENCES public.profiles(id);

-- Add players column to store complete player data
ALTER TABLE public.game_rooms 
ADD COLUMN IF NOT EXISTS players JSONB DEFAULT '[]';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_current_mission ON public.game_rooms(current_mission);
CREATE INDEX IF NOT EXISTS idx_game_rooms_mission_leader ON public.game_rooms(mission_leader);
