-- Create delivery_charges table to store delivery charges
CREATE TABLE IF NOT EXISTS public.delivery_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_type TEXT NOT NULL UNIQUE CHECK (location_type IN ('inside_dhaka', 'outside_dhaka')),
  charge DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default values
INSERT INTO public.delivery_charges (location_type, charge)
VALUES 
  ('inside_dhaka', 60),
  ('outside_dhaka', 120)
ON CONFLICT (location_type) DO NOTHING;

-- Enable RLS
ALTER TABLE public.delivery_charges ENABLE ROW LEVEL SECURITY;

-- Anyone can read delivery charges (needed for cart calculation)
CREATE POLICY "Anyone can view delivery charges"
ON public.delivery_charges FOR SELECT
TO public
USING (true);

-- Only admins can update delivery charges
CREATE POLICY "Admins can update delivery charges"
ON public.delivery_charges FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert delivery charges
CREATE POLICY "Admins can insert delivery charges"
ON public.delivery_charges FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update timestamp function
CREATE TRIGGER update_delivery_charges_updated_at
BEFORE UPDATE ON public.delivery_charges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.delivery_charges IS 'Stores delivery charges for different location types';

