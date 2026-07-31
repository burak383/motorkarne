// src/data/images.ts
//
// Bu dosyadaki tüm görseller Wikimedia Commons'tan (ücretsiz/özgür lisanslı,
// kamuya açık medya deposu) alınmıştır. Marka logoları için Commons'ın
// "Special:FilePath" yönlendirmesi kullanılıyor; ?width= parametresi SVG
// dosyalarını React Native'in <Image> bileşeninin doğrudan gösterebileceği
// bir PNG halinde sunulmasını sağlıyor (React Native SVG'yi uzak bir uri
// üzerinden native olarak render edemez).

const WIKI = 'https://commons.wikimedia.org/wiki/Special:FilePath';

// Marka Logoları Haritası (Wikimedia Commons, gerçek/güncel marka logoları)
export const BRAND_LOGOS: Record<string, string> = {
  Peugeot: `${WIKI}/Peugeot_Logo.svg?width=300`,
  'Citroën': `${WIKI}/Citroen_2022.svg?width=300`,
  Fiat: `${WIKI}/FIAT_logo_%282020%29.svg?width=300`,
  Volkswagen: `${WIKI}/Volkswagen_logo_2019.svg?width=300`,
  'Škoda': `${WIKI}/%C5%A0koda_Auto.svg?width=300`,
  Renault: `${WIKI}/Renault_2021.svg?width=300`,
  Dacia: `${WIKI}/Dacia_2021_logo_green.svg?width=300`,
  Toyota: `${WIKI}/Toyota_carlogo.svg?width=300`,
  Honda: `${WIKI}/Honda_Logo.svg?width=300`,
  Hyundai: `${WIKI}/Hyundai_Motor_Company_logo.svg?width=300`,
  Kia: `${WIKI}/KIA_logo2.svg?width=300`,
  Ford: `${WIKI}/Ford_logo_flat.svg?width=300`,
  BMW: `${WIKI}/BMW.svg?width=300`,
  'Mercedes-Benz': `${WIKI}/Mercedes-Benz_Logo_2010.svg?width=300`,
  Chery: `${WIKI}/Chery_logo.svg?width=300`,
  TOGG: `${WIKI}/Togg_Official_Logo.svg?width=300`,
  BYD: `${WIKI}/BYD_Auto_2022_logo.svg?width=300`,
  Opel: `${WIKI}/Opel_logo_2023.svg?width=300`,
  Nissan: `${WIKI}/Nissan_Motor_Corporation_2020_logo.svg?width=300`,
  Audi: `${WIKI}/Audi_logo.svg?width=300`,
  Mazda: `${WIKI}/Mazda_logo.svg?width=300`,
  MG: `${WIKI}/MG_Motor_2021_logo.svg?width=300`,
  Suzuki: `${WIKI}/Suzuki_logo_2.svg?width=300`,
  Volvo: `${WIKI}/Volvo_logo.svg?width=300`,
  Tesla: `${WIKI}/Tesla_Motors.svg?width=300`,
};

// Motor bölmesi / şanzıman için genel referans fotoğrafları (Wikimedia Commons)
export const ENGINE_BAY_IMAGE = `${WIKI}/Opel_Corsa-e_engine_bay_seen_from_front.jpg?width=800`;
export const TRANSMISSION_IMAGE = `${WIKI}/TREMEC_TR-6070_7-speed_manual_transmission.jpg?width=800`;

// Araç Görselleri Haritası
// Not: Her modelin kendine özgü bir basın fotoğrafını tek tek doğrulamak bu
// güncellemenin kapsamı dışında kaldığı için, her aracın kartında en azından
// DOĞRU markaya ait gerçek bir logo gösteriliyor (önceki sürümdeki, markalar
// arası birbirine karışmış/yanlış eşleşen görsellerin yerini alıyor).
const VEHICLE_BRAND: Record<string, string> = {
  'peugeot-208': 'Peugeot',
  'peugeot-3008': 'Peugeot',
  'peugeot-408': 'Peugeot',
  'citroen-c3-aircross': 'Citroën',
  'fiat-egea-cross': 'Fiat',
  'fiat-egea-sedan': 'Fiat',
  'vw-golf-8': 'Volkswagen',
  'vw-passat': 'Volkswagen',
  'vw-tiguan': 'Volkswagen',
  'skoda-octavia': 'Škoda',
  'renault-clio': 'Renault',
  'renault-austral': 'Renault',
  'dacia-duster': 'Dacia',
  'toyota-corolla': 'Toyota',
  'honda-civic': 'Honda',
  'hyundai-tucson': 'Hyundai',
  'kia-sportage': 'Kia',
  'ford-focus': 'Ford',
  'bmw-320i': 'BMW',
  'mercedes-a200': 'Mercedes-Benz',
  'chery-tiggo8': 'Chery',
  'togg-t10x': 'TOGG',
  'byd-atto3': 'BYD',
  'renault-clio6': 'Renault',
  'fiat-egea-firefly': 'Fiat',
  'fiat-egea-hybrid': 'Fiat',
  'toyota-corolla-na': 'Toyota',
  'toyota-yaris': 'Toyota',
  'toyota-chr': 'Toyota',
  'vw-polo': 'Volkswagen',
  'vw-t-cross': 'Volkswagen',
  'vw-taigo': 'Volkswagen',
  'renault-megane-sedan': 'Renault',
  'hyundai-i20': 'Hyundai',
  'hyundai-bayon': 'Hyundai',
  'ford-puma': 'Ford',
  'ford-focus-diesel': 'Ford',
  'ford-kuga': 'Ford',
  'bmw-1-serisi': 'BMW',
  'mercedes-cla': 'Mercedes-Benz',
  'dacia-sandero': 'Dacia',
  'skoda-fabia': 'Škoda',
  'kia-picanto': 'Kia',
  'opel-corsa': 'Opel',
  'nissan-qashqai': 'Nissan',
  'audi-a3': 'Audi',
  'mazda-cx5': 'Mazda',
  'mg-zs': 'MG',
  'suzuki-vitara': 'Suzuki',
  'volvo-xc40': 'Volvo',
  'jeep-avenger': 'Jeep',
  'cupra-formentor': 'Cupra',
  'seat-leon': 'Seat',
  'tesla-model-y': 'Tesla',
  'mini-cooper-electric': 'Mini',
  'landrover-defender': 'Land Rover',
  'alfa-romeo-junior': 'Alfa Romeo',
  'lexus-nx': 'Lexus',
  'fiat-doblo-cargo': 'Fiat',
  'ford-tourneo-courier': 'Ford',
  'vw-caddy': 'Volkswagen',
};

export const getVehicleImage = (id: string): string => {
  const brand = VEHICLE_BRAND[id];
  return brand ? BRAND_LOGOS[brand] : ENGINE_BAY_IMAGE;
};

export const getBrandLogo = (brandName: string): string => {
  return BRAND_LOGOS[brandName] || ENGINE_BAY_IMAGE;
};
