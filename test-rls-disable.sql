-- TEMPORARY RLS DISABLE FOR TESTING
-- ⚠️  WARNING: This disables security! Only use for testing!

-- 1. Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Test inserting a profile (should work now)
INSERT INTO public.profiles (id, username, display_name, avatar)
VALUES (gen_random_uuid(), 'testuser', 'Test User', '🧪')
ON CONFLICT (id) DO NOTHING;

-- 3. Check if it worked
SELECT * FROM public.profiles WHERE username = 'testuser';

-- 4. Clean up test data
DELETE FROM public.profiles WHERE username = 'testuser';

-- 5. RE-ENABLE RLS (IMPORTANT!)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Verify RLS is back on
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';
