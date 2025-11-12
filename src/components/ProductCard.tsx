import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackProductClick, trackProductView } from '@/hooks/useTracking';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LazyImage } from '@/components/LazyImage';

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  images?: string[] | null;
  stock: number;
}

export const ProductCard = ({ id, name, description, price, image_url, images, stock }: ProductCardProps) => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get all images (from images array or fallback to image_url)
  // Filter out any null/undefined/empty strings
  const allImages = (images && images.length > 0 
    ? images.filter((img): img is string => Boolean(img && img.trim()))
    : (image_url && image_url.trim() ? [image_url] : [])
  );
  const hasMultipleImages = allImages.length > 1;

  // Track product view when card is rendered
  useEffect(() => {
    trackProductView(id, name);
  }, [id, name]);

  // Auto-transition images every 5 seconds if multiple images
  useEffect(() => {
    if (!hasMultipleImages) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [hasMultipleImages, allImages.length]);

  const handleAddToCart = async (e?: React.MouseEvent) => {
    // Prevent event bubbling to card click
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (stock <= 0) {
      toast.error('এই পণ্যটি স্টকে নেই');
      return;
    }

    // Track add to cart activity
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
        product_id: id,
        product_name: name,
        metadata: {
          price,
          quantity: 1,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error tracking add to cart:', error);
    }

    addItem({
      id,
      name,
      price,
      quantity: 1,
      image_url,
    });

    toast.success('পণ্যটি কার্টে যোগ করা হয়েছে!', {
      duration: 2000,
    });
    // Navigate to cart immediately after adding
    setTimeout(() => {
      navigate('/cart');
    }, 500);
  };

  const handleCardClick = () => {
    trackProductClick(id, name);
    navigate(`/product/${id}`);
  };

  return (
    <Card 
      className="product-card overflow-hidden group hover:shadow-xl transition-all duration-500 ease-out border-2 border-transparent hover:border-primary/20 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50 relative">
        {allImages.length > 0 ? (
          <>
            {allImages[currentImageIndex]?.includes('video') || allImages[currentImageIndex]?.endsWith('.mp4') || allImages[currentImageIndex]?.endsWith('.webm') ? (
              <video
                src={allImages[currentImageIndex]}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <LazyImage
                src={allImages[currentImageIndex]}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ease-out"
                placeholder="📦"
              />
            )}
            {hasMultipleImages && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                {allImages.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentImageIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform duration-300">
            <span className="text-6xl">📦</span>
          </div>
        )}
        {stock <= 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold animate-pulse">
            স্টক শেষ
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">
          {name}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div>
            <span className="text-3xl font-extrabold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              ৳{price.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stock > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {stock > 0 ? `স্টক: ${stock}` : 'স্টক শেষ'}
            </span>
          </div>
        </div>
      </CardContent>
              <CardFooter className="p-4 pt-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  onClick={handleAddToCart}
                  disabled={stock <= 0}
                  className="w-full btn-order gap-2 group/button relative overflow-hidden"
                  size="lg"
                >
          <span className="relative z-10 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 group-hover/button:animate-bounce" />
            {stock > 0 ? 'অর্ডার করুন' : 'স্টক শেষ'}
          </span>
          <span className="absolute inset-0 bg-gradient-to-r from-accent/0 via-white/20 to-accent/0 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-700" />
        </Button>
      </CardFooter>
    </Card>
  );
};