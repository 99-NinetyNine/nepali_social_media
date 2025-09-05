// User types
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_premium: boolean;
  is_business: boolean;
  profile: UserProfile;
  date_joined: string;
}

export interface UserProfile {
  id: number;
  bio: string;
  avatar: string | null;
  cover_photo: string | null;
  location: string;
  website: string;
  birth_date: string | null;
  phone_number: string;
  is_verified: boolean;
  show_monetization_content: boolean;
  privacy_level: 'public' | 'friends' | 'private';
}

// Post types
export interface Post {
  id: number;
  author: User;
  title: string;
  description: string;
  post_type: 'post' | 'job' | 'short' | 'story' | 'ad';
  privacy: 'public' | 'connections' | 'private';
  is_monetized: boolean;
  allow_comments: boolean;
  allow_sharing: boolean;
  view_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  share_count: number;
  is_boosted: boolean;
  media: PostMedia[];
  hashtags: Hashtag[];
  user_reaction: string | null;
  is_shared_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostMedia {
  id: number;
  media_type: 'image' | 'video' | 'audio' | 'document';
  file: string;
  thumbnail: string | null;
  alt_text: string;
  order: number;
  duration?: number;
  file_size?: number;
  text_overlay?: string;
  text_position?: 'top' | 'middle' | 'bottom';
}

export interface Hashtag {
  id: number;
  name: string;
  post_count: number;
  trending_score: number;
}

export interface Comment {
  id: number;
  author: User;
  content: string;
  like_count: number;
  replies: Comment[];
  created_at: string;
}

// E-commerce types
export interface Product {
  id: number;
  seller: User;
  category: Category;
  name: string;
  description: string;
  product_type: string;
  price: number;
  original_price: number | null;
  stock_quantity: number;
  is_realtime_delivery: boolean;
  preparation_time: number;
  is_active: boolean;
  is_featured: boolean;
  average_rating: number;
  review_count: number;
  images: ProductImage[];
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  image: string | null;
  parent: number | null;
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
}

export interface CartItem {
  id: number;
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  price: number;
}

export interface ProductVariant {
  id: number;
  name: string;
  value: string;
  price_adjustment: number;
  stock_quantity: number;
  sku: string;
}

export interface Order {
  id: number;
  order_id: string;
  customer: User;
  subtotal: number;
  tax_amount: number;
  delivery_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  delivery_address: string;
  delivery_phone: string;
  items: OrderItem[];
  created_at: string;
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  variant_info: string;
}

// Payment types
export interface Invoice {
  id: number;
  invoice_id: string;
  user: User;
  invoice_type: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  delivery_fee: number;
  total_amount: number;
  status: string;
  payment_method: string;
  items: InvoiceItem[];
  created_at: string;
  due_date: string;
  paid_at: string | null;
}

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PremiumPlan {
  id: number;
  name: string;
  plan_type: 'monthly' | 'yearly' | 'lifetime';
  price: number;
  duration_days: number;
  features: Record<string, any>;
  is_active: boolean;
}

// API Response types
export interface ApiResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface LoginResponse {
  user: User;
  access: string;
  refresh: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
}

export interface PostForm {
  title: string;
  description: string;
  post_type: string;
  privacy: string;
  is_monetized: boolean;
  allow_comments: boolean;
  allow_sharing: boolean;
  hashtags: string[];
  media_files: File[];
}