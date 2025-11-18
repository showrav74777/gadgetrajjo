// src/fbpixel.ts
export const fbqTrack = (event: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', event, params || {});
  }
};

export const initFacebookPixel = () => {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('init', '862723852989129');
    (window as any).fbq('track', 'PageView');
  }
};