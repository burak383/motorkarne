import type { Vehicle } from '../data/catalog';

const TR_CHAR_MAP: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
};

function slugify(text: string): string {
  const replaced = text
    .split('')
    .map((ch) => TR_CHAR_MAP[ch] ?? ch)
    .join('');
  return replaced
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Motor kod/trim bilgisini (1.5, TSI, (120) gibi) atıp sadece marka + temel model
// adını çıkarmaya çalışır (örn. "Fiat Egea 1.0 Firefly" -> "Fiat Egea").
function extractBaseModelName(vehicle: Vehicle): string {
  const withoutParens = vehicle.name.replace(/\([^)]*\)/g, '').trim();
  const words = withoutParens.split(/\s+/);
  const cutIndex = words.findIndex((w) => /\d/.test(w));
  const kept = cutIndex === -1 ? words : words.slice(0, cutIndex);
  return kept.length > 0 ? kept.join(' ') : vehicle.brand;
}

// arabam.com'un doğrulanmış URL yapısı: /ikinci-el/{kategori}/{marka}-{model}
// Kategori, aracın gövde tipine (desc alanı) göre değişiyor.
function getArabamCategory(vehicle: Vehicle): string {
  const desc = vehicle.desc.toLowerCase();
  if (desc.includes('ticari') || desc.includes('van') || desc.includes('minivan')) {
    return 'minivan-van_panelvan';
  }
  if (desc.includes('suv') || desc.includes('crossover') || desc.includes('off-road') || desc.includes('arazi')) {
    return 'arazi-suv-pick-up';
  }
  return 'otomobil';
}

export interface ListingSearchUrls {
  arabam: string;
  sahibinden: string;
}

export function buildListingSearchUrls(vehicle: Vehicle): ListingSearchUrls {
  const baseModel = extractBaseModelName(vehicle);
  const slug = slugify(baseModel);
  const category = getArabamCategory(vehicle);

  return {
    arabam: `https://www.arabam.com/ikinci-el/${category}/${slug}`,
    // Not: sahibinden.com bot tespiti nedeniyle bu tam formatı canlı olarak
    // doğrulayamadık; genel bilinen arama şemasını kullanıyoruz.
    sahibinden: `https://www.sahibinden.com/otomobil?query_text=${encodeURIComponent(baseModel)}`,
  };
}
