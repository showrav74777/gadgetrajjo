-- Create storage bucket for product images and videos
-- This migration creates a public storage bucket named 'products'

-- Note: Storage buckets need to be created through the Supabase Dashboard or CLI
-- This file serves as documentation. Run these commands in Supabase SQL Editor:

-- 1. Create the storage bucket (run in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('products', 'products', true)
-- ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage policies for the products bucket
-- Allow public read access
CREATE POLICY "Public can view products"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Allow authenticated users (admins) to upload
CREATE POLICY "Admins can upload products"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] IN ('images', 'videos')
);

-- Allow authenticated users (admins) to update
CREATE POLICY "Admins can update products"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' AND
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- Allow authenticated users (admins) to delete
CREATE POLICY "Admins can delete products"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- Note: To create the bucket via Supabase CLI, run:
-- supabase storage create products --public

