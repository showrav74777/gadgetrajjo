-- Fix Storage Public Access for Products Bucket
-- This migration ensures the products bucket is public and has proper policies

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg'];

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view products" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload products" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update products" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete products" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to products" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update products" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete products" ON storage.objects;

-- 3. Create public read policy (allows anyone to view)
CREATE POLICY "Public can view products"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- 4. Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload products"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] IN ('images', 'videos')
);

-- 5. Create policy for authenticated users to update
CREATE POLICY "Authenticated users can update products"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- 6. Create policy for authenticated users to delete
CREATE POLICY "Authenticated users can delete products"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');

-- Note: If you want to allow anonymous uploads (not recommended for production),
-- you can uncomment the following policy:
-- CREATE POLICY "Anyone can upload to products"
-- ON storage.objects FOR INSERT
-- TO public
-- WITH CHECK (
--   bucket_id = 'products' AND
--   (storage.foldername(name))[1] IN ('images', 'videos')
-- );

