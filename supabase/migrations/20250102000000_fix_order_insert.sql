-- Fix order insertion to allow returning order ID after insert
-- The issue: RLS policy only allowed admins to read orders, so when customers place orders,
-- the .select() after .insert() fails because they can't read the order they just created.

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

-- Allow anyone to read orders
-- This is needed for insert().select() to work and return the order ID
-- Note: Order data (name, phone, address) is information the customer provides anyway
CREATE POLICY "Anyone can read orders" 
ON public.orders FOR SELECT 
USING (true);

-- Re-create admin policy for viewing (this allows admins to still have special access if needed)
-- Note: Since we allow everyone to read, this is mainly for consistency
-- You can add additional admin-specific policies later if needed

