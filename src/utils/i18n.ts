// Middle East Regional Bilingual (Arabic RTL & English LTR) Localization & Internationalization
import { useState, useEffect } from 'react';

export type SupportedLanguage = 'ar' | 'en';

export const LANGUAGE_STORAGE_KEY = 'passloyal_language';

export interface RegionalCountry {
  code: string;
  dialCode: string;
  nameEn: string;
  nameAr: string;
  flag: string;
  placeholder: string;
}

export const MIDDLE_EAST_COUNTRIES: RegionalCountry[] = [
  { code: 'SA', dialCode: '+966', nameEn: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', flag: '🇸🇦', placeholder: '50 123 4567' },
  { code: 'AE', dialCode: '+971', nameEn: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', flag: '🇦🇪', placeholder: '50 123 4567' },
  { code: 'JO', dialCode: '+962', nameEn: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴', placeholder: '7 9123 4567' },
  { code: 'KW', dialCode: '+965', nameEn: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', placeholder: '9123 4567' },
  { code: 'QA', dialCode: '+974', nameEn: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', placeholder: '3312 3456' },
  { code: 'BH', dialCode: '+973', nameEn: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', placeholder: '3612 3456' },
  { code: 'OM', dialCode: '+968', nameEn: 'Oman', nameAr: 'سلطنة عُمان', flag: '🇴🇲', placeholder: '9123 4567' },
  { code: 'EG', dialCode: '+20', nameEn: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', placeholder: '10 1234 5678' },
  { code: 'INTL', dialCode: '+', nameEn: 'International', nameAr: 'دولي', flag: '🌐', placeholder: 'Country code & number' },
];

export interface RegionalCurrency {
  code: string;
  symbolEn: string;
  symbolAr: string;
  nameEn: string;
  nameAr: string;
}

export const REGIONAL_CURRENCIES: Record<string, RegionalCurrency> = {
  SAR: { code: 'SAR', symbolEn: 'SAR', symbolAr: 'ر.س', nameEn: 'Saudi Riyal', nameAr: 'ريال سعودي' },
  AED: { code: 'AED', symbolEn: 'AED', symbolAr: 'د.إ', nameEn: 'UAE Dirham', nameAr: 'درهم إماراتي' },
  KWD: { code: 'KWD', symbolEn: 'KWD', symbolAr: 'د.ك', nameEn: 'Kuwaiti Dinar', nameAr: 'دينار كويتي' },
  JOD: { code: 'JOD', symbolEn: 'JOD', symbolAr: 'د.أ', nameEn: 'Jordanian Dinar', nameAr: 'دينار أردني' },
  QAR: { code: 'QAR', symbolEn: 'QAR', symbolAr: 'ر.ق', nameEn: 'Qatari Riyal', nameAr: 'ريال قطري' },
  BHD: { code: 'BHD', symbolEn: 'BHD', symbolAr: 'د.ب', nameEn: 'Bahraini Dinar', nameAr: 'دينار بحريني' },
  OMR: { code: 'OMR', symbolEn: 'OMR', symbolAr: 'ر.ع', nameEn: 'Omani Rial', nameAr: 'ريال عُماني' },
  EGP: { code: 'EGP', symbolEn: 'EGP', symbolAr: 'ج.م', nameEn: 'Egyptian Pound', nameAr: 'جنيه مصري' },
  USD: { code: 'USD', symbolEn: '$', symbolAr: '$', nameEn: 'US Dollar', nameAr: 'دولار أمريكي' },
};

const translations = {
  en: {
    // Landing Page Navbar & Hero
    landingLogo: 'PassLoyal',
    navPlatform: 'Platform',
    navSmartTap: 'Smart Tap',
    navBeacons: 'Beacons',
    navPricing: 'Pricing',
    navEnterprise: 'Enterprise',
    navLogin: 'Login',
    navGetStarted: 'Get Started Free',
    heroCertifiedBadge: 'Dual Mobile Wallet Engine (Apple & Google Wallet)',
    heroHeadline: 'Turn Every Tap Into a',
    heroHeadlineHighlight: 'Lifelong Regular',
    heroSubtitle: 'PassLoyal empowers Middle East restaurants and retailers to issue native Apple Wallet (.pkpass) and Google Wallet passes, trigger geo-proximity alerts, and scan via NFC in 0.2s — zero apps required.',
    exploreDemo: 'Explore Live Interactive Demo',
    deployFirstPass: 'Deploy Your First Pass Free',
    passRetentionStat: 'Pass Retention 98.4%',
    passRetentionReview: 'from 1,200+ multi-unit restaurant operators',

    // Navigation & App Shell
    dashboard: 'Dashboard',
    passStudio: 'Pass Studio',
    posCashier: 'POS Cashier',
    customersCrm: 'Customers CRM',
    pushGeo: 'Push & Geo Studio',
    customerJoin: 'Customer Enrollment',
    onboarding: 'Store Onboarding',
    reports: 'Analytics & Ledger',
    billing: 'SaaS Billing & Limits',
    superAdmin: 'Super Admin Console',
    settings: 'Settings',
    profile: 'My Profile',
    logout: 'Log Out',
    scanPass: 'Scan Pass',
    quickScan: 'Quick Optical Scanner',
    searchPlaceholder: 'Search members, IDs, stores...',
    langToggle: 'العربية',

    // Customer Enrollment / Join
    enrollHeader: 'Digital Loyalty Membership',
    enrollSubtitle: 'Enroll in seconds to save your pass directly to Apple Wallet & Google Wallet',
    fullName: 'Full Name',
    fullNamePlaceholder: 'e.g. Omar Al-Zahrani',
    emailAddress: 'Email Address',
    emailPlaceholder: 'e.g. omar@example.com',
    mobilePhone: 'Mobile Phone',
    countryCode: 'Country',
    enrollButton: 'Enroll & Issue Wallet Pass',
    signingPass: 'Generating & Signing Pass...',
    welcomeHeader: 'Welcome to the Club!',
    passReadySubtitle: 'Your pass is ready. Add it to your digital wallet to earn points & unlock rewards instantly.',
    addToAppleWallet: 'Add to Apple Wallet',
    addToGoogleWallet: 'Add to Google Wallet',
    previewCard: 'Interactive Wallet Preview',
    qrBarcodeLabel: 'Digital Pass QR Barcode',
    presentAtCheckout: 'Present this QR barcode or Member ID at cashier checkout.',
    bonusPointsGranted: 'Bonus points awarded upon registration!',
    copyPassLink: 'Copy Pass URL',
    reEnroll: 'Enroll Another Member',
    storeCodeLookup: 'Enter Merchant Store Code',
    lookupBtn: 'Continue to Enrollment',
    points: 'PTS',
    memberId: 'Member ID',
    tier: 'Tier',

    // POS Cashier
    posTitle: 'POS Cashier Terminal',
    posSubtitle: 'Live scanner, member lookup, points accrual & rewards redemption',
    lookupCustomer: 'Lookup Customer',
    enterPhoneOrId: 'Enter phone number or Member ID...',
    findMemberBtn: 'Find Member',
    customerFound: 'Member Active',
    currentBalance: 'Current Balance',
    earnPoints: 'Issue / Add Points',
    redeemPoints: 'Redeem Points',
    orderAmount: 'Order Amount',
    pointsToAdd: 'Points to Add',
    pointsToRedeem: 'Points to Deduct',
    confirmTransaction: 'Confirm POS Transaction',
    transactionSuccess: 'Transaction Processed Successfully',
    couponsAvailable: 'Available Coupons & Perks',
    redeemCouponBtn: 'Redeem Coupon',

    // Wallet Preview Simulator
    walletPreviewTitle: 'Digital Wallet Simulator',
    appleWalletTab: 'Apple Wallet (.pkpass)',
    googleWalletTab: 'Google Wallet (Smart Tap)',
    appleWalletDesc: 'Native iOS PassKit preview with live QR barcode and NFC Smart Tap simulation.',
    googleWalletDesc: 'Google Pay RS256 cryptographically signed loyalty pass.',
    done: 'Done',
  },
  ar: {
    // Landing Page Navbar & Hero
    landingLogo: 'باس لويال',
    navPlatform: 'المنصة',
    navSmartTap: 'المسح الذكي Smart Tap',
    navBeacons: 'المحددات Beacons',
    navPricing: 'الباقات والأسعار',
    navEnterprise: 'الشركات الكبرى',
    navLogin: 'تسجيل الدخول',
    navGetStarted: 'ابدأ مجاناً الآن',
    heroCertifiedBadge: 'محرك المحافظ الرقمية المزدوج (Apple & Google Wallet)',
    heroHeadline: 'حوّل كل لمسة هاتف إلى',
    heroHeadlineHighlight: 'عميل دائم ومخلص',
    heroSubtitle: 'تمكّن PassLoyal المطاعم والمتاجر في الشرق الأوسط من إصدار بطاقات ولاء رقمية مدمجة لمحفظة Apple ومحفظة Google، وإرسال تنبيهات شاشة القفل الجغرافية، والمسح عبر NFC خلال 0.2 ثانية — بدون الحاجة لأي تطبيق.',
    exploreDemo: 'تجربة محاكاة المنصة التفاعلية',
    deployFirstPass: 'أنشئ أول بطاقة ولاء لمتجرك مجاناً',
    passRetentionStat: 'نسبة الاحتفاظ بالبطاقة 98.4%',
    passRetentionReview: 'من أكثر من 1,200 علامة تجارية في الشرق الأوسط',

    // Navigation & App Shell
    dashboard: 'لوحة التحكم',
    passStudio: 'استوديو البطاقات',
    posCashier: 'كاشير نقاط البيع',
    customersCrm: 'إدارة العملاء',
    pushGeo: 'الحملات الجغرافية والإشعارات',
    customerJoin: 'تسجيل العملاء',
    onboarding: 'إعداد المتجر',
    reports: 'التحليلات وسجل النقاط',
    billing: 'الباقات والاشتراكات',
    superAdmin: 'لوحة المشرف العام',
    settings: 'الإعدادات',
    profile: 'الملف الشخصي',
    logout: 'تسجيل الخروج',
    scanPass: 'مسح البطاقة',
    quickScan: 'الماسح الضوئي السريع',
    searchPlaceholder: 'البحث عن العملاء، الأكواد، المتاجر...',
    langToggle: 'English',

    // Customer Enrollment / Join
    enrollHeader: 'عضوية برنامج الولاء الرقمي',
    enrollSubtitle: 'سجّل في ثوانٍ واحفظ بطاقتك مباشرة في محفظة Apple ومحفظة Google',
    fullName: 'الاسم الكامل',
    fullNamePlaceholder: 'مثال: عمر الزهراني',
    emailAddress: 'البريد الإلكتروني',
    emailPlaceholder: 'مثال: omar@example.com',
    mobilePhone: 'رقم الهاتف',
    countryCode: 'الدولة',
    enrollButton: 'تسجيل وإصدار بطاقة المحفظة',
    signingPass: 'جاري تشفير وإصدار البطاقة...',
    welcomeHeader: 'أهلاً بك في نادي الولاء!',
    passReadySubtitle: 'بطاقتك الرقمية جاهزة. أضفها إلى محفظتك لكسب النقاط واستبدال المكافآت فوراً.',
    addToAppleWallet: 'إضافة إلى Apple Wallet',
    addToGoogleWallet: 'إضافة إلى Google Wallet',
    previewCard: 'معاينة تفاعلية للبطاقة في المحفظة',
    qrBarcodeLabel: 'رمز الاستجابة السريعة (QR) للبطاقة',
    presentAtCheckout: 'أظهر رمز QR أو رقم العضوية للكاشير عند الدفع.',
    bonusPointsGranted: 'تم منح نقاط ترحيبية فورية عند التسجيل!',
    copyPassLink: 'نسخ رابط البطاقة',
    reEnroll: 'تسجيل عضو آخر',
    storeCodeLookup: 'أدخل كود المتجر الترويجي',
    lookupBtn: 'المتابعة للتسجيل',
    points: 'نقطة',
    memberId: 'رقم العضوية',
    tier: 'المستوى',

    // POS Cashier
    posTitle: 'شاشة كاشير نقاط البيع',
    posSubtitle: 'مسح فوري، بحث عن الأعضاء، احتساب النقاط واستبدال المكافآت',
    lookupCustomer: 'البحث عن العميل',
    enterPhoneOrId: 'أدخل رقم الهاتف أو رقم العضوية...',
    findMemberBtn: 'بحث عن العضو',
    customerFound: 'العضو مفعل',
    currentBalance: 'الرصيد الحالي',
    earnPoints: 'إضافة نقاط',
    redeemPoints: 'استبدال نقاط',
    orderAmount: 'قيمة الطلب',
    pointsToAdd: 'النقاط المضافة',
    pointsToRedeem: 'النقاط المخصومة',
    confirmTransaction: 'تأكيد حركة البيع',
    transactionSuccess: 'تمت العملية بنجاح',
    couponsAvailable: 'الكوبونات والمكافآت المتاحة',
    redeemCouponBtn: 'استبدال الكوبون',

    // Wallet Preview Simulator
    walletPreviewTitle: 'محاكي المحفظة الرقمية',
    appleWalletTab: 'محفظة Apple (.pkpass)',
    googleWalletTab: 'محفظة Google (Smart Tap)',
    appleWalletDesc: 'معاينة بطاقة iOS الأصلية مع باركود QR ومحاكاة NFC Smart Tap.',
    googleWalletDesc: 'بطاقة ولاء Google Pay الموقعة رقمياً بتشفير RS256.',
    done: 'تم',
  },
};

export function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'ar';
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
  if (saved === 'ar' || saved === 'en') return saved;
  // Middle East market default to Arabic
  return 'ar';
}

export function setAppLanguage(lang: SupportedLanguage) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  window.dispatchEvent(new CustomEvent('passloyal_language_changed', { detail: lang }));
}

export function useI18n() {
  const [lang, setLang] = useState<SupportedLanguage>(getInitialLanguage);

  useEffect(() => {
    // Synchronize document dir and lang attribute
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    const handleLanguageChange = (e: Event) => {
      const customEvent = e as CustomEvent<SupportedLanguage>;
      if (customEvent.detail && (customEvent.detail === 'ar' || customEvent.detail === 'en')) {
        setLang(customEvent.detail);
      }
    };

    window.addEventListener('passloyal_language_changed', handleLanguageChange);
    return () => window.removeEventListener('passloyal_language_changed', handleLanguageChange);
  }, [lang]);

  const toggleLanguage = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    setAppLanguage(nextLang);
  };

  const t = (key: keyof typeof translations['en']): string => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return {
    lang,
    isRtl: lang === 'ar',
    toggleLanguage,
    setLanguage: (l: SupportedLanguage) => {
      setLang(l);
      setAppLanguage(l);
    },
    t,
    currencies: REGIONAL_CURRENCIES,
    countries: MIDDLE_EAST_COUNTRIES,
  };
}