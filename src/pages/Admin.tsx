import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Plus, Edit, Trash2, LogOut, Loader2, Upload, Package, ShoppingCart, 
  TrendingUp, DollarSign, FileText, Image as ImageIcon, Video, X, BarChart3, 
  Activity, Eye, MousePointerClick, Search as SearchIcon, Filter, Settings
} from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { User } from '@supabase/supabase-js';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price?: number;
  image_url: string | null;
  images?: string[] | null; // JSON array of image/video URLs
  stock: number;
  priority?: number; // Lower number = higher priority (1 appears first)
  created_at: string;
}

interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  location_type: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  products: Product;
}

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deliveryCharges, setDeliveryCharges] = useState({
    inside_dhaka: 60,
    outside_dhaka: 120,
  });
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost_price: '',
    image_url: '',
    images: [] as string[],
    stock: '',
    priority: '999', // Default priority
  });
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [lastOrderCheck, setLastOrderCheck] = useState<Date>(new Date());
  interface UserActivity {
    id: string;
    session_id: string;
    user_agent: string | null;
    ip_address: string | null;
    activity_type: string;
    page_path: string | null;
    product_id: string | null;
    product_name: string | null;
    metadata: any;
    created_at: string;
  }
  
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [activitySearch, setActivitySearch] = useState('');
  
  // Pagination states
  const [productsPage, setProductsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate('/auth');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchOrders();
      fetchActivities();
      
      // Set up real-time subscription for new orders
      const ordersSubscription = supabase
        .channel('orders_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
          },
          (payload) => {
            console.log('New order received:', payload);
            setNewOrderCount(prev => prev + 1);
            fetchOrders(); // Refresh orders
            toast.success(`নতুন অর্ডার: ${(payload.new as any).customer_name}`, {
              duration: 5000,
            });
          }
        )
        .subscribe();

      // Set up real-time subscription for user activities
      const activitiesSubscription = supabase
        .channel('activities_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_activity',
          },
          () => {
            fetchActivities(); // Refresh activities
          }
        )
        .subscribe();

      return () => {
        ordersSubscription.unsubscribe();
        activitiesSubscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchDeliveryCharges = async () => {
    try {
      setLoadingCharges(true);
      const { data, error } = await supabase
        .from('delivery_charges' as any)
        .select('*');

      if (error) {
        // If table doesn't exist, use defaults
        console.warn('Delivery charges table not found, using defaults:', error);
        return;
      }

      if (data && data.length > 0) {
        const charges: { inside_dhaka: number; outside_dhaka: number } = {
          inside_dhaka: 60,
          outside_dhaka: 120,
        };
        
        data.forEach((item: any) => {
          if (item.location_type === 'inside_dhaka') {
            charges.inside_dhaka = parseFloat(item.charge);
          } else if (item.location_type === 'outside_dhaka') {
            charges.outside_dhaka = parseFloat(item.charge);
          }
        });
        
        setDeliveryCharges(charges);
      }
    } catch (error) {
      console.error('Error fetching delivery charges:', error);
    } finally {
      setLoadingCharges(false);
    }
  };

  const updateDeliveryCharge = async (locationType: 'inside_dhaka' | 'outside_dhaka', charge: number) => {
    try {
      setLoadingCharges(true);
      const { error } = await supabase
        .from('delivery_charges' as any)
        .upsert({
          location_type: locationType,
          charge: charge,
        } as any, {
          onConflict: 'location_type',
        });

      if (error) {
        // If table doesn't exist, show error
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
          toast.error('Delivery charges table not found. Please run the migration first.');
        } else {
          throw error;
        }
      } else {
        setDeliveryCharges(prev => ({
          ...prev,
          [locationType]: charge,
        }));
        toast.success('ডেলিভারি চার্জ আপডেট হয়েছে!');
      }
    } catch (error: any) {
      console.error('Error updating delivery charge:', error);
      toast.error(error.message || 'ডেলিভারি চার্জ আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setLoadingCharges(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDeliveryCharges();
    }
  }, [user]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Try fetching with priority first
      let { data, error } = await supabase
        .from('products')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });
  
      if (error) {
        const msg = error.message || '';
        if (
          msg.includes('priority') ||
          msg.includes('cost_price') ||
          msg.includes('images') ||
          msg.includes('column') ||
          msg.includes('does not exist')
        ) {
          // Fallback if columns missing
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('products')
            .select('id, name, description, price, image_url, stock, created_at')
            .order('created_at', { ascending: false });
  
          if (fallbackError) throw fallbackError;
  
          const productsWithDefaults = (fallbackData || []).map((p: any) => ({
            ...p,
            cost_price: undefined,
            images: p.image_url ? [p.image_url] : undefined,
            priority: 999,
          }));
  
          setProducts(productsWithDefaults);
          return;
        } else {
          throw error;
        }
      }
  
      // Successfully fetched data
      const products = (data || []).map((p: any) => {
        let images: string[] | undefined;
  
        if (p.images) {
          if (typeof p.images === 'string') {
            try {
              const parsed = JSON.parse(p.images);
              images = Array.isArray(parsed)
                ? parsed.filter((img: any) => img && typeof img === 'string')
                : [p.images];
            } catch {
              images = [p.images];
            }
          } else if (Array.isArray(p.images)) {
            images = p.images.filter((img: any) => img && typeof img === 'string');
          }
        }
  
        if ((!images || images.length === 0) && p.image_url) {
          images = [p.image_url];
        }
  
        return {
          ...p,
          cost_price: p.cost_price ?? undefined,
          images: images && images.length > 0 ? images : undefined,
          priority: p.priority ?? 999,
        };
      });
  
      setProducts(products);
    } catch (err) {
      console.error('Error fetching products:', err);
      toast.error('পণ্য লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select(`
              *,
              products (*)
            `)
            .eq('order_id', order.id);

          if (itemsError) throw itemsError;

          return {
            ...order,
            order_items: itemsData || [],
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('অর্ডার লোড করতে সমস্যা হয়েছে');
    }
  };

  const fetchActivities = async () => {
    setActivitiesLoading(true);
    try {
      let query = supabase
        .from('user_activity' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (activityFilter !== 'all') {
        query = query.eq('activity_type', activityFilter);
      }

      const { data, error } = await query as any;

      if (error) throw error;

      let filteredData: UserActivity[] = (data || []) as UserActivity[];

      // Apply search filter
      if (activitySearch.trim()) {
        const searchLower = activitySearch.toLowerCase();
        filteredData = filteredData.filter((activity: UserActivity) =>
          activity.product_name?.toLowerCase().includes(searchLower) ||
          activity.page_path?.toLowerCase().includes(searchLower) ||
          activity.session_id?.toLowerCase().includes(searchLower) ||
          activity.metadata?.search_query?.toLowerCase().includes(searchLower)
        );
      }

      setActivities(filteredData);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('অ্যাক্টিভিটি লোড করতে সমস্যা হয়েছে');
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'analytics') {
      fetchActivities();
    }
  }, [user, activeTab, activityFilter, activitySearch]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validImageTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];

    const filesToUpload: File[] = [];
    
    // Validate all files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = validImageTypes.includes(file.type) || file.type.startsWith('image/');
      const isVideo = validVideoTypes.includes(file.type) || file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        toast.error(`${file.name}: শুধুমাত্র ছবি (PNG, JPG, JPEG, WEBP) বা ভিডিও (MP4, etc.) আপলোড করা যাবে`);
        continue;
      }

      // Check file size (max 10MB for images, 50MB for videos)
      const maxSize = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name}: ফাইল সাইজ ${isImage ? '১০MB' : '৫০MB'} এর বেশি হতে পারবে না`);
        continue;
      }

      filesToUpload.push(file);
    }

    if (filesToUpload.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const isImage = validImageTypes.includes(file.type) || file.type.startsWith('image/');
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `${isImage ? 'images' : 'videos'}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error(`Upload error for ${file.name}:`, uploadError);
          toast.error(`${file.name} আপলোড করতে সমস্যা হয়েছে`);
          continue;
        }

        // Get public URL (this doesn't fail, it just constructs the URL)
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);

        if (!publicUrl) {
          console.error(`No public URL returned for ${file.name}`);
          toast.error(`${file.name} এর URL পাওয়া যায়নি`);
          continue;
        }

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        const newImages = [...formData.images, ...uploadedUrls];
        setFormData({ ...formData, images: newImages, image_url: newImages[0] || '' });
        setUploadedFiles(newImages);
        // Set preview to the first uploaded image
        if (newImages.length > 0) {
          setUploadPreview(newImages[0]);
        }
        toast.success(`${uploadedUrls.length} টি ফাইল সফলভাবে আপলোড হয়েছে!`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.message?.includes('Bucket') || error.message?.includes('bucket')) {
        toast.error('Storage bucket সেট আপ করা হয়নি। README.md ফাইল দেখুন setup instructions এর জন্য।');
      } else {
        toast.error(error.message || 'ফাইল আপলোড করতে সমস্যা হয়েছে');
      }
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      cost_price: '',
      image_url: '',
      images: [],
      stock: '',
      priority: '999',
    });
    setEditingProduct(null);
    setUploadPreview(null);
    setUploadedFiles([]);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      // Get images from new images field or fallback to image_url
      const productImages = product.images && product.images.length > 0 
        ? product.images.filter((img): img is string => Boolean(img && img.trim()))
        : (product.image_url && product.image_url.trim() ? [product.image_url] : []);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        cost_price: (product.cost_price || 0).toString(),
        image_url: productImages[0] || '',
        images: productImages,
        stock: product.stock.toString(),
        priority: (product.priority || 999).toString(),
      });
      setUploadPreview(productImages.length > 0 ? productImages[0] : null);
      setUploadedFiles(productImages);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Build product data, conditionally including cost_price, images, and priority
      const productData: any = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        image_url: formData.images[0] || formData.image_url || null, // Keep for backward compatibility
        stock: parseInt(formData.stock),
        priority: parseInt(formData.priority || '999'),
      };

      // Only include images if provided and column exists
      // This allows the code to work even if the column doesn't exist yet
      if (formData.images.length > 0) {
        productData.images = formData.images; // JSONB accepts arrays directly
      }

      // Only include cost_price if it's provided and valid
      // This allows the code to work even if the column doesn't exist yet
      const costPriceValue = parseFloat(formData.cost_price || '0');
      if (!isNaN(costPriceValue) && costPriceValue >= 0) {
        productData.cost_price = costPriceValue;
      }

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) {
          // If error is about cost_price, images, or priority column, try without them
          const errorMessage = error.message || '';
          if (errorMessage.includes('cost_price') || errorMessage.includes('images') || errorMessage.includes('priority') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
            // Remove columns that don't exist
            if (errorMessage.includes('cost_price')) {
              delete productData.cost_price;
            }
            if (errorMessage.includes('images')) {
              delete productData.images;
            }
            if (errorMessage.includes('priority')) {
              delete productData.priority;
            }
            const { error: retryError } = await supabase
              .from('products')
              .update(productData)
              .eq('id', editingProduct.id);
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }
        toast.success('পণ্য আপডেট হয়েছে!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) {
          // If error is about cost_price, images, or priority column, try without them
          const errorMessage = error.message || '';
          if (errorMessage.includes('cost_price') || errorMessage.includes('images') || errorMessage.includes('priority') || errorMessage.includes('column') || errorMessage.includes('does not exist')) {
            // Remove columns that don't exist
            if (errorMessage.includes('cost_price')) {
              delete productData.cost_price;
            }
            if (errorMessage.includes('images')) {
              delete productData.images;
            }
            if (errorMessage.includes('priority')) {
              delete productData.priority;
            }
            const { error: retryError } = await supabase
              .from('products')
              .insert(productData);
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }
        toast.success('পণ্য যোগ হয়েছে!');
      }

      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'পণ্য সংরক্ষণে সমস্যা হয়েছে');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই পণ্যটি মুছে ফেলতে চান?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('পণ্য মুছে ফেলা হয়েছে!');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('পণ্য মুছতে সমস্যা হয়েছে');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, oldStatus: string) => {
    try {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Update stock when order is confirmed or delivered (and wasn't before)
      if ((newStatus === 'confirmed' || newStatus === 'delivered') && 
          oldStatus !== 'confirmed' && oldStatus !== 'delivered') {
        // Get order items
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);

        if (itemsError) {
          console.warn('Could not fetch order items for stock update:', itemsError);
        } else if (orderItems) {
          // Update stock for each product
          for (const item of orderItems) {
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single();

            if (productError) {
              console.warn(`Could not fetch product ${item.product_id}:`, productError);
              continue;
            }

            if (product && product.stock !== undefined) {
              const newStock = Math.max(0, product.stock - item.quantity);
              const { error: updateError } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', item.product_id);

              if (updateError) {
                console.warn(`Could not update stock for product ${item.product_id}:`, updateError);
              }
            }
          }
        }
      }

      toast.success('অর্ডার স্ট্যাটাস আপডেট হয়েছে!');
      fetchOrders();
      fetchProducts(); // Refresh products to show updated stock
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('অর্ডার স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে');
    }
  };

  // Calculate statistics
  const totalSales = orders
    .filter(o => o.status === 'confirmed' || o.status === 'delivered')
    .reduce((sum, order) => sum + order.total_amount, 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock < 10).length;

  // Calculate profit
  const totalProfit = orders
    .filter(o => o.status === 'confirmed' || o.status === 'delivered')
    .reduce((sum, order) => {
      const orderProfit = order.order_items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.product_id);
        const costPrice = product?.cost_price || 0;
        const profitPerItem = item.price - costPrice;
        return itemSum + (profitPerItem * item.quantity);
      }, 0);
      return sum + orderProfit;
    }, 0);

  // Monthly and yearly statistics
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const monthlyOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });
  
  const monthlySales = monthlyOrders
    .filter(o => o.status === 'confirmed' || o.status === 'delivered')
    .reduce((sum, order) => sum + order.total_amount, 0);
  
  const yearlyOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at);
    return orderDate.getFullYear() === currentYear;
  });
  
  const yearlySales = yearlyOrders
    .filter(o => o.status === 'confirmed' || o.status === 'delivered')
    .reduce((sum, order) => sum + order.total_amount, 0);

  // Prepare data for charts
  const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
    const monthOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at);
      return orderDate.getMonth() === i && orderDate.getFullYear() === currentYear;
    });
    const monthSales = monthOrders
      .filter(o => o.status === 'confirmed' || o.status === 'delivered')
      .reduce((sum, order) => sum + order.total_amount, 0);
    const monthProfit = monthOrders
      .filter(o => o.status === 'confirmed' || o.status === 'delivered')
      .reduce((sum, order) => {
        const orderProfit = order.order_items.reduce((itemSum, item) => {
          const product = products.find(p => p.id === item.product_id);
          const costPrice = product?.cost_price || 0;
          const profitPerItem = item.price - costPrice;
          return itemSum + (profitPerItem * item.quantity);
        }, 0);
        return sum + orderProfit;
      }, 0);
    
    return {
      month: new Date(currentYear, i).toLocaleDateString('bn-BD', { month: 'short' }),
      sales: monthSales,
      profit: monthProfit,
    };
  });

  // Last 12 months data
  const last12MonthsData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const monthOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at);
      return orderDate.getMonth() === month && orderDate.getFullYear() === year;
    });
    const monthSales = monthOrders
      .filter(o => o.status === 'confirmed' || o.status === 'delivered')
      .reduce((sum, order) => sum + order.total_amount, 0);
    
    return {
      month: date.toLocaleDateString('bn-BD', { month: 'short', year: 'numeric' }),
      sales: monthSales,
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'delivered':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'নিশ্চিত';
      case 'pending':
        return 'অপেক্ষমান';
      case 'delivered':
        return 'ডেলিভারি হয়েছে';
      case 'cancelled':
        return 'বাতিল';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background page-transition">
      <header className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border sticky top-0 z-10 shadow-sm backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              অ্যাডমিন প্যানেল
            </h1>
            {newOrderCount > 0 && (
              <Badge className="bg-red-500 text-white animate-pulse">
                {newOrderCount} নতুন
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {newOrderCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewOrderCount(0);
                  setActiveTab('orders');
                }}
                className="transition-all duration-200 hover:scale-105"
              >
                দেখুন
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full sm:w-auto transition-all duration-200 hover:scale-105 hover:bg-destructive hover:text-destructive-foreground"
            >
            <LogOut className="h-4 w-4 mr-2" />
            লগআউট
          </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 animate-fade-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 lg:grid-cols-6 h-auto">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm py-2 sm:py-2.5 transition-all duration-200">ড্যাশবোর্ড</TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm py-2 sm:py-2.5 transition-all duration-200">পণ্য</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm py-2 sm:py-2.5 transition-all duration-200">অর্ডার</TabsTrigger>
            <TabsTrigger value="sales" className="text-xs sm:text-sm py-2 sm:py-2.5 transition-all duration-200">বিক্রয়</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 sm:py-2.5 transition-all duration-200">অ্যাক্টিভিটি</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 sm:py-2.5 transition-all duration-200">সেটিংস</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট বিক্রয়</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">৳{totalSales.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">সব সময়ের বিক্রয়</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    এই মাস: ৳{monthlySales.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট লাভ</CardTitle>
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">৳{totalProfit.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">নিট মুনাফা</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {totalSales > 0 ? `${((totalProfit / totalSales) * 100).toFixed(1)}% মার্জিন` : '0% মার্জিন'}
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট অর্ডার</CardTitle>
                  <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalOrders}</div>
                  <p className="text-xs text-muted-foreground">
                    নিশ্চিত: {confirmedOrders} | ডেলিভারি: {deliveredOrders}
                  </p>
                  {pendingOrders > 0 && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold">
                      ⚠️ {pendingOrders} অপেক্ষমান
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট পণ্য</CardTitle>
                  <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalProducts}</div>
                  <p className="text-xs text-muted-foreground">
                    {lowStockProducts > 0 ? `${lowStockProducts} পণ্য কম স্টকে` : 'সব পণ্য স্টকে আছে'}
                  </p>
                  {lowStockProducts > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-semibold">
                      ⚠️ স্টক কম
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Monthly and Yearly Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">এই মাসের বিক্রয়</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">৳{monthlySales.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {monthlyOrders.filter(o => o.status === 'confirmed' || o.status === 'delivered').length} টি অর্ডার
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">এই বছরের বিক্রয়</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">৳{yearlySales.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {yearlyOrders.filter(o => o.status === 'confirmed' || o.status === 'delivered').length} টি অর্ডার
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>সাম্প্রতিক অর্ডার</CardTitle>
                <CardDescription>সর্বশেষ ৫টি অর্ডার</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-semibold">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{order.phone}</p>
                        <p className="text-sm text-muted-foreground">৳{order.total_amount.toFixed(2)}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">কোন অর্ডার নেই</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                  <div>
              <CardTitle>পণ্য ব্যবস্থাপনা</CardTitle>
                    <CardDescription>পণ্য যোগ, সম্পাদনা এবং মুছুন</CardDescription>
                  </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                      <Button onClick={() => handleOpenDialog()} className="transition-all duration-300 hover:scale-105">
                    <Plus className="h-4 w-4 mr-2" />
                    নতুন পণ্য যোগ করুন
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle>
      {editingProduct ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য যোগ করুন'}
    </DialogTitle>
    <DialogDescription>
      {editingProduct 
        ? 'আপনি এখানে পণ্যের তথ্য সম্পাদনা করতে পারেন' 
        : 'এখানে নতুন পণ্য যোগ করতে পারেন'}
    </DialogDescription>
  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">পণ্যের নাম *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                            className="transition-all duration-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">বিবরণ</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="transition-all duration-200"
                      />
                    </div>
                        <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">বিক্রয় মূল্য (৳) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                              className="transition-all duration-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cost_price">ক্রয় মূল্য (৳)</Label>
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        placeholder="0.00"
                              className="transition-all duration-200"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        লাভ গণনার জন্য প্রয়োজন
                      </p>
                    </div>
                    </div>
                        <div>
                    <div>
                      <Label htmlFor="stock">স্টক *</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        required
                              className="transition-all duration-200"
                      />
                    </div>
                        </div>
                        <div>
                          <Label htmlFor="priority">প্রাধান্য (Priority) *</Label>
                          <Input
                            id="priority"
                            type="number"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            min="1"
                            placeholder="999"
                            className="transition-all duration-200"
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            কম সংখ্যা = বেশি প্রাধান্য (1 প্রথমে, 2 দ্বিতীয়ে, ইত্যাদি)
                          </p>
                        </div>
                        <div>
                          <Label>ছবি/ভিডিও আপলোড করুন (একাধিক নির্বাচন করুন)</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            সমর্থিত ফরম্যাট: PNG, JPG, JPEG, WEBP (ছবি) | MP4, WEBM, OGG (ভিডিও)
                          </p>
                          <div className="mt-2 space-y-4">
                            <div className="flex items-center gap-4">
                              <Input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm,video/ogg"
                                multiple
                                onChange={(e) => {
                                  handleFileUpload(e.target.files);
                                  // Reset file input after handling
                                  if (e.target) {
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                                disabled={uploading}
                                className="cursor-pointer transition-all duration-200"
                              />
                              {uploading && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                  <span>আপলোড হচ্ছে...</span>
                                </div>
                              )}
                            </div>
                            {/* Show uploaded files preview */}
                            {uploadedFiles.length > 0 && (
                              <div className="space-y-3 mt-4">
                                <p className="text-sm font-medium text-foreground">আপলোড করা ছবি/ভিডিও ({uploadedFiles.length}):</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                  {uploadedFiles.map((url, index) => (
                                    <div key={index} className="relative group border-2 border-border rounded-lg overflow-hidden hover:border-primary transition-all duration-200">
                                      {url.includes('video') || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') ? (
                                        <video
                                          src={url}
                                          className="w-full h-32 object-cover"
                                          controls
                                          onError={(e) => {
                                            console.error('Video load error:', url);
                                          }}
                                        />
                                      ) : (
                                        <img
                                          src={url}
                                          alt={`Preview ${index + 1}`}
                                          className="w-full h-32 object-cover"
                                          onError={(e) => {
                                            console.error('Image load error:', url);
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                                          }}
                                        />
                                      )}
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        onClick={() => {
                                          const newFiles = uploadedFiles.filter((_, i) => i !== index);
                                          setUploadedFiles(newFiles);
                                          setFormData({ ...formData, images: newFiles, image_url: newFiles[0] || '' });
                                          setUploadPreview(newFiles.length > 0 ? newFiles[0] : null);
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                      {index === 0 && (
                                        <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                                          Main
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {uploadedFiles.length > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    💡 প্রথম ছবিটি প্রধান ছবি হিসেবে ব্যবহার হবে
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button type="submit" className="w-full transition-all duration-300 hover:scale-105" disabled={uploading}>
                          {uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              আপলোড হচ্ছে...
                            </>
                          ) : editingProduct ? (
                            'আপডেট করুন'
                          ) : (
                            'যোগ করুন'
                          )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
                <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ছবি</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>মূল্য</TableHead>
                  <TableHead>স্টক</TableHead>
                  <TableHead>প্রাধান্য</TableHead>
                  <TableHead className="text-right">অ্যাকশন</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products
                  .slice((productsPage - 1) * ITEMS_PER_PAGE, productsPage * ITEMS_PER_PAGE)
                  .map((product) => (
                        <TableRow key={product.id} className="transition-colors hover:bg-muted/50">
                    <TableCell>
                      {(() => {
                        const productImages = product.images && product.images.length > 0 
                          ? product.images 
                          : (product.image_url ? [product.image_url] : []);
                        const displayImage = productImages[0];
                        
                        return displayImage ? (
                          <img
                            src={displayImage}
                          alt={product.name}
                            className="w-12 h-12 object-cover rounded transition-transform duration-200 hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null;
                      })()}
                      {(!product.image_url && (!product.images || product.images.length === 0)) && (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>৳{product.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={product.stock < 10 ? 'destructive' : 'default'}>
                              {product.stock}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {product.priority ?? 999}
                            </Badge>
                          </TableCell>
                    <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(product)}
                                className="transition-all duration-200 hover:scale-110"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                                className="transition-all duration-200 hover:scale-110 text-destructive hover:text-destructive"
                      >
                                <Trash2 className="h-4 w-4" />
                      </Button>
                            </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
                </div>
                {products.length > ITEMS_PER_PAGE && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={productsPage}
                      totalPages={Math.ceil(products.length / ITEMS_PER_PAGE)}
                      onPageChange={setProductsPage}
                      itemsPerPage={ITEMS_PER_PAGE}
                      totalItems={products.length}
                    />
                  </div>
                )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">অর্ডার ব্যবস্থাপনা</CardTitle>
                <CardDescription className="text-sm">সব অর্ডার দেখুন এবং পরিচালনা করুন</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mobile View - Card Layout */}
                <div className="block lg:hidden space-y-4">
                  {orders
                    .slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE)
                    .map((order) => (
                    <Card key={order.id} className="card-hover animate-fade-in">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-mono text-xs text-muted-foreground mb-1">{order.id.slice(0, 8)}</p>
                            <h3 className="font-semibold text-base">{order.customer_name}</h3>
                            <p className="text-sm text-muted-foreground">{order.phone}</p>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusText(order.status)}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-1">ঠিকানা:</p>
                          <p className="font-medium">{order.address}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-1">পণ্য:</p>
                          <div className="space-y-1">
                            {order.order_items.map((item, idx) => (
                              <div key={idx}>
                                {item.products?.name || 'N/A'} x{item.quantity} = ৳{(item.quantity * item.price).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div>
                            <p className="text-sm text-muted-foreground">মোট:</p>
                            <p className="text-lg font-bold text-primary">৳{order.total_amount.toFixed(2)}</p>
                          </div>
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleUpdateOrderStatus(order.id, value, order.status)}
                          >
                            <SelectTrigger className="w-28 sm:w-32 transition-all duration-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">অপেক্ষমান</SelectItem>
                              <SelectItem value="confirmed">নিশ্চিত</SelectItem>
                              <SelectItem value="delivered">ডেলিভারি হয়েছে</SelectItem>
                              <SelectItem value="cancelled">বাতিল</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          তারিখ: {new Date(order.created_at).toLocaleDateString('bn-BD')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">কোন অর্ডার নেই</p>
                  )}
                </div>

                {/* Desktop View - Table Layout */}
                <div className="hidden lg:block rounded-md border">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>অর্ডার আইডি</TableHead>
                          <TableHead>গ্রাহক</TableHead>
                          <TableHead>ফোন</TableHead>
                          <TableHead>ঠিকানা</TableHead>
                          <TableHead>পণ্য</TableHead>
                          <TableHead>মোট</TableHead>
                          <TableHead>স্ট্যাটাস</TableHead>
                          <TableHead>তারিখ</TableHead>
                          <TableHead>অ্যাকশন</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders
                          .slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE)
                          .map((order) => (
                          <TableRow key={order.id} className="transition-colors hover:bg-muted/50">
                            <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                            <TableCell className="font-medium">{order.customer_name}</TableCell>
                            <TableCell>{order.phone}</TableCell>
                            <TableCell className="max-w-xs truncate">{order.address}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.order_items.map((item, idx) => (
                                  <div key={idx} className="text-sm">
                                    {item.products?.name || 'N/A'} x{item.quantity}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">৳{order.total_amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                {getStatusText(order.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString('bn-BD')}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={order.status}
                                onValueChange={(value) => handleUpdateOrderStatus(order.id, value, order.status)}
                              >
                                <SelectTrigger className="w-32 transition-all duration-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">অপেক্ষমান</SelectItem>
                                  <SelectItem value="confirmed">নিশ্চিত</SelectItem>
                                  <SelectItem value="delivered">ডেলিভারি হয়েছে</SelectItem>
                                  <SelectItem value="cancelled">বাতিল</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                        {orders.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              কোন অর্ডার নেই
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {orders.length > 0 && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={ordersPage}
                      totalPages={Math.ceil(orders.length / ITEMS_PER_PAGE)}
                      onPageChange={setOrdersPage}
                      itemsPerPage={ITEMS_PER_PAGE}
                      totalItems={orders.length}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20">
                <CardHeader>
                  <CardTitle className="text-lg">মোট বিক্রয়</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">৳{totalSales.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground mt-2">সব সময়ের মোট বিক্রয়</p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
                <CardHeader>
                  <CardTitle className="text-lg">মোট লাভ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">৳{totalProfit.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground mt-2">নিট মুনাফা</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {totalSales > 0 ? `${((totalProfit / totalSales) * 100).toFixed(1)}% মার্জিন` : '0%'}
                  </p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
                <CardHeader>
                  <CardTitle className="text-lg">মোট অর্ডার</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalOrders}</div>
                  <p className="text-sm text-muted-foreground mt-2">সব সময়ের মোট অর্ডার</p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20">
                <CardHeader>
                  <CardTitle className="text-lg">গড় অর্ডার মূল্য</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    ৳{totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">প্রতি অর্ডারের গড় মূল্য</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    মাসিক বিক্রয় (এই বছর)
                  </CardTitle>
                  <CardDescription>প্রতি মাসের বিক্রয় এবং লাভ</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `৳${value.toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="sales" fill="#10b981" name="বিক্রয়" />
                      <Bar dataKey="profit" fill="#3b82f6" name="লাভ" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    মাসিক বিক্রয় ট্রেন্ড (গত ১২ মাস)
                  </CardTitle>
                  <CardDescription>বিক্রয়ের প্রবণতা</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={last12MonthsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `৳${value.toFixed(2)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} name="বিক্রয়" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>অর্ডার বিবরণ</CardTitle>
                <CardDescription>বিক্রয়ের সম্পূর্ণ বিবরণ</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders
                    .slice((ordersPage - 1) * ITEMS_PER_PAGE, ordersPage * ITEMS_PER_PAGE)
                    .map((order) => (
                    <Card key={order.id} className="transition-all duration-300 hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{order.customer_name}</h3>
                              <Badge className={getStatusColor(order.status)}>
                                {getStatusText(order.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">ফোন: {order.phone}</p>
                            <p className="text-sm text-muted-foreground">ঠিকানা: {order.address}</p>
                            <p className="text-sm text-muted-foreground">
                              তারিখ: {new Date(order.created_at).toLocaleString('bn-BD')}
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm font-medium">পণ্য:</p>
                              {order.order_items.map((item, idx) => {
                                const product = products.find(p => p.id === item.product_id);
                                const costPrice = product?.cost_price || 0;
                                const profitPerItem = item.price - costPrice;
                                const itemProfit = profitPerItem * item.quantity;
                                return (
                                  <div key={idx} className="text-sm text-muted-foreground ml-4">
                                    • {item.products?.name || 'N/A'} - {item.quantity} x ৳{item.price.toFixed(2)} = ৳{(item.quantity * item.price).toFixed(2)}
                                    {costPrice > 0 && (
                                      <span className="text-blue-600 dark:text-blue-400 ml-2">
                                        (লাভ: ৳{itemProfit.toFixed(2)})
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">৳{order.total_amount.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.location_type === 'inside_dhaka' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে'}
                            </p>
                            {order.order_items.length > 0 && (() => {
                              const orderProfit = order.order_items.reduce((sum, item) => {
                                const product = products.find(p => p.id === item.product_id);
                                const costPrice = product?.cost_price || 0;
                                const profitPerItem = item.price - costPrice;
                                return sum + (profitPerItem * item.quantity);
                              }, 0);
                              const hasCostPrice = order.order_items.some(item => {
                                const product = products.find(p => p.id === item.product_id);
                                return (product?.cost_price || 0) > 0;
                              });
                              return hasCostPrice && orderProfit > 0 ? (
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">
                                  লাভ: ৳{orderProfit.toFixed(2)}
                                </p>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">কোন বিক্রয় নেই</p>
                  )}
                </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">মোট ভিজিট</CardTitle>
                  <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {activities.filter(a => a.activity_type === 'page_view').length}
                  </div>
                  <p className="text-xs text-muted-foreground">পেজ ভিউ</p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-background dark:from-green-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">পণ্য ক্লিক</CardTitle>
                  <MousePointerClick className="h-5 w-5 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {activities.filter(a => a.activity_type === 'product_click').length}
                  </div>
                  <p className="text-xs text-muted-foreground">পণ্যে ক্লিক</p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">কার্টে যোগ</CardTitle>
                  <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {activities.filter(a => a.activity_type === 'add_to_cart').length}
                  </div>
                  <p className="text-xs text-muted-foreground">কার্টে যোগ করা</p>
                </CardContent>
              </Card>

              <Card className="transition-all duration-300 hover:shadow-lg border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-background dark:from-orange-950/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">অনন্য সেশন</CardTitle>
                  <Activity className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {new Set(activities.map(a => a.session_id)).size}
                  </div>
                  <p className="text-xs text-muted-foreground">ইউনিক ভিজিটর</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl">ইউজার অ্যাক্টিভিটি লগ</CardTitle>
                    <CardDescription className="text-sm">সব ইউজার অ্যাক্টিভিটি দেখুন</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                      <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="খুঁজুন..."
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                        className="pl-8 w-full sm:w-64 transition-all duration-200"
                      />
                    </div>
                    <Select value={activityFilter} onValueChange={setActivityFilter}>
                      <SelectTrigger className="w-full sm:w-48 transition-all duration-200">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">সব অ্যাক্টিভিটি</SelectItem>
                        <SelectItem value="page_view">পেজ ভিউ</SelectItem>
                        <SelectItem value="product_view">পণ্য দেখা</SelectItem>
                        <SelectItem value="product_click">পণ্য ক্লিক</SelectItem>
                        <SelectItem value="add_to_cart">কার্টে যোগ</SelectItem>
                        <SelectItem value="order_placed">অর্ডার প্লেস</SelectItem>
                        <SelectItem value="search">খোঁজা</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <div className="overflow-x-auto">
                      {/* Mobile View */}
                      <div className="block lg:hidden space-y-4">
                        {activities
                          .slice((activitiesPage - 1) * ITEMS_PER_PAGE, activitiesPage * ITEMS_PER_PAGE)
                          .map((activity) => (
                          <Card key={activity.id} className="card-hover animate-fade-in">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <Badge className={getActivityTypeColor(activity.activity_type)}>
                                    {getActivityTypeText(activity.activity_type)}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                                    {activity.session_id?.slice(0, 12)}...
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(activity.created_at).toLocaleString('bn-BD')}
                                </p>
                              </div>
                              {activity.product_name && (
                                <p className="font-semibold text-sm">{activity.product_name}</p>
                              )}
                              {activity.page_path && (
                                <p className="text-xs text-muted-foreground">পেজ: {activity.page_path}</p>
                              )}
                              {activity.metadata?.search_query && (
                                <p className="text-xs text-muted-foreground">
                                  খোঁজা: "{activity.metadata.search_query}"
                                </p>
                              )}
                              {activity.metadata?.order_id && (
                                <p className="text-xs text-muted-foreground">
                                  অর্ডার ID: {activity.metadata.order_id.slice(0, 8)}
                                </p>
                              )}
                              <div className="text-xs text-muted-foreground pt-2 border-t">
                                <p>IP: {activity.ip_address || 'Unknown'}</p>
                                <p className="truncate">Device: {activity.user_agent?.substring(0, 50) || 'Unknown'}...</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {activities.length === 0 && (
                          <p className="text-center py-8 text-muted-foreground">কোন অ্যাক্টিভিটি নেই</p>
                        )}
                      </div>

                      {/* Desktop View */}
                      <div className="hidden lg:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>সময়</TableHead>
                              <TableHead>অ্যাক্টিভিটি</TableHead>
                              <TableHead>পণ্য</TableHead>
                              <TableHead>পেজ</TableHead>
                              <TableHead>সেশন</TableHead>
                              <TableHead>IP</TableHead>
                              <TableHead>ডিভাইস</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activities
                              .slice((activitiesPage - 1) * ITEMS_PER_PAGE, activitiesPage * ITEMS_PER_PAGE)
                              .map((activity) => (
                              <TableRow key={activity.id} className="transition-colors hover:bg-muted/50">
                                <TableCell className="text-sm text-muted-foreground">
                                  {new Date(activity.created_at).toLocaleString('bn-BD')}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getActivityTypeColor(activity.activity_type)}>
                                    {getActivityTypeText(activity.activity_type)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {activity.product_name || '-'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {activity.page_path || '-'}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {activity.session_id?.slice(0, 12) || '-'}...
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {activity.ip_address || 'Unknown'}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                  {activity.user_agent || 'Unknown'}
                                </TableCell>
                              </TableRow>
                            ))}
                            {activities.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                  কোন অ্যাক্টিভিটি নেই
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  ডেলিভারি চার্জ সেটিংস
                </CardTitle>
                <CardDescription>
                  ঢাকার ভিতরে এবং বাইরের জন্য ডেলিভারি চার্জ নির্ধারণ করুন
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Inside Dhaka */}
                  <Card className="border-2 border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">ঢাকার ভিতরে</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="inside_dhaka_charge">ডেলিভারি চার্জ (৳)</Label>
                        <Input
                          id="inside_dhaka_charge"
                          type="number"
                          min="0"
                          step="0.01"
                          value={deliveryCharges.inside_dhaka}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setDeliveryCharges(prev => ({
                              ...prev,
                              inside_dhaka: value,
                            }));
                          }}
                          className="mt-2"
                          disabled={loadingCharges}
                        />
                      </div>
                      <Button
                        onClick={() => updateDeliveryCharge('inside_dhaka', deliveryCharges.inside_dhaka)}
                        disabled={loadingCharges}
                        className="w-full"
                      >
                        {loadingCharges ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            আপডেট হচ্ছে...
                          </>
                        ) : (
                          'সংরক্ষণ করুন'
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Outside Dhaka */}
                  <Card className="border-2 border-border">
                    <CardHeader>
                      <CardTitle className="text-lg">ঢাকার বাইরে</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="outside_dhaka_charge">ডেলিভারি চার্জ (৳)</Label>
                        <Input
                          id="outside_dhaka_charge"
                          type="number"
                          min="0"
                          step="0.01"
                          value={deliveryCharges.outside_dhaka}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setDeliveryCharges(prev => ({
                              ...prev,
                              outside_dhaka: value,
                            }));
                          }}
                          className="mt-2"
                          disabled={loadingCharges}
                        />
                      </div>
                      <Button
                        onClick={() => updateDeliveryCharge('outside_dhaka', deliveryCharges.outside_dhaka)}
                        disabled={loadingCharges}
                        className="w-full"
                      >
                        {loadingCharges ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            আপডেট হচ্ছে...
                          </>
                        ) : (
                          'সংরক্ষণ করুন'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>নোট:</strong> ডেলিভারি চার্জ পরিবর্তন করলে নতুন অর্ডারগুলোতে নতুন চার্জ প্রযোজ্য হবে।
                    আগের অর্ডারগুলোতে পুরানো চার্জই থাকবে।
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Helper functions for activity types
const getActivityTypeColor = (type: string) => {
  switch (type) {
    case 'page_view':
      return 'bg-blue-500';
    case 'product_view':
      return 'bg-cyan-500';
    case 'product_click':
      return 'bg-green-500';
    case 'add_to_cart':
      return 'bg-purple-500';
    case 'order_placed':
      return 'bg-orange-500';
    case 'search':
      return 'bg-pink-500';
    default:
      return 'bg-gray-500';
  }
};

const getActivityTypeText = (type: string) => {
  switch (type) {
    case 'page_view':
      return 'পেজ ভিউ';
    case 'product_view':
      return 'পণ্য দেখা';
    case 'product_click':
      return 'পণ্য ক্লিক';
    case 'add_to_cart':
      return 'কার্টে যোগ';
    case 'remove_from_cart':
      return 'কার্ট থেকে সরান';
    case 'order_placed':
      return 'অর্ডার প্লেস';
    case 'search':
      return 'খোঁজা';
    case 'button_click':
      return 'বাটন ক্লিক';
    default:
      return type;
  }
};

export default Admin;
