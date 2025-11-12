-- Add cost_price column to products table for profit calculation
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.products.cost_price IS 'Cost price of the product for profit calculation';

