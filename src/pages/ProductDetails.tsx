import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { ShoppingCart, ArrowLeft, Plus, Minus, Package, DollarSign, TrendingUp } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { trackProductView, trackProductClick } from '@/hooks/useTracking';
import { LazyImage } from '@/components/LazyImage';

// FIX: Import the functions using their actual names: trackEvent and initFacebookPixel
import { trackEvent, initFacebookPixel } from '@/fbpixel'; 

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price?: number;
  image_url: string | null;
  images?: string[] | null;
  stock: number;
  created_at: string;
}

// === BEGIN FACEBOOK PIXEL UTILITIES ===

// Declare global scope to safely attach initialization status
declare global {
  interface Window {
    fbqInitialized?: boolean;
  }
}

// FIX: Create a robust tracking function that calls the imported 'trackEvent'
const safeTrackEvent = (event: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.fbqInitialized) {
    try {
      trackEvent(event, params); // Calls the imported function
    } catch (e) {
      console.error(`FB Pixel ${event} failed`, e);
    }
  }
};

// === END FACEBOOK PIXEL UTILITIES ===


const ProductDetails = () => {
  const isMounted = useRef(true);
  
  // FIX: Use safe initialization pattern and call PageView robustly
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.fbqInitialized) {
      try {
        initFacebookPixel();
        window.fbqInitialized = true;
      } catch (e) {
        console.error('FB Pixel init failed', e);
      }
    }
    safeTrackEvent("PageView");
    return () => { isMounted.current = false; };
  }, []);
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const fetchProduct = async () => {
    if (!id) {
      console.error('Product ID is missing');
      setLoading(false);
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      // Try to fetch with all columns first
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // If error is about images column, try without it
        const errorMessage = error.message || '';
        if (errorMessage.includes('images') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('products')
            .select('id, name, description, price, image_url, stock, created_at, cost_price')
            .eq('id', id)
            .single();
          
          if (fallbackError) throw fallbackError;
          
          // Add images from image_url
          setProduct({
            ...(fallbackData as any),
            image_url: (fallbackData as any).image_url,
            images: (fallbackData as any).image_url ? [(fallbackData as any).image_url] : undefined,
          });
        } else {
          throw error;
        }
      } else {
        // Successfully fetched, parse images
        let images: string[] | undefined = undefined;
        if ((data as any).images !== undefined && (data as any).images !== null) {
          if (typeof (data as any).images === 'string') {
            try {
              const parsed = JSON.parse((data as any).images);
              images = Array.isArray(parsed) 
                ? parsed.filter((img: any): img is string => Boolean(img && typeof img === 'string' && img.trim()))
                : ((data as any).images && (data as any).images.trim() ? [(data as any).images] : undefined);
            } catch {
              images = (data as any).images && (data as any).images.trim() ? [(data as any).images] : undefined;
            }
          } else if (Array.isArray((data as any).images)) {
            images = (data as any).images.filter((img: any): img is string => Boolean(img && typeof img === 'string' && img.trim()));
          }
        }
        
        // Fallback to image_url if no images array
        if ((!images || images.length === 0) && data.image_url && data.image_url.trim()) {
          images = [data.image_url];
        }

        setProduct({
          ...(data as any),
          image_url: (data as any).image_url,
          images: images && images.length > 0 ? images : undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('পণ্য লোড করতে সমস্যা হয়েছে');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Get all images (from images array or fallback to image_url)
  const allImages = useMemo(() => {
    if (!product) return [];
    try {
      return (product.images && product.images.length > 0 
        ? product.images.filter((img): img is string => Boolean(img && typeof img === 'string' && img.trim()))
        : (product.image_url && product.image_url.trim() ? [product.image_url] : [])
      );
    } catch (error) {
      console.error('Error processing images:', error);
      return product.image_url && product.image_url.trim() ? [product.image_url] : [];
    }
  }, [product]);

  const hasMultipleImages = allImages.length > 1;

  useEffect(() => {
    if (product) {
      trackProductView(product.id, product.name);
      
      // FIX: Add ViewContent event for Meta Pixel
      safeTrackEvent("ViewContent", {
        content_name: product.name,
        content_category: 'Product Page', 
        content_ids: [product.id],
        content_type: 'product',
        value: parseFloat(product.price.toFixed(2)),
        currency: 'BDT',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // Auto-transition images every 50 seconds if multiple images
  useEffect(() => {
    if (!hasMultipleImages || allImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        if (allImages.length === 0) return 0;
        return (prev + 1) % allImages.length;
      });
    }, 50000);

    return () => clearInterval(interval);
  }, [hasMultipleImages, allImages.length]);


  const handleAddToCart = async () => {
    if (!product) return;

    if (product.stock <= 0) {
      toast.error('এই পণ্যটি স্টকে নেই');
      return;
    }

    // Track product click
    trackProductClick(product.id, product.name);

    // FIX: Add AddToCart event for Meta Pixel
    safeTrackEvent("AddToCart", {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: parseFloat((product.price * quantity).toFixed(2)),
      currency: 'BDT',
      quantity: quantity,
    });

    // Track add to cart (Supabase activity)
    try {
      const sessionId = sessionStorage.getItem('tracking_session_id') || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (!sessionStorage.getItem('tracking_session_id')) {
        sessionStorage.setItem('tracking_session_id', sessionId);
      }
      
      const getUserAgent = () => navigator.userAgent || 'Unknown';
      const getIPAddress = async () => {
        try {
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          return data.ip || 'Unknown';
        } catch {
          return 'Unknown';
        }
      };

      await supabase.from('user_activity' as any).insert({
        session_id: sessionId,
        user_agent: getUserAgent(),
        ip_address: await getIPAddress(),
        activity_type: 'add_to_cart',
        page_path: window.location.pathname,
        product_id: product.id,
        product_name: product.name,
        metadata: {
          price: product.price,
          quantity: quantity,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error tracking add to cart:', error);
    }

    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image_url: allImages[0] || product.image_url,
      });
    }

    toast.success(`${quantity} টি পণ্য কার্টে যোগ করা হয়েছে!`, {
      duration: 2000,
    });
    
    setTimeout(() => {
      if (isMounted.current) navigate('/cart');
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">পণ্য লোড হচ্ছে...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-xl text-muted-foreground">পণ্য পাওয়া যায়নি</p>
            <Button onClick={() => navigate('/')}>হোমে ফিরে যান</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const {stock} = product;

  return (
    <div className="min-h-screen flex flex-col page-transition">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-12 animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6 transition-all duration-200 hover:scale-105"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          হোমে ফিরে যান
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Section */}
          <div className="space-y-4">
            <Card className="overflow-hidden border-2 border-border hover:border-primary/20 transition-all duration-300">
              <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50 relative">
                {allImages.length > 0 && allImages[currentImageIndex] && typeof allImages[currentImageIndex] === 'string' ? (
                  <>
                    <div className="media-container">
                      {allImages[currentImageIndex].includes('video') || 
                       allImages[currentImageIndex].endsWith('.mp4') || 
                       allImages[currentImageIndex].endsWith('.webm') ? (
                        <video
                          src={allImages[currentImageIndex]}
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls
                        />
                      ) : (
                        <LazyImage
                          src={allImages[currentImageIndex]}
                          alt={product.name}
                          className="w-full h-full object-cover transition-all duration-500"
                          placeholder="📦"
                        />
                      )}
                    </div>
                    {hasMultipleImages && (
                      <>
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                          {allImages.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`h-2 rounded-full transition-all duration-300 ${
                                index === currentImageIndex 
                                  ? 'w-8 bg-white' 
                                  : 'w-2 bg-white/50 hover:bg-white/75'
                              }`}
                            />
                          ))}
                        </div>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white border-0"
                          onClick={() => setCurrentImageIndex((prev) => (prev + 1) % allImages.length)}
                        >
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-16 right-4 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white border-0"
                          onClick={() => setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-9xl">📦</span>
                  </div>
                )}
                {stock <= 0 && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold animate-pulse">
                    স্টক শেষ
                  </div>
                )}
              </div>
            </Card>

            {/* Thumbnail Gallery */}
            {hasMultipleImages && (
              <div className="grid grid-cols-4 gap-2">
                {allImages.map((url, index) => (
                  <button
                    key={url}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                      index === currentImageIndex
                        ? 'border-primary scale-105'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="media-container">
                      {url.includes('video') || url.endsWith('.mp4') || url.endsWith('.webm') ? (
                        <video
                          src={url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <LazyImage
                          src={url}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                          placeholder="📦"
                        />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                {product.name}
              </h1>
              {product.description && (
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  {product.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div>
                <span className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  ৳{product.price.toFixed(2)}
                </span>
              </div>
              <Badge 
                className={`text-base px-4 py-2 ${
                  stock > 0 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {stock > 0 ? `স্টক: ${stock}` : 'স্টক শেষ'}
              </Badge>
            </div>

            {/* Quantity Selector */}
            {stock > 0 && (
              <Card className="p-4 border-2 border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">পরিমাণ:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="transition-all duration-200 hover:scale-110"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                        disabled={quantity >= stock}
                        className="transition-all duration-200 hover:scale-110"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">মোট মূল্য</p>
                    <p className="text-2xl font-bold text-primary">
                      ৳{(product.price * quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={stock <= 0}
                className="w-full btn-order gap-2 group/button relative overflow-hidden h-14 text-lg"
                size="lg"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 group-hover/button:animate-bounce" />
                  {stock > 0 ? 'কার্টে যোগ করুন' : 'স্টক শেষ'}
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-accent/0 via-white/20 to-accent/0 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-700" />
              </Button>
              
              {stock > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleAddToCart();
                    setTimeout(() => navigate('/cart'), 100);
                  }}
                  className="w-full h-12 text-base transition-all duration-300 hover:scale-105"
                >
                  <Package className="h-4 w-4 mr-2" />
                  এখনই অর্ডার করুন
                </Button>
              )}
            </div>

            {/* Product Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <Card className="p-4 border-2 border-border hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
                <Package className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">স্টক</p>
                <p className="text-lg font-bold">{stock} টি</p>
              </Card>
              <Card className="p-4 border-2 border-border hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
                <DollarSign className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">মূল্য</p>
                <p className="text-lg font-bold">৳{product.price.toFixed(2)}</p>
              </Card>
              <Card className="p-4 border-2 border-border hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
                <TrendingUp className="h-6 w-6 text-primary mb-2" />
                <p className="text-sm text-muted-foreground">অর্ডার</p>
                <p className="text-lg font-bold">২৪/৭</p>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetails;