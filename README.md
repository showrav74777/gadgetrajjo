# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/19182876-97dd-485f-a8d7-850de57d867e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/19182876-97dd-485f-a8d7-850de57d867e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Database & Storage)
- React Router
- TanStack Query

## Features

### Customer Features
- **Product Browsing**: View all available products with images and descriptions
- **Shopping Cart**: Add products to cart and manage quantities
- **Order Placement**: Place orders with customer information and delivery location
- **Order Confirmation**: Automatic order confirmation with order ID
- **Responsive Design**: Works seamlessly on mobile and desktop

### Admin Features
- **Product Management**: Add, edit, and delete products
- **Image/Video Upload**: Upload product images and videos directly from PC or mobile
- **Order Management**: View all orders with detailed descriptions and update order status
- **Sales Dashboard**: Track total sales, order counts, and revenue
- **Analytics**: View sales statistics and order details
- **Stock Management**: Monitor product stock levels

## Setup Instructions

### 1. Supabase Storage Setup

To enable image/video upload functionality, you need to create a storage bucket in Supabase:

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to **Storage**
3. Click **"New bucket"**
4. Name it `products`
5. **IMPORTANT:** Make sure **"Public bucket"** is checked/enabled
6. Click **"Create bucket"**
7. After creating, go to **Storage > Policies** for the `products` bucket
8. Run the migration: `supabase/migrations/20250106000000_fix_storage_public_access.sql`

**Option B: Using SQL (If bucket doesn't exist)**
1. Go to SQL Editor in Supabase Dashboard
2. Run the following command:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  52428800, -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE
SET public = true;
```

**Option C: Using Supabase CLI**
```bash
supabase storage create products --public
```

### 2. Storage Policies (IMPORTANT - Fix 400 Error)

**If you're getting 400 Bad Request errors when viewing images, run this migration:**

1. Go to Supabase Dashboard > SQL Editor
2. Run: `supabase/migrations/20250106000000_fix_storage_public_access.sql`

This migration will:
- Ensure the bucket is public
- Set up proper read policies for public access
- Configure upload/update/delete policies for authenticated users

**Or manually verify in Supabase Dashboard:**
1. Go to **Storage > Policies** for the `products` bucket
2. Make sure there's a policy named **"Public can view products"** that allows `SELECT` for `public` role
3. If missing, create it:
   - Policy name: `Public can view products`
   - Allowed operation: `SELECT`
   - Target roles: `public`
   - USING expression: `bucket_id = 'products'`

### 3. Environment Variables

Make sure you have the following environment variables set:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 4. Admin Access

To access the admin panel:
1. Create a user account through the Auth page
2. In Supabase Dashboard, go to SQL Editor
3. Run this query to assign admin role:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('your_user_id', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Replace `your_user_id` with the actual user ID from `auth.users` table.

### 5. Fix Order Insertion Issue

If you're getting errors when placing orders, you need to run the migration to fix RLS policies:

1. Go to Supabase Dashboard > SQL Editor
2. Run the migration file: `supabase/migrations/20250102000000_fix_order_insert.sql`

Or manually run this SQL:

```sql
-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

-- Allow anyone to read orders (needed for .select() after insert to return the order ID)
CREATE POLICY "Anyone can read orders" 
ON public.orders FOR SELECT 
USING (true);
```

This allows the order insertion to return the order ID after creating the order, which is needed for the confirmation dialog.

### 6. Add Cost Price Column (For Profit Calculation)

To enable profit calculation, run the migration to add cost_price to products:

1. Go to Supabase Dashboard > SQL Editor
2. Run the migration file: `supabase/migrations/20250103000000_add_cost_price.sql`

Or manually run this SQL:

```sql
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) DEFAULT 0;
```

### 7. Enable User Activity Tracking

To track all user activities, run the migration:

1. Go to Supabase Dashboard > SQL Editor
2. Run the migration file: `supabase/migrations/20250104000000_user_activity_tracking.sql`

This will create:
- `user_activity` table to store all user interactions
- Indexes for fast queries
- RLS policies (anyone can insert, only admins can view)
- Activity summary view

**What gets tracked:**
- Page views (automatic)
- Product views (when product card is displayed)
- Product clicks (when user clicks on product)
- Add to cart actions
- Order placements
- Search queries
- IP address and device information
- Session tracking

**Admin Access:**
- Go to Admin Panel > "অ্যাক্টিভিটি" tab
- View all user activities in real-time
- Filter by activity type
- Search activities
- See unique visitors count

## Features Overview

### ✅ Completed Features

1. **Order Management**
   - Orders start as "pending" status
   - Admin can change order status (pending → confirmed → delivered)
   - Stock updates automatically when order is confirmed/delivered
   - Real-time order notifications for admin
   - Foreign key validation prevents errors

2. **Profit Calculation**
   - Add cost_price to products
   - Automatic profit calculation per order
   - Total profit tracking in dashboard
   - Profit margin percentage display

3. **Analytics & Charts**
   - Monthly sales chart (bar chart)
   - Yearly sales trend (line chart)
   - Monthly and yearly statistics
   - Sales vs Profit comparison

4. **Admin Dashboard**
   - Beautiful gradient cards with statistics
   - Real-time order notifications
   - Pending orders alert
   - Low stock warnings
   - Profit and sales tracking
   - Monthly/yearly breakdowns

5. **User Interface**
   - Smooth transitions and animations
   - Beautiful product cards with hover effects
   - Gradient text effects
   - Responsive design (mobile & desktop)
   - Enhanced button animations
   - Loading states

6. **Stock Management**
   - Stock decreases when order is confirmed/delivered
   - Stock validation before order placement
   - Low stock alerts in admin dashboard
   - Real-time stock updates

7. **User Activity Tracking (Analytics)**
   - Complete user activity tracking system
   - Tracks page views, product views, product clicks
   - Tracks add to cart, order placement, search queries
   - Records IP address, user agent, session ID
   - Admin dashboard shows all user activities
   - Filter by activity type and search activities
   - Real-time activity updates
   - Mobile and desktop responsive views

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/19182876-97dd-485f-a8d7-850de57d867e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
