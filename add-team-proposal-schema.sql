-- Add team proposal tracking to game_rooms table
-- This tracks the current team proposal state and selected players

-- Add column to track current team proposal state
ALTER TABLE public.game_rooms 
ADD COLUMN team_proposal_state TEXT DEFAULT 'none'; -- (none, selecting, proposed, voting, approved, rejected)

-- Add column to store selected team members as JSON array
ALTER TABLE public.game_rooms 
ADD COLUMN selected_team_members JSONB DEFAULT '[]';

-- Add column to track who proposed the current team
ALTER TABLE public.game_rooms 
ADD COLUMN team_proposer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add column to track team proposal attempts for this mission
ALTER TABLE public.game_rooms 
ADD COLUMN team_proposal_attempts INTEGER DEFAULT 0;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_team_proposal_state ON public.game_rooms(team_proposal_state);
CREATE INDEX IF NOT EXISTS idx_game_rooms_team_proposer_id ON public.game_rooms(team_proposer_id);

-- Add comment to document the new columns
COMMENT ON COLUMN public.game_rooms.team_proposal_state IS 'Current state of team proposal (none, selecting, proposed, voting, approved, rejected)';
COMMENT ON COLUMN public.game_rooms.selected_team_members IS 'JSON array of player IDs selected for current team proposal';
COMMENT ON COLUMN public.game_rooms.team_proposer_id IS 'Player ID who proposed the current team';
COMMENT ON COLUMN public.game_rooms.team_proposal_attempts IS 'Number of team proposal attempts for current mission';
