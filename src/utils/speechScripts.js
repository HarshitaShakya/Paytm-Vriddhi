// Speech script templates across Hinglish, Hindi, and English (Three-Layer Loyalty Engine)

export function getCustomerDisplayName(customer, lang = "hinglish") {
  if (!customer) return lang === "english" ? "a lucky customer" : "ek khushnasib grahak";
  if (!customer.optInName) {
    if (lang === "english") return "a valued customer";
    if (lang === "hindi") return "एक खुशनसीब ग्राहक";
    return "ek khushnasib grahak";
  }

  const firstName = customer.name.split(" ")[0];
  if (lang === "english") return firstName;
  if (firstName.endsWith("a") || firstName.endsWith("i")) {
    return `${firstName} ji`;
  }
  return `${firstName} bhaiya`;
}

export function buildPaymentSpeech({
  customer,
  amount,
  lang = "hinglish",
  festival = "none",
  thresholdCrossed = false,
  isMultiTierJump = false,
  tierName = null,
  rewardValue = null,
  pointsEarned = 0,
  appliedRewardDiscount = 0,
  progressNudge = null,
  isSeasonEndNudge = false,
  seasonDaysLeft = 0,
  isBrandSponsored = false,
  brandName = "Parle",
  brandItem = "Parle-G 200g Gold",
  merchantName = "Sharma Kirana",
  isSuspicious = false
}) {
  const displayName = getCustomerDisplayName(customer, lang);

  if (isSuspicious) {
    if (lang === "hindi") {
      return `पेटीएम पर ${amount} रुपये प्राप्त हुए। संदिग्ध भुगतान पैटर्न डिटेक्ट हुआ है, लॉयल्टी पॉइंट्स नहीं जोड़े गए।`;
    }
    if (lang === "english") {
      return `Rupees ${amount} received on Paytm. Suspicious payment pattern flagged. Loyalty points not credited.`;
    }
    return `Paytm par ${amount} rupaye prapt hue. Dhyan dein: suspicious pattern detect hua hai, loyalty points add nahi kiye gaye.`;
  }

  let parts = [];

  // Base Payment line
  if (lang === "hindi") {
    parts.push(`पेटीएम पर ${amount} रुपये प्राप्त हुए।`);
  } else if (lang === "english") {
    parts.push(`Rupees ${amount} received on Paytm.`);
  } else {
    parts.push(`Paytm par ${amount} rupaye prapt hue.`);
  }

  // Auto-Applied Reward line
  if (appliedRewardDiscount > 0) {
    if (lang === "hindi") {
      parts.push(`आपका ${appliedRewardDiscount} रुपये का पुराना ईनाम स्वतः कट गया!`);
    } else if (lang === "english") {
      parts.push(`Your Rupees ${appliedRewardDiscount} voucher was auto-applied!`);
    } else {
      parts.push(`Aapka ${appliedRewardDiscount} rupaye ka reward automatically deduct ho gaya!`);
    }
  }

  // Points earned line
  if (pointsEarned > 0) {
    if (lang === "hindi") {
      parts.push(`${pointsEarned} बचत पॉइंट्स जुड़े।`);
    } else if (lang === "english") {
      parts.push(`${pointsEarned} Bachat Points credited.`);
    } else {
      parts.push(`${pointsEarned} Bachat Points jude.`);
    }
  }

  // Tier Crossing / Multi-tier jump
  if (thresholdCrossed && tierName) {
    if (isMultiTierJump) {
      if (lang === "hindi") {
        parts.push(`शानदार! सीधे ${tierName} बन गए! ${rewardValue} रुपये का रिवॉर्ड मिला!`);
      } else if (lang === "english") {
        parts.push(`Outstanding! Jumped straight to ${tierName} with a Rupees ${rewardValue} reward!`);
      } else {
        parts.push(`Shaandar! Seedhe ${tierName} ban gaye! ${rewardValue} rupaye ka reward mila!`);
      }
    } else {
      if (lang === "hindi") {
        parts.push(`बधाई हो ${displayName}! ${tierName} का ${rewardValue} रुपये ईनाम खुल गया!`);
      } else if (lang === "english") {
        parts.push(`Congratulations ${displayName}! Unlocked ${tierName} with Rupees ${rewardValue} reward!`);
      } else {
        parts.push(`Badhai ho ${displayName}! ${tierName} ka ${rewardValue} rupaye reward khul gaya!`);
      }
    }
  } else if (progressNudge && progressNudge.remaining > 0) {
    // End of season urgency nudge vs standard progress nudge
    if (isSeasonEndNudge) {
      if (lang === "hindi") {
        parts.push(`सीज़न समाप्त होने में सिर्फ ${seasonDaysLeft} दिन शेष हैं! सिर्फ ${progressNudge.remaining} रुपये और, बनिए ${progressNudge.nextTierName}!`);
      } else if (lang === "english") {
        parts.push(`Season ends in just ${seasonDaysLeft} days! Spend Rupees ${progressNudge.remaining} more to achieve ${progressNudge.nextTierName}!`);
      } else {
        parts.push(`Season khatam hone mein sirf ${seasonDaysLeft} din bache hain! Sirf ${progressNudge.remaining} rupaye aur ban jaiye ${progressNudge.nextTierName}!`);
      }
    } else if (progressNudge.remaining <= 450) {
      if (lang === "hindi") {
        parts.push(`सिर्फ ${progressNudge.remaining} रुपये और, आपका ${progressNudge.nextTierName} का ईनाम पक्का!`);
      } else if (lang === "english") {
        parts.push(`Just Rupees ${progressNudge.remaining} more to secure your ${progressNudge.nextTierName} prize!`);
      } else {
        parts.push(`Sirf ${progressNudge.remaining} rupaye aur, aapka ${progressNudge.nextTierName} ka inaam pakka!`);
      }
    }
  }

  return parts.join(" ");
}

export function buildLeaderboardAnnouncement(topSpenders, merchantName, lang = "hinglish") {
  const names = topSpenders.slice(0, 3).map(s => {
    return s.optInName ? s.name.split(" ")[0] : "Khushnasib grahak";
  });

  if (lang === "hindi") {
    return `सुनो सुनो! ${merchantName} के पिछले महीने के स्टार ग्राहक: पहले नंबर पर ${names[0]}, दूसरे पर ${names[1]}, और तीसरे पर ${names[2]}! बहुत बहुत बधाई!`;
  }
  if (lang === "english") {
    return `Attention please! Last month's Star Customers of ${merchantName}: 1st place ${names[0]}, 2nd ${names[1]}, and 3rd ${names[2]}! Congratulations!`;
  }
  return `Suno suno! Pichhle mahine ke Star Grahak: pehle number par ${names[0]} ji, doosre par ${names[1]}, aur teesre par ${names[2]} ji! Sharma Store ki taraf se dher saari badhai!`;
}
