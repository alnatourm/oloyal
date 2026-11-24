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

    // Architecture Pillars (localization audit)
    pillarsHeadline: 'Why Modern Hospitality Groups Are Abandoning Custom Mobile Apps',
    pillar1: 'Native Google Wallet Passes',
    pillar2: 'Smart Tap 2.0 & Optical Scanning',
    pillar3: 'Autonomous Geo-Fencing & Beacons',

    // Interactive Precision Tooling
    precisionTooling: 'Precision Tooling For High-Volume Venues',
    tabSmartTapProtocol: 'Smart Tap 2.0 Protocol',
    tabGeoPushBeacons: 'Geo-Radius Push Beacons',
    tabArchetypes: 'Pass Studio Archetypes',
    tabTelemetry: 'Real-Time POS Telemetry',
    tabDescSmartTapProtocol: 'Instant NFC verification & crypto handshake',
    tabDescGeoPushBeacons: 'Lockscreen trigger when customer enters 300m',
    tabDescArchetypes: 'Drag-and-drop wallet design with live preview',
    tabDescTelemetry: 'Bi-directional webhook sync with check balances',

    // ROI Calculator
    roiSectionLabel: 'Immediate Business Impact',
    roiTitle: 'Estimate Your Monthly Incremental Revenue',
    roiSubtitle: 'Calculate the exact top-line expansion generated by converting anonymous walk-ins into Google Wallet cardholders.',
    locationsLabel: 'Store Locations',
    storeWordSingular: 'Store',
    storeWordPlural: 'Stores',
    rangeLocationsFrom: '1 Location',
    rangeLocationsTo: '25 Locations',
    dailyDinersLabel: 'Daily Diners per Store',
    guests: 'Guests',
    rangeDinersFrom: '50 Diners',
    rangeDinersTo: '1,500 Diners',
    averageCheckLabel: 'Average Guest Check',
    rangeTicketFrom: '$12 / check',
    rangeTicketTo: '$150 / check',
    revenueLiftLabel: 'Projected Monthly Revenue Lift',
    revenueLiftNote: 'Based on empirical 18% repeat visit lift and 0% App Store drop-off.',
    paybackLabel: 'Payback Window:',
    paybackValue: '3.8x ROI within 45 days',

    // Comparison Matrix
    comparisonTitle: 'Architectural Comparison',
    comparisonSubtitle: 'Why Custom Apps Are Failing Restaurants',
    cmpHeaderDimension: 'Dimension',
    cmpHeaderPassLoyalWallet: 'PassLoyal Wallet',
    cmpHeaderCustomApp: 'Custom Mobile App',
    cmpHeaderStamp: 'Plastic Stamp Card',
    cmpPassAppStore: '0% (Saved in 1 Tap)',
    cmpAppLockscreen: 'Requires App Permissions',
    cmpPassLockscreen: 'Native 300m Beacons',
    cmpAppSlowQr: 'Slow QR Screen Unlock',
    cmpPassNfc: '0.2s Handshake',
    cmpAppManual: 'Manual Punch Card',
    cmpPassLaunch: 'Under 15 Minutes',
    cmpAppDevWork: '4-6 Months Dev Work',
    cmpStampPrint: '2-3 Weeks Printing',
    cmpPassFree: '$0 / Included',
    cmpAppDevCosts: '$25k+ Annual Dev Costs',
    cmpStampReprint: 'Constant Reprinting',
    cmpDimFriction: 'App Store Download Friction',
    cmpAppFriction: '86% Drop-off Rate',
    cmpStampNone: 'None (Physical)',
    cmpDimGeoProximity: 'Lockscreen Geo-Proximity',
    cmpStampImpossible: 'Impossible',
    cmpDimNfc: 'NFC Smart Tap Speed',
    cmpDimLaunch: 'Launch Timeline',
    cmpDimFees: 'Maintenance & Store Fees',

    // Pricing & SaaS Packages
    pricingHeader: 'Transparent SaaS Packages',
    pricingTitle: 'Predictable Pricing for Growing Merchants',
    pricingSubtitle: 'All plans include zero App Store commissions, unlimited lockscreen geo-beacons, and Google Smart Tap 2.0 verification.',
    starterPlan: 'Starter Package',
    starterName: 'Single Venue',
    starterDesc: 'Perfect for boutique cafes, neighborhood bakeries, and single-store restaurateurs.',
    starterLimit: 'Up to 500 active passes',
    starterNfc: 'Google Smart Tap 2.0 NFC',
    starterBeacon: '1 Geo-Fence Proximity Beacon',
    starterScanner: 'Standard optical QR scanner',
    selectStarter: 'Select Starter Plan',
    growthHeader: 'Most Popular',
    growthPlan: 'Growth Package',
    growthName: 'Multi-Unit Brands',
    growthDesc: 'Designed for fast casual chains, busy bistros, and expanding hospitality groups.',
    growthLimit: 'Up to 5,000 active passes',
    growthBeacons: 'Unlimited Geo-Fence Beacons',
    growthWebhooks: 'POS Bi-directional Webhooks',
    growthApproval: 'Priority Admin Review & Approval',
    selectGrowth: 'Select Growth Plan',
    scalePlan: 'Scale Package',
    scaleName: 'High Volume Fleets',
    scaleDesc: 'Engineered for regional franchises, stadiums, and multi-location retail networks.',
    scaleLimit: 'Up to 50,000 active passes',
    scaleSigningKey: 'Dedicated RSA256 Signing Key',
    scaleTelemetry: 'Sub-second POS Telemetry Streams',
    scaleAccountManager: 'Dedicated Account Manager & SLA',
    selectScale: 'Select Scale Plan',

    // Final CTA Banner & Footer
    finalCtaTitle: 'Ready to turn foot traffic into VIP retention?',
    finalCtaAction1: 'Get Started with 100 Free Passes',
    finalCtaAction2: 'Explore Terminal Console',
    ctaNote1: 'No credit card required',
    ctaNote2: 'Plug-and-play POS compatibility',
    ctaNote3: '5-minute automated setup',
    footerSignIn: 'Sign In',
    footerRegister: 'Register Store',
    footerContact: 'Contact Support',

    // Explore Demo Interactive Pass Simulator
    exploreDemoTitle: 'Interactive Wallet Pass Simulator',
    demoMemberName: 'Demo Guest',
    demoTierLabel: 'Tier',
    demoPointsLabel: 'Reward Balance',
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

    // Architecture Pillars (localization audit)
    pillarsHeadline: 'لماذا تتخلص مجموعات الضيافة الحديثة من التطبيقات المخصصة للهواتف الذكية؟',
    pillar1: 'محفظة Google الأصلية',
    pillar2: 'المسح الذكي 2.0 والمسح البصري',
    pillar3: 'القيود الجغرافية التلقائية والمحددات (Beacons)',

    // Interactive Precision Tooling
    precisionTooling: 'أدوات دقيقة للأماكن ذات الحركة المرتفعة',
    tabSmartTapProtocol: 'بروتوكول المسح الذكي 2.0',
    tabGeoPushBeacons: 'محددات الدفع الجغرافي',
    tabArchetypes: 'نماذج Pass Studio',
    tabTelemetry: 'مراقبة POS الفورية',
    tabDescSmartTapProtocol: 'تحقق فوري عبر NFC ومصافحة تشفير',
    tabDescGeoPushBeacons: 'إشعار على شاشة القفل عند دخول العميل نطاق 300 متر',
    tabDescArchetypes: 'تصميم المحفظة بالسحب والإفلات مع معاينة مباشرة',
    tabDescTelemetry: 'مزامنة ثنائية الاتجاه عبر الويب هوك مع رصد الرصيد',

    // ROI Calculator
    roiSectionLabel: 'الأثر التجاري الفوري',
    roiTitle: 'احسب العائد الإضافي الشهري التقريبي',
    roiSubtitle: 'احسب التوسع الشامل الدقيق الذي ينتجه تحويل الزوار المجهولين إلى بطاقات محفظة Google.',
    locationsLabel: 'مواقع المتاجر',
    storeWordSingular: 'متجر',
    storeWordPlural: 'متاجر',
    rangeLocationsFrom: 'موقع واحد',
    rangeLocationsTo: '25 موقعاً',
    dailyDinersLabel: 'الزوار اليوميون لكل متجر',
    guests: 'الضيوف',
    rangeDinersFrom: '50 ضيفاً',
    rangeDinersTo: '1,500 ضيف يومياً',
    averageCheckLabel: 'متوسط فاتورة الضيف',
    rangeTicketFrom: '12 ريال فاتورة',
    rangeTicketTo: '150 ريال فاتورة',
    revenueLiftLabel: 'العائد الشهري المتوقع',
    revenueLiftNote: 'استناداً إلى تصاعد التكرار 18% وتراجع التحميل 0% من متجر التطبيقات.',
    paybackLabel: 'فترة الاسترداد:',
    paybackValue: 'عائد 3.8 ضعف خلال 45 يوماً',

    // Comparison Matrix
    comparisonTitle: 'المقارنة المعمارية',
    comparisonSubtitle: 'لماذا تفشل التطبيقات المخصصة للمطاعم؟',
    cmpHeaderDimension: 'البعد',
    cmpHeaderPassLoyalWallet: 'محفظة PassLoyal',
    cmpHeaderCustomApp: 'تطبيق مخصص للهواتف',
    cmpHeaderStamp: 'بطاقة بلاستيكية',
    cmpPassAppStore: '0% (تشغيل في ضغطة واحدة)',
    cmpAppLockscreen: 'يتطلب صلاحيات التطبيق',
    cmpPassLockscreen: 'محددات Eddystone 300 م',
    cmpAppSlowQr: 'فتح القارئ البصري البطيء',
    cmpPassNfc: 'مصافحة 0.2 ثانية',
    cmpAppManual: 'بطاقة مقوسة يدوياً',
    cmpPassLaunch: 'أقل من 15 دقيقة',
    cmpAppDevWork: 'عمل تطويري 4-6 أشهر',
    cmpStampPrint: 'طباعة من 2-3 أسابيع',
    cmpPassFree: '0 ريال / مشمول',
    cmpAppDevCosts: 'تكاليف تطوير سنوية 25 ألف+ ريال',
    cmpStampReprint: 'إعادة طباعة مستمرة',
    cmpDimFriction: 'احتكاك تنزيل متجر التطبيقات',
    cmpAppFriction: 'معدل التسرب 86%',
    cmpStampNone: 'بلا (فيزيائي)',
    cmpDimGeoProximity: 'التقارب الجغرافي لشاشة القفل',
    cmpStampImpossible: 'غير ممكن',
    cmpDimNfc: 'سرعة المسح الذكي NFC',
    cmpDimLaunch: 'جدول الإطلاق',
    cmpDimFees: 'الصيانة ورسوم المتاجر',

    // Pricing & SaaS Packages
    pricingHeader: 'حزم برمجي SaaS شفافة',
    pricingTitle: 'أسعار محددة للتجار المتنامين',
    pricingSubtitle: 'تشمل جميع الخطط عمولات صفر على متجر التطبيقات، ومحددات شاشة القفل غير المحدودة، وتحقق Google Smart Tap 2.0.',
    starterPlan: 'حزمة المبتدئين',
    starterName: 'متجر واحد',
    starterDesc: 'مثالية للمقاهي البوتير، المخابز المحلية، والمطاعم ذات المتجر الواحد.',
    starterLimit: 'حتى 500 بطاقة نشطة',
    starterNfc: 'Google Smart Tap 2.0 NFC',
    starterBeacon: 'محدد GPS داخل واحد',
    starterScanner: 'ماسح ضوئي معياري',
    selectStarter: 'اختر خطة المبتدئين',
    growthHeader: 'الأكثر شيوعاً',
    growthPlan: 'حزمة النمو',
    growthName: 'علامات متعددة المتجر',
    growthDesc: 'مصممة للسلاسل السريعة، والمطاعم الشليلة، ومجموعات الضيافة المتوسعة.',
    growthLimit: 'حتى 5,000 بطاقة نشطة',
    growthBeacons: 'محددات شاشة القفل غير المحدودة',
    growthWebhooks: 'روابط الويب هوك ثنائية الاتجاه لـ POS',
    growthApproval: 'مراجعة المسؤول بأولوية واعتماده',
    selectGrowth: 'اختر خطة النمو',
    scalePlan: 'حزمة النمو الكبير',
    scaleName: 'انفعاليات حجمية',
    scaleDesc: 'مصممة للفرق الإقليمية، والاستاديوم، والمحلات التجزئة متعددة المواقع.',
    scaleLimit: 'حتى 50,000 بطاقة نشطة',
    scaleSigningKey: 'مفتاح توقيع RSA256 مخصص',
    scaleTelemetry: 'تدفقات POS دون تأخير أقل من ثانية',
    scaleAccountManager: 'مدير حساب مخصص واتفاقية مستوى خدمة',
    selectScale: 'اختر خطة النمو الكبير',

    // Final CTA Banner & Footer
    finalCtaTitle: 'هل تريد تحويل الزحام إلى محافظة VIP؟',
    finalCtaAction1: 'ابدأ مع 100 بطاقة مجانية',
    finalCtaAction2: 'استكشف شاشة التحكم',
    ctaNote1: 'لا تحتاج بطاقة ائتمان',
    ctaNote2: 'توافق سلبي مع POS',
    ctaNote3: 'إعداد آلي في 5 دقائق',
    footerSignIn: 'تسجيل الدخول',
    footerRegister: 'تسجيل متجر',
    footerContact: 'تواصل مع الدعم',

    // Explore Demo Interactive Pass Simulator
    exploreDemoTitle: 'محاكي بطاقة المحفظة التفاعلية',
    demoMemberName: 'ضيف تجريبي',
    demoTierLabel: 'المستوى',
    demoPointsLabel: 'الرصيد',
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