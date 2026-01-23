
export type OrderStatus = 'pending' | 'processing' | 'packaging' | 'shipped' | 'delivered' | 'canceled';
export type SellerRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'hero' | 'grand';

export interface Category {
  id: string;
  name: string;
  imageUrl: string;
  link: string;
}

export interface SiteConfig {
  bannerVisible: boolean;
  bannerText: string;
  bannerType: 'info' | 'success' | 'warning' | 'error';
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  keywords: string;
  contactPhone: string;
  telegramLink: string;
  whatsappLink: string;
  oneSignalAppId?: string;
  oneSignalApiKey?: string;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  rewardPoints: number;
  rankOverride?: SellerRank;
  isAdmin?: boolean;
  isBanned?: boolean;
  isSellerApproved?: boolean;
  isShadowMode?: boolean; 
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  description: string;
  image: string;
  stock: string;
  sellerId?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerWhatsapp?: string; // New field
  sellerPaymentMethod?: string;
  sellerPaymentNumber?: string;
  views?: number;
  isPromoted?: boolean;
  timestamp: any;
}

export interface Order {
  id: string;
  userInfo: {
    userId: string;
    userName: string;
    phone: string;
  };
  sellerId?: string | null;
  products: any[];
  totalAmount: number;
  advancePaid: number;
  status: OrderStatus;
  paymentMethod: string;
  address: any;
  timestamp: any;
  // Verification for No Advance
  verificationType?: 'advance' | 'nid';
  parentInfo?: {
    parentType: 'Mother' | 'Father';
    parentName: string;
    parentPhone: string;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  timestamp: any;
}

// Added missing HomeBanner interface
export interface HomeBanner {
  id: string;
  imageUrl: string;
  link?: string;
  order: number;
}

// Added missing CustomAd interface
export interface CustomAd {
  id: string;
  imageUrl: string;
  link?: string;
  text: string;
  placement: 'home_top' | 'home_middle' | 'home_bottom';
  order: number;
}

// Added missing Review interface
export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  timestamp: any;
}

// Added missing SellerRequest interface
export interface SellerRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any;
}
