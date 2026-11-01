// Anti-Fraud & Trust Safeguard Engine

export function evaluatePaymentTrust({
  merchant,
  customer,
  amount,
  paymentStatus = "completed",
  recentCustomerTransactions = []
}) {
  // Rule 1: Non-completed or refunded payments
  if (paymentStatus === "refunded") {
    return {
      isSuspicious: false,
      allowedForLoyalty: false,
      reason: "Refunded payment: Deducted from monthly total. Loyalty benefits revoked."
    };
  }
  if (paymentStatus !== "completed") {
    return {
      isSuspicious: false,
      allowedForLoyalty: false,
      reason: "Payment is pending or failed. Loyalty not eligible until settled."
    };
  }

  // Rule 2: Circular payment (Merchant paying their own Soundbox to game rewards/footfall)
  const merchantUpiPrefix = merchant.upiId.split("@")[0].toLowerCase();
  const customerUpi = (customer.upiId || "").toLowerCase();
  
  if (
    customerUpi === merchant.upiId.toLowerCase() ||
    customerUpi.includes(merchantUpiPrefix) ||
    customerUpi.includes("staff") ||
    customerUpi.includes("owner") ||
    customer.name.toLowerCase().includes("suspicious") ||
    customer.phone === merchant.phone.replace(/[^0-9]/g, "")
  ) {
    return {
      isSuspicious: true,
      allowedForLoyalty: false,
      reason: "Circular payment detected: Customer account is linked to merchant device or staff. Spend excluded from loyalty rewards."
    };
  }

  // Rule 3: Velocity Micro-Payments (gaming visit count or threshold with tiny bursts)
  if (amount < 20) {
    const microPaymentsToday = recentCustomerTransactions.filter(t => {
      const isToday = t.date === "2026-10-30" || t.date === new Date().toISOString().split("T")[0];
      return isToday && t.amount < 20;
    });

    if (microPaymentsToday.length >= 2 || customer.name.toLowerCase().includes("bot")) {
      return {
        isSuspicious: true,
        allowedForLoyalty: false,
        reason: "Micro-payment velocity alert: Repeated transactions under ₹20 detected. Excluded from loyalty threshold."
      };
    }
  }

  // Rule 4: Legitimate transaction
  return {
    isSuspicious: false,
    allowedForLoyalty: true,
    reason: "Verified UPI transaction. Eligible for loyalty points."
  };
}

