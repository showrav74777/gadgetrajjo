import { Facebook } from 'lucide-react';
import logo from '@/assets/logo.jpeg';

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-card via-card/95 to-card border-t border-border/50 mt-auto relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="relative group">
              <img 
                src={logo} 
                alt="Gadget's Rajjo" 
                className="h-20 w-auto rounded-xl shadow-xl ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105" 
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="text-center md:text-left">
              <p className="font-extrabold text-2xl bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent bengali-font mb-1">
                GADGET'S RAJJO
              </p>
              <p className="text-sm text-muted-foreground bengali-font">আপনার পছন্দের গ্যাজেট</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <h3 className="font-bold text-lg text-foreground mb-2 bengali-font">দ্রুত লিংক</h3>
            <a href="/" className="text-muted-foreground hover:text-primary transition-colors duration-200 bengali-font">
              হোম
            </a>
            <a href="/cart" className="text-muted-foreground hover:text-primary transition-colors duration-200 bengali-font">
              কার্ট
            </a>
          </div>

          {/* Social Links */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <h3 className="font-bold text-lg text-foreground mb-2 bengali-font">সামাজিক যোগাযোগ</h3>
            <a
              href="https://www.facebook.com/people/Gadgets-Rajjo/61583523514715/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-105 group"
            >
              <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Facebook className="h-5 w-5" />
              </div>
              <span className="text-sm bengali-font font-medium">GADGET'S RAJJO</span>
            </a>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground bengali-font text-center md:text-left">
              &copy; {new Date().getFullYear()} GADGET'S RAJJO। সর্বস্বত্ব সংরক্ষিত।
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="bengali-font">Made with</span>
              <span className="text-red-500 animate-pulse">❤️</span>
              <span className="bengali-font">in Bangladesh</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};