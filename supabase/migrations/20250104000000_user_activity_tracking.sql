-- Create user_activity table to track all user interactions
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('page_view', 'product_view', 'product_click', 'add_to_cart', 'remove_from_cart', 'order_placed', 'search', 'button_click')),
  page_path TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_activity_session ON public.user_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_product ON public.user_activity(product_id);

-- Enable Row Level Security
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert activity (for tracking)
CREATE POLICY "Anyone can insert activity" 
ON public.user_activity FOR INSERT 
WITH CHECK (true);

-- Only admins can view activity
CREATE POLICY "Admins can view activity" 
ON public.user_activity FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create a view for activity summary
CREATE OR REPLACE VIEW public.activity_summary AS
SELECT 
  DATE(created_at) as date,
  activity_type,
  COUNT(*) as count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM public.user_activity
GROUP BY DATE(created_at), activity_type;

-- Grant access to the view
GRANT SELECT ON public.activity_summary TO authenticated;

