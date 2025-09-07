-- Fix RLS policy to allow room host to update all players in their room
-- This is needed for role assignment during game start

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Players can update their own status" ON public.room_players;

-- Create a new policy that allows:
-- 1. Players to update their own records
-- 2. Room hosts to update all players in their room
CREATE POLICY "Players can update their own status or room host can update all players" 
ON public.room_players 
FOR UPDATE 
USING (
    auth.uid() = player_id 
    OR 
    auth.uid() IN (
        SELECT host_id 
        FROM public.game_rooms 
        WHERE id = room_id
    )
);
