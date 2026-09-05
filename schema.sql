-- =========================================================
-- THE STORY OF BEATWAVE - COMPLETE SUPABASE DATABASE SCHEMA
-- Copy & paste this entire script into your Supabase SQL Editor and click RUN
-- =========================================================

-- 1. Create the book_orders table
CREATE TABLE IF NOT EXISTS public.book_orders (
    id TEXT PRIMARY KEY,                       -- e.g. BW-102948
    created_at TIMESTAMPTZ DEFAULT NOW(),
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    tier_id TEXT NOT NULL,                     -- 'ebook' or 'print'
    tier_name TEXT NOT NULL,                   -- 'Digital E-Book' or 'Collector Printed Copy'
    amount NUMERIC NOT NULL,                   -- 150 or 290
    delivery_address TEXT,                     -- Physical address for print edition
    payment_method TEXT DEFAULT 'UPI',
    sender_handle TEXT,                        -- e.g. akshansh@axl or Rahul Verma
    status TEXT DEFAULT 'PENDING'              -- 'PENDING', 'PAID', 'SHIPPED', 'CANCELLED'
);

-- 2. Enable Row Level Security (RLS) on book_orders
ALTER TABLE public.book_orders ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for book_orders (Idempotent: drop existing before creating)
DROP POLICY IF EXISTS "Allow public order placement" ON public.book_orders;
CREATE POLICY "Allow public order placement" 
ON public.book_orders 
FOR INSERT 
TO public, anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public order read" ON public.book_orders;
CREATE POLICY "Allow public order read" 
ON public.book_orders 
FOR SELECT 
TO public, anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public order update" ON public.book_orders;
CREATE POLICY "Allow public order update" 
ON public.book_orders 
FOR UPDATE 
TO public, anon, authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public order delete" ON public.book_orders;
CREATE POLICY "Allow public order delete" 
ON public.book_orders 
FOR DELETE 
TO public, anon, authenticated 
USING (true);

-- 4. Enable Realtime Replication for instant device syncing safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'book_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.book_orders;
    END IF;
END $$;

-- 5. Add indexes for performance & search
CREATE INDEX IF NOT EXISTS idx_book_orders_status ON public.book_orders (status);
CREATE INDEX IF NOT EXISTS idx_book_orders_email ON public.book_orders (email);
CREATE INDEX IF NOT EXISTS idx_book_orders_phone ON public.book_orders (phone);
CREATE INDEX IF NOT EXISTS idx_book_orders_created_at ON public.book_orders (created_at DESC);

-- 6. Reader Profiles Table (Syncs with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    full_name TEXT,
    email TEXT,
    avatar_url TEXT
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 7. Auto-Profile Creation Trigger for New Readers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Security Definer RPC function for Master Author Admin verification
CREATE OR REPLACE FUNCTION public.verify_admin_access(pass_attempt text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN pass_attempt = 'admin00';
END;
$$;

