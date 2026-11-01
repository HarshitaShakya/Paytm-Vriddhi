// Three-Layer Loyalty Engine (Paytm AI Devsemble Noida)
// Layer 1: Bachat Points Wallet (1 point / ₹100, 1 point = ₹0.5, non-resetting, 6-12m inactivity)
// Layer 2: Rolling Season Tier Ladder (Pakka ₹1k, Khaas ₹2.5k, Shaan-e-Mohalla ₹5k, 90-day season)
// Layer 3: Tier Status (Badge & perks kept 90 days from earned_at)

export const TIER_DEFINITIONS = [
  { 
    id: "pakka", 
    threshold: 1000, 
    name: "Pakka Grahak", 
    rewardValue: 10, 
    badge: "🥉", 
    perk: "₹10 bachat + Priority support" 
  },
  { 
    id: "khaas", 
    threshold: 2500, 
    name: "Khaas Grahak", 
    rewardValue: 40, 
    badge: "🥈", 
    perk: "₹40 bachat + Brand gifts" 
  },
  { 
    id: "shaan", 
    threshold: 5000, 
    name: "Shaan-e-Mohalla", 
    rewardValue: 100, 
    badge: "🥇", 
    perk: "₹100 bachat + Counter Star photo" 
  }
];

// Helper: Format Current Date in IST
export function getISTTimestamp(date = new Date()) {
  const d = new Date(date);
  return d.toISOString();
}

export function formatISTDisplay(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata"
    }) + " IST";
  } catch (e) {
    return isoString;
  }
}

// Adaptive Validity: 45-60 days or ~2x visit gap
export function getAdaptiveValidityDays(customer) {
  const gap = customer.avgVisitGapDays || 7;
  const adaptive = Math.round(gap * 2.2);
  return Math.min(60, Math.max(45, adaptive));
}

// Start a new 90-day season (or merchant configured duration: 30 / 90 / 180)
export function startNewSeason(customer, merchant, seasonDays = 90) {
  const now = new Date();
  const end = new Date(now.getTime() + seasonDays * 24 * 60 * 60 * 1000);

  return {
    season_id: `s_${customer.id}_${Date.now()}`,
    merchant_id: merchant.id,
    customer_id: customer.id,
    start_at: getISTTimestamp(now),
    end_at: getISTTimestamp(end),
    duration_days: seasonDays,
    eligible_spend: 0,
    tiers_unlocked: [], // array of threshold numbers unlocked in this season
    tier_snapshot: customer.tierStatus?.tier || "none"
  };
}

// Core Event-Driven Trigger: on_payment(txn)
export function processLoyaltyPayment({
  txn,
  merchant,
  customer,
  currentLanguage = "hinglish",
  autoApplyReward = true
}) {
  const now = new Date();
  let events = [];
  let pointsLedgerEntries = [];
  let updatedRewards = [...(customer.rewards || [])];

  // 1. Safety Check: Idempotency (ignore already processed txn)
  if (customer.history && customer.history.some(t => t.txn_id === txn.txn_id)) {
    return {
      success: false,
      reason: "Duplicate transaction (Idempotency key matched). Ignored.",
      customer,
      events: []
    };
  }

  // 2. Season Resolution: Rolling 90-day window
  let season = customer.activeSeason ? { ...customer.activeSeason } : null;
  const seasonDuration = merchant.seasonDurationDays || 90;

  if (!season || new Date(season.end_at) < now) {
    // Previous season ended! Reset ladder progress for new season, but preserve points & tier status
    season = startNewSeason(customer, merchant, seasonDuration);
    events.push({
      event_id: `ev_season_${Date.now()}`,
      type: "SEASON_START",
      payload: { customer_id: customer.id, season_id: season.season_id, duration_days: seasonDuration },
      created_at: getISTTimestamp(now)
    });
  }

  // Check 120-day inactivity ladder clear
  if (customer.lastVisitDaysAgo >= 120) {
    season.eligible_spend = 0;
    season.tiers_unlocked = [];
  }

  // 3. Layer 1: Bachat Points Calculation
  // 1 Bachat Point per ₹100 eligible spend (1 point = ₹0.5)
  const earnedPoints = Math.floor(txn.amount / 100);
  const pointsRupeeValue = earnedPoints * 0.5;

  let currentPoints = customer.pointsWallet?.balance || 0;
  let newPoints = currentPoints + earnedPoints;

  if (earnedPoints > 0) {
    const ledgerEntry = {
      entry_id: `pt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      customer_id: customer.id,
      merchant_id: merchant.id,
      points: earnedPoints,
      reason: "EARN",
      txn_id: txn.txn_id,
      created_at: getISTTimestamp(now)
    };
    pointsLedgerEntries.push(ledgerEntry);

    events.push({
      event_id: `ev_pt_${Date.now()}`,
      type: "POINTS_EARNED",
      payload: { customer_id: customer.id, points: earnedPoints, txn_id: txn.txn_id },
      created_at: getISTTimestamp(now)
    });
  }

  // 4. Auto-Apply existing unredeemed rewards if any
  let rewardDiscountApplied = 0;
  let appliedRewardObj = null;

  if (autoApplyReward) {
    const redeemableRewardIdx = updatedRewards.findIndex(
      r => r.status === "ISSUED" && new Date(r.expires_at) >= now
    );

    if (redeemableRewardIdx !== -1) {
      appliedRewardObj = updatedRewards[redeemableRewardIdx];
      rewardDiscountApplied = appliedRewardObj.value;

      updatedRewards[redeemableRewardIdx] = {
        ...appliedRewardObj,
        status: "REDEEMED",
        redeemed_at: getISTTimestamp(now),
        redeemed_txn_id: txn.txn_id
      };

      events.push({
        event_id: `ev_rew_red_${Date.now()}`,
        type: "REWARD_REDEEMED",
        payload: { reward_id: appliedRewardObj.reward_id, value: appliedRewardObj.value, txn_id: txn.txn_id },
        created_at: getISTTimestamp(now)
      });
    }
  }

  // 5. Layer 2: Tier Ladder Crossing inside the active season
  const oldTotal = season.eligible_spend || 0;
  const newTotal = oldTotal + txn.amount;

  // Find all tiers where old_total < threshold <= new_total and not yet in season.tiers_unlocked
  const crossedTiers = TIER_DEFINITIONS.filter(t => 
    oldTotal < t.threshold &&
    t.threshold <= newTotal &&
    !(season.tiers_unlocked || []).includes(t.threshold)
  );

  let highestTierReward = null;
  let isMultiTierJump = false;
  let newTierStatus = customer.tierStatus ? { ...customer.tierStatus } : { tier: "none", valid_until: null };

  if (crossedTiers.length > 0) {
    // Sort ascending by threshold, pick highest
    crossedTiers.sort((a, b) => a.threshold - b.threshold);
    highestTierReward = crossedTiers[crossedTiers.length - 1];
    isMultiTierJump = crossedTiers.length > 1;

    // Check Merchant Monthly Reward Budget Cap
    const currentBudgetUsed = merchant.stats?.budgetCapUsed || 0;
    const budgetCap = merchant.monthlyBudgetCap || 4000;
    const canIssue = (currentBudgetUsed + highestTierReward.rewardValue) <= budgetCap;

    if (canIssue) {
      const validityDays = getAdaptiveValidityDays(customer);
      const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

      const newReward = {
        reward_id: `rew_${highestTierReward.id}_${Date.now()}`,
        customer_id: customer.id,
        merchant_id: merchant.id,
        tier_name: highestTierReward.name,
        value: highestTierReward.rewardValue,
        status: "ISSUED",
        issued_at: getISTTimestamp(now),
        expires_at: getISTTimestamp(expiresAt),
        validity_days: validityDays,
        extended: false,
        reminder_50_sent: false,
        reminder_85_sent: false
      };

      updatedRewards.unshift(newReward);

      events.push({
        event_id: `ev_rew_iss_${Date.now()}`,
        type: "REWARD_ISSUED",
        payload: newReward,
        created_at: getISTTimestamp(now)
      });
    }

    // Mark all crossed thresholds as unlocked in season
    season.tiers_unlocked = Array.from(new Set([
      ...(season.tiers_unlocked || []),
      ...crossedTiers.map(t => t.threshold)
    ]));

    // Layer 3: Update Tier Status - valid for 90 days from earned_at
    const validUntil90d = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    newTierStatus = {
      customer_id: customer.id,
      merchant_id: merchant.id,
      tier: highestTierReward.id,
      tier_name: highestTierReward.name,
      earned_at: getISTTimestamp(now),
      valid_until: getISTTimestamp(validUntil90d)
    };

    events.push({
      event_id: `ev_tier_${Date.now()}`,
      type: isMultiTierJump ? "MULTI_TIER_JUMP" : "TIER_CROSSED",
      payload: { 
        highest_tier: highestTierReward.id, 
        tiers_crossed: crossedTiers.map(t => t.name),
        valid_until: newTierStatus.valid_until 
      },
      created_at: getISTTimestamp(now)
    });
  }

  // Update season eligible spend
  season.eligible_spend = newTotal;
  season.tier_snapshot = newTierStatus.tier;

  // 6. Next Tier Gap & Nudge Calculation
  const nextTier = TIER_DEFINITIONS.find(t => t.threshold > newTotal);
  let nextTierGap = nextTier ? nextTier.threshold - newTotal : 0;

  // Check end-of-season urgency nudge (last 14 days and >= 70% progress)
  const daysLeftInSeason = Math.max(0, Math.ceil((new Date(season.end_at) - now) / (1000 * 60 * 60 * 24)));
  let isSeasonEndNudge = false;
  if (nextTier && daysLeftInSeason <= 14) {
    const prevThreshold = crossedTiers.length > 0 
      ? highestTierReward.threshold 
      : (season.tiers_unlocked.length > 0 ? Math.max(...season.tiers_unlocked) : 0);
    const progressInCurrentBracket = (newTotal - prevThreshold) / (nextTier.threshold - prevThreshold);
    if (progressInCurrentBracket >= 0.7) {
      isSeasonEndNudge = true;
    }
  }

  // 7. Compose Intelligent Soundbox Speech
  const customerName = customer.optInName ? customer.name.split(" ")[0] + " bhaiya" : "khushnasib grahak";
  let speechText = "";

  // Base Payment confirmation
  speechText = `Paytm par ${txn.amount} rupaye prapt hue. `;

  // If reward auto-applied
  if (appliedRewardObj) {
    speechText += `Aapka ${appliedRewardObj.value} rupaye ka purana reward deduct ho gaya. `;
  }

  // Points confirmation
  if (earnedPoints > 0) {
    speechText += `${earnedPoints} Bachat Points jude. `;
  }

  // Tier Crossing
  if (highestTierReward) {
    if (isMultiTierJump) {
      speechText += `Shaandar! Seedhe ${highestTierReward.name} ban gaye, ${highestTierReward.rewardValue} rupaye ka reward mila! `;
    } else {
      speechText += `Badhai ho ${customerName}! ${highestTierReward.name} ka ${highestTierReward.rewardValue} rupaye reward khul gaya! `;
    }
  } else if (nextTier && nextTierGap > 0) {
    // Spoken Progress Nudge
    if (isSeasonEndNudge) {
      speechText += `Season khatam hone mein sirf ${daysLeftInSeason} din bache hain, sirf ${nextTierGap} rupaye aur ban jaiye ${nextTier.name}!`;
    } else if (nextTierGap <= 450) {
      speechText += `Sirf ${nextTierGap} rupaye aur, aapka ${nextTier.name} ka inaam pakka!`;
    }
  }

  // 8. Update Customer State
  const updatedCustomer = {
    ...customer,
    pointsWallet: {
      balance: newPoints,
      lifetimeEarned: (customer.pointsWallet?.lifetimeEarned || 0) + earnedPoints,
      ledger: [...pointsLedgerEntries, ...(customer.pointsWallet?.ledger || [])]
    },
    activeSeason: season,
    tierStatus: newTierStatus,
    rewards: updatedRewards,
    lastVisitDaysAgo: 0,
    visitCount: (customer.visitCount || 0) + 1,
    history: [
      {
        txn_id: txn.txn_id,
        amount: txn.amount,
        status: "completed",
        paid_at: getISTTimestamp(now),
        points_earned: earnedPoints,
        reward_discount: rewardDiscountApplied,
        season_total: newTotal
      },
      ...(customer.history || [])
    ]
  };

  return {
    success: true,
    customer: updatedCustomer,
    earnedPoints,
    highestTierReward,
    isMultiTierJump,
    appliedRewardObj,
    nextTierGap,
    speechText,
    season,
    events,
    pointsLedgerEntries
  };
}

// Refund Handler: Subtract from season, revert points, cancel unredeemed rewards
export function processLoyaltyRefund({
  txnId,
  refundAmount,
  merchant,
  customer
}) {
  const now = new Date();
  const events = [];
  const pointsToDeduct = Math.floor(refundAmount / 100);

  // Revert Points in Ledger
  const currentPoints = customer.pointsWallet?.balance || 0;
  const newPoints = Math.max(0, currentPoints - pointsToDeduct);

  const refundLedger = {
    entry_id: `pt_ref_${Date.now()}`,
    customer_id: customer.id,
    merchant_id: merchant.id,
    points: -pointsToDeduct,
    reason: "REFUND",
    txn_id: txnId,
    created_at: getISTTimestamp(now)
  };

  // Revert Season Spend
  let season = customer.activeSeason ? { ...customer.activeSeason } : null;
  let seasonEligible = season?.eligible_spend || 0;
  let newSeasonSpend = Math.max(0, seasonEligible - refundAmount);

  // Check tiers that fall below threshold
  let updatedRewards = [...(customer.rewards || [])];
  let flaggedRedeemedRewards = [];

  TIER_DEFINITIONS.forEach(tier => {
    if (newSeasonSpend < tier.threshold && (season.tiers_unlocked || []).includes(tier.threshold)) {
      // Find rewards issued for this tier
      const rIdx = updatedRewards.findIndex(r => r.tier_name === tier.name && r.status === "ISSUED");
      if (rIdx !== -1) {
        updatedRewards[rIdx] = {
          ...updatedRewards[rIdx],
          status: "CANCELLED",
          cancelled_reason: "Payment refunded"
        };
        events.push({
          event_id: `ev_rew_can_${Date.now()}`,
          type: "REWARD_CANCELLED",
          payload: { reward_id: updatedRewards[rIdx].reward_id, tier: tier.name },
          created_at: getISTTimestamp(now)
        });
      } else {
        // Check if already redeemed
        const redIdx = updatedRewards.findIndex(r => r.tier_name === tier.name && r.status === "REDEEMED");
        if (redIdx !== -1) {
          flaggedRedeemedRewards.push(updatedRewards[redIdx]);
        }
      }
    }
  });

  // Remove unlocked tiers that no longer qualify
  season.eligible_spend = newSeasonSpend;
  season.tiers_unlocked = (season.tiers_unlocked || []).filter(thresh => newSeasonSpend >= thresh);

  const updatedCustomer = {
    ...customer,
    pointsWallet: {
      balance: newPoints,
      lifetimeEarned: customer.pointsWallet?.lifetimeEarned || 0,
      ledger: [refundLedger, ...(customer.pointsWallet?.ledger || [])]
    },
    activeSeason: season,
    rewards: updatedRewards,
    history: customer.history?.map(tx => tx.txn_id === txnId ? { ...tx, status: "refunded", refunded_amount: refundAmount } : tx)
  };

  return {
    success: true,
    customer: updatedCustomer,
    pointsDeducted: pointsToDeduct,
    newSeasonSpend,
    flaggedRedeemedRewards,
    events
  };
}

// 15-day Extension if customer visits before expiry
export function extendRewardValidity(rewardId, customer) {
  const updatedRewards = customer.rewards?.map(r => {
    if (r.reward_id === rewardId && !r.extended && r.status === "ISSUED") {
      const curExpires = new Date(r.expires_at);
      const extendedExpires = new Date(curExpires.getTime() + 15 * 24 * 60 * 60 * 1000);
      return {
        ...r,
        expires_at: getISTTimestamp(extendedExpires),
        extended: true,
        validity_days: (r.validity_days || 45) + 15
      };
    }
    return r;
  });

  return {
    ...customer,
    rewards: updatedRewards
  };
}

