-- Enable real-time publications for game tables
-- This is required for Supabase real-time subscriptions to work

-- Enable real-time for game_rooms table
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;

-- Enable real-time for room_players table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;

-- Verify the tables are added to the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('game_rooms', 'room_players');

-- Alternative: If the above doesn't work, try recreating the publication
-- (Only run this if the above fails)
/*
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
*/
