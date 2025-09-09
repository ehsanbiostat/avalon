-- Add team rejection tracking to game_rooms table
-- This tracks consecutive team rejections for the 5-rejection rule

-- Add column to track current rejection count
ALTER TABLE public.game_rooms 
ADD COLUMN rejection_count INTEGER DEFAULT 0;

-- Add column to track if we're in a voting phase
ALTER TABLE public.game_rooms 
ADD COLUMN is_voting_phase BOOLEAN DEFAULT FALSE;

-- Add column to track current mission leader for voting
ALTER TABLE public.game_rooms 
ADD COLUMN voting_leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_rejection_count ON public.game_rooms(rejection_count);

-- Add comment to document the new columns
COMMENT ON COLUMN public.game_rooms.rejection_count IS 'Number of consecutive team rejections (0-5, 5 = Evil wins)';
COMMENT ON COLUMN public.game_rooms.is_voting_phase IS 'Whether the game is currently in team voting phase';
COMMENT ON COLUMN public.game_rooms.voting_leader_id IS 'Current mission leader during voting phase';
