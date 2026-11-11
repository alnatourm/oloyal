export type NavigationPath = 
  | 'dashboard' 
  | 'pass-studio' 
  | 'pos-cashier' 
  | 'customers-crm' 
  | 'onboarding'
  | 'billing'
  | 'customer-join'
  | 'super-admin'
  | 'telemetry-hardware' 
  | 'reports' 
  | 'settings'
  | 'privacy'
  | 'terms';

export type ArchetypeKey = 'loyalty' | 'gift' | 'ticket';

export interface PassArchetype {
  id: string;
  title: string;
  merchant: string;
  avatar: string;
  badge: string;
  holderLabel: string;
  holderName: string;
  tierText: string;
  tierIcon: string;
  tierBg: string;
  tierColor: string;
  metricLabel: string;
  metricValue: string;
  submetricValue: string;
  nfcIcon: string;
  nfcText: string;
  barcodeType: 'barcode' | 'qr';
  barcodeNum: string;
  showExtra: boolean;
  rotaryDeg: number;
  dialSubtitle: string;
  stepperLabel: string;
  accentColor: string;
}

export interface SwatchColor {
  name: string;
  color: string;
  dark: string;
  glow: string;
}

export interface CustomerMember {
  id: string;
  uid: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  initials?: string;
  tier: 'GOLD VIP' | 'SILVER' | 'PLATINUM' | 'BRONZE';
  tierColor: string;
  tierBg: string;
  points: number;
  tierCap: number;
  entryPoints: number;
  thresholdPoints: number;
  status: string;
  joinedDate: string;
  syncedTime: string;
  visitCount: number;
}

export interface LoyaltyPerk {
  id: string;
  title: string;
  pointsCost: number;
  discountAmount: number;
  icon: string;
  category: string;
  active: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  subtitle: string;
  qty: number;
  price: number;
}

export interface TerminalEvent {
  id: string;
  memberName: string;
  tier: 'GOLD' | 'SILVER' | 'PLATINUM' | 'BRONZE';
  action: string;
  location: string;
  pointsDelta: number;
  timestamp: string;
  icon: string;
  type: 'card' | 'nfc' | 'redeem' | 'install';
}
