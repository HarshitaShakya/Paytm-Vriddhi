// Regression & Voice Accuracy Test Suite for Paytm Vriddhi NLP Parser
import { parseVoiceOrder, devanagariToHinglish } from '../src/utils/mandiParser.js';

// Verify Devanagari to Hinglish transliteration for speak-to-text
const hinglishCases = [
  ['चार पेटी सरसों तेल और दो कट्टा चीनी', '4 peti sarson tel aur 2 katta chini'],
  ['४ पेटी सरसों तेल और २ कट्टा चीनी', '4 peti sarson tel aur 2 katta chini'],
  ['पांच किलो प्याज और दस किलो आलू चाहिए', '5 kg pyaaz aur 10 kg aloo chahiye'],
  ['आधा किलो चीनी', 'aadha kg chini'],
  ['तीन बोरी अरहर दाल', '3 bori arhar dal']
];

let hinglishFailures = 0;
for (const [hindi, want] of hinglishCases) {
  const got = devanagariToHinglish(hindi);
  const pass = got === want;
  console.log(`${pass ? '✓ PASS' : '✗ FAIL'} Hinglish Transcribe: "${hindi}" -> "${got}"`);
  if (!pass) hinglishFailures++;
}

const cases = [
  ['Roman Hinglish', '4 peti Bail Kolhu tel', [{ key: 'oil', qty: 4, unit: 'peti', label: 'Bail Kolhu tel' }]],
  ['Multiple Roman items', '3 bori arhar dal aur 2 katta chini', [{ key: 'dal', qty: 3, unit: 'bori', label: 'Arhar dal' }, { key: 'sugar', qty: 2, unit: 'katta', label: 'Chini' }]],
  ['Devanagari products', 'चार पेटी सरसों तेल और दो कट्टा चीनी', [{ key: 'oil', qty: 4, unit: 'peti', label: 'Bail Kolhu tel' }, { key: 'sugar', qty: 2, unit: 'katta', label: 'Chini' }]],
  ['Hindi digits', '४ पेटी सरसों तेल और २ कट्टा चीनी', [{ key: 'oil', qty: 4, unit: 'peti', label: 'Bail Kolhu tel' }, { key: 'sugar', qty: 2, unit: 'katta', label: 'Chini' }]],
  ['English number words', 'four peti mustard oil and two katta sugar', [{ key: 'oil', qty: 4, unit: 'peti', label: 'Bail Kolhu tel' }, { key: 'sugar', qty: 2, unit: 'katta', label: 'Chini' }]],
  ['Hindi fraction', 'आधा किलो चीनी', [{ key: 'sugar', qty: 0.5, unit: 'katta', label: 'Chini' }]],
  ['Unknown product', '2 peti xyzzy', []],
  ['Hindi Roman words (chaar & paanch)', 'chaar peti sarson tel aur paanch katta chini', [{ key: 'oil', qty: 4, unit: 'peti', label: 'Bail Kolhu tel' }, { key: 'sugar', qty: 5, unit: 'katta', label: 'Chini' }]],
  ['Hindi Roman words (das & bees)', 'das bori arhar dal aur bees kg aloo', [{ key: 'dal', qty: 10, unit: 'bori', label: 'Arhar dal' }, { key: 'potato', qty: 20, unit: 'kg', label: 'Potato' }]],
  ['Suffix quantities', 'sarson tel 2 peti aur chini 5 katta', [{ key: 'oil', qty: 2, unit: 'peti', label: 'Bail Kolhu tel' }, { key: 'sugar', qty: 5, unit: 'katta', label: 'Chini' }]],
  ['Colloquial conversational sentence', 'bhaiya hume 5 kg pyaaz aur 10 kg aloo bhej do', [{ key: 'onion', qty: 5, unit: 'kg', label: 'Onion' }, { key: 'potato', qty: 10, unit: 'kg', label: 'Potato' }]],
  ['Phonetic homophone tolerance (petty/cutter)', '4 petty bail kolhu tel aur 2 cutter chini', [{ key: 'oil', qty: 4, unit: 'peti', label: 'Bail Kolhu tel' }, { key: 'sugar', qty: 2, unit: 'katta', label: 'Chini' }]],
  ['Hindi fractions (dedh & dhai)', 'dedh bori arhar dal aur dhai peti tel', [{ key: 'dal', qty: 1.5, unit: 'bori', label: 'Arhar dal' }, { key: 'oil', qty: 2.5, unit: 'peti', label: 'Bail Kolhu tel' }]],
  ['Devanagari conversational order', 'पांच किलो प्याज और दस किलो आलू चाहिए', [{ key: 'onion', qty: 5, unit: 'kg', label: 'Onion' }, { key: 'potato', qty: 10, unit: 'kg', label: 'Potato' }]]
];

let failures = 0;
for (const [name, input, expected] of cases) {
  const actual = parseVoiceOrder(input).map(item => ({ key: item.key, qty: item.qty, unit: item.unit, label: item.product.label }));
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? '✓ PASS' : '✗ FAIL'}: ${name}`);
  if (!pass) {
    console.log(`   Expected:`, expected);
    console.log(`   Actual:  `, actual);
    failures++;
  }
}

if (failures === 0) {
  console.log(`\n🎉 All ${cases.length} NLP regression test cases passed successfully!`);
} else {
  console.error(`\nTest suite completed with ${failures} failure(s).`);
  process.exitCode = 1;
}

