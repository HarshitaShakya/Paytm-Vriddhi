// NLP Voice Order Parsing & Invoicing Engine
// Preserved and modularized from bol kr order kren/app.js

import { COMMODITY_QUOTES } from '../data/mandiData.js';

export function devanagariToHinglish(text) {
  if (!text) return '';
  let str = text.normalize('NFKC');
  const devDigits = '०१२३४५६७८९';
  str = str.replace(/[०-९]/g, d => String(devDigits.indexOf(d)));

  const wordMap = [
    [/सरसों\s*का\s*तेल/g, 'sarson ka tel'],
    [/सरसों\s*तेल/g, 'sarson tel'],
    [/अरहर\s*की\s*दाल/g, 'arhar ki dal'],
    [/अरहर\s*दाल/g, 'arhar dal'],
    [/तूर\s*दाल/g, 'toor dal'],
    [/चना\s*दाल/g, 'chana dal'],
    [/मूंग\s*दाल/g, 'moong dal'],
    [/उड़द\s*दाल/g, 'urad dal'],
    [/टाटा\s*नमक/g, 'tata namak'],
    [/गेहूं\s*का\s*आटा/g, 'gehu ka atta'],
    [/चाय\s*पत्ती/g, 'chai patti'],
    [/भेज\s*दो/g, 'bhej do'],
    [/तेल/g, 'tel'],
    [/चीनी/g, 'chini'],
    [/शक्कर/g, 'shakkar'],
    [/साखर/g, 'sakhar'],
    [/दाल/g, 'dal'],
    [/प्याज|प्याज़/g, 'pyaaz'],
    [/कांदा/g, 'kanda'],
    [/आलू/g, 'aloo'],
    [/बटाटा/g, 'batata'],
    [/टमाटर/g, 'tamatar'],
    [/नमक/g, 'namak'],
    [/आटा/g, 'atta'],
    [/मैदा/g, 'maida'],
    [/सूजी/g, 'sooji'],
    [/बेसन/g, 'besan'],
    [/चावल/g, 'chawal'],
    [/चाय/g, 'chai'],
    [/दूध/g, 'doodh'],
    [/मक्खन/g, 'makhan'],
    [/घी/g, 'ghee'],
    [/बिस्कुट/g, 'biscuit'],
    [/मैगी/g, 'maggi'],
    [/मिर्च/g, 'mirch'],
    [/धनिया/g, 'dhaniya'],
    [/हल्दी/g, 'haldi'],
    [/गरम\s*मसाला/g, 'garam masala'],
    [/मसाला/g, 'masala'],
    [/पेटी/g, 'peti'],
    [/कट्टा/g, 'katta'],
    [/बोरी/g, 'bori'],
    [/किलोग्राम|किलो/g, 'kg'],
    [/लीटर/g, 'L'],
    [/ग्राम/g, 'g'],
    [/पैकेट/g, 'packet'],
    [/डिब्बा/g, 'dabba'],
    [/आधा/g, 'aadha'],
    [/डेढ़/g, 'dedh'],
    [/ढाई/g, 'dhai'],
    [/पौन/g, 'paun'],
    [/सवा/g, 'sawa'],
    [/(?:^|\s)एक(?=\s|$)/g, ' 1 '],
    [/(?:^|\s)दो(?=\s|$)/g, ' 2 '],
    [/(?:^|\s)तीन(?=\s|$)/g, ' 3 '],
    [/(?:^|\s)चार(?=\s|$)/g, ' 4 '],
    [/(?:^|\s)(?:पाँच|पांच)(?=\s|$)/g, ' 5 '],
    [/(?:^|\s)(?:छह|छः)(?=\s|$)/g, ' 6 '],
    [/(?:^|\s)सात(?=\s|$)/g, ' 7 '],
    [/(?:^|\s)आठ(?=\s|$)/g, ' 8 '],
    [/(?:^|\s)नौ(?=\s|$)/g, ' 9 '],
    [/(?:^|\s)दस(?=\s|$)/g, ' 10 '],
    [/(?:^|\s)बीस(?=\s|$)/g, ' 20 '],
    [/(?:^|\s)तीस(?=\s|$)/g, ' 30 '],
    [/(?:^|\s)पचास(?=\s|$)/g, ' 50 '],
    [/(?:^|\s)सौ(?=\s|$)/g, ' 100 '],
    [/और|तथा|एवं/g, 'aur'],
    [/चाहिए/g, 'chahiye'],
    [/भैया/g, 'bhaiya'],
    [/दुकान/g, 'dukaan'],
    [/हमे|हमें/g, 'hume'],
    [/का/g, 'ka'],
    [/की/g, 'ki'],
    [/के/g, 'ke'],
    [/में/g, 'mein'],
    [/पर/g, 'par']
  ];

  for (const [pattern, rep] of wordMap) {
    str = str.replace(pattern, rep);
  }

  const charMap = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n',
    'ँ': 'n', '्': '', 'ः': 'h',
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
    'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au'
  };

  str = str.replace(/[\u0900-\u097F]/g, char => charMap[char] || '');
  return str.replace(/\s+/g, ' ').trim();
}

export function normalizeSpeechText(text) {
  if (!text) return '';
  const devanagariDigits = '०१२३४५६७८९';

  let clean = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[०-९]/g, digit => String(devanagariDigits.indexOf(digit)))
    .replace(/[,.!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Speech-to-text phonetic homophone correction for Indian accents
  const phoneticReplacements = [
    [/\b(petty|pretty|patty|petties|pettis)\b/gi, 'peti'],
    [/\b(cutter|kutta|kata|katte)\b/gi, 'katta'],
    [/\b(bury|body|buri|boori|borey)\b/gi, 'bori'],
    [/\b(cheeni|chiny|chinni|chinny)\b/gi, 'chini'],
    [/\b(dall|toor)\b/gi, 'dal'],
    [/\b(sarso|sarson tel)\b/gi, 'sarson tel'],
    [/\b(kilo|kilos|kg|kgs|किलोग्राम)\b/gi, 'kg']
  ];

  for (const [pattern, replacement] of phoneticReplacements) {
    clean = clean.replace(pattern, replacement);
  }

  return clean;
}

export function numberFor(word) {
  if (!word) return 0;
  const num = Number(word);
  if (!isNaN(num) && num > 0) return num;

  const numbers = {
    // English words
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    twentyfive: 25, thirty: 30, forty: 40, fifty: 50, hundred: 100,

    // Hindi Romanized words
    ek: 1, do: 2, teen: 3, chaar: 4, char: 4, paanch: 5, panch: 5,
    chhe: 6, che: 6, chha: 6, saat: 7, aath: 8, ath: 8, nau: 9, no: 9,
    das: 10, dus: 10, gyarah: 11, barah: 12, baarah: 12, terah: 13,
    chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18,
    aatharah: 18, unnis: 19, bees: 20, bis: 20, pachees: 25, pachis: 25,
    tees: 30, tis: 30, chaalis: 40, chalis: 40, pachaas: 50, pachas: 50,
    sau: 100, so: 100,

    // Devanagari numerals and words
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5,
    'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
    'ग्यारह': 11, 'बारह': 12, 'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15,
    'सोलह': 16, 'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
    'पच्चीस': 25, 'तीस': 30, 'चालीस': 40, 'पचास': 50, 'सौ': 100,

    // Fractions
    aadha: 0.5, 'आधा': 0.5, 'half': 0.5,
    dedh: 1.5, 'डेढ़': 1.5,
    dhai: 2.5, 'ढाई': 2.5,
    paun: 0.75, pavan: 0.75, 'पौन': 0.75,
    sawa: 1.25, 'सवा': 1.25
  };

  const lookup = word.toLowerCase().trim();
  return numbers[lookup] || 0;
}

export function parseVoiceOrder(text, quotesDict = COMMODITY_QUOTES) {
  const clean = normalizeSpeechText(text);
  if (!clean) return [];

  const matches = [];
  const entries = Object.entries(quotesDict);

  // Match all potential products by alias (longest first to avoid subset conflicts)
  entries.forEach(([key, q]) => {
    const sortedAliases = q.aliases.slice().sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'g');
      let found;
      while ((found = pattern.exec(clean)) !== null) {
        matches.push({
          key,
          q,
          alias,
          index: found.index + (found[1] ? found[1].length : 0),
          length: alias.length
        });
      }
    }
  });

  // Filter overlapping matches: keep longest match for overlapping ranges; if identical range, keep first
  const ordered = matches
    .sort((a, b) => a.index - b.index || b.length - a.length)
    .filter((match, index, list) =>
      !list.some((other, otherIndex) => {
        if (otherIndex === index) return false;
        if (other.index === match.index && other.length === match.length) {
          return otherIndex < index;
        }
        return other.index <= match.index && (other.index + other.length) >= (match.index + match.length);
      })
    );

  const numPatternStr = '(?:\\d+(?:\\.\\d+)?|ek|one|do|two|teen|three|chaar|char|four|paanch|panch|five|chhe|che|chha|six|saat|seven|aath|ath|eight|nau|nine|das|dus|ten|gyarah|eleven|barah|baarah|twelve|pandrah|fifteen|bees|twenty|pachees|twentyfive|pachaas|fifty|sau|hundred|एक|दो|तीन|चार|पाँच|पांच|छह|छः|सात|आठ|नौ|दस|ग्यारह|बारह|पंद्रह|बीस|पच्चीस|पचास|सौ|aadha|आधा|half|dedh|डेढ़|dhai|ढाई|paun|pavan|पौन|sawa|सवा)';
  const qtyRegex = new RegExp(`(?:^|\\s)(${numPatternStr})(?=\\s|$)`, 'gi');
  const separatorRegex = /\b(aur|and|evam|tatha|va|,|\+)\b/i;

  return ordered.map((match, index) => {
    // 1. Check segment BEFORE the item (respecting clause connectors like 'aur' / 'and')
    const prevEnd = index ? ordered[index - 1].index + ordered[index - 1].length : 0;
    let segmentBefore = clean.slice(prevEnd, match.index);

    const sepMatchBefore = separatorRegex.exec(segmentBefore);
    if (sepMatchBefore) {
      segmentBefore = segmentBefore.slice(sepMatchBefore.index + sepMatchBefore[0].length);
    }

    let qtyTokens = [...segmentBefore.matchAll(qtyRegex)].map(m => m[1]);
    let qty = 0;
    if (qtyTokens.length) {
      qty = numberFor(qtyTokens.at(-1));
    }

    // 2. If no quantity before, check segment AFTER the item (e.g. "tel 2 peti aur chini 5 katta")
    if (!qty) {
      const nextStart = index + 1 < ordered.length ? ordered[index + 1].index : clean.length;
      let segmentAfter = clean.slice(match.index + match.length, nextStart);
      const sepMatchAfter = separatorRegex.exec(segmentAfter);
      if (sepMatchAfter) {
        segmentAfter = segmentAfter.slice(0, sepMatchAfter.index);
      }
      const afterTokens = [...segmentAfter.matchAll(qtyRegex)].map(m => m[1]);
      if (afterTokens.length) {
        qty = numberFor(afterTokens[0]);
      }
    }

    // Default to 1 if no quantity detected
    if (!qty || isNaN(qty)) qty = 1;

    return {
      key: match.key,
      qty,
      unit: match.q.unit,
      product: match.q
    };
  }).reduce((items, item) => {
    const existing = items.find(current => current.key === item.key);
    if (existing) {
      existing.qty += item.qty;
    } else {
      items.push(item);
    }
    return items;
  }, []);
}

export function selectBestQuote(product, payment = 'cash') {
  const eligible = product.quotes.filter(quote => quote.inStock !== false);
  const candidates = eligible.length ? eligible : product.quotes;
  return candidates.slice().sort((a, b) => {
    const aPrice = a[payment];
    const bPrice = b[payment];
    return aPrice - bPrice || a.seller.localeCompare(b.seller);
  })[0];
}

export function calculateOrder(items, payment = 'cash', seller = null) {
  const rows = items.map(item => {
    const quote = seller
      ? item.product.quotes.find(q => q.seller === seller && q.inStock !== false)
      : selectBestQuote(item.product, payment);
    if (!quote) return null;
    const rate = quote[payment];
    const line = rate * item.qty;
    return {
      ...item,
      quote,
      rate,
      line
    };
  }).filter(Boolean);

  const subtotal = rows.reduce((sum, item) => sum + item.line, 0);
  return {
    items: rows,
    subtotal,
    total: subtotal,
    payment,
    credit: payment === 'credit',
    seller
  };
}

export function createBillImage(order, id, seller, merchantName = 'Sharma Kirana Store') {
  const canvas = document.createElement('canvas');
  const width = 1000;
  const rowHeight = 62;
  canvas.width = width;
  canvas.height = 680 + order.items.length * rowHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, canvas.height);

  // Top header banner (Paytm Navy)
  ctx.fillStyle = '#002970';
  ctx.fillRect(0, 0, width, 124);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 32px sans-serif';
  ctx.fillText('Bol-Ke-Mandi · Paytm Vriddhi', 48, 52);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#93c5fd';
  ctx.fillText('Paytm Mandi Wholesale Network · Digital Verified Invoice', 48, 84);

  // Payment badge
  ctx.fillStyle = order.credit ? '#fef3c7' : '#dcfce7';
  if (ctx.roundRect) {
    ctx.roundRect(width - 240, 36, 192, 38, 8);
  } else {
    ctx.fillRect(width - 240, 36, 192, 38);
  }
  ctx.fill();
  ctx.fillStyle = order.credit ? '#92400e' : '#166534';
  ctx.font = '700 13px sans-serif';
  ctx.fillText(order.credit ? '7-DAY CREDIT LINE' : 'CASH ON DELIVERY', width - 222, 60);

  // Invoice Details card
  ctx.fillStyle = '#ffffff';
  if (ctx.roundRect) {
    ctx.roundRect(36, 144, width - 72, 90, 10);
  } else {
    ctx.fillRect(36, 144, width - 72, 90);
  }
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = '700 20px sans-serif';
  ctx.fillText('Order Confirmation', 56, 178);

  const trust = { 'Shree Ganesh Foods': '9.2', 'Raj Traders': '8.7', 'Malwa Fresh Co.': '8.1' };
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Invoice ID: ${id}   ·   Date: ${new Date().toLocaleDateString('en-IN')}`, 56, 210);
  ctx.fillText(`Fulfillment Seller: ${seller}`, 520, 178);
  ctx.fillText(`Seller Trust Score: ${trust[seller] || '8.8'} / 10 · APMC Verified`, 520, 210);

  // Table header
  let y = 270;
  ctx.fillStyle = '#64748b';
  ctx.font = '700 12px sans-serif';
  ctx.fillText('ITEM DESCRIPTION', 56, y);
  ctx.fillText('QTY', 560, y);
  ctx.fillText('RATE', 680, y);
  ctx.fillText('AMOUNT', 830, y);
  y += 18;

  // Items
  order.items.forEach(item => {
    ctx.fillStyle = '#ffffff';
    if (ctx.roundRect) {
      ctx.roundRect(36, y, width - 72, rowHeight - 8, 8);
    } else {
      ctx.fillRect(36, y, width - 72, rowHeight - 8);
    }
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 15px sans-serif';
    ctx.fillText(item.product.label, 56, y + 28);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${item.qty} ${item.unit}`, 560, y + 28);
    ctx.fillText(`₹${Number(item.rate).toLocaleString('en-IN')}`, 680, y + 28);

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 15px sans-serif';
    ctx.fillText(`₹${Number(item.line).toLocaleString('en-IN')}`, 830, y + 28);
    y += rowHeight;
  });

  // Totals divider
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(560, y + 10);
  ctx.lineTo(928, y + 10);
  ctx.stroke();
  y += 44;

  ctx.fillStyle = '#002970';
  ctx.font = '700 24px sans-serif';
  ctx.fillText(`Total Amount:`, 560, y);
  ctx.fillText(`₹${Number(order.total).toLocaleString('en-IN')}`, 800, y);

  y += 24;
  ctx.fillStyle = '#64748b';
  ctx.font = '13px sans-serif';
  ctx.fillText(`Wholesale rate · All taxes included · No delivery charges`, 560, y);

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Merchant: ${merchantName} · Paytm SmartDukaan Network`, 56, y - 24);
  ctx.fillText(`Payment Mode: ${order.credit ? '7-Day Credit Line' : 'Cash on Delivery'}`, 56, y);
  ctx.fillText(`Seller notification auto-dispatched · Certified digital APMC invoice.`, 56, y + 24);

  return canvas.toDataURL('image/png');
}
