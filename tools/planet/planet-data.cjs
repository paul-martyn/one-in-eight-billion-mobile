// Country data for GlobeLive: Natural Earth 1:110m borders (via world-atlas 2.0.2, ISC; the data is
// public domain), rough births and deaths a year (thousands, UN WPP estimates for 2023–24, rounded),
// a few cities for the birth pin and first names for the bubbles.
// build(atlasJson, gameSource) → { META, SHAPES, CODE, POOLS, stats }; each META row ends with the
// game's ISO code of the country ('' where the game has no such country).
// Came with the planet from the design canvas (tools/planet-data.js), 2026-11-11.
const D2R = Math.PI / 180;

// [births, deaths] a year, thousands.
const STATS = {
  'India': [23100, 10200], 'China': [9000, 11100], 'Nigeria': [7700, 2700], 'Pakistan': [6500, 1650],
  'Indonesia': [4400, 1900], 'Dem. Rep. Congo': [4500, 950], 'Ethiopia': [4100, 770],
  'United States of America': [3600, 3070], 'Bangladesh': [3050, 950], 'Brazil': [2500, 1450],
  'Egypt': [2200, 620], 'Tanzania': [2400, 380], 'Philippines': [1900, 740], 'Mexico': [1820, 800],
  'Uganda': [1830, 230], 'Sudan': [1700, 330], 'Kenya': [1490, 310], 'Angola': [1410, 260],
  'Afghanistan': [1470, 280], 'Vietnam': [1400, 650], 'Russia': [1260, 1760], 'Niger': [1200, 230],
  'Mozambique': [1250, 260], 'Iraq': [1200, 210], 'Iran': [1050, 450], 'South Africa': [1150, 560],
  'Turkey': [960, 530], "Côte d'Ivoire": [1000, 240], 'Cameroon': [990, 210], 'Mali': [980, 200],
  'Madagascar': [980, 190], 'Yemen': [1150, 240], 'Algeria': [790, 200], 'Ghana': [920, 250],
  'Myanmar': [850, 480], 'Burkina Faso': [790, 190], 'Somalia': [650, 155], 'Somaliland': [190, 45],
  'Uzbekistan': [930, 170], 'Chad': [810, 210], 'Japan': [740, 1580], 'Germany': [690, 1030],
  'Malawi': [700, 130], 'Zambia': [700, 120], 'France': [680, 640], 'United Kingdom': [660, 660],
  'Saudi Arabia': [550, 120], 'Thailand': [520, 560], 'Morocco': [640, 210], 'Nepal': [580, 200],
  'Colombia': [510, 260], 'Senegal': [580, 100], 'Guinea': [510, 130], 'Peru': [560, 190],
  'Argentina': [460, 360], 'Venezuela': [470, 200], 'S. Sudan': [400, 120], 'Syria': [520, 120],
  'Benin': [490, 120], 'Rwanda': [400, 80], 'Burundi': [460, 90], 'Zimbabwe': [460, 130],
  'Malaysia': [410, 200], 'Sri Lanka': [250, 180], 'Kazakhstan': [390, 130], 'Canada': [350, 330],
  'Australia': [290, 180], 'Spain': [320, 440], 'Italy': [380, 660], 'Poland': [270, 410],
  'Ukraine': [190, 600], 'South Korea': [230, 350], 'North Korea': [360, 250], 'Ecuador': [250, 90],
  'Guatemala': [380, 100], 'Bolivia': [260, 90], 'Haiti': [270, 100], 'Tunisia': [160, 80],
  'Jordan': [220, 45], 'Tajikistan': [260, 47], 'Papua New Guinea': [270, 67], 'Sierra Leone': [270, 77],
  'Togo': [290, 75], 'Liberia': [170, 40], 'Central African Rep.': [240, 67], 'Congo': [190, 40],
  'Eritrea': [100, 24], 'Laos': [165, 48], 'Cambodia': [340, 100], 'Honduras': [220, 50],
  'Nicaragua': [135, 34], 'El Salvador': [95, 47], 'Dominican Rep.': [210, 73], 'Cuba': [90, 120],
  'Paraguay': [140, 38], 'Chile': [170, 120], 'Netherlands': [165, 170], 'Belgium': [110, 115],
  'Sweden': [100, 94], 'Greece': [71, 128], 'Portugal': [85, 118], 'Czechia': [91, 112],
  'Hungary': [85, 130], 'Romania': [150, 240], 'Belarus': [70, 120], 'Mongolia': [68, 19],
  'Libya': [130, 35], 'Mauritania': [160, 33], 'Namibia': [70, 22], 'Botswana': [60, 17],
  'Gabon': [65, 16], 'Lesotho': [55, 30], 'eSwatini': [30, 12], 'Gambia': [90, 15],
  'Guinea-Bissau': [65, 15], 'Eq. Guinea': [50, 14], 'Djibouti': [24, 8], 'N. Cyprus': [4, 2.5],
  'Cyprus': [10, 7], 'Kosovo': [18, 11], 'Israel': [180, 50], 'Palestine': [145, 18], 'Lebanon': [80, 30],
  'United Arab Emirates': [100, 12], 'Qatar': [25, 3], 'Kuwait': [50, 8], 'Oman': [75, 9],
  'Azerbaijan': [110, 60], 'Armenia': [36, 28], 'Georgia': [42, 45], 'Turkmenistan': [140, 45],
  'Kyrgyzstan': [150, 35], 'Bhutan': [10, 5], 'Taiwan': [135, 205], 'Brunei': [6, 2], 'Timor-Leste': [35, 8],
  'Vanuatu': [9, 2], 'Solomon Is.': [22, 4], 'New Caledonia': [4, 2], 'Fiji': [17, 7], 'New Zealand': [60, 37],
  'Iceland': [4.5, 2.5], 'Ireland': [55, 35], 'Norway': [52, 44], 'Denmark': [57, 57], 'Finland': [43, 61],
  'Estonia': [11, 16], 'Latvia': [13, 27], 'Lithuania': [20, 39], 'Austria': [77, 89], 'Switzerland': [80, 72],
  'Luxembourg': [6.5, 4.5], 'Slovenia': [17, 22], 'Slovakia': [50, 57], 'Croatia': [33, 51],
  'Bosnia and Herz.': [26, 36], 'Serbia': [61, 97], 'Montenegro': [7, 7], 'Macedonia': [17, 20],
  'Albania': [25, 22], 'Bulgaria': [57, 101], 'Moldova': [24, 35], 'Panama': [70, 23], 'Costa Rica': [51, 27],
  'Belize': [8, 2], 'Jamaica': [30, 20], 'Bahamas': [4, 3], 'Puerto Rico': [18, 32],
  'Trinidad and Tobago': [13, 12], 'Guyana': [16, 7], 'Suriname': [10, 4], 'Uruguay': [31, 35],
  'Falkland Is.': [0.03, 0.02], 'Fr. S. Antarctic Lands': [0, 0], 'Greenland': [0.75, 0.5],
  'Antarctica': [0, 0], 'W. Sahara': [12, 3]
};

// Short names for the bubbles and the roll; the rest keep Natural Earth's.
const SHORT = {
  'United States of America': 'USA', 'United Kingdom': 'UK', 'Dem. Rep. Congo': 'DR Congo',
  'Central African Rep.': 'CAR', 'United Arab Emirates': 'UAE', 'Bosnia and Herz.': 'Bosnia',
  'Dominican Rep.': 'Dominican Rep.', 'S. Sudan': 'South Sudan', 'Eq. Guinea': 'Eq. Guinea',
  'Fr. S. Antarctic Lands': 'French Southern Lands', 'Solomon Is.': 'Solomon Islands', 'Falkland Is.': 'Falklands',
  'W. Sahara': 'Western Sahara', 'eSwatini': 'Eswatini', 'Macedonia': 'North Macedonia', 'N. Cyprus': 'N. Cyprus',
  'Trinidad and Tobago': 'Trinidad & Tobago', 'Papua New Guinea': 'Papua New Guinea'
};
const LONG = {
  'United States of America': 'United States', 'Dem. Rep. Congo': 'DR Congo', 'Central African Rep.': 'Central African Republic',
  'Bosnia and Herz.': 'Bosnia and Herzegovina', 'Dominican Rep.': 'Dominican Republic', 'S. Sudan': 'South Sudan',
  'Eq. Guinea': 'Equatorial Guinea', 'Fr. S. Antarctic Lands': 'French Southern Lands', 'Solomon Is.': 'Solomon Islands',
  'Falkland Is.': 'Falkland Islands', 'W. Sahara': 'Western Sahara', 'eSwatini': 'Eswatini', 'Macedonia': 'North Macedonia',
  'N. Cyprus': 'Northern Cyprus'
};

// Where the birth pin may land: [name, lat, lon].
const CITIES = {
  'India': [['Lucknow', 26.85, 80.95], ['Mumbai', 19.08, 72.88], ['Patna', 25.59, 85.14], ['Kolkata', 22.57, 88.36], ['Delhi', 28.61, 77.21]],
  'China': [['Chongqing', 29.56, 106.55], ['Guangzhou', 23.13, 113.26], ['Zhengzhou', 34.75, 113.62], ['Chengdu', 30.66, 104.06]],
  'Nigeria': [['Lagos', 6.52, 3.38], ['Kano', 12.0, 8.52], ['Ibadan', 7.38, 3.94]],
  'Pakistan': [['Karachi', 24.86, 67.01], ['Lahore', 31.55, 74.34], ['Faisalabad', 31.42, 73.08]],
  'Indonesia': [['Jakarta', -6.2, 106.85], ['Surabaya', -7.25, 112.75], ['Bandung', -6.92, 107.6]],
  'Dem. Rep. Congo': [['Kinshasa', -4.32, 15.31], ['Lubumbashi', -11.66, 27.48], ['Mbuji-Mayi', -6.13, 23.6]],
  'Ethiopia': [['Addis Ababa', 9.03, 38.74], ['Gondar', 12.6, 37.47]],
  'United States of America': [['Houston', 29.76, -95.37], ['Chicago', 41.88, -87.63], ['Phoenix', 33.45, -112.07], ['Atlanta', 33.75, -84.39]],
  'Bangladesh': [['Dhaka', 23.81, 90.41], ['Chittagong', 22.36, 91.78]],
  'Brazil': [['São Paulo', -23.55, -46.63], ['Salvador', -12.97, -38.5], ['Manaus', -3.12, -60.02]],
  'Egypt': [['Cairo', 30.04, 31.24], ['Asyut', 27.18, 31.18]],
  'Tanzania': [['Dar es Salaam', -6.79, 39.21], ['Mwanza', -2.52, 32.9]],
  'Philippines': [['Manila', 14.6, 120.98], ['Cebu', 10.32, 123.89]],
  'Mexico': [['Mexico City', 19.43, -99.13], ['Guadalajara', 20.66, -103.35]],
  'Uganda': [['Kampala', 0.35, 32.58]], 'Sudan': [['Khartoum', 15.5, 32.56]], 'Kenya': [['Nairobi', -1.29, 36.82]],
  'Angola': [['Luanda', -8.84, 13.23]], 'Afghanistan': [['Kabul', 34.53, 69.17]],
  'Vietnam': [['Ho Chi Minh City', 10.82, 106.63], ['Hanoi', 21.03, 105.85]],
  'Russia': [['Moscow', 55.76, 37.62], ['Kazan', 55.79, 49.11], ['Novosibirsk', 55.03, 82.92]],
  'Niger': [['Niamey', 13.51, 2.11]], 'Mozambique': [['Maputo', -25.97, 32.57]], 'Iraq': [['Baghdad', 33.31, 44.36]],
  'Iran': [['Tehran', 35.69, 51.39], ['Mashhad', 36.3, 59.6]], 'South Africa': [['Johannesburg', -26.2, 28.05]],
  'Turkey': [['Istanbul', 41.01, 28.98], ['Ankara', 39.93, 32.86]], "Côte d'Ivoire": [['Abidjan', 5.36, -4.01]],
  'Cameroon': [['Douala', 4.05, 9.77]], 'Mali': [['Bamako', 12.64, -8.0]], 'Madagascar': [['Antananarivo', -18.88, 47.51]],
  'Yemen': [["Sana'a", 15.37, 44.19]], 'Algeria': [['Algiers', 36.75, 3.06]], 'Ghana': [['Accra', 5.6, -0.19]],
  'Myanmar': [['Yangon', 16.84, 96.17]], 'Burkina Faso': [['Ouagadougou', 12.37, -1.52]], 'Somalia': [['Mogadishu', 2.05, 45.32]],
  'Uzbekistan': [['Tashkent', 41.3, 69.24]], 'Chad': [["N'Djamena", 12.13, 15.06]],
  'Japan': [['Osaka', 34.69, 135.5], ['Tokyo', 35.68, 139.69]], 'Germany': [['Berlin', 52.52, 13.4], ['Munich', 48.14, 11.58]],
  'Malawi': [['Lilongwe', -13.96, 33.79]], 'Zambia': [['Lusaka', -15.39, 28.32]],
  'France': [['Lyon', 45.76, 4.84], ['Paris', 48.86, 2.35]], 'United Kingdom': [['Manchester', 53.48, -2.24], ['London', 51.51, -0.13]],
  'Saudi Arabia': [['Riyadh', 24.71, 46.68]], 'Thailand': [['Bangkok', 13.76, 100.5]], 'Morocco': [['Casablanca', 33.57, -7.59]],
  'Nepal': [['Kathmandu', 27.72, 85.32]], 'Colombia': [['Bogotá', 4.71, -74.07]], 'Senegal': [['Dakar', 14.72, -17.47]],
  'Guinea': [['Conakry', 9.64, -13.58]], 'Peru': [['Lima', -12.05, -77.04]], 'Argentina': [['Buenos Aires', -34.6, -58.38]],
  'Venezuela': [['Caracas', 10.48, -66.9]], 'S. Sudan': [['Juba', 4.85, 31.58]], 'Syria': [['Damascus', 33.51, 36.29]],
  'Benin': [['Cotonou', 6.37, 2.39]], 'Rwanda': [['Kigali', -1.94, 30.06]], 'Burundi': [['Gitega', -3.43, 29.93]],
  'Zimbabwe': [['Harare', -17.83, 31.05]], 'Malaysia': [['Kuala Lumpur', 3.14, 101.69]], 'Sri Lanka': [['Colombo', 6.93, 79.86]],
  'Kazakhstan': [['Almaty', 43.24, 76.89]], 'Canada': [['Toronto', 43.65, -79.38]], 'Australia': [['Sydney', -33.87, 151.21]],
  'Spain': [['Madrid', 40.42, -3.7]], 'Italy': [['Rome', 41.9, 12.5]], 'Poland': [['Warsaw', 52.23, 21.01]],
  'Ukraine': [['Kyiv', 50.45, 30.52]], 'South Korea': [['Seoul', 37.57, 126.98]], 'North Korea': [['Pyongyang', 39.04, 125.76]],
  'Guatemala': [['Guatemala City', 14.63, -90.51]], 'Cambodia': [['Phnom Penh', 11.56, 104.93]], 'Ecuador': [['Guayaquil', -2.17, -79.92]],
  'Haiti': [['Port-au-Prince', 18.59, -72.31]], 'Bolivia': [['Santa Cruz', -17.78, -63.18]], 'Chile': [['Santiago', -33.45, -70.67]],
  'Papua New Guinea': [['Port Moresby', -9.44, 147.18]]
};

// First names for the bubbles, by country or by region.
const POOLS = {
  IN: ['Aarav', 'Ananya', 'Vihaan', 'Diya', 'Ishaan', 'Saanvi', 'Arjun', 'Priya', 'Rohan', 'Kavya'],
  CN: ['Mei', 'Jun', 'Li Na', 'Hao', 'Xin', 'Yu', 'Chen', 'Lan', 'Wei', 'Jing'],
  PK: ['Ayesha', 'Ali', 'Fatima', 'Hamza', 'Zainab', 'Bilal', 'Hira', 'Usman'],
  NG: ['Chidi', 'Amara', 'Tunde', 'Ngozi', 'Emeka', 'Zainab', 'Musa', 'Adaeze'],
  ID: ['Putri', 'Budi', 'Siti', 'Rizky', 'Dewi', 'Agus', 'Nur', 'Bayu'],
  CD: ['Grâce', 'Patrick', 'Esther', 'Jonathan', 'Merveille', 'Christelle'],
  ET: ['Abebe', 'Hana', 'Dawit', 'Selam', 'Tigist', 'Yonas'],
  US: ['Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Mason', 'Mia', 'Elijah'],
  BD: ['Rahim', 'Nusrat', 'Arif', 'Tasnim', 'Sumon', 'Farzana'],
  BR: ['Miguel', 'Helena', 'Arthur', 'Alice', 'Gael', 'Laura'],
  EG: ['Omar', 'Malak', 'Youssef', 'Nour', 'Mariam', 'Ahmed'],
  MX: ['Santiago', 'Sofía', 'Mateo', 'Valentina', 'Diego', 'Regina'],
  PH: ['Jose', 'Maria', 'Juan', 'Angel', 'Mark', 'Princess'],
  RU: ['Artyom', 'Sofia', 'Maksim', 'Anna', 'Ivan', 'Alisa'],
  JP: ['Haruto', 'Yui', 'Sota', 'Himari', 'Ren', 'Mio'],
  VN: ['Minh', 'Linh', 'Huy', 'Anh', 'Bao', 'Ngoc'],
  IR: ['Amir', 'Zahra', 'Reza', 'Fatemeh', 'Ali', 'Narges'],
  TR: ['Yusuf', 'Zeynep', 'Eymen', 'Elif', 'Mustafa', 'Defne'],
  DE: ['Noah', 'Emilia', 'Matteo', 'Sophia', 'Leon', 'Hannah'],
  FR: ['Gabriel', 'Louise', 'Raphaël', 'Jade', 'Léo', 'Ambre'],
  GB: ['Oliver', 'Olivia', 'George', 'Amelia', 'Arthur', 'Isla'],
  AF: ['Amina', 'Kwame', 'Fatou', 'Moussa', 'Aisha', 'Kofi', 'Nia', 'Ibrahim'],
  LA: ['Sofía', 'Mateo', 'Valentina', 'Santiago', 'Camila', 'Lucas'],
  EU: ['Anna', 'Luca', 'Emma', 'Leo', 'Mia', 'Jan'],
  ME: ['Omar', 'Layla', 'Yusuf', 'Mariam', 'Ali', 'Noor'],
  CA: ['Ali', 'Zara', 'Arman', 'Dilnoza', 'Timur', 'Aziza'],
  SA: ['Aarav', 'Sita', 'Ram', 'Anil', 'Priya', 'Kiran'],
  EA: ['Mei', 'Kai', 'Linh', 'Ari', 'Sora', 'Nala'],
  NA: ['Olivia', 'Liam', 'Charlotte', 'Jack', 'Isla', 'Noah']
};
const POOL_OF = {
  'India': 'IN', 'China': 'CN', 'Taiwan': 'CN', 'Pakistan': 'PK', 'Nigeria': 'NG', 'Indonesia': 'ID', 'Dem. Rep. Congo': 'CD',
  'Ethiopia': 'ET', 'United States of America': 'US', 'Bangladesh': 'BD', 'Brazil': 'BR', 'Egypt': 'EG', 'Mexico': 'MX',
  'Philippines': 'PH', 'Russia': 'RU', 'Belarus': 'RU', 'Japan': 'JP', 'Vietnam': 'VN', 'Iran': 'IR', 'Turkey': 'TR', 'N. Cyprus': 'TR',
  'Germany': 'DE', 'Austria': 'DE', 'France': 'FR', 'United Kingdom': 'GB', 'Ireland': 'GB', 'Canada': 'NA', 'Australia': 'NA',
  'New Zealand': 'NA', 'Greenland': 'EU', 'Sudan': 'ME', 'Yemen': 'ME', 'Nepal': 'SA', 'Sri Lanka': 'SA', 'Bhutan': 'SA',
  'Afghanistan': 'CA', 'Somalia': 'AF', 'Somaliland': 'AF', 'Djibouti': 'AF'
};
function poolFor(name, lat, lon) {
  if (POOL_OF[name]) return POOL_OF[name];
  if (lon < -30) return lat > 25 ? 'NA' : 'LA';
  if (lat > 36 && lon < 45) return 'EU';
  if (lat >= 19 && lon >= -18 && lon < 63) return 'ME';
  if (lon >= -20 && lon < 52 && lat < 19) return 'AF';
  if (lon >= 45 && lon < 90 && lat >= 20) return 'CA';
  return 'EA';
}

// Ring encoding: "x,y,pole:" (tenths of a degree, the ring's start and whether it closes round a
// pole), then each step as two numbers zigzagged into the alphabet: one char below 80, else a
// prefix char (80–82) and a char.
const CODE = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-./=?@[]^_~|';
if (CODE.length !== 83) throw new Error('alphabet ' + CODE.length);
function enc(v) {
  const u = v >= 0 ? 2 * v : -2 * v - 1;
  if (u < 80) return CODE[u];
  const q = Math.floor(u / 80);
  if (q > 3) throw new Error('step too long: ' + v);
  return CODE[79 + q] + CODE[u % 80];
}

function decodeArcs(t) {
  const [sx, sy] = t.transform.scale, [tx, ty] = t.transform.translate;
  return t.arcs.map((a) => { let x = 0, y = 0; return a.map((p) => { x += p[0]; y += p[1]; return [x * sx + tx, y * sy + ty]; }); });
}
function ringOf(arcs, ids) {
  const out = [];
  ids.forEach((id, k) => {
    const a = id >= 0 ? arcs[id] : arcs[~id].slice().reverse();
    (k ? a.slice(1) : a).forEach((p) => out.push(p));
  });
  return out;
}
const unit = (lat, lon) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R)];
function inRing(p, x, y) {
  let inside = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The game's own country table (src/engine/game.en.js): births a year (b), people (pop, thousands),
// life expectancy (le), children per woman (tfr), income a person (ppp, $), urban % (urb), online %
// (net), years at school (eys), infants dying per 1000 (im). Matched to the map by English name.
const GAME_ALIAS = {
  'United States of America': 'USA', 'Dem. Rep. Congo': 'COD', 'Dominican Rep.': 'DOM', 'Central African Rep.': 'CAF',
  'Congo': 'COG', 'Eq. Guinea': 'GNQ', 'Gambia': 'GMB', 'United Arab Emirates': 'ARE', 'Netherlands': 'NLD',
  'Solomon Is.': 'SLB', 'United Kingdom': 'GBR', 'Philippines': 'PHL', 'Bosnia and Herz.': 'BIH', 'Macedonia': 'MKD', 'S. Sudan': 'SSD'
};
function gameTable(src) {
  if (!src) return {};
  const grab = (start, open, close) => {
    const a = src.indexOf(start);
    if (a < 0) throw new Error('game data: ' + start);
    let i = src.indexOf(open, a), d = 0, j = i;
    for (; j < src.length; j++) { if (src[j] === open) d++; else if (src[j] === close && !--d) break; }
    return Function('return (' + src.slice(i, j + 1) + ')')();
  };
  const rows = grab('const COUNTRIES = [', '[', ']'), names = grab('const COUNTRY_T = {', '{', '}');
  const norm = (x) => x.toLowerCase().replace(/[^a-z]/g, '');
  const out = {};
  rows.forEach((r) => { out[r.id] = r; if (names[r.id]) out[norm(names[r.id])] = r; });
  out.lookup = (neName) => out[GAME_ALIAS[neName]] || out[norm(neName)] || null;
  return out;
}

function build(atlas, gameSrc) {
  const game = gameTable(gameSrc);
  let matched = 0;
  const arcs = decodeArcs(atlas);
  const geoms = atlas.objects.countries.geometries;
  const META = [], shapeStrs = [], missing = [];
  let totalB = 0, totalD = 0;
  for (const g of geoms) {
    const name = g.properties.name;
    const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
    const rings = [];
    const outers = [];
    for (const poly of polys) {
      poly.forEach((ids, ri) => {
        // Unwrap across the antimeridian, quantize to 0.1°, drop repeats and the closing point.
        let pts = ringOf(arcs, ids).map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
        for (let i = 1; i < pts.length; i++) {
          while (pts[i][0] - pts[i - 1][0] > 1800) pts[i][0] -= 3600;
          while (pts[i][0] - pts[i - 1][0] < -1800) pts[i][0] += 3600;
        }
        let pole = 0;
        if (Math.abs(pts[pts.length - 1][0] - pts[0][0]) > 1800) {
          pole = pts.reduce((s, p) => s + p[1], 0) < 0 ? -1 : 1;
        }
        pts = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
        if (!pole && pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
        if (pts.length < 3) return;
        let s = pts[0][0] + ',' + pts[0][1] + ',' + pole + ':';
        for (let i = 1; i < pts.length; i++) s += enc(pts[i][0] - pts[i - 1][0]) + enc(pts[i][1] - pts[i - 1][1]);
        rings.push(s);
        if (ri === 0 && !pole) outers.push(pts.map(([x, y]) => [x / 10, y / 10]));
      });
    }
    shapeStrs.push(rings.join(' '));
    // The middle of the country and how far it reaches (degrees of arc). A country that is mostly one
    // landmass is framed by that landmass whole; an archipelago by where 90% of its land lies.
    let clat = 0, clon = 0, angR = 1;
    if (outers.length) {
      const all = outers.flat(), xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const step = Math.max(0.05, Math.min(0.5, Math.sqrt((x1 - x0) * (y1 - y0)) / 80));
      const per = outers.map((ring) => {
        const rx = ring.map((p) => p[0]), ry = ring.map((p) => p[1]), smp = [];
        const a0 = Math.min(...rx), a1 = Math.max(...rx), b0 = Math.min(...ry), b1 = Math.max(...ry);
        for (let y = b0 + step / 2; y < b1; y += step) for (let x = a0 + step / 2; x < a1; x += step) if (inRing(ring, x, y)) smp.push([y, x, Math.cos(y * D2R)]);
        if (!smp.length) smp.push([ry.reduce((s, v) => s + v, 0) / ry.length, rx.reduce((s, v) => s + v, 0) / rx.length, 1e-3]);
        return { ring, smp, w: smp.reduce((s, q) => s + q[2], 0) };
      });
      const total = per.reduce((s, q) => s + q.w, 0);
      const main = per.reduce((m, q) => (q.w > m.w ? q : m), per[0]), share = main.w / total;
      const centre = (list) => {
        let v = [0, 0, 0];
        list.forEach(([y, x, w]) => { const u = unit(y, x); v[0] += u[0] * w; v[1] += u[1] * w; v[2] += u[2] * w; });
        const len = Math.hypot(...v);
        return v.map((c) => c / len);
      };
      const v = centre(share >= 0.6 ? main.smp : per.flatMap((q) => q.smp));
      clat = Math.asin(v[2]) / D2R;
      clon = Math.atan2(v[1], v[0]) / D2R;
      const dist = (y, x) => { const u = unit(y, x); return Math.acos(Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2])) / D2R; };
      if (share >= 0.8) angR = Math.max(...main.ring.map(([x, y]) => dist(y, x)));
      else {
        const ds = per.flatMap((q) => q.smp.map(([y, x, w]) => [dist(y, x), w])).sort((p, q) => p[0] - q[0]);
        let acc = 0;
        angR = ds[ds.length - 1][0];
        for (const [d, w] of ds) { acc += w; if (acc >= total * 0.9) { angR = d + 1; break; } }
      }
    }
    if (name === 'Antarctica') { clat = -82; clon = 0; angR = 30; }
    const st = STATS[name];
    if (!st) missing.push(name);
    const row = game.lookup ? game.lookup(name) : null;
    if (row) matched++;
    // Births from the game's table where it has the country (so the planet agrees with the game).
    const b = row && row.b ? Math.round(row.b / 100) / 10 : (st || [20])[0], d = (st || [0, 8])[1];
    // [0 people (k), 1 life expectancy, 2 kids per woman, 3 income $, 4 urban %, 5 online %, 6 years
    // at school, 7 infants dying per 1000, 8 under-fives dying per 1000, 9 Gini, 10 the engine widens
    // the income spread here (1/0, see sigmaOf), 11 war 0–3, 12 murders per 100k, 13 malaria 0–1.5,
    // 14 HIV % of adults, 15 women married before 18 %, 16 life satisfaction 0–10 (-1 none),
    // 17 years women outlive men, 18 income factor (incK)]
    const wide = row && (['ssa', 'sa', 'mena'].includes(row.p) || (row.p === 'eap' && row.id !== 'CHN')) ? 1 : 0;
    const info = row ? [row.pop, row.le, row.tfr, row.ppp, row.urb, row.net, row.eys, row.im, row.u5, row.gi, wide, row.war || 0, row.hom, row.mal || 0, row.hiv, row.cm, typeof row.wh === 'number' ? row.wh : -1, row.gap, row.ik || 1] : 0;
    totalB += b; totalD += d;
    const cities = (CITIES[name] || []).map((c) => c.join(',')).join('|');
    META.push([LONG[name] || name, SHORT[name] || LONG[name] || name, b, d, +clat.toFixed(2), +clon.toFixed(2), +angR.toFixed(2), cities, poolFor(name, clat, clon), info, row ? row.id : '']);
  }
  return { META, SHAPES: shapeStrs.join(';'), CODE, POOLS, stats: { totalB: Math.round(totalB), totalD: Math.round(totalD), missing, matched } };
}

module.exports = { build };
