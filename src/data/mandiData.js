// Complete Mandi & Wholesale Procurement Data
// Preserved verbatim from bol kr order kren

export const INITIAL_MANDI_RATES = [
  { crop: 'onion', name: 'Onion (प्याज)', market: 'Indore APMC', min: 2620, median: 2840, max: 3010, change: 4.8, updated: '2 min ago' },
  { crop: 'onion', name: 'Onion (प्याज)', market: 'Dewas Mandi', min: 2570, median: 2790, max: 2960, change: 2.1, updated: '6 min ago' },
  { crop: 'potato', name: 'Potato (आलू)', market: 'Indore APMC', min: 1680, median: 1810, max: 1940, change: -1.4, updated: '4 min ago' },
  { crop: 'tomato', name: 'Tomato (टमाटर)', market: 'Ujjain Krishi Upaj Mandi', min: 3180, median: 3450, max: 3710, change: 6.2, updated: '11 min ago' },
  { crop: 'potato', name: 'Potato (आलू)', market: 'Dewas Mandi', min: 1710, median: 1850, max: 1980, change: 0.8, updated: '12 min ago' },
  { crop: 'tomato', name: 'Tomato (टमाटर)', market: 'Indore APMC', min: 3060, median: 3320, max: 3580, change: -2.6, updated: '14 min ago' }
];

export const INITIAL_PROCUREMENT_ORDERS = [
  { id: 'BK-2048', buyer: 'Sharma Kirana Store', items: '50 kg onion', value: 1475, status: 'Awaiting supplier', placed: '10:31 AM', seller: 'Shree Ganesh Foods' },
  { id: 'BK-2047', buyer: 'Sharma Kirana Store', items: '100 kg potato', value: 3100, status: 'Ready for pickup', placed: '09:48 AM', seller: 'Raj Traders' },
  { id: 'BK-2046', buyer: 'Sharma Kirana Store', items: '4 peti Bail Kolhu tel', value: 16560, status: 'Ready for pickup', placed: 'Yesterday', seller: 'Raj Traders' },
  { id: 'BK-2045', buyer: 'Sharma Kirana Store', items: '2 katta chini', value: 4160, status: 'Delivered', placed: 'Yesterday', seller: 'Malwa Fresh Co.' }
];

export const WHOLESALE_SUPPLIERS = [
  { 
    name: 'Shree Ganesh Foods', 
    market: 'Indore APMC', 
    score: '9.2', 
    rate: '₹2,820', 
    detail: '98% on-time · 94% rate accuracy', 
    accent: 'teal',
    phone: '+91 98260 11234',
    ratingCount: 142,
    acceptedOrders: 420
  },
  { 
    name: 'Raj Traders', 
    market: 'Dewas Mandi', 
    score: '8.7', 
    rate: '₹2,790', 
    detail: '91% on-time · 89% rate accuracy', 
    accent: 'amber',
    phone: '+91 98265 99881',
    ratingCount: 98,
    acceptedOrders: 310
  },
  { 
    name: 'Malwa Fresh Co.', 
    market: 'Ujjain Mandi', 
    score: '8.1', 
    rate: '₹2,850', 
    detail: '86% on-time · 83% rate accuracy', 
    accent: 'slate',
    phone: '+91 98270 44556',
    ratingCount: 76,
    acceptedOrders: 205
  }
];

export const CATALOG_SEED = [
  ['Atta & flours', 'Aashirvaad Whole Wheat Atta 5kg', 'aashirvaad atta aashirvad aata ashirwad atta ashirvaad wheat flour आशीर्वाद आटा आटा', '5 kg pack', 285],
  ['Atta & flours', 'Pillsbury Chakki Fresh Atta 5kg', 'pillsbury atta pillsbury aata pillsbury chakki fresh pillsbury flour पिल्सबरी आटा पिल्सबरी', '5 kg pack', 275],
  ['Atta & flours', 'Fortune Besan 500g', 'fortune besan besan gram flour chana aata बेसन फॉर्च्यून बेसन', '500 g pack', 72],
  ['Atta & flours', 'Sooji Fine Rava 500g', 'sooji suji rava semolina सूजी रवा', '500 g pack', 44],
  ['Atta & flours', 'Rajdhani Fine Maida 1kg', 'maida rajdhani maida refined flour all purpose flour मैदा राजधानी मैदा', '1 kg pack', 48],
  ['Atta & flours', 'Rajdhani Chana Sattu 500g', 'sattu chana sattu rajdhani sattu roasted gram flour सत्तू चना सत्तू', '500 g pack', 68],
  ['Rice', 'India Gate Basmati Rice 5kg', 'india gate basmati india gate rice basmati rice basmati chawal इंडिया गेट बासमती बासमती चावल', '5 kg pack', 575],
  ['Rice', 'Daawat Rozana Gold Basmati Rice 5kg', 'daawat rozana daawat rice rozana gold dawat chawal दावत रोज़ाना दावत चावल', '5 kg pack', 365],
  ['Rice', 'Kohinoor Sella Basmati Rice 1kg', 'kohinoor sella sella rice sella chawal kohinoor rice कोहिनूर सेला सेला चावल', '1 kg pack', 145],
  ['Rice', 'Lal Qilla Basmati Rice 1kg', 'lal qilla basmati lal quila rice biryani chawal lal qilla chawal लाल किला बासमती लाल किला चावल', '1 kg pack', 175],
  ['Rice', 'Wada Kolam Steam Rice (10kg Bori)', 'kolam rice wada kolam kolam chawal steam rice कोलम चावल वाडा कोलम', '10 kg bori', 680],
  ['Rice', 'Sona Masoori Raw Rice (25kg Bori)', 'sona masoori sona masuri sona masoori rice sona masoori chawal सोना मसूरी सोना मसूरी चावल', '25 kg bori', 1450],
  ['Dals & pulses', 'Tata Sampann Arhar Toor Dal (50kg Bori)', 'arhar dal toor dal tur dal tuar dal अरहर दाल तूर दाल', '50 kg bori', 6650],
  ['Dals & pulses', 'Fortune Moong Dal Dhuli 1kg', 'moong dal mung dal fortune moong yellow moong मूंग दाल मूंग धुली', '1 kg pack', 132],
  ['Dals & pulses', 'Urad Dal Black Chilka 1kg', 'urad dal urad kali black urad kali dal उड़द दाल काली दाल', '1 kg pack', 142],
  ['Dals & pulses', 'Chana Dal Premium 1kg', 'chana dal chana ki dal bengal gram dal chane ki dal चना दाल चने की दाल', '1 kg pack', 92],
  ['Dals & pulses', 'Masoor Dal Malka Red 1kg', 'masoor dal red masoor malka masoor masur dal मसूर दाल लाल मसूर', '1 kg pack', 108],
  ['Dals & pulses', 'Chitra Rajma Premium 1kg', 'rajma chitra rajma rajmah kashmiri rajma राजमा चित्रा राजमा', '1 kg pack', 155],
  ['Dals & pulses', 'Kabuli Chana Dollar Quality 1kg', 'kabuli chana safed chana white chickpeas chhole chana काबुली चना सफेद चना', '1 kg pack', 148],
  ['Edible oils & ghee', 'Bail Kolhu Mustard Oil (12x1L Carton)', 'bail kolhu bail kolhu tel bail kolhu mustard oil sarson tel बैल कोल्हू बैल कोल्हू तेल', '12 L carton', 1850],
  ['Edible oils & ghee', 'Fortune Sunlite Sunflower Oil (12x1L Carton)', 'fortune sunflower sunflower oil surajmukhi tel fortune oil फॉर्च्यून तेल सूरजमुखी तेल', '12 L carton', 1680],
  ['Edible oils & ghee', 'Saffola Gold Blended Edible Oil 1L', 'saffola gold saffola oil saffola refined cooking oil saffola सफोला गोल्ड सफोला तेल', '1 L bottle', 168],
  ['Edible oils & ghee', 'Amul Pure Ghee 1L Tin', 'amul ghee desi ghee amul pure ghee ghee 1l अमूल घी देसी घी', '1 L tin', 610],
  ['Edible oils & ghee', 'Dhara Filtered Groundnut Oil 1L', 'dhara oil groundnut oil mungfali tel singdana tel धारा तेल मूंगफली तेल', '1 L pouch', 185],
  ['Edible oils & ghee', 'Dalda Vanaspati Ghee 1L', 'dalda dalda ghee vanaspati vanaspati ghee डालडा डालडा घी', '1 L pack', 135],
  ['Spices & masalas', 'MDH Deggi Mirch 100g', 'mdh deggi mirch deggi mirch lal mirch chilli powder एमडीएच देगी मिर्च देगी मिर्च', '100 g pack', 72],
  ['Spices & masalas', 'Everest Garam Masala 100g', 'everest garam masala garam masala everest masala garam masalo एवरेस्ट गरम मसाला गरम मसाला', '100 g pack', 68],
  ['Spices & masalas', 'Catch Coriander Powder 100g', 'catch coriander dhaniya powder dhaniya coriander powder catch कैच धनिया धनिया पाउडर', '100 g pack', 48],
  ['Spices & masalas', 'Tata Sampann Turmeric Haldi 100g', 'tata haldi haldi powder turmeric powder tata turmeric टाटा हल्दी हल्दी पाउडर', '100 g pack', 42],
  ['Spices & masalas', 'Everest Chaat Masala 100g', 'everest chaat masala chat masala chaat masala एवरेस्ट चाट मसाला चाट मसाला', '100 g pack', 58],
  ['Spices & masalas', 'Catch Whole Cumin Seeds Jeera 200g', 'catch jeera jeera cumin seeds sabut jeera कैच जीरा जीरा', '200 g pack', 115],
  ['Spices & masalas', 'Catch Mustard Seeds Rai 200g', 'catch rai rai mustard seeds sarson dana कैच राई राई', '200 g pack', 55],
  ['Spices & masalas', 'Everest Sambhar Masala 100g', 'everest sambhar masala sambhar masala sambar powder एवरेस्ट सांभर मसाला सांभर मसाला', '100 g pack', 65],
  ['Spices & masalas', 'Everest Chhole Masala 100g', 'everest chhole masala chhole masala chana masala एवरेस्ट छोले मसाला छोले मसाला', '100 g pack', 65],
  ['Spices & masalas', 'Catch Compounded Asafoetida Hing 50g', 'catch hing hing asafoetida heeng कैच हींग हींग', '50 g dabba', 78],
  ['Salt, sugar & sweeteners', 'Tata Salt Iodized (50x1kg Bori)', 'tata salt tata salt bori namak salt bori टाटा नमक नमक', '50 kg bori', 1100],
  ['Salt, sugar & sweeteners', 'Madhur Sugar (50kg Katta)', 'madhur sugar chini cheeni sugar katta मधुर चीनी चीनी', '50 kg katta', 2080],
  ['Salt, sugar & sweeteners', 'Tata Rock Salt Sendha Namak 1kg', 'sendha namak rock salt vrat namak lahori namak सेंधा नमक सेंधा नमक पैकेट', '1 kg pack', 85],
  ['Salt, sugar & sweeteners', 'Pure Kolhapuri Jaggery Gur 1kg', 'jaggery gur gud kolhapuri gur गुड़ देसी गुड़', '1 kg block', 65],
  ['Tea, coffee & drinks', 'Tata Tea Gold 500g', 'tata tea gold tata tea chai patti tata gold टाटा टी गोल्ड टाटा चाय', '500 g pack', 235],
  ['Tea, coffee & drinks', 'Brooke Bond Red Label Tea 500g', 'red label red label tea brooke bond red label chai रेड लेबल रेड लेबल चाय', '500 g pack', 225],
  ['Tea, coffee & drinks', 'Brooke Bond Taj Mahal Tea 500g', 'taj mahal tea taj mahal chai taj tea ताज महल चाय ताज महल', '500 g pack', 345],
  ['Tea, coffee & drinks', 'Nescafe Classic Coffee Jar 100g', 'nescafe classic nescafe coffee nescafe jar नेस्कैफे कॉफी', '100 g jar', 285],
  ['Tea, coffee & drinks', 'Cadbury Bournvita Chocolate 500g', 'bournvita cadbury bournvita health drink bornvita बॉर्नविटा बोर्नविटा', '500 g jar', 265],
  ['Tea, coffee & drinks', 'Hamdard Rooh Afza Sharbat 750ml', 'rooh afza hamdard rooh afza gulab sharbat roohafza रूह अफ़ज़ा रूहअफ़ज़ा', '750 ml bottle', 185],
  ['Biscuits & snacks', 'Parle-G Glucose Biscuits (24x800g Carton)', 'parle g parle-g parle parleg पारले जी पारले-जी', '24 pack carton', 1820],
  ['Biscuits & snacks', 'Britannia Good Day Cashew 600g', 'good day good day biscuit britannia good day kaju biscuit गुड डे गुड डे बिस्कुट', '600 g pack', 110],
  ['Biscuits & snacks', 'Britannia Marie Gold Biscuits 500g', 'marie gold marie biscuit mari gold britannia marie मैरी गोल्ड मैरी बिस्कुट', '500 g pack', 78],
  ['Biscuits & snacks', 'Parle Monaco Salted Biscuits 400g', 'monaco parle monaco salted biscuit namkeen biscuit monaco मोनाको पारले मोनाको', '400 g pack', 65],
  ['Biscuits & snacks', 'Parle Krackjack Sweet & Salty 400g', 'krackjack crackjack parle krackjack sweet and salty biscuit क्रैकजैक पारले क्रैकजैक', '400 g pack', 65],
  ['Biscuits & snacks', 'Britannia Bourbon Chocolate Cream 300g', 'bourbon chocolate biscuit britannia bourbon bourbon cream बोरबॉन बोर्बन', '300 g pack', 72],
  ['Biscuits & snacks', 'Haldiram Aloo Bhujia Namkeen 400g', 'aloo bhujia haldiram aloo bhujia bhujia namkeen haldiram आलू भुजिया हल्दीराम आलू भुजिया', '400 g pack', 145],
  ['Biscuits & snacks', 'Haldiram Ratlami Sev 400g', 'ratlami sev sev haldiram sev ratlami sev namkeen रतलामी सेव हल्दीराम सेव', '400 g pack', 140],
  ['Biscuits & snacks', 'Lay\'s India\'s Magic Masala 52g', 'lays lays chips magic masala lays blue लेज लेज चिप्स', '52 g pack', 20],
  ['Biscuits & snacks', 'Kurkure Masala Munch 90g', 'kurkure masala munch kurkure namkeen kurkure packet कुरकुरे मसाला मंच', '90 g pack', 20],
  ['Instant foods', 'Maggi 2-Minute Masala Noodles (96 packs carton)', 'maggi maggi noodles nestle maggi maggi carton मैगी मैगी नूडल्स', '96 pack carton', 1280],
  ['Instant foods', 'Sunfeast YiPPee Magic Masala Noodles (96 packs)', 'yippee yippee noodles sunfeast yippee yippie यिप्पी यिप्पी नूडल्स', '96 pack carton', 1220],
  ['Instant foods', 'MTR Ready Breakfast Upma Mix 200g', 'mtr upma upma mix instant upma mtr breakfast एमटीआर उपमा उपमा मिक्स', '200 g pack', 92],
  ['Instant foods', 'Gits Gulab Jamun Instant Dessert Mix 200g', 'gits gulab jamun gulab jamun mix gits mix instant gulab jamun गिट्स गुलाब जामुन गुलाब जामुन मिक्स', '200 g pack', 112],
  ['Dairy & breakfast', 'Amul Taaza Toned Fresh Milk 1L Tetra', 'amul milk amul taaza doodh toned milk अमूल दूध अमूल ताजा', '1 L tetra', 64],
  ['Dairy & breakfast', 'Amul Butter Pasteurized 500g Block', 'amul butter butter makhan amul makhan अमूल बटर मक्खन', '500 g block', 285],
  ['Dairy & breakfast', 'Amul Processed Cheese Slices 200g (10 Slices)', 'amul cheese cheese slices cheese amul cheez अमूल चीज़ चीज़ स्लाइस', '200 g pack', 145],
  ['Dairy & breakfast', 'Kellogg\'s Real Almond & Honey Corn Flakes 475g', 'corn flakes kelloggs cornflakes nashta corn flakes kelloggs कॉर्नफ्लेक्स केलॉग्स कॉर्नफ्लेक्स', '475 g pack', 210],
  ['Dairy & breakfast', 'Quaker Rolled Oats 1kg Pouch', 'quaker oats oats rolled oats daliya oats ओट्स क्वेकर ओट्स', '1 kg pack', 185],
  ['Sauces & pickles', 'Kissan Fresh Tomato Ketchup 1kg Pouch', 'kissan ketchup tomato sauce ketchup kissan sauce किसान केचप टमाटर सॉस', '1 kg pouch', 125],
  ['Sauces & pickles', 'Ching\'s Secret Schezwan Chutney 250g', 'chings schezwan schezwan chutney schezwan sauce chings chutney चिंग्स शेजवान शेजवान चटनी', '250 g bottle', 95],
  ['Sauces & pickles', 'Mother\'s Recipe Mango Pickle Achar 500g', 'mango pickle aam ka achar mothers recipe pickle achar 500g आम का अचार मदर्स रेसिपी अचार', '500 g jar', 155],
  ['Sauces & pickles', 'Shri Mahila Griha Udyog Lijjat Urad Papad 200g', 'lijjat papad papad urad papad lijjat लिज्जत पापड़ पापड़', '200 g pack', 75],
  ['Dry fruits & nuts', 'Happilo California Premium Almonds Badam 500g', 'badam happilo almond california badam almonds 500g बादाम हैपिलो बादाम', '500 g pouch', 485],
  ['Dry fruits & nuts', 'Green Long Raisins Kishmish 500g', 'kishmish kismis raisins munakka किशमिश किशमिस', '500 g pouch', 245],
  ['Dry fruits & nuts', 'Goa Premium Cashew W320 Kaju 250g', 'kaju cashew w320 kaju kaju tukda काजू काजू टुकड़ा', '250 g pouch', 285],
  ['Dry fruits & nuts', 'Kashmiri Shelled Walnuts Akhrot Giri 250g', 'akhrot walnut akhrot giri walnuts अखरोट अखरोट गिरी', '250 g pouch', 320],
  ['Personal care', 'Lux Velvet Touch Beauty Soap 100g', 'lux soap lux sabun sabun lux लक्स साबुन लक्स', '100 g bar', 38],
  ['Personal care', 'Dettol Original Germ Protection Soap 125g', 'dettol soap dettol sabun germ protection soap डेटॉल साबुन डेटॉल', '125 g bar', 48],
  ['Personal care', 'Dove Intense Repair Hair Shampoo 340ml', 'dove shampoo dove shampoo dove hair shampoo डव शैम्पू डव', '340 ml bottle', 285],
  ['Personal care', 'Colgate MaxFresh Spicy Fresh Toothpaste 150g', 'colgate colgate maxfresh toothpaste manjan कोलगेट कोलगेट मैक्सफ्रेश', '150 g tube', 105],
  ['Personal care', 'Dettol Liquid Handwash Pump 250ml', 'dettol handwash handwash liquid dettol pump hand wash डेटॉल हैंडवाश हैंडवाश', '250 ml pump', 95],
  ['Personal care', 'Whisper Ultra Clean Sanitary Napkins (20 Pads XL)', 'whisper whisper ultra sanitary pad whisper pads व्हिस्पर सैनिटरी पैड', '20 pads pack', 185],
  ['Laundry', 'Surf Excel Matic Front Load Detergent Powder 2kg', 'surf excel surf surf excel matic detergent powder सर्फ एक्सेल सर्फ', '2 kg pack', 315],
  ['Laundry', 'Ariel Matic Liquid Detergent 1L Bottle', 'ariel liquid ariel matic washing liquid ariel detergent एरियल लिक्विड एरियल', '1 L bottle', 265],
  ['Laundry', 'Active Wheel 2 in 1 Green Lemon Detergent 1kg', 'wheel powder wheel detergent green wheel wheel sabun powder व्हील पाउडर व्हील', '1 kg pack', 72],
  ['Laundry', 'Rin Advanced Detergent Laundry Bar 250g', 'rin bar rin sabun kapde ka sabun rin detergent bar रिन साबुन रिन बार', '250 g bar', 28],
  ['Household cleaning', 'Vim Lemon Dishwash Bar 200g', 'vim bar vim sabun bartan sabun dishwash bar विम बार विम साबुन', '200 g bar', 28],
  ['Household cleaning', 'Harpic Power Plus Toilet Cleaner 1L', 'harpic toilet cleaner harpic 1l blue harpic हार्पिक टॉयलेट क्लीनर', '1 L bottle', 185],
  ['Household cleaning', 'Lizol Citrus Disinfectant Floor Cleaner 2L', 'lizol floor cleaner pochha liquid lizol 2l लाइजोल फ्लोर क्लीनर', '2 L bottle', 245],
  ['Household cleaning', 'Colin Regular Glass & Surface Cleaner 500ml', 'colin glass cleaner shisha cleaner colin spray कॉलिन ग्लास क्लीनर', '500 ml spray', 95],
  ['Packaged foods', 'Kissan Mixed Fruit Jam Jar 500g', 'kissan jam fruit jam mixed jam jam किसान जैम फ्रूट जैम', '500 g jar', 145],
  ['Packaged foods', 'MTR Daily Breakfast Flattened Rice Poha 500g', 'poha mtr poha chivda aval पोहा चिवड़ा', '500 g pack', 78],
  ['Packaged foods', 'India Gate Roasted Wheat Porridge Daliya 500g', 'daliya wheat daliya porridge gehu daliya दलिया गेहूं दलिया', '500 g pack', 72],
  ['Fresh produce', 'Fresh Red Onion Mandi Grade 1kg', 'onion pyaaz pyaz pyaj प्याज प्याज़', '1 kg', 28],
  ['Fresh produce', 'Fresh Jyoti Potato Agra Quality 1kg', 'potato aloo alu batata आलू बटाटा', '1 kg', 31],
  ['Fresh produce', 'Fresh Hybrid Tomato Mandi 1kg', 'tomato tamatar red tomato desi tamatar टमाटर लाल टमाटर', '1 kg', 48],
  ['Fresh produce', 'Desi White Garlic Lehsun 500g', 'lehsun garlic lahsun safed lehsun लहसुन देसी लहसुन', '500 g', 95],
  ['Fresh produce', 'Fresh Spicy Ginger Adrak 250g', 'adrak ginger adrak fresh ada अदरक ताजा अदरक', '250 g', 45],
  ['Fresh produce', 'Juicy Yellow Kagzi Lemon Nimbu 500g', 'nimbu lemon kagzi nimbu neebu नींबू कागजी नींबू', '500 g', 60],
  ['Health & wellness', 'Dabur Chyawanprash Immunity 500g', 'chyawanprash dabur chyawanprash chawanprash dabur immunity च्यवनप्राश डाबर च्यवनप्राश', '500 g jar', 245],
  ['Health & wellness', 'ENO Regular Fruit Salt 100g Bottle', 'eno eno fruit salt acidity eno gas dawa ईनो फ्रूट साल्ट', '100 g bottle', 115],
  ['Health & wellness', 'Vicks Vaporub Cold Relief Balm 50g', 'vicks vicks vaporub sardi balm vicks balm विक्स विक्स वेपोरब', '50 g tub', 145],
  ['Health & wellness', 'Dettol Antiseptic Liquid 125ml', 'dettol antiseptic antiseptic liquid dettol liquid dettol dava डेटॉल एंटीसेप्टिक डेटॉल लिक्विड', '125 ml bottle', 78],
  ['Health & wellness', 'Moov Pain Relief Fast Action Spray 50g', 'moov moov spray pain spray moov pain relief मूव मूव स्प्रे', '50 g spray', 165],
  ['Health & wellness', 'Zandu Balm Fast Headache & Cold Relief 25ml', 'zandu balm headache balm zandu sar dard balm झंडू बाम झंडू', '25 ml bottle', 45]
];

const SELLER_NAMES = ['Shree Ganesh Foods', 'Raj Traders', 'Malwa Fresh Co.'];

export const CATALOG_PRODUCTS = CATALOG_SEED.map((p, i) => {
  const cash = p[4] + (i % 4) * 3;
  return {
    id: i + 1,
    category: p[0],
    label: p[1],
    aliases: [p[2], ...p[2].split(' ')],
    pack: p[3],
    cash,
    credit: Math.round(cash * 1.03),
    gst: i % 5 === 0 ? 12 : 5,
    stock: 18 + (i * 17) % 160,
    seller: SELLER_NAMES[i % 3]
  };
});

// Core high-volume mandi commodities with dedicated multi-seller quotes
export const COMMODITY_QUOTES = {
  oil: {
    label: 'Bail Kolhu tel',
    aliases: [
      'bail kolhu tel', 'bail kolhu mustard oil', 'bail kolhu', 'sarson tel', 'sarson ka tel',
      'mustard oil', 'mustard tel', 'cooking oil', 'tel', 'सरसों तेल', 'सरसों का तेल', 'तेल', 'सरसों'
    ],
    unit: 'peti',
    quotes: [
      { seller: 'Shree Ganesh Foods', cash: 4200, credit: 4326, gst: 5, inStock: true },
      { seller: 'Raj Traders', cash: 4140, credit: 4300, gst: 5, inStock: true }
    ]
  },
  sugar: {
    label: 'Chini',
    aliases: ['madhur sugar', 'chini', 'cheeni', 'chiny', 'sugar', 'sakkar', 'shakkar', 'चीनी', 'शक्कर', 'साखर'],
    unit: 'katta',
    quotes: [
      { seller: 'Raj Traders', cash: 2150, credit: 2215, gst: 5, inStock: true },
      { seller: 'Malwa Fresh Co.', cash: 2080, credit: 2180, gst: 5, inStock: true }
    ]
  },
  dal: {
    label: 'Arhar dal',
    aliases: ['arhar dal', 'toor dal', 'tur dal', 'tuar dal', 'arhar ki dal', 'toor dal tata', 'dal', 'अरहर दाल', 'अरहर की दाल', 'तूर दाल', 'दाल'],
    unit: 'bori',
    quotes: [
      { seller: 'Malwa Fresh Co.', cash: 6800, credit: 7004, gst: 5, inStock: true },
      { seller: 'Shree Ganesh Foods', cash: 6650, credit: 6950, gst: 5, inStock: false }
    ]
  },
  onion: {
    label: 'Onion',
    aliases: ['onion', 'pyaaz', 'pyaz', 'pyaj', 'kanda', 'kandha', 'red onion', 'प्याज', 'प्याज़', 'कांदा', 'कंदा'],
    unit: 'kg',
    quotes: [
      { seller: 'Raj Traders', cash: 29, credit: 30, gst: 5, inStock: true },
      { seller: 'Shree Ganesh Foods', cash: 27.5, credit: 29.5, gst: 5, inStock: true }
    ]
  },
  potato: {
    label: 'Potato',
    aliases: ['potato', 'aloo', 'alu', 'aalu', 'batata', 'आलू', 'बटाटा'],
    unit: 'kg',
    quotes: [
      { seller: 'Raj Traders', cash: 32, credit: 33, gst: 5, inStock: true },
      { seller: 'Shree Ganesh Foods', cash: 31, credit: 32, gst: 5, inStock: true }
    ]
  }
};

export const PRODUCT_QUOTES = {
  ...COMMODITY_QUOTES,
  ...Object.fromEntries(
    CATALOG_PRODUCTS.map(p => [
      p.id,
      {
        label: p.label,
        aliases: p.aliases,
        unit: p.pack,
        quotes: [
          { seller: p.seller, cash: p.cash, credit: p.credit, gst: p.gst, inStock: p.stock > 0 },
          { seller: SELLER_NAMES[(p.id + 1) % 3], cash: p.cash + 5, credit: p.credit + 5, gst: p.gst, inStock: true }
        ]
      }
    ])
  )
};

// Distributor Price Radar Items (Verbatim from Feature B)
export const DISTRIBUTOR_RADAR_ITEMS = [
  {
    id: 'radar_1',
    item: 'Tata Salt (बोरी - 50x1kg)',
    brand: 'Tata Consumer',
    packSize: '50 kg bori',
    distributorCharged: 540,
    areaMedianRate: 510,
    activeScheme: '2 packet free scheme (worth ₹56)',
    effectiveAreaRate: 510,
    reportingPeersPercent: 80,
    reportingCount: 28,
    verdict: 'High Overcharge',
    overchargePerUnit: 30,
    suggestedCounterOffer: 'Bhaiya, baaki dukandaron ko ₹510 + 2 packet free mil raha hai. ₹510 par lock karo.',
    monthlyLossAtVolume: 1200 // 40 boris = ₹1,200 loss
  },
  {
    id: 'radar_2',
    item: 'Bail Kolhu Mustard Oil (पेटी - 12x1L)',
    brand: 'Bail Kolhu',
    packSize: '12 L carton',
    distributorCharged: 1420,
    areaMedianRate: 1360,
    activeScheme: '5% cash discount on same-day clearance',
    effectiveAreaRate: 1360,
    reportingPeersPercent: 74,
    reportingCount: 22,
    verdict: 'High Overcharge',
    overchargePerUnit: 60,
    suggestedCounterOffer: '2 gali chhod ke Gupta ji ko ₹1,360 lagaya hai. Rate match kijiye.',
    monthlyLossAtVolume: 1800
  },
  {
    id: 'radar_3',
    item: 'Fortune Sunflower Oil (15L Tin)',
    brand: 'Adani Wilmar',
    packSize: '15 L tin',
    distributorCharged: 1950,
    areaMedianRate: 1940,
    activeScheme: 'Standard trade scheme',
    effectiveAreaRate: 1940,
    reportingPeersPercent: 88,
    reportingCount: 35,
    verdict: 'Fair',
    overchargePerUnit: 10,
    suggestedCounterOffer: 'Rate theek hai, par agle order par 2 tin bonus point claim karenge.',
    monthlyLossAtVolume: 200
  },
  {
    id: 'radar_4',
    item: 'Parle-G Gold (कार्टन - 24x800g)',
    brand: 'Parle Products',
    packSize: '24 packs carton',
    distributorCharged: 1880,
    areaMedianRate: 1820,
    activeScheme: '1 jar free with 2 cartons',
    effectiveAreaRate: 1820,
    reportingPeersPercent: 66,
    reportingCount: 19,
    verdict: 'Moderate Overcharge',
    overchargePerUnit: 60,
    suggestedCounterOffer: 'Area scheme ke hisaab se 1 jar free add karo ya ₹1,820 bill banao.',
    monthlyLossAtVolume: 720
  },
  {
    id: 'radar_5',
    item: 'Madhur Sugar (कट्टा - 50kg)',
    brand: 'Shree Renuka',
    packSize: '50 kg katta',
    distributorCharged: 2150,
    areaMedianRate: 2080,
    activeScheme: 'APMC wholesale parity',
    effectiveAreaRate: 2080,
    reportingPeersPercent: 82,
    reportingCount: 31,
    verdict: 'High Overcharge',
    overchargePerUnit: 70,
    suggestedCounterOffer: 'Mandi rate ₹2,080 chal raha hai Malwa Fresh par. ₹2,090 se zyada nahi denge.',
    monthlyLossAtVolume: 1050
  }
];
