-- Fix real-time subscription issues for Avalon game

-- 1. Enable real-time publications for game tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;

-- 2. Ensure RLS policies allow real-time subscriptions
-- Real-time subscriptions need to be able to read data even when user is not authenticated
-- during the subscription setup phase

-- Update room_players policies to be more permissive for real-time
DROP POLICY IF EXISTS "Anyone can view room players" ON public.room_players;
CREATE POLICY "Anyone can view room players" ON public.room_players FOR SELECT USING (true);

-- Update game_rooms policies to be more permissive for real-time  
DROP POLICY IF EXISTS "Anyone can view public rooms" ON public.game_rooms;
CREATE POLICY "Anyone can view public rooms" ON public.game_rooms FOR SELECT USING (true);

-- 3. Verify tables are in the real-time publication
SELECT 
    schemaname, 
    tablename,
    pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('game_rooms', 'room_players')
ORDER BY tablename;

-- 4. Check if real-time is enabled for the database
SELECT 
    name,
    enabled
FROM pg_replication_slots 
WHERE name LIKE '%realtime%';

-- 5. Alternative approach: Create a more permissive policy for real-time
-- This allows the real-time system to read data during subscription setup
CREATE POLICY IF NOT EXISTS "Real-time can read all room data" ON public.game_rooms 
FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Real-time can read all player data" ON public.room_players 
FOR SELECT USING (true);
