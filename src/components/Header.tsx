import { ShoppingCart, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import logo from '@/assets/logo.jpeg';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export const Header = ({ onSearch }: HeaderProps) => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
      
      // Track search activity
      if (searchQuery.trim()) {
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
            activity_type: 'search',
            page_path: window.location.pathname,
            metadata: {
              search_query: searchQuery,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error('Error tracking search:', error);
        }
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-md border-b border-border/50 shadow-lg shadow-primary/5">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link 
            to="/" 
            className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
          >
            <div className="relative">
              <img 
                src={logo} 
                alt="Gadget's Rajjo" 
                className="h-12 w-auto rounded-lg shadow-md group-hover:shadow-xl transition-all duration-300 ring-2 ring-primary/20 group-hover:ring-primary/40" 
              />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-xl bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent bengali-font block">
                GADGET'S RAJJO
              </span>
              <span className="text-xs text-muted-foreground bengali-font">আপনার পছন্দের গ্যাজেট</span>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 group-focus-within:text-primary transition-colors duration-200" />
              <Input
                type="text"
                placeholder="পণ্য খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 bg-background/50 backdrop-blur-sm"
              />
            </div>
          </form>

          <Button
            variant="outline"
            size="icon"
            className="relative transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary group"
            onClick={() => navigate('/cart')}
          >
            <ShoppingCart className="h-5 w-5 group-hover:animate-bounce transition-transform" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg animate-pulse">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};