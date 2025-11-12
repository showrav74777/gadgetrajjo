-- Add images column to support multiple images/videos
-- This will store JSON array of image/video URLs
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Migrate existing image_url to images array
UPDATE public.products 
SET images = CASE 
  WHEN image_url IS NOT NULL AND image_url != '' THEN jsonb_build_array(image_url)
  ELSE '[]'::jsonb
END
WHERE images = '[]'::jsonb OR images IS NULL;

-- Add comment
COMMENT ON COLUMN public.products.images IS 'Array of image/video URLs in JSON format';

