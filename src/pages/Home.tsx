declare global {
  interface Window {
    fbqInitialized?: boolean;
  }
}

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { Pagination } from '@/components/Pagination';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { initFacebookPixel, trackEvent } from '@/fbpixel'; // Assuming trackEvent is safeFbqTrack renamed

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  images?: string[] | null;
  stock: number;
  priority?: number;
  created_at?: string;
}

const ITEMS_PER_PAGE = 12;

// FIX 1: Returns a single stable <div> container
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 w-full h-full">
      <div key="bg1" className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div key="bg2" className="absolute top-1/3 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" />
      <div key="bg3" className="absolute bottom-0 left-1/2 w-72 h-72 bg-primary/15 rounded-full blur-3xl animate-pulse" />
      <div key="float1" className="absolute top-20 left-10 w-2 h-2 bg-primary/30 rounded-full animate-float" />
      <div key="float2" className="absolute top-40 right-20 w-3 h-3 bg-accent/30 rounded-full animate-float" />
      <div key="float3" className="absolute bottom-40 left-20 w-2 h-2 bg-primary/30 rounded-full animate-float" />
      <div key="float4" className="absolute top-60 left-1/2 w-2 h-2 bg-accent/30 rounded-full animate-float" />
      <div key="float5" className="absolute bottom-20 right-10 w-3 h-3 bg-primary/30 rounded-full animate-float" />
      <div
        key="grid"
        className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-30"
      />
    </div>
  );
};

// FIX 2: Returns a single stable <div> container
const BackgroundPlaceholder = () => {
  return (
    <div className="absolute inset-0 w-full h-full">
      <div key="bg1" className="absolute top-0 left-1/4 w-96 h-96" style={{ visibility: 'hidden' }} />
      <div key="bg2" className="absolute top-1/3 right-1/4 w-80 h-80" style={{ visibility: 'hidden' }} />
      <div key="bg3" className="absolute bottom-0 left-1/2 w-72 h-72" style={{ visibility: 'hidden' }} />
      <div key="float1" className="absolute top-20 left-10 w-2 h-2" style={{ visibility: 'hidden' }} />
      <div key="float2" className="absolute top-40 right-20 w-3 h-3" style={{ visibility: 'hidden' }} />
      <div key="float3" className="absolute bottom-40 left-20 w-2 h-2" style={{ visibility: 'hidden' }} />
      <div key="float4" className="absolute top-60 left-1/2 w-2 h-2" style={{ visibility: 'hidden' }} />
      <div key="float5" className="absolute bottom-20 right-10 w-3 h-3" style={{ visibility: 'hidden' }} />
      <div key="grid" className="absolute inset-0" style={{ visibility: 'hidden' }} />
    </div>
  );
};

const Home = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('priority');
  const [mounted, setMounted] = useState(false);

  // Helper function to safely track fbq events (renamed from safeFbqTrack to match the import structure)
  const safeFbqTrack = (event: string, params?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.fbqInitialized) {
      try {
        trackEvent(event, params); // Using imported trackEvent
      } catch (e) {
        console.error(`FB Pixel ${event} failed`, e);
      }
    }
  };

  // Safely fetch products with fallback for missing columns
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let data: any[] = [];
        let error: any = null;

        const result: { data: any[] | null; error: any } = await supabase
          .from('products')
          .select('id,name,description,price,image_url,images,stock,priority,created_at');

        if (result.data && Array.isArray(result.data)) {
          data = result.data;
          error = result.error;
        } else {
          // Fallback
          const fallbackResult: { data: any[] | null; error: any } = await supabase
            .from('products')
            .select('id,name,description,price,image_url,stock,created_at');
          if (fallbackResult.data && Array.isArray(fallbackResult.data)) {
            data = fallbackResult.data;
            error = fallbackResult.error;
          } else {
            error = fallbackResult.error || new Error('No data returned');
          }
        }

        if (error) throw error;

        const safeProducts = (data || []).map((p: any): Product => ({
          id: p.id,
          name: p.name,
          description: p.description ?? null,
          price: p.price,
          image_url: p.image_url ?? null,
          images: Array.isArray(p.images)
            ? p.images.filter(Boolean)
            : p.image_url
            ? [p.image_url]
            : null,
          stock: p.stock,
          priority: p.priority ?? 999,
          created_at: p.created_at ?? null,
        }));

        setProducts(safeProducts);
        setFilteredProducts(safeProducts);
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Set mounted state to true after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Safely initialize FB Pixel once
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.fbqInitialized) {
      // Use imported initFacebookPixel directly
      try {
          initFacebookPixel();
          window.fbqInitialized = true;
          safeFbqTrack('PageView');
      } catch (e) {
          console.error('FB Pixel init failed', e);
      }
    }
  }, []);

  // Fire ViewContent safely
  useEffect(() => {
    if (products.length > 0) {
      safeFbqTrack('ViewContent', {
        content_category: 'Home Page',
        content_ids: products.map(p => p.id),
        content_type: 'product_group',
      });
    }
  }, [products]);

  const handleSearch = (query: string) => {
    const trimmedQuery = query.trim().toLowerCase();
    const filtered = trimmedQuery
      ? products.filter(p =>
          p.name.toLowerCase().includes(trimmedQuery) ||
          (p.description && p.description.toLowerCase().includes(trimmedQuery))
        )
      : products;
    setFilteredProducts(filtered);
    setCurrentPage(1);

    safeFbqTrack('Search', { search_string: query });
  };

  // Sorting
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    switch (sortBy) {
      case 'priority':
        return sorted.sort((a, b) =>
          (a.priority ?? 999) - (b.priority ?? 999) ||
          (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        );
      case 'price-low':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-high':
        return sorted.sort((a, b) => b.price - a.price);
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      default:
        return sorted;
    }
  }, [filteredProducts, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedProducts, currentPage]);

  // Reset currentPage if sortedProducts or sortBy changes and currentPage is out of range
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="min-h-screen flex flex-col page-transition relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* FIX 3: Conditionally render the stable components using unique keys */}
        {mounted ? (
            <AnimatedBackground key="animated" />
        ) : (
            <BackgroundPlaceholder key="placeholder" />
        )}
      </div>

      <Header onSearch={handleSearch} />

      <main className="flex-1 container mx-auto px-4 py-4 sm:py-8 animate-fade-in relative z-10">
        {/* Sorting Controls */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="sort" className="text-sm font-medium whitespace-nowrap">সাজান:</Label>
            <Select value={sortBy} onValueChange={(value) => {
              setSortBy(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger id="sort" className="w-[200px]">
                <SelectValue placeholder="সাজান" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">প্রাধান্য (Default)</SelectItem>
                <SelectItem value="price-low">মূল্য: কম থেকে বেশি</SelectItem>
                <SelectItem value="price-high">মূল্য: বেশি থেকে কম</SelectItem>
                <SelectItem value="name-asc">নাম: A-Z</SelectItem>
                <SelectItem value="name-desc">নাম: Z-A</SelectItem>
                <SelectItem value="newest">নতুন প্রথম</SelectItem>
                <SelectItem value="oldest">পুরাতন প্রথম</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">{sortedProducts.length} টি পণ্য পাওয়া গেছে</div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          </div>
        ) : (paginatedProducts || []).length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl sm:text-2xl text-muted-foreground font-semibold mb-2">কোন পণ্য পাওয়া যায়নি</p>
            <p className="text-sm text-muted-foreground">অনুগ্রহ করে অন্য কীওয়ার্ড দিয়ে খুঁজুন</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {(paginatedProducts || []).map(product => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={page => setCurrentPage(page)}
              itemsPerPage={ITEMS_PER_PAGE}
              totalItems={sortedProducts.length}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Home;