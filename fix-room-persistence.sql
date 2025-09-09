-- Fix room persistence issues
-- This script removes cascade deletes that cause rooms to be deleted when host leaves

-- 1. Remove the CASCADE constraint from host_id in game_rooms table
-- First, we need to drop the existing foreign key constraint
ALTER TABLE public.game_rooms 
DROP CONSTRAINT IF EXISTS game_rooms_host_id_fkey;

-- 2. Recreate the foreign key constraint without CASCADE
-- This prevents room deletion when host profile is deleted
ALTER TABLE public.game_rooms 
ADD CONSTRAINT game_rooms_host_id_fkey 
FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Make host_id nullable to allow rooms to exist without a host
ALTER TABLE public.game_rooms 
ALTER COLUMN host_id DROP NOT NULL;

-- 4. Add a comment to document the change
COMMENT ON COLUMN public.game_rooms.host_id IS 'Room host ID - can be NULL if host left, room persists';

-- 5. Update any existing rooms that might have been affected
-- Set host_id to NULL for rooms where the host no longer exists
UPDATE public.game_rooms 
SET host_id = NULL, host_name = 'Unknown Host'
WHERE host_id NOT IN (SELECT id FROM public.profiles);

-- 6. Add an index for better performance when querying rooms by code
CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON public.game_rooms(code);

-- 7. Add an index for better performance when querying active rooms
CREATE INDEX IF NOT EXISTS idx_game_rooms_status_public ON public.game_rooms(status, is_public, created_at);
