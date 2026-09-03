// src/utils/listingParser.ts
//
// arabam.com / sahibinden.com gibi ilan sitelerinden yapıştırılan link veya
// ilan metnini ayrıştırıp (fiyat, km, yıl, yakıt, vites, marka, motor ipucu)
// katalogdaki motorlarla eşleştirmeye çalışan yardımcı fonksiyonlar.
//
// ÖNEMLİ: sahibinden.com gibi siteler bot koruması kullandığı için bu dosyadaki
// fetchListingText() fonksiyonu her zaman başarılı olacağının garantisi yoktur
// (test edildiğinde HTTP 403 döndürüyor). arabam.com genelde doğrudan linkten
// çekilebiliyor. Hangi site olursa olsun, ekran otomatik çekim başarısız
// olursa kullanıcının ilan metnini manuel olarak yapıştırabileceği bir yola
// her zaman izin verir.

export interface ParsedListingInfo {
  title?: string;
  price?: string;
  km?: string;
  year?: string;
  fuel?: string;
  transmission?: string;
  brand?: string;
  engineHint?: string;
  model?: string;
}

const KNOWN_BRANDS = [
  'Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Bentley', 'Cadillac', 'Chery', 'Chevrolet',
  'Citroën', 'Citroen', 'Cupra', 'DS', 'Dacia', 'Daihatsu', 'Dodge', 'Fiat', 'Ford',
  'GMC', 'Haval', 'Honda', 'Hummer', 'Hyundai', 'Jaecoo', 'Jaguar', 'Jeep', 'KGM',
  'Kia', 'Lada', 'Land Rover', 'Lexus', 'MG', 'Maserati', 'Mazda', 'Mercedes-Benz',
  'Mercedes', 'Mini', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 'Renault',
  'Rolls-Royce', 'Seat', 'Skywell', 'SsangYong', 'Subaru', 'Suzuki', 'TOGG', 'Tesla',
  'Tofaş', 'Toyota', 'Volkswagen', 'VW', 'Volvo', 'Škoda', 'Skoda',
];

// Motor kod/aile isimlerini doğrudan yakalayan genel bir desen; katalogdaki
// `code`/`name` alanlarıyla büyük ölçüde örtüşüyor (örn. "1.6 TDI", "2.0 dCi").
const ENGINE_TOKEN_RE =
  /(\d\.\d)\s?(TSI|TDCi|TDI|TFSI|TCe|dCi|HDi|CRDi|CDI|CDTI|MultiJet|Multijet|VTEC|VTi|THP|EcoBoost|EcoBlue|SkyActiv|Skyactiv|Boosterjet|D-4D|MIVEC|D4D|CVVT|Valvematic|GDI|MPI|VVT)/i;

// Eski tip BMW model rozetleri (320i, 520d, 318d gibi) — üçüncü/beşinci basamak
// serisini, ortadaki iki hane ise geleneksel adlandırmada motor hacmini (x10)
// temsil eder. Bu, 2016 sonrası "20i/30i" gibi hacimden bağımsız adlandırmalarda
// tam isabetli olmayabilir; bu yüzden sonuç bir "ipucu" olarak kullanılıyor.
const BMW_BADGE_RE = /\b([1-8])(\d{2})([a-z]{1,2})\b/i;

// Not: Aşağıdaki extractXxx() fonksiyonlarının tümü aynı hataya açıktı — `text.match()`
// metnin tamamında SIRAYLA ilk eşleşeni döndürür. İlan sayfalarında "benzer ilanlar",
// "önerilen ilanlar" veya reklam bölümlerinde BAŞKA araçların fiyatı/km'si/yılı/motoru
// da geçebiliyor; bu bölümler asıl ilan detaylarından önce (sayfanın üstünde/yanında)
// yer alırsa yanlış değer yakalanabiliyor. Bunu önlemek için her alan önce METNİN
// BAŞI (title/özet alanı) içinde aranıyor, orada bulunamazsa gövdenin tamamına
// düşülüyor — böylece asıl ilana ait olma ihtimali en yüksek eşleşme önceliklendiriliyor.
function matchTitleFirst(text: string, titleWindow: string, re: RegExp): RegExpMatchArray | undefined {
  return titleWindow.match(re) ?? text.match(re) ?? undefined;
}

function extractPrice(text: string, titleWindow: string): string | undefined {
  const m = matchTitleFirst(text, titleWindow, /(\d{1,3}(?:[.,]\d{3})+)\s*(?:TL|₺)/i);
  return m ? `${m[1]} TL` : undefined;
}

function extractKm(text: string, titleWindow: string): string | undefined {
  const labeled = matchTitleFirst(text, titleWindow, /Kilometre\s*[:\-]?\s*([\d.,]+)/i);
  if (labeled) return `${labeled[1]} km`;
  const generic = matchTitleFirst(text, titleWindow, /(\d{1,3}(?:[.,]\d{3})*)\s*km\b/i);
  return generic ? `${generic[1]} km` : undefined;
}

function extractYear(text: string, titleWindow: string): string | undefined {
  const labeled = matchTitleFirst(text, titleWindow, /(?:Yıl|Model Yılı)\s*[:\-]?\s*((?:19|20)\d{2})/i);
  if (labeled) return labeled[1];
  const generic = matchTitleFirst(text, titleWindow, /\b(19[89]\d|20[0-2]\d)\b/);
  return generic ? generic[1] : undefined;
}

function extractFuel(text: string, titleWindow: string): string | undefined {
  const m = matchTitleFirst(text, titleWindow, /\b(Benzin|Dizel|LPG|Elektrik|Hibrit|Hybrid)\b/i);
  return m ? m[1] : undefined;
}

function extractTransmission(text: string, titleWindow: string): string | undefined {
  const m = matchTitleFirst(text, titleWindow, /\b(Otomatik|Manuel|Yarı Otomatik|Düz)\b/i);
  return m ? m[1] : undefined;
}

function normalizeBrand(brand: string): string {
  // Kısaltmaları/varyantları katalogdaki kanonik isimlere normalize et.
  if (brand === 'VW') return 'Volkswagen';
  if (brand === 'Mercedes') return 'Mercedes-Benz';
  if (brand === 'Citroen') return 'Citroën';
  if (brand === 'Skoda') return 'Škoda';
  return brand;
}

// Not: KNOWN_BRANDS listesindeki sıraya göre "ilk eşleşeni" döndürmek hataya
// açık — ilan sayfalarında "benzer ilanlar" / reklam gibi bölümlerde başka
// markaların isimleri de geçebiliyor (ör. bir BMW ilanında "Audi" kelimesi
// önerilen ilanlar arasında geçebilir). Bu yüzden markayı, listedeki sıraya
// göre değil, METİNDE İLK GEÇTİĞİ konuma göre seçiyoruz — ayrıca başlık
// (metnin ilk ~200 karakteri) her zaman gövde metninden önceliklidir, çünkü
// başlık ilanın gerçek markasını en güvenilir şekilde yansıtır.
function findEarliestBrand(haystack: string): string | undefined {
  const lower = haystack.toLowerCase();
  let bestBrand: string | undefined;
  let bestIndex = Infinity;
  for (const brand of KNOWN_BRANDS) {
    const idx = lower.indexOf(brand.toLowerCase());
    if (idx !== -1 && idx < bestIndex) {
      bestIndex = idx;
      bestBrand = brand;
    }
  }
  return bestBrand;
}

function extractBrand(text: string): string | undefined {
  const titleWindow = text.slice(0, 200);
  const titleBrand = findEarliestBrand(titleWindow);
  if (titleBrand) return normalizeBrand(titleBrand);

  const bodyBrand = findEarliestBrand(text);
  if (bodyBrand) return normalizeBrand(bodyBrand);

  return undefined;
}

// İlan başlıklarında marka isminden hemen sonra genelde model adı gelir (ör.
// "Ford Focus 1.5 TDCi...", "BMW Sahibinden Pazarlıksız 320i..."). Ama araya
// sahibinden.com/arabam.com tarzı sitelerin sıkça kullandığı pazarlama
// kelimeleri de girebiliyor ("Sahibinden", "Pazarlıksız", "Galeriden" vb.) —
// bunları atlamadan model adını yakalamak mümkün değil, bu yüzden bir
// "durak kelime" listesiyle filtreliyoruz.
const MODEL_STOPWORDS = new Set([
  'sahibinden', 'pazarlıksız', 'pazarlikli', 'pazarlıklı', 'galeriden', 'ikinci', 'el',
  'sıfır', 'sifir', 'km', 'garantili', 'değişensiz', 'degisensiz', 'boyasız', 'boyasiz',
  'hatasız', 'hatasiz', 'temiz', 'bakımlı', 'bakimli', 'çok', 'cok', 'satılık', 'satilik',
  'acil', 'komple', 'orjinal', 'orijinal', 'faturalı', 'faturali', 'yetkili', 'servis',
  'bayii', 'bayi', 'fiyat', 'opsiyonlu', 'dolu', 'vip', 'ful', 'full', 'yeni', 'model',
]);

function isDecimalNumber(word: string): boolean {
  return /^\d+([.,]\d+)?$/.test(word);
}

function hasDigit(word: string): boolean {
  return /\d/.test(word);
}

// "TDI", "HDI", "TDCi" gibi kısa, tamamı büyük harf motor kod kısaltmalarını
// model adı sanıp ikinci kelime olarak eklemeyi önlemek için kaba bir kontrol.
function looksLikeEngineCode(word: string): boolean {
  return /^[A-ZÇĞİÖŞÜ]{2,6}$/.test(word);
}

function extractModel(titleWindow: string, brand: string | undefined): string | undefined {
  if (!brand) return undefined;
  const idx = titleWindow.toLowerCase().indexOf(brand.toLowerCase());
  if (idx === -1) return undefined;

  const after = titleWindow.slice(idx + brand.length);
  const words = after.trim().split(/\s+/).filter(Boolean);

  let firstWord: string | undefined;
  let restIdx = 0;
  for (let i = 0; i < words.length; i++) {
    const clean = words[i].replace(/[.,;:!?'"()]/g, '');
    if (!clean) continue;
    const lower = clean.toLocaleLowerCase('tr');
    if (MODEL_STOPWORDS.has(lower)) continue;
    // Salt hacim ipucu ("1.5", "2.0") model adı değildir, atla.
    if (isDecimalNumber(clean)) continue;
    firstWord = clean;
    restIdx = i + 1;
    break;
  }
  if (!firstWord) return undefined;

  // İlk kelime rakam içeriyorsa (ör. BMW rozeti "320i", Peugeot "308" gibi),
  // bu zaten tek başına yeterince özgün bir model ipucu — ikinci kelimeye bakma.
  if (hasDigit(firstWord)) return firstWord;

  // İlk kelime salt alfabetikse (ör. "Focus", "Corolla"), ikinci kelimenin de
  // (varsa) model adının bir parçası olup olmadığına bak — "Land Cruiser",
  // "Grand Cherokee" gibi çok kelimeli modelleri yakalamak için. Ama rakam
  // içeren veya motor kodu gibi görünen kelimeleri (TDI, HDI, TDCi...) dahil etme.
  for (let i = restIdx; i < words.length; i++) {
    const clean = words[i].replace(/[.,;:!?'"()]/g, '');
    if (!clean) break;
    const lower = clean.toLocaleLowerCase('tr');
    if (MODEL_STOPWORDS.has(lower)) break;
    if (hasDigit(clean) || looksLikeEngineCode(clean)) break;
    return `${firstWord} ${clean}`;
  }

  return firstWord;
}

function extractEngineHint(text: string, titleWindow: string, brand: string | undefined, fuel: string | undefined): string | undefined {
  const direct = matchTitleFirst(text, titleWindow, ENGINE_TOKEN_RE);
  if (direct) return direct[0];

  if (brand === 'BMW') {
    // BMW rozeti de aynı şekilde önce başlıkta aranmalı — gövdede "benzer
    // ilanlar" arasında başka bir BMW model rozeti geçerse yanlış hacim/motor
    // ipucu üretilmemesi için.
    const badge = matchTitleFirst(text, titleWindow, BMW_BADGE_RE);
    if (badge) {
      const displacement = (parseInt(badge[2], 10) / 10).toFixed(1);
      const isDiesel = /d$/i.test(badge[3]) || fuel?.toLowerCase() === 'dizel';
      // ÖNEMLİ: rozetin kendisini (ör. "320i") de ipucuna dahil et. Katalogdaki
      // birçok BMW motoru isminde tam olarak bu rozeti listeliyor (ör. "316i /
      // 318i / 320i"), bu da hangi nesil motorun kullanıldığını en isabetli
      // şekilde ayırt eden bilgi. Sadece "2.0 Benzin" gibi genel bir hacim/yakıt
      // ipucuna indirgemek, aynı hacme sahip farklı nesil motorlar (ör. eski
      // N43 ile güncel B48) arasında ayrım yapılamamasına ve yanlış (ama
      // katalogda daha yüksek güvenilirlik puanlı) bir motorun öne çıkmasına
      // yol açıyordu.
      return `${badge[0]} ${displacement} ${isDiesel ? 'Dizel' : 'Benzin'}`;
    }
  }

  // Genel "1.6", "2.0" gibi yalın hacim ipuçları.
  const bareDisplacement = matchTitleFirst(text, titleWindow, /\b([01]\.\d)\b/);
  if (bareDisplacement) return bareDisplacement[1];

  return undefined;
}

export function parseListingText(rawText: string): ParsedListingInfo {
  const text = rawText.replace(/\s+/g, ' ').trim();
  // Başlık/özet penceresi — ilana ait bilgilerin en güvenilir şekilde bulunduğu yer.
  // Tüm alanlar önce burada aranır, ancak buradan sonrasındaki "benzer ilanlar" gibi
  // ilgisiz bölümlerden yanlış eşleşme almamak için bu pencere aşırı geniş tutulmuyor.
  const titleWindow = text.slice(0, 200);
  const brand = extractBrand(text);
  const fuel = extractFuel(text, titleWindow);

  return {
    title: text.slice(0, 120) || undefined,
    price: extractPrice(text, titleWindow),
    km: extractKm(text, titleWindow),
    year: extractYear(text, titleWindow),
    fuel,
    transmission: extractTransmission(text, titleWindow),
    brand,
    engineHint: extractEngineHint(text, titleWindow, brand, fuel),
    model: extractModel(titleWindow, brand),
  };
}

// HTML'den kaba bir metin çıkarımı (React Native'de DOMParser yok). Script/style
// bloklarını atar, etiketleri boşluğa çevirir, HTML entity'lerinin en yaygınlarını
// çözer. Kusursuz değildir ama başlık/fiyat/km gibi kısa alanları yakalamak için
// yeterlidir.
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function looksLikeUrl(input: string): boolean {
  return /^https?:\/\//i.test(input.trim());
}

export interface FetchListingResult {
  success: boolean;
  text?: string;
  error?: string;
}

const FETCH_TIMEOUT_MS = 8000;

// Doğrudan linkten çekmeyi dener. sahibinden.com gibi siteler bot korumasıyla
// isteği reddedebilir (403 vb.) — bu durumda success:false döner ve ekran
// kullanıcıdan ilan metnini yapıştırmasını ister.
export async function fetchListingText(url: string): Promise<FetchListingResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html',
      },
    });

    if (!res.ok) {
      return { success: false, error: `Site erişimi reddetti (HTTP ${res.status}).` };
    }

    const html = await res.text();
    const text = stripHtmlToText(html);
    if (!text || text.length < 40) {
      return { success: false, error: 'Sayfa içeriği okunamadı.' };
    }
    return { success: true, text };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, error: 'İstek zaman aşımına uğradı.' };
    }
    return { success: false, error: 'Bu siteye otomatik erişim engellenmiş olabilir.' };
  } finally {
    clearTimeout(timeout);
  }
}
