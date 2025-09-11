-- Re-enable RLS on room_players table since the issue was with .single() query, not RLS

-- Re-enable RLS
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- Create the correct policies
CREATE POLICY "Anyone can view room players" ON public.room_players 
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join rooms" ON public.room_players 
FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can update room players" ON public.room_players 
FOR UPDATE USING (
    auth.uid() = player_id OR 
    EXISTS (
        SELECT 1 FROM public.game_rooms 
        WHERE game_rooms.id = room_players.room_id 
        AND game_rooms.host_id = auth.uid()
    )
);

CREATE POLICY "Users can leave rooms" ON public.room_players 
FOR DELETE USING (
    auth.uid() = player_id OR 
    EXISTS (
        SELECT 1 FROM public.game_rooms 
        WHERE game_rooms.id = room_players.room_id 
        AND game_rooms.host_id = auth.uid()
    )
);

-- Verify RLS is enabled and policies are created
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'room_players';

SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'room_players' 
ORDER BY policyname;
