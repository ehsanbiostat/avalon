-- Fix RLS policies for room_players table to allow necessary queries
-- This fixes the 406 (Not Acceptable) error when checking if player exists

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own room players" ON public.room_players;
DROP POLICY IF EXISTS "Users can insert their own room players" ON public.room_players;
DROP POLICY IF EXISTS "Users can update their own room players" ON public.room_players;
DROP POLICY IF EXISTS "Users can delete their own room players" ON public.room_players;

-- Create more permissive policies for room_players table
-- Allow anyone to view room players (needed for real-time subscriptions and duplicate checks)
CREATE POLICY "Anyone can view room players" ON public.room_players 
FOR SELECT USING (true);

-- Allow authenticated users to insert themselves into rooms
CREATE POLICY "Authenticated users can join rooms" ON public.room_players 
FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Allow users to update their own records and hosts to update any player in their room
CREATE POLICY "Users can update room players" ON public.room_players 
FOR UPDATE USING (
    auth.uid() = player_id OR 
    EXISTS (
        SELECT 1 FROM public.game_rooms 
        WHERE game_rooms.id = room_players.room_id 
        AND game_rooms.host_id = auth.uid()
    )
);

-- Allow users to leave rooms (delete their own records) and hosts to remove players
CREATE POLICY "Users can leave rooms" ON public.room_players 
FOR DELETE USING (
    auth.uid() = player_id OR 
    EXISTS (
        SELECT 1 FROM public.game_rooms 
        WHERE game_rooms.id = room_players.room_id 
        AND game_rooms.host_id = auth.uid()
    )
);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'room_players' 
ORDER BY policyname;
