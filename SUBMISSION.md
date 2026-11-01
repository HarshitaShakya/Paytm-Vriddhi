# Vriddhi: Buy Smarter, Sell Better

## Overview

Every small shopkeeper in India runs two businesses at once — buying goods from wholesalers in the morning and selling them to walk-in customers all day. Profit leaks happen on **both** sides, and today neither side has a simple tool to plug them.

**On the buy side,** shopkeepers negotiate wholesale prices blind. A local distributor may charge one shop ₹1,420 for a carton of oil while charging a competitor two streets away ₹1,360 for the identical carton. Without visibility into live wholesale rates, the shopkeeper silently loses margin on every restocking run.

**On the sell side,** shopkeepers have no lightweight way to reward the regulars who keep the register ringing. Loyal customers get the same experience as first-timers, so there is no pull to keep them coming back.

Vriddhi closes both gaps through the Paytm Merchant Box and app — and the two features reinforce each other in a tight loop:

```
Buy Smarter (Distributor Price Radar)
        │
        ▼
  Margin freed up
        │
        ▼
Fund Customer Rewards (Monthly Loyalty)
        │
        ▼
  Repeat visits ↑  Revenue ↑
        │
        ▼
  More buying power for next restock
```

The **Distributor Price Radar** helps the shopkeeper cut overcharges on purchases, freeing up margin. That recovered margin is exactly what funds the **Monthly Loyalty Rewards** — small cashbacks and gifts that turn one-time buyers into regulars. More regulars mean higher revenue, which in turn gives the shopkeeper more buying power at the wholesale market. One loop. One merchant. Two features working together.

---

## Feature 1 — Monthly Loyalty Rewards

### The Problem

Shopkeepers have no simple way to reward regular customers. Loyal buyers who return week after week get no recognition and no reason to stay loyal — they are one competitor's discount away from switching.

### The Idea

The Merchant Box already holds every transaction in real time. The system analyses this data on a monthly basis and rewards customers who cross a spend threshold set by the merchant.

- **Monthly analytics.** Each customer's spend (identified by Paytm ID or UPI ID) is totalled per merchant, per calendar month. The merchant gets a monthly summary of total sales, repeat customers, top spenders, and rewards given.
- **Threshold-based reward.** The merchant sets a monthly spend threshold and a reward — a small discount, cashback, or a gift of equivalent value. When a customer crosses the threshold, the reward is triggered automatically. A free gift feels more rewarding than a flat discount and releases a small dopamine hit, building the habit of returning to the same shop. It costs the shopkeeper a small slice of profit now, but a growing base of loyal customers pays back over time.
- **Announcement on the Soundbox.** The Soundbox announces the win aloud — for example, *"Congratulations Rahul, you've won a ₹100 reward!"* This celebrates the winner and shows other customers in the shop that rewards are real, nudging them to spend more too.

### Example

> **Sharma General Store** sets the rule: *spend ₹2,000 in a month → win ₹100 cashback.*
>
> Rahul pays ₹500 (3 Nov), ₹700 (12 Nov), ₹900 (25 Nov) — crossing ₹2,000 on the 25 Nov payment. The ₹100 reward is credited and the Soundbox announces his win.
>
> The shop earned ₹2,100 and paid about **4.8 %** back. Rahul now has a reason to return next month.

### Refinements

- Let each merchant set their own threshold, reward type, and monthly budget cap.
- Count only completed, non-refunded payments; flag suspicious patterns (many tiny payments, the merchant's own accounts paying themselves).
- Announce only a first name or masked ID; let customers opt in to being named aloud.
- Add progress nudges, e.g. *"Spend ₹300 more to win a reward."*
- Show merchants the return on their rewards — repeat-visit rate, revenue lift month over month.

---

## Feature 2 — Mandi Bhav & Distributor Price Radar

### The Problem

A small shopkeeper buys goods from local distributors (*thok vyapari*) on verbal negotiation. One distributor may charge Shopkeeper A ₹1,420 for a carton of oil while charging Shopkeeper B two streets away ₹1,360 for the identical carton. No individual shopkeeper can see the real live wholesale rate (*mandi bhav*) in their district.

Merchant payment data captures consumer-side sales — what the customer pays the shop — but not what the shopkeeper pays their wholesaler. This missing **buy-side price data** is the gap.

### The Idea

A collaborative bill-scanning AI network that pools wholesale purchase prices across merchants in the same area, giving every participant a live price radar.

- **Capture.** The shopkeeper snaps a photo of a wholesale purchase bill, or speaks the purchase rate into the app. A vision LLM extracts the item, brand, pack size, and wholesale unit price.
- **Pool.** Data is anonymised and pooled across merchants in the same pin code.
- **Alert.** The AI acts as a live price radar and tells the shopkeeper where they stand relative to the local market.

### Example

> *"Bhaiya, aapke distributor ne Tata Salt ki bori ₹540 mein lagayi hai, par aapke area mein aaj 80% dukandaro ko ₹510 + 2 packet free scheme mil rahi hai."*

### Refinements

- Show a price only when enough merchants contribute (a minimum group size), so no single shopkeeper or distributor can be identified.
- Normalise for pack size, GST, and schemes before comparing — e.g. "₹510 + 2 free" is compared fairly with "₹540."
- Let the shopkeeper confirm the scanned values, since bill OCR can misread handwriting.
- Give a simple verdict — **fair / high / low** — plus a suggested counter-offer to use with the distributor.
- Position the feature as price transparency for the shopkeeper, not a blacklist. Expect distributor pushback and handle it through framing, not confrontation.

---

## Where They Connect

### Shared Technical Plumbing

| Layer | Feature 1 — Loyalty Rewards | Feature 2 — Price Radar |
|---|---|---|
| **Merchant identity** | Keys every reward ledger to the merchant's Paytm / UPI ID | Keys every price data point to the same merchant ID |
| **Soundbox as voice interface** | Announces reward wins and progress nudges aloud | Can voice-alert wholesale price anomalies ("Your distributor's rate is ₹30 above area average") |
| **Anonymised cross-merchant data pooling** | Aggregates customer-spend patterns across the merchant base to benchmark reward thresholds | Aggregates wholesale-purchase prices across the merchant base to benchmark distributor rates |

Both features share a single data pipeline architecture — ingest per-merchant events, anonymise and pool them across a geographic cluster (pin code), and push actionable insights back to the individual merchant.

### Product-Level Synergy

1. **Savings fund rewards.** Money the shopkeeper saves through the Price Radar — catching a ₹30-per-unit overcharge on cooking oil, for instance — is the natural budget for monthly loyalty cashbacks and gifts. The two features form a closed economic loop: cut costs on buying, reinvest in customer retention.
2. **Sales analytics inform purchase checks.** The monthly analytics from the Loyalty Rewards dashboard show which products drive the most repeat visits and revenue. These are exactly the products worth cross-checking against the Price Radar — if Tata Salt is your top-selling SKU, even a ₹10-per-bag saving compounds into meaningful margin over a month.

