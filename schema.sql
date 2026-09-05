-- =========================================================
-- THE STORY OF BEATWAVE - COMPLETE SUPABASE DATABASE SCHEMA
-- Copy & paste this entire script into your Supabase SQL Editor and click RUN
-- =========================================================

-- 1. Create the book_orders table
CREATE TABLE IF NOT EXISTS public.book_orders (
    id TEXT PRIMARY KEY,                       -- e.g. BW-102948
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    user_password TEXT DEFAULT '',             -- Associated reader password (if provided)
    tier_id TEXT NOT NULL DEFAULT 'ebook',     -- 'ebook' or 'print'
    tier_name TEXT NOT NULL DEFAULT 'Digital E-Book Edition',
    amount NUMERIC NOT NULL DEFAULT 150,       -- 150 or 290
    delivery_address TEXT DEFAULT 'N/A (Digital)',
    payment_method TEXT DEFAULT 'UPI',
    sender_handle TEXT DEFAULT '',             -- UPI ID / Transaction handle
    status TEXT DEFAULT 'PENDING' NOT NULL     -- 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'
);

-- 2. Enable Row Level Security (RLS) on book_orders
ALTER TABLE public.book_orders ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for book_orders
DROP POLICY IF EXISTS "orders_insert" ON public.book_orders;
CREATE POLICY "orders_insert" ON public.book_orders FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "orders_select" ON public.book_orders;
CREATE POLICY "orders_select" ON public.book_orders FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "orders_update" ON public.book_orders;
CREATE POLICY "orders_update" ON public.book_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orders_delete" ON public.book_orders;
CREATE POLICY "orders_delete" ON public.book_orders FOR DELETE TO anon, authenticated USING (true);

-- 4. Enable Realtime Replication for instant device syncing
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
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.book_orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.book_orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.book_orders (phone);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.book_orders (created_at DESC);

-- 6. Reader Profiles Table (Syncs with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    full_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    user_password TEXT DEFAULT '',             -- Reader login password for author management
    phone TEXT DEFAULT '',
    delivery_address TEXT DEFAULT '',
    upi_id TEXT DEFAULT '',
    avatar_url TEXT DEFAULT ''
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_anon" ON public.profiles;
CREATE POLICY "profiles_insert_anon" ON public.profiles FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_anon" ON public.profiles;
CREATE POLICY "profiles_update_anon" ON public.profiles FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 7. Auto-Profile Creation Trigger for New Readers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, user_password, phone, delivery_address, upi_id, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'password', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'delivery_address', ''),
        COALESCE(NEW.raw_user_meta_data ->> 'upi_id', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        user_password = CASE WHEN EXCLUDED.user_password <> '' THEN EXCLUDED.user_password ELSE public.profiles.user_password END,
        phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
        delivery_address = CASE WHEN EXCLUDED.delivery_address <> '' THEN EXCLUDED.delivery_address ELSE public.profiles.delivery_address END,
        upi_id = CASE WHEN EXCLUDED.upi_id <> '' THEN EXCLUDED.upi_id ELSE public.profiles.upi_id END,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Auto-Confirm Email Trigger
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
CREATE TRIGGER auto_confirm_email_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user_email();

-- 9. Security Definer RPC function for Master Author Admin verification
CREATE OR REPLACE FUNCTION public.verify_admin_access(pass_attempt TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN LOWER(TRIM(pass_attempt)) IN (
        'admin00', 'admin', 'admin123',
        'vortex', 'beatwave',
        'akshansh', 'aarav'
    );
END;
$$;
