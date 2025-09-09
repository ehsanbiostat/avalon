-- Add original host tracking to game_rooms table
-- This allows the original host to regain host status when rejoining

-- Add column to track the original host (room creator)
ALTER TABLE public.game_rooms 
ADD COLUMN original_host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add column to track when the original host left
ALTER TABLE public.game_rooms 
ADD COLUMN original_host_left_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_original_host_id ON public.game_rooms(original_host_id);

-- Add comment to document the new columns
COMMENT ON COLUMN public.game_rooms.original_host_id IS 'ID of the original host who created the room - has priority to regain host status';
COMMENT ON COLUMN public.game_rooms.original_host_left_at IS 'Timestamp when the original host left the room';

-- Update existing rooms to set original_host_id to current host_id
UPDATE public.game_rooms 
SET original_host_id = host_id 
WHERE original_host_id IS NULL AND host_id IS NOT NULL;
