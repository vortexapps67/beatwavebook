-- =========================================================
-- THE STORY OF BEATWAVE - SUPABASE DATABASE SCHEMA
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

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.book_orders ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow anyone (anon) to insert a new book order
CREATE POLICY "Allow public order placement" 
ON public.book_orders 
FOR INSERT 
TO public, anon 
WITH CHECK (true);

-- 4. Policy: Allow reading and updating orders (for admin portal)
CREATE POLICY "Allow public order read" 
ON public.book_orders 
FOR SELECT 
TO public, anon 
USING (true);

CREATE POLICY "Allow public order update" 
ON public.book_orders 
FOR UPDATE 
TO public, anon 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public order delete" 
ON public.book_orders 
FOR DELETE 
TO public, anon 
USING (true);

-- 5. Enable Realtime Replication for instant device syncing
ALTER PUBLICATION supabase_realtime ADD TABLE public.book_orders;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_book_orders_status ON public.book_orders (status);
CREATE INDEX IF NOT EXISTS idx_book_orders_created_at ON public.book_orders (created_at DESC);
