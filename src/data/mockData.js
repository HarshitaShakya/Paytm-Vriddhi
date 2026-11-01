// Mock Data for Three-Layer Loyalty Engine (Paytm AI Devsemble, Noida)
// Layer 1: Bachat Points Wallet (1 point = ₹0.5, non-resetting)
// Layer 2: Rolling Season Tier Ladder (90-day season, reset ladder on season end, clear progress after 120d inactivity)
// Layer 3: Tier Status (Kept 90 days from earned date)

export const MERCHANTS = [
  {
    id: "m_sharma_kirana",
    name: "Sharma Kirana & General Store",
    owner: "Rakesh Sharma",
    category: "Kirana & FMCG",
    area: "Sector 18, Noida",
    pincode: "201301",
    upiId: "sharmakirana@paytm",
    phone: "+91 98101 23456",
    avatar: "🏪",
    monthlyThreshold: 1000,
    seasonDurationDays: 90, // merchant configurable: 30, 90, 180
    monthlyBudgetCap: 4000,
    outstandingPointsCap: 15000, // Max outstanding points liability allowed
    activeFestival: "diwali",
    tiers: {
      pakka: { name: "Pakka Grahak", threshold: 1000, badge: "🥉", rewardValue: 10 },
      khaas: { name: "Khaas Grahak", threshold: 2500, badge: "🥈", rewardValue: 40 },
      shaan: { name: "Shaan-e-Mohalla", threshold: 5000, badge: "🥇", rewardValue: 100 }
    },
    slowHourBoost: {
      enabled: true,
      day: "Tuesday & Thursday",
      hours: "14:00 - 17:00",
      multiplier: 1.5,
      label: "Dopahar Bachat Boost (1.5x Bachat Points)"
    },
    deadStockItems: [
      { name: "Marie Gold Biscuits (300g)", stock: 24, cost: 0, retailPrice: 35, expiryDays: 40 },
      { name: "Lifebuoy Handwash Refill", stock: 16, cost: 0, retailPrice: 45, expiryDays: 55 },
      { name: "Haldiram Aloo Bhujia (150g)", stock: 19, cost: 0, retailPrice: 30, expiryDays: 30 }
    ],
    sponsoredBrands: [
      { brand: "Parle", item: "Parle-G Gold (200g)", sponsorBudgetLeft: "₹12,400", active: true },
      { brand: "Tata Consumer", item: "Tata Tea Premium 100g", sponsorBudgetLeft: "₹8,900", active: true },
      { brand: "Amul", item: "Amul Kool Kesar Badam", sponsorBudgetLeft: "₹5,200", active: true }
    ],
    stats: {
      totalMonthlySales: 158400,
      previousMonthSales: 129500,
      repeatCustomerRate: 76,
      rewardsGivenCount: 38,
      rewardsSpentValue: 3150,
      incrementalSales: 28900,
      budgetCapUsed: 3150
    }
  },
  {
    id: "m_gupta_medicos",
    name: "Gupta Medicos & Daily Care",
    owner: "Anil Gupta",
    category: "Chemist & Wellness",
    area: "Indirapuram, Ghaziabad",
    pincode: "201014",
    upiId: "guptamedicos@paytm",
    phone: "+91 98112 34567",
    avatar: "💊",
    monthlyThreshold: 1000,
    seasonDurationDays: 90,
    monthlyBudgetCap: 3500,
    outstandingPointsCap: 12000,
    activeFestival: "none",
    tiers: {
      pakka: { name: "Pakka Grahak", threshold: 1000, badge: "🥉", rewardValue: 10 },
      khaas: { name: "Khaas Grahak", threshold: 2500, badge: "🥈", rewardValue: 40 },
      shaan: { name: "Shaan-e-Mohalla", threshold: 5000, badge: "🥇", rewardValue: 100 }
    },
    slowHourBoost: {
      enabled: false,
      day: "Wednesday",
      hours: "13:00 - 16:00",
      multiplier: 2.0,
      label: "Senior Citizen Special (2x Points)"
    },
    deadStockItems: [
      { name: "Dettol Antiseptic Soap (Pack of 3)", stock: 18, cost: 0, retailPrice: 110, expiryDays: 60 }
    ],
    sponsoredBrands: [
      { brand: "Dabur", item: "Dabur Honitus Herbal", sponsorBudgetLeft: "₹15,000", active: true }
    ],
    stats: {
      totalMonthlySales: 142100,
      previousMonthSales: 118000,
      repeatCustomerRate: 81,
      rewardsGivenCount: 31,
      rewardsSpentValue: 2600,
      incrementalSales: 24100,
      budgetCapUsed: 2600
    }
  },
  {
    id: "m_chai_corner",
    name: "Chai & Snacks Corner",
    owner: "Suresh Verma",
    category: "Tea & Samosa Stall",
    area: "Noida Electronic City",
    pincode: "201309",
    upiId: "sureshchai@paytm",
    phone: "+91 98188 77665",
    avatar: "☕",
    monthlyThreshold: 1000,
    seasonDurationDays: 30, // Chai stall prefers high-frequency 30-day season!
    monthlyBudgetCap: 2000,
    outstandingPointsCap: 8000,
    activeFestival: "ipl",
    tiers: {
      pakka: { name: "Pakka Grahak", threshold: 1000, badge: "🥉", rewardValue: 10 },
      khaas: { name: "Khaas Grahak", threshold: 2500, badge: "🥈", rewardValue: 40 },
      shaan: { name: "Shaan-e-Mohalla", threshold: 5000, badge: "🥇", rewardValue: 100 }
    },
    slowHourBoost: {
      enabled: true,
      day: "Monday to Friday",
      hours: "11:00 - 13:00",
      multiplier: 1.5,
      label: "Pre-Lunch Chai Boost (1.5x Points)"
    },
    deadStockItems: [
      { name: "Cream Roll (Pack of 6)", stock: 12, cost: 0, retailPrice: 40, expiryDays: 15 }
    ],
    sponsoredBrands: [
      { brand: "Wagh Bakri", item: "Special Masala Tea", sponsorBudgetLeft: "₹6,000", active: true }
    ],
    stats: {
      totalMonthlySales: 68400,
      previousMonthSales: 54200,
      repeatCustomerRate: 88,
      rewardsGivenCount: 44,
      rewardsSpentValue: 1450,
      incrementalSales: 14200,
      budgetCapUsed: 1450
    }
  }
];

export const FESTIVAL_TEMPLATES = {
  diwali: {
    id: "diwali",
    name: "Diwali Dhamaka",
    icon: "🪔",
    themeColor: "from-amber-600 via-yellow-500 to-amber-700",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    thresholdDiscountPercent: 15,
    doubleReward: true,
    bonusGift: "Kaju Katli (100g) ya Designer Diya Pack",
    soundboxGreeting: "Diwali ki hardik shubhkamnayein! Aaj shopping par double reward points!",
    congratsLine: "Diwali Dhamaka! Badhai ho {name}, aapka Shandar Uphar khul gaya!"
  },
  rakhi: {
    id: "rakhi",
    name: "Raksha Bandhan Mithaas",
    icon: "🎀",
    themeColor: "from-pink-600 via-rose-500 to-red-600",
    badgeColor: "bg-pink-100 text-pink-900 border-pink-300",
    thresholdDiscountPercent: 10,
    doubleReward: true,
    bonusGift: "Sundar Rakhi + Chocolate Box",
    soundboxGreeting: "Raksha Bandhan mubarak! Behan-Bhai ki shopping par vishesh uphar!",
    congratsLine: "Rakhi Uphar! Badhai ho {name}, aapko mila khas Rakhi gift hamper!"
  },
  holi: {
    id: "holi",
    name: "Holi Rangotsav",
    icon: "🎨",
    themeColor: "from-purple-600 via-pink-500 to-yellow-500",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    thresholdDiscountPercent: 10,
    doubleReward: true,
    bonusGift: "Organic Gulaal + Gujiya Pack",
    soundboxGreeting: "Holi Hai! Rang aur mithai ke sath double bachat!",
    congratsLine: "Holi Masti! Badhai ho {name}, rangeen reward dabba khul gaya!"
  },
  eid: {
    id: "eid",
    name: "Eid Mubarak Treat",
    icon: "🌙",
    themeColor: "from-emerald-600 via-teal-500 to-green-700",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    thresholdDiscountPercent: 10,
    doubleReward: true,
    bonusGift: "Sheer Khurma Dry-fruit Mix",
    soundboxGreeting: "Eid Mubarak! Har payment par barkat aur bachat!",
    congratsLine: "Eid Eidi Mubarak! Badhai ho {name}, aapka Eidi inaam khul gaya!"
  },
  ipl: {
    id: "ipl",
    name: "IPL Match Dhamaka",
    icon: "🏏",
    themeColor: "from-blue-700 via-indigo-600 to-cyan-500",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
    thresholdDiscountPercent: 10,
    doubleReward: true,
    bonusGift: "Cold Drink + Chips Match Combo",
    soundboxGreeting: "Chauke-Chhakke ki bochhar! Match time par 2x loyalty points!",
    congratsLine: "Sixer Lag Gaya! Badhai ho {name}, match day jackpot reward mila!"
  },
  none: {
    id: "none",
    name: "Regular Kirana Mode",
    icon: "🛒",
    themeColor: "from-blue-800 to-indigo-900",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    thresholdDiscountPercent: 0,
    doubleReward: false,
    bonusGift: null,
    soundboxGreeting: "Paytm par payment safal raha.",
    congratsLine: "Badhai ho {name}, aapka loyalty inaam khul gaya!"
  }
};

// 30 realistic Indian customers with Three-Layer loyalty schema
export const INITIAL_CUSTOMERS = [
  {
    id: "c_01",
    name: "Rahul Sharma",
    phone: "98180 11223",
    upiId: "rahul.s@okhdfcbank",
    optInName: true,
    segment: "weekly", // daily, weekly, monthly, occasional
    avgVisitGapDays: 6,
    familyPoolId: "pool_sharma_family",
    familyRole: "Head (Beta)",
    familyName: "Sharma Parivar",
    visitCount: 7,
    lastVisitDaysAgo: 1,
    
    // Layer 1: Bachat Points Wallet (never resets, 6-12m inactivity)
    pointsWallet: {
      balance: 48, // 48 Bachat Points = ₹24 value
      lifetimeEarned: 76,
      ledger: [
        { entry_id: "pt_101", points: 15, reason: "EARN", txn_id: "t_101", created_at: "2026-10-04T11:20:00.000Z" },
        { entry_id: "pt_102", points: 12, reason: "EARN", txn_id: "t_102", created_at: "2026-10-11T14:10:00.000Z" },
        { entry_id: "pt_103", points: 11, reason: "EARN", txn_id: "t_103", created_at: "2026-10-18T18:40:00.000Z" },
        { entry_id: "pt_104", points: 10, reason: "EARN", txn_id: "t_104", created_at: "2026-10-29T10:15:00.000Z" }
      ]
    },

    // Layer 2: Tier Ladder on 90-day Rolling Season
    activeSeason: {
      season_id: "s_c01_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_01",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z", // ~31 days left in 90-day season
      duration_days: 90,
      eligible_spend: 2350,
      tiers_unlocked: [1000], // Already unlocked Pakka (₹1,000). Needs ₹150 more to cross Khaas (₹2,500)!
      tier_snapshot: "pakka"
    },

    // Layer 3: Tier Status (Kept 90 days from earned_at)
    tierStatus: {
      customer_id: "c_01",
      merchant_id: "m_sharma_kirana",
      tier: "pakka",
      tier_name: "Pakka Grahak",
      earned_at: "2026-09-18T12:00:00.000Z",
      valid_until: "2026-12-17T23:59:59.000Z"
    },

    // Individual Rewards (Validity 45-60 days, auto-apply on next payment)
    rewards: [
      {
        reward_id: "rew_c01_01",
        tier_name: "Pakka Grahak",
        value: 10,
        status: "ISSUED", // Ready to be auto-applied on next payment!
        issued_at: "2026-09-18T12:00:00.000Z",
        expires_at: "2026-11-15T23:59:59.000Z",
        validity_days: 58,
        extended: false
      }
    ],

    stampCard: null,
    history: [
      { txn_id: "t_101", amount: 450, status: "completed", paid_at: "2026-10-04T11:20:00.000Z", points_earned: 4, reward_discount: 0 },
      { txn_id: "t_102", amount: 720, status: "completed", paid_at: "2026-10-11T14:10:00.000Z", points_earned: 7, reward_discount: 0 },
      { txn_id: "t_103", amount: 680, status: "completed", paid_at: "2026-10-18T18:40:00.000Z", points_earned: 6, reward_discount: 0 },
      { txn_id: "t_104", amount: 500, status: "completed", paid_at: "2026-10-29T10:15:00.000Z", points_earned: 5, reward_discount: 0 }
    ]
  },
  {
    id: "c_02",
    name: "Sunita Sharma",
    phone: "98180 11224",
    upiId: "sunita.sharma@paytm",
    optInName: true,
    segment: "monthly",
    avgVisitGapDays: 14,
    familyPoolId: "pool_sharma_family",
    familyRole: "Mataji",
    familyName: "Sharma Parivar",
    visitCount: 5,
    lastVisitDaysAgo: 2,
    pointsWallet: {
      balance: 62,
      lifetimeEarned: 88,
      ledger: [
        { entry_id: "pt_105", points: 28, reason: "EARN", txn_id: "t_105", created_at: "2026-10-05T12:00:00.000Z" }
      ]
    },
    activeSeason: {
      season_id: "s_c02_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_02",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 2800,
      tiers_unlocked: [1000, 2500],
      tier_snapshot: "khaas"
    },
    tierStatus: {
      customer_id: "c_02",
      merchant_id: "m_sharma_kirana",
      tier: "khaas",
      tier_name: "Khaas Grahak",
      earned_at: "2026-10-19T10:00:00.000Z",
      valid_until: "2027-01-17T23:59:59.000Z"
    },
    rewards: [
      {
        reward_id: "rew_c02_01",
        tier_name: "Khaas Grahak",
        value: 40,
        status: "ISSUED",
        issued_at: "2026-10-19T10:00:00.000Z",
        expires_at: "2026-12-10T23:59:59.000Z",
        validity_days: 52,
        extended: false
      }
    ],
    stampCard: null,
    history: [
      { txn_id: "t_105", amount: 1200, status: "completed", paid_at: "2026-10-05T12:00:00.000Z", points_earned: 12, reward_discount: 0 },
      { txn_id: "t_106", amount: 1600, status: "completed", paid_at: "2026-10-19T16:30:00.000Z", points_earned: 16, reward_discount: 0 }
    ]
  },
  {
    id: "c_03",
    name: "Amit Sharma",
    phone: "98180 11225",
    upiId: "amit.s@paytm",
    optInName: true,
    segment: "occasional",
    avgVisitGapDays: 12,
    familyPoolId: "pool_sharma_family",
    familyRole: "Chhota Bhai",
    familyName: "Sharma Parivar",
    visitCount: 4,
    lastVisitDaysAgo: 3,
    pointsWallet: {
      balance: 14,
      lifetimeEarned: 14,
      ledger: []
    },
    activeSeason: {
      season_id: "s_c03_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_03",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 650,
      tiers_unlocked: [],
      tier_snapshot: "none"
    },
    tierStatus: {
      customer_id: "c_03",
      merchant_id: "m_sharma_kirana",
      tier: "none",
      tier_name: "Naya Grahak",
      earned_at: "2026-09-01T00:00:00.000Z",
      valid_until: null
    },
    rewards: [],
    stampCard: null,
    history: []
  },
  {
    id: "c_04",
    name: "Pooja Verma",
    phone: "98711 22334",
    upiId: "pooja.v@icici",
    optInName: true,
    segment: "weekly",
    avgVisitGapDays: 4,
    familyPoolId: null,
    visitCount: 11,
    lastVisitDaysAgo: 1,
    pointsWallet: {
      balance: 112,
      lifetimeEarned: 154,
      ledger: []
    },
    activeSeason: {
      season_id: "s_c04_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_04",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 5400,
      tiers_unlocked: [1000, 2500, 5000],
      tier_snapshot: "shaan"
    },
    tierStatus: {
      customer_id: "c_04",
      merchant_id: "m_sharma_kirana",
      tier: "shaan",
      tier_name: "Shaan-e-Mohalla",
      earned_at: "2026-10-29T11:00:00.000Z",
      valid_until: "2027-01-27T23:59:59.000Z"
    },
    rewards: [
      {
        reward_id: "rew_c04_shaan",
        tier_name: "Shaan-e-Mohalla",
        value: 100,
        status: "ISSUED",
        issued_at: "2026-10-29T11:00:00.000Z",
        expires_at: "2026-12-25T23:59:59.000Z",
        validity_days: 57,
        extended: false
      }
    ],
    stampCard: null,
    history: []
  },
  {
    id: "c_05",
    name: "Vikram Malhotra",
    phone: "98105 44332",
    upiId: "vikram.m@axisbank",
    optInName: false, // Privacy: Anonymous
    segment: "monthly",
    avgVisitGapDays: 9,
    familyPoolId: null,
    visitCount: 6,
    lastVisitDaysAgo: 3,
    pointsWallet: {
      balance: 68,
      lifetimeEarned: 68,
      ledger: []
    },
    activeSeason: {
      season_id: "s_c05_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_05",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 3100,
      tiers_unlocked: [1000, 2500],
      tier_snapshot: "khaas"
    },
    tierStatus: {
      customer_id: "c_05",
      merchant_id: "m_sharma_kirana",
      tier: "khaas",
      tier_name: "Khaas Grahak",
      earned_at: "2026-10-22T10:00:00.000Z",
      valid_until: "2027-01-20T23:59:59.000Z"
    },
    rewards: [
      {
        reward_id: "rew_c05_01",
        tier_name: "Khaas Grahak",
        value: 40,
        status: "ISSUED",
        issued_at: "2026-10-22T10:00:00.000Z",
        expires_at: "2026-12-15T23:59:59.000Z",
        validity_days: 54,
        extended: false
      }
    ],
    stampCard: null,
    history: []
  },
  {
    id: "c_06",
    name: "Deepak Rawat",
    phone: "98991 99887",
    upiId: "deepak.rawat@paytm",
    optInName: true,
    segment: "daily", // Daily buyer! Eligible for 10-visit stamp card
    avgVisitGapDays: 2,
    familyPoolId: "pool_rawat",
    familyRole: "Father",
    familyName: "Rawat Parivar",
    visitCount: 17,
    lastVisitDaysAgo: 1,
    pointsWallet: {
      balance: 38,
      lifetimeEarned: 52,
      ledger: []
    },
    activeSeason: {
      season_id: "s_c06_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_06",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 1750,
      tiers_unlocked: [1000],
      tier_snapshot: "pakka"
    },
    tierStatus: {
      customer_id: "c_06",
      merchant_id: "m_sharma_kirana",
      tier: "pakka",
      tier_name: "Pakka Grahak",
      earned_at: "2026-10-07T00:00:00.000Z",
      valid_until: "2027-01-05T23:59:59.000Z"
    },
    rewards: [],
    // 10-visit stamp card for daily milk/bread buyer
    stampCard: {
      visits: 7,
      target: 10,
      freeItem: "Free Amul Butter 100g / Bread"
    },
    history: []
  },
  {
    id: "c_07",
    name: "Kavita Rawat",
    phone: "98991 99888",
    upiId: "kavita.r@paytm",
    optInName: true,
    segment: "weekly",
    avgVisitGapDays: 5,
    familyPoolId: "pool_rawat",
    familyRole: "Mother",
    familyName: "Rawat Parivar",
    visitCount: 6,
    lastVisitDaysAgo: 3,
    pointsWallet: { balance: 22, lifetimeEarned: 22, ledger: [] },
    activeSeason: {
      season_id: "s_c07_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_07",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 1100,
      tiers_unlocked: [1000],
      tier_snapshot: "pakka"
    },
    tierStatus: {
      customer_id: "c_07",
      merchant_id: "m_sharma_kirana",
      tier: "pakka",
      tier_name: "Pakka Grahak",
      earned_at: "2026-10-12T00:00:00.000Z",
      valid_until: "2027-01-10T23:59:59.000Z"
    },
    rewards: [],
    stampCard: null,
    history: []
  },
  {
    id: "c_08",
    name: "Ananya Gupta (Multi-Tier Ready)",
    phone: "98114 55667",
    upiId: "ananya.g@sbi",
    optInName: true,
    segment: "weekly",
    avgVisitGapDays: 4,
    familyPoolId: null,
    visitCount: 9,
    lastVisitDaysAgo: 1,
    pointsWallet: { balance: 99, lifetimeEarned: 130, ledger: [] },
    activeSeason: {
      season_id: "s_c08_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_08",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 4950, // Exactly ₹50 away from ₹5,000 Shaan-e-Mohalla!
      tiers_unlocked: [1000, 2500],
      tier_snapshot: "khaas"
    },
    tierStatus: {
      customer_id: "c_08",
      merchant_id: "m_sharma_kirana",
      tier: "khaas",
      tier_name: "Khaas Grahak",
      earned_at: "2026-10-14T00:00:00.000Z",
      valid_until: "2027-01-12T23:59:59.000Z"
    },
    rewards: [],
    stampCard: null,
    history: []
  },
  {
    id: "c_09",
    name: "Sanjay Singhal (Progress Nudge)",
    phone: "98102 77889",
    upiId: "sanjay.singhal@hdfcbank",
    optInName: true,
    segment: "monthly",
    avgVisitGapDays: 10,
    familyPoolId: null,
    visitCount: 3,
    lastVisitDaysAgo: 2,
    pointsWallet: { balance: 34, lifetimeEarned: 34, ledger: [] },
    activeSeason: {
      season_id: "s_c09_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_09",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 2200, // ₹300 away from ₹2,500 Khaas Grahak!
      tiers_unlocked: [1000],
      tier_snapshot: "pakka"
    },
    tierStatus: {
      customer_id: "c_09",
      merchant_id: "m_sharma_kirana",
      tier: "pakka",
      tier_name: "Pakka Grahak",
      earned_at: "2026-10-10T00:00:00.000Z",
      valid_until: "2027-01-08T23:59:59.000Z"
    },
    rewards: [],
    stampCard: null,
    history: []
  },
  {
    id: "c_10",
    name: "Pawan Kumar (Win-Back Inactive)",
    phone: "98990 44331",
    upiId: "pawan.k@paytm",
    optInName: true,
    segment: "occasional",
    avgVisitGapDays: 24,
    familyPoolId: null,
    visitCount: 0,
    lastVisitDaysAgo: 24, // Inactive >3 weeks
    pointsWallet: { balance: 57, lifetimeEarned: 57, ledger: [] },
    activeSeason: {
      season_id: "s_c10_q3_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_10",
      start_at: "2026-08-01T00:00:00.000Z",
      end_at: "2026-10-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 0,
      tiers_unlocked: [],
      tier_snapshot: "none"
    },
    tierStatus: {
      customer_id: "c_10",
      merchant_id: "m_sharma_kirana",
      tier: "none",
      tier_name: "Naya Grahak",
      earned_at: "2026-08-01T00:00:00.000Z",
      valid_until: null
    },
    rewards: [],
    stampCard: null,
    history: []
  },
  {
    id: "c_12",
    name: "Rajeshwar Tiwari (Mohalla Champion)",
    phone: "98733 99112",
    upiId: "rajeshwar.t@sbi",
    optInName: true,
    segment: "weekly",
    avgVisitGapDays: 3,
    familyPoolId: null,
    visitCount: 14,
    lastVisitDaysAgo: 1,
    pointsWallet: { balance: 135, lifetimeEarned: 190, ledger: [] },
    activeSeason: {
      season_id: "s_c12_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_12",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 6200,
      tiers_unlocked: [1000, 2500, 5000],
      tier_snapshot: "shaan"
    },
    tierStatus: {
      customer_id: "c_12",
      merchant_id: "m_sharma_kirana",
      tier: "shaan",
      tier_name: "Shaan-e-Mohalla",
      earned_at: "2026-10-21T00:00:00.000Z",
      valid_until: "2027-01-19T23:59:59.000Z"
    },
    rewards: [
      {
        reward_id: "rew_c12_shaan",
        tier_name: "Shaan-e-Mohalla",
        value: 100,
        status: "ISSUED",
        issued_at: "2026-10-21T00:00:00.000Z",
        expires_at: "2026-12-20T23:59:59.000Z",
        validity_days: 60,
        extended: false
      }
    ],
    stampCard: null,
    history: []
  },
  {
    id: "c_13",
    name: "Mohit Bansal (Circular Staff Account)",
    phone: "98110 00112",
    upiId: "sharmakirana.staff@paytm", // Circular payment flag
    optInName: true,
    segment: "occasional",
    avgVisitGapDays: 1,
    familyPoolId: null,
    visitCount: 12,
    lastVisitDaysAgo: 1,
    isSuspicious: true,
    suspicionReason: "Circular payment: Linked to merchant establishment staff",
    pointsWallet: { balance: 0, lifetimeEarned: 0, ledger: [] },
    activeSeason: {
      season_id: "s_c13_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_13",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 0,
      tiers_unlocked: [],
      tier_snapshot: "none"
    },
    tierStatus: { tier: "none", tier_name: "None", earned_at: null, valid_until: null },
    rewards: [],
    stampCard: null,
    history: []
  },
  {
    id: "c_28",
    name: "Tiny Bot Spammer (Velocity Alert)",
    phone: "98990 00001",
    upiId: "bot.tester@paytm",
    optInName: true,
    segment: "occasional",
    avgVisitGapDays: 0,
    familyPoolId: null,
    visitCount: 9,
    lastVisitDaysAgo: 1,
    isSuspicious: true,
    suspicionReason: "Micro-payment velocity alert: Repeated transactions under ₹20",
    pointsWallet: { balance: 0, lifetimeEarned: 0, ledger: [] },
    activeSeason: {
      season_id: "s_c28_q4_2026",
      merchant_id: "m_sharma_kirana",
      customer_id: "c_28",
      start_at: "2026-09-01T00:00:00.000Z",
      end_at: "2026-11-30T23:59:59.000Z",
      duration_days: 90,
      eligible_spend: 0,
      tiers_unlocked: [],
      tier_snapshot: "none"
    },
    tierStatus: { tier: "none", tier_name: "None", earned_at: null, valid_until: null },
    rewards: [],
    stampCard: null,
    history: []
  }
];

// Seed other 17 customers for a complete set of 30
for (let i = 14; i <= 30; i++) {
  if (i === 28) continue; // Already added
  const id = `c_${i < 10 ? "0" + i : i}`;
  if (!INITIAL_CUSTOMERS.find(c => c.id === id)) {
    const spend = Math.round(500 + Math.random() * 4000);
    const tier = spend >= 5000 ? "shaan" : spend >= 2500 ? "khaas" : spend >= 1000 ? "pakka" : "none";
    INITIAL_CUSTOMERS.push({
      id,
      name: `Customer ${i} Kumar`,
      phone: `9810${i} 00${i}2`,
      upiId: `customer${i}@paytm`,
      optInName: i % 4 !== 0,
      segment: i % 3 === 0 ? "daily" : i % 2 === 0 ? "weekly" : "monthly",
      avgVisitGapDays: (i % 7) + 2,
      familyPoolId: null,
      visitCount: (i % 8) + 1,
      lastVisitDaysAgo: (i % 5) + 1,
      pointsWallet: {
        balance: Math.floor(spend / 100),
        lifetimeEarned: Math.floor(spend / 100) + 10,
        ledger: []
      },
      activeSeason: {
        season_id: `s_${id}_q4_2026`,
        merchant_id: "m_sharma_kirana",
        customer_id: id,
        start_at: "2026-09-01T00:00:00.000Z",
        end_at: "2026-11-30T23:59:59.000Z",
        duration_days: 90,
        eligible_spend: spend,
        tiers_unlocked: spend >= 5000 ? [1000, 2500, 5000] : spend >= 2500 ? [1000, 2500] : spend >= 1000 ? [1000] : [],
        tier_snapshot: tier
      },
      tierStatus: {
        customer_id: id,
        merchant_id: "m_sharma_kirana",
        tier,
        tier_name: tier === "shaan" ? "Shaan-e-Mohalla" : tier === "khaas" ? "Khaas Grahak" : tier === "pakka" ? "Pakka Grahak" : "Naya Grahak",
        earned_at: "2026-09-15T00:00:00.000Z",
        valid_until: "2026-12-14T23:59:59.000Z"
      },
      rewards: tier !== "none" ? [
        {
          reward_id: `rew_${id}_01`,
          tier_name: tier === "shaan" ? "Shaan-e-Mohalla" : tier === "khaas" ? "Khaas Grahak" : "Pakka Grahak",
          value: tier === "shaan" ? 100 : tier === "khaas" ? 40 : 10,
          status: "ISSUED",
          issued_at: "2026-10-15T00:00:00.000Z",
          expires_at: "2026-12-05T23:59:59.000Z",
          validity_days: 51,
          extended: false
        }
      ] : [],
      stampCard: i % 3 === 0 ? { visits: (i % 9) + 1, target: 10, freeItem: "1 Free Masala Chai" } : null,
      history: []
    });
  }
}

// Normalize monthlySpend for backwards-compatibility with leaderboard & legacy views
INITIAL_CUSTOMERS.forEach(c => {
  if (c.monthlySpend === undefined) {
    c.monthlySpend = c.activeSeason?.eligible_spend || 0;
  }
});

export const FAMILY_POOLS = {
  pool_sharma_family: {
    id: "pool_sharma_family",
    name: "Sharma Parivar (Household Pool)",
    primaryContact: "98180 11223",
    members: ["c_01", "c_02", "c_03"],
    totalPooledSpend: 5800,
    targetThreshold: 5000,
    poolBenefit: "Combined spend unlocked Shaan-e-Mohalla for entire household!"
  },
  pool_rawat: {
    id: "pool_rawat",
    name: "Rawat Parivar (Household Pool)",
    primaryContact: "98991 99887",
    members: ["c_06", "c_07"],
    totalPooledSpend: 2850,
    targetThreshold: 2500,
    poolBenefit: "Combined spend unlocked Khaas Grahak tier!"
  }
};

export const AI_RECOMMENDATIONS = {
  m_sharma_kirana: {
    seasonRecommendation: {
      recommendedDays: 90,
      reasonHinglish: "Aapke grocery grahak mahine mein 4-6 baar aate hain. 90-day rolling season se slow buyers aur regular families dono target hit kar sakte hain bina points khoye."
    },
    segmentAdvice: [
      { segment: "Daily Buyers (Doodh / Bread / Chai)", rule: "10-visit stamp card chalu rakhiye. Har 10 visit par 1 item muft." },
      { segment: "Weekly Ration Buyers", rule: "90-day season mein ₹2,500 Khaas Grahak target rakhiye." },
      { segment: "Monthly Bulk Shoppers", rule: "First-week shopping par 2x Bachat Points offer karein." }
    ],
    thresholdRecommendation: {
      currentThreshold: 1000,
      recommendedThreshold: 1000,
      averageAreaSpend: 1850,
      confidenceScore: 94,
      reasonHinglish: "Aapke area ke 82% grahak ₹1,600 se ₹1,900 ke beech kharidari karte hain. 90 din ke season mein ₹1,000 Pakka Grahak, ₹2,500 Khaas Grahak, aur ₹5,000 Shaan-e-Mohalla targets naturally achieve hote hain.",
      projectedLiftRupees: 31200
    },
    slowHourAlert: {
      detectedPattern: "Mangalwar (Tuesday) aur Guruwar (Thursday) dopahar 2 baje se 5 baje tak bikri 68% gir jaati hai.",
      actionPrompt: "Dopahar Bachat Boost activate karein: 1.5x Bachat Points",
      projectedFootfallIncrease: "+25% extra customers in slow hours"
    },
    deadStockRecommendation: {
      title: "Stock Clearance via Rewards",
      description: "24 packets Marie Gold (40 din mein expiry) ko milestone reward banayein. Merchant ki pocket se ₹0 lagega!",
      savingsRupees: 840
    },
    brandSponsorship: {
      brand: "Parle Products",
      offer: "Parle-G 200g Gold 100% Brand Sponsored",
      benefit: "Aapke dukaan ko free stock milega, Soundbox Parle ka naam bolegi, customer khush!"
    }
  },
  m_gupta_medicos: {
    seasonRecommendation: {
      recommendedDays: 90,
      reasonHinglish: "Chemist shop par chronic medicines har 30 din mein li jaati hain, isliye 90 din ka 3-month cycle perfect hai."
    },
    segmentAdvice: [
      { segment: "Chronic Patients", rule: "Monthly medicine refills par bonus 20 Bachat Points." },
      { segment: "Daily Wellness Buyers", rule: "Healthy snacks par ₹10 instant voucher." }
    ],
    thresholdRecommendation: {
      currentThreshold: 1000,
      recommendedThreshold: 1000,
      averageAreaSpend: 1650,
      confidenceScore: 91,
      reasonHinglish: "Indirapuram mein regular medicine lene wale grahak har mahine ₹1,700 spend karte hain. ₹1,000 Pakka Grahak tier se loyalty unlock hoti hai.",
      projectedLiftRupees: 26500
    },
    slowHourAlert: {
      detectedPattern: "Budhwar (Wednesday) dopahar 1 se 4 baje chemist footfall sabse kam rehta hai.",
      actionPrompt: "Senior Citizen Special (2x Points) offer chalu karein.",
      projectedFootfallIncrease: "+30% seniors during afternoon"
    },
    deadStockRecommendation: {
      title: "Dettol Soaps Clearing",
      description: "18 units soap packets ko Khaas Grahak reward basket mein shamil karein.",
      savingsRupees: 1980
    },
    brandSponsorship: {
      brand: "Dabur",
      offer: "Dabur Honitus & Chyawanprash Brand Sponsorship",
      benefit: "Dabur sponsors up to ₹15,000 worth gifts."
    }
  },
  m_chai_corner: {
    seasonRecommendation: {
      recommendedDays: 30,
      reasonHinglish: "Chai stall par roz aane wale grahak hain. Yahan 30 din ka chhota cycle aur 10-visit stamp card sabse zyada bikri badhata hai."
    },
    segmentAdvice: [
      { segment: "Office Goers", rule: "Roz subah chai peene walo ke liye 10-visit card." },
      { segment: "Evening Snacks Teams", rule: "₹500 spend par free samosa combo." }
    ],
    thresholdRecommendation: {
      currentThreshold: 1000,
      recommendedThreshold: 1000,
      averageAreaSpend: 620,
      confidenceScore: 89,
      reasonHinglish: "Office goers roz chai peete hain. ₹1,000 threshold par unhe Pakka Grahak tier aur stamp card gifts offer karein.",
      projectedLiftRupees: 15400
    },
    slowHourAlert: {
      detectedPattern: "Subah 11 baje se dopahar 1 baje ke beech chai ki bikri sthir rehti hai.",
      actionPrompt: "Pre-Lunch Chai Boost (1.5x Points) lagayein.",
      projectedFootfallIncrease: "+40% team orders"
    },
    deadStockRecommendation: {
      title: "Rusk Toast Clearance",
      description: "15 packets Rusk ko chai loyalty dabba mein gift dein.",
      savingsRupees: 750
    },
    brandSponsorship: {
      brand: "Britannia",
      offer: "Britannia Good Day biscuits with tea orders",
      benefit: "Britannia sponsors ₹7,800 monthly loyalty budget."
    }
  }
};
