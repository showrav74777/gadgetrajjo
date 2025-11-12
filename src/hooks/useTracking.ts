import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Generate or get session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('tracking_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('tracking_session_id', sessionId);
  }
  return sessionId;
};

// Get user agent
const getUserAgent = (): string => {
  return navigator.userAgent || 'Unknown';
};

// Get IP address (we'll use a simple approach, can be enhanced with external service)
const getIPAddress = async (): Promise<string> => {
  try {
    // Using a free IP service
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'Unknown';
  } catch {
    return 'Unknown';
  }
};

interface TrackActivityParams {
  activityType: 'page_view' | 'product_view' | 'product_click' | 'add_to_cart' | 'remove_from_cart' | 'order_placed' | 'search' | 'button_click';
  pagePath?: string;
  productId?: string;
  productName?: string;
  metadata?: Record<string, any>;
}

export const useTracking = () => {
  const location = useLocation();

  // Track page views automatically
  useEffect(() => {
    const trackPageView = async () => {
      try {
        const sessionId = getSessionId();
        const userAgent = getUserAgent();
        const ipAddress = await getIPAddress();

        await supabase.from('user_activity' as any).insert({
          session_id: sessionId,
          user_agent: userAgent,
          ip_address: ipAddress,
          activity_type: 'page_view',
          page_path: location.pathname,
          metadata: {
            referrer: document.referrer || null,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error('Error tracking page view:', error);
        // Silently fail - don't interrupt user experience
      }
    };

    // Small delay to ensure page is loaded
    const timer = setTimeout(trackPageView, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Function to track custom activities
  const trackActivity = useCallback(async (params: TrackActivityParams) => {
    try {
      const sessionId = getSessionId();
      const userAgent = getUserAgent();
      const ipAddress = await getIPAddress();

      await supabase.from('user_activity' as any).insert({
        session_id: sessionId,
        user_agent: userAgent,
        ip_address: ipAddress,
        activity_type: params.activityType,
        page_path: params.pagePath || location.pathname,
        product_id: params.productId || null,
        product_name: params.productName || null,
        metadata: {
          ...params.metadata,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
      // Silently fail - don't interrupt user experience
    }
  }, [location.pathname]);

  return { trackActivity };
};

// Helper function to track product views
export const trackProductView = async (productId: string, productName: string) => {
  try {
    const sessionId = getSessionId();
    const userAgent = getUserAgent();
    const ipAddress = await getIPAddress();

    await supabase.from('user_activity').insert({
      session_id: sessionId,
      user_agent: userAgent,
      ip_address: ipAddress,
      activity_type: 'product_view',
      page_path: window.location.pathname,
      product_id: productId,
      product_name: productName,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error tracking product view:', error);
  }
};

// Helper function to track product clicks
export const trackProductClick = async (productId: string, productName: string) => {
  try {
    const sessionId = getSessionId();
    const userAgent = getUserAgent();
    const ipAddress = await getIPAddress();

    await supabase.from('user_activity').insert({
      session_id: sessionId,
      user_agent: userAgent,
      ip_address: ipAddress,
      activity_type: 'product_click',
      page_path: window.location.pathname,
      product_id: productId,
      product_name: productName,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error tracking product click:', error);
  }
};

