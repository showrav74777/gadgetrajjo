-- Add priority column to products table
-- Lower number = higher priority (1 appears first, 2 second, etc.)
-- Default priority 999 for existing products

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 999 NOT NULL;

-- Set default priority for existing products
UPDATE public.products 
SET priority = 999 
WHERE priority IS NULL OR priority = 0;

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS idx_products_priority ON public.products(priority ASC, created_at DESC);

-- Add comment
COMMENT ON COLUMN public.products.priority IS 'Product display priority. Lower number = higher priority (appears first). Default: 999';

