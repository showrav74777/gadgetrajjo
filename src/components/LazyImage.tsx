import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}

export const LazyImage = ({ src, alt, className = '', placeholder }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!src) {
      setError(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' } // Start loading 50px before image enters viewport
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  // If no src, show placeholder
  if (!src) {
    return (
      <div className={`relative ${className} bg-muted flex items-center justify-center`}>
        {placeholder ? (
          <span className="text-4xl">{placeholder}</span>
        ) : (
          <span className="text-4xl">📦</span>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!isInView && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center z-10">
          {placeholder ? (
            <span className="text-4xl">{placeholder}</span>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
      {isInView && (
        <>
          {!isLoaded && !error && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={`${className} transition-opacity duration-300 relative z-0 ${
              isLoaded && !error ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => {
              setIsLoaded(true);
              setError(false);
            }}
            onError={() => {
              setError(true);
              setIsLoaded(false);
            }}
            loading="lazy"
            decoding="async"
          />
          {error && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center z-20">
              {placeholder ? (
                <span className="text-4xl">{placeholder}</span>
              ) : (
                <span className="text-4xl">📦</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

