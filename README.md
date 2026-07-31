# MotorKarne — React Native (Expo)

Türkiye'de ikinci el veya sıfır araç almayı düşünen sürücüler için motor, şanzıman, kronik arıza riski ve işletme maliyetini tek bir güvenilir kaynaktan değerlendiren mobil uygulama.

Orijinal HTML + Tailwind CSS tasarımı, **React Native + Expo + React Navigation** mimarisine birebir çevrilmiştir. Renkler, tipografi (Sora/Manrope), risk renkleri (yeşil/sarı/kırmızı), kart yapısı ve navigasyon akışı korunmuştur.

## Kurulum

```bash
cd motorkarne
npm install
npx expo start
```

iOS simülatörü, Android emülatörü veya Expo Go uygulamasıyla açabilirsiniz.

## Teknoloji

- **Expo SDK 50** — React Native 0.73
- **React Navigation 6** — bottom-tabs + native-stack
- **react-native-svg** — ScoreRing dairesel göstergeler ve Admin Paneli sparkline grafiği
- **lucide-react-native** — Lucide ikon seti (Iconify web component yerine)
- **@react-native-async-storage/async-storage** — kalıcı yerel depolama (üyelik, favoriler, yorumlar, katalog düzenlemeleri)
- **react-native-view-shot** + **expo-sharing** — Karşılaştırma ekranındaki "Görsel Olarak Paylaş" özelliği için (bkz. aşağıdaki not)
- **StyleSheet.create** — Tailwind sınıfları birebir stil karşılıklarıyla çevrilmiştir

> **Not:** `react-native-view-shot`, `expo-sharing` ve `@react-native-async-storage/async-storage` bu geliştirme ortamında
> internet erişimi olmadığı için `npm install` ile gerçekten kurulup test edilemedi. `package.json`'a doğru sürümlerle
> eklendiler ve `src/types/*.d.ts` içinde geçici tip tanımları var — `npm install` çalıştırdıktan sonra bu geçici
> `.d.ts` dosyalarını silebilirsin, gerçek paketler kendi tiplerini getirecektir.

## Tasarım Tokenları

`src/theme/theme.ts` içinde merkezi olarak tanımlıdır:

- **Renkler:** Kömür Grafit arka plan (`#11161C`), Çelik Gri sınırlar (`#34414E`), Servis Mavisi primary (`#3B82F6`), kehribar accent (`#F4B740`), yeşil success (`#35B779`), kırmızı destructive (`#E05A5A`)
- **Fontlar:** Sora (başlıklar, skorlar, motor kodları) + Manrope (gövde metni, arıza açıklamaları)
- **Radius:** 14px

## Ekranlar

### Tab Ekranları (alt navigasyon)

| Ekran | Dosya | İçerik |
|---|---|---|
| Keşfet | `KesfetScreen.tsx` | Hero inceleme, popüler markalar, hızlı filtreler, en çok araştırılan motorlar, uyarılar |
| Markalar & Katalog | `MarkalarKatalogScreen.tsx` | Segment filtresi, popüler marka grid'i, alfabetik marka listesi |
| Karşılaştır | `KarsilastirScreen.tsx` | Yan yana motor kıyası, skor halkaları, teknik tablo, kronik risk matrisi |
| Bana Araç Bul | `BanaAracBulScreen.tsx` | 4 adımlı sihirbaz: bütçe, kilometre, kullanım, risk toleransı |
| Kaydedilenler | `KaydedilenlerScreen.tsx` | İzleme listesi, kaydedilmiş karşılaştırmalar |

### Stack Ekranları

| Ekran | Dosya |
|---|---|
| Arama Sonuçları | `AramaSonuclariScreen.tsx` |
| Motor ve Araç Detayı | `MotorVeAracDetayScreen.tsx` |
| Profil | `ProfilScreen.tsx` |
| Admin Paneli | `AdminPaneliScreen.tsx` |
| Veri Yönetimi | `VeriYonetimiScreen.tsx` |

## Navigasyon Akışı

```
Tabs (bottom)
├── Keşfet (default)
├── Markalar & Katalog
├── Karşılaştır
├── Bana Araç Bul
└── Kaydedilenler

Stack (push)
├── AramaSonuclari  ← Keşfet, Markalar, Bana Araç Bul
├── MotorVeAracDetay ← Keşfet, AramaSonuçları
├── Profil ← Keşfet
├── AdminPaneli ← Profil
└── VeriYonetimi ← Profil, AdminPaneli
```

## Görsel Varlıklar

Tüm araç ve marka görselleri orijinal Supabase Storage URL'lerinden yüklenir — ek asset gerekmez. Uygulama internet bağlantısı gerektirir.

## Çevirim Notları

| HTML / Tailwind | React Native karşılığı |
|---|---|
| `<iconify-icon icon="lucide:scan-line">` | `<ScanLine />` from lucide-react-native |
| `class="bg-card text-foreground"` | `style={{ backgroundColor: colors.card, color: colors.foreground }}` |
| `onclick="navigate('X')"` | `onPress={() => nav.navigate('X')}` |
| Tailwind grid / flex | `flexDirection`, `flex`, `gap`, `flexWrap` |
| SVG stroke-dasharray skor | `ScoreRing` bileşeni (react-native-svg) |
| `rgba()` opacity sınıfları | `rgba(colors.x, 0.15)` helper |

## Dosya Yapısı

```
motorkarne/
├── App.tsx
├── app.json
├── package.json
├── babel.config.js
├── tsconfig.json
└── src/
    ├── theme/
    │   └── theme.ts
    ├── components/
    │   └── ScoreRing.tsx
    ├── navigation/
    │   └── RootNavigator.tsx
    └── screens/
        ├── KesfetScreen.tsx
        ├── MarkalarKatalogScreen.tsx
        ├── KarsilastirScreen.tsx
        ├── BanaAracBulScreen.tsx
        ├── KaydedilenlerScreen.tsx
        ├── AramaSonuclariScreen.tsx
        ├── MotorVeAracDetayScreen.tsx
        ├── ProfilScreen.tsx
        ├── AdminPaneliScreen.tsx
        └── VeriYonetimiScreen.tsx
```

## Fontlar

Sora ve Manrope fontları sistemde bulunmazsa cihaz varsayılan fontlarına düşer. Üretimde `expo-google-fonts` paketiyle yüklenmesi önerilir:

```bash
npx expo install expo-google-fonts
```

Ardından `App.tsx` içinde `useFonts` hook'u ile yükleme yapılabilir.

## Testler

Proje `jest-expo` ve `@testing-library/react-native` ile yazılmış birim testleri içerir
(`src/**/__tests__/*.test.tsx`). Çalıştırmadan önce bağımlılıkları yükleyin:

```bash
npm install
npm test
```

Şu an kapsanan alanlar: `MembersContext` (kayıt/giriş doğrulamaları), `FavoritesContext`
(favori ekleme/kaldırma), `CatalogContext` (arama, motor ekleme/güncelleme/silme) ve
`ScoreRing` bileşeninin render edilmesi. Yeni context veya kritik iş mantığı eklerken
buraya karşılık gelen bir test dosyası eklenmesi önerilir.

## Google Play'de Yayınlamadan Önce

Aşağıdaki adımlar tamamlandı, ama yayınlamadan önce **senin de** yapman gereken birkaç şey var:

1. **Paket adını değiştir.** `app.json`'daki `com.motorkarne.app` bir yer tutucudur — Play
   Console'da benzersiz olması gerekir. Kendi paket adınla (örn. `com.seninsirketin.motorkarne`)
   değiştir; hem `ios.bundleIdentifier` hem `android.package` alanlarını güncelle.

2. **`docs/privacy-policy.html` ve `docs/delete-account.html` sayfalarını yayınla.**
   Bu dosyalar Play Console'un zorunlu tuttuğu, uygulama dışından erişilebilir web sayfalarıdır.
   En kolay yöntem GitHub Pages:
   - Bu projeyi bir GitHub reposuna yükle.
   - Repo ayarlarında **Settings → Pages** kısmından `docs/` klasörünü kaynak olarak seç.
   - Yayınlanan URL'ler şu şekilde olacak:
     `https://<kullanici-adin>.github.io/<repo-adi>/privacy-policy.html`
     `https://<kullanici-adin>.github.io/<repo-adi>/delete-account.html`
   - Bu URL'leri Play Console'da "Privacy Policy" ve "Data deletion" alanlarına gir.
   - Sayfalardaki `destek@motorkarne.app` adresini kendi gerçek destek e-postanla değiştir.

3. **Expo SDK'yı güncelle.** Proje şu an Expo SDK 50 kullanıyor; Play Store'un yıllık artan
   minimum "target API level" gereksinimini karşılamak için yayından önce güncel bir Expo
   sürümüne geçmen gerekebilir (`npx expo install expo@latest` ve ardından bağımlılıkları
   `npx expo install --fix` ile güncelle).

4. **Data Safety formunu doldur.** Play Console'da uygulamanın hangi veriyi topladığını
   (ad, e-posta, telefon) ve bunun sadece cihazda tutulup sunucuya gönderilmediğini
   belirtmen gerekiyor.

5. **Marka kullanımı uyarısı.** Uygulama; BMW, Mercedes-Benz, Volkswagen gibi gerçek marka
   isimlerini/logolarını yalnızca bilgilendirme/karşılaştırma amaçlı kullanıyor ve resmi bir
   marka temsilcisi değildir. Bunu Play Store açıklamanda da belirtmen önerilir (örn.
   "Bu uygulama herhangi bir otomobil üreticisiyle bağlantılı değildir.").

## Android Build Alma (EAS)

Proje köküne `eas.json` eklendi. Build almak için:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```

Bu komut Play Store'un istediği **.aab** (Android App Bundle) dosyasını Expo'nun bulut
sunucularında üretir ve build bitince sana bir indirme linki verir. Kendi cihazında hızlı
test etmek istersen (Play Store'a yüklemeden) `--profile preview` ile bir **.apk** de
alabilirsin.

## Mağaza Görselleri (`assets/` klasöründe hazır)

Play Console mağaza listesi için gereken görseller markanın renkleriyle (koyu arka plan +
mavi/kırmızı gösterge motifi) oluşturuldu:

| Dosya | Boyut | Kullanım yeri |
|---|---|---|
| `assets/icon.png` | 1024×1024 | Uygulama ikonu (zaten `app.json`'a bağlı) |
| `assets/feature-graphic.png` | 1024×500 | Play Store "Öne çıkan görsel" (Store listing → Graphics) |
| `assets/screenshot-template-*.png` | 1080×1920 | Ekran görüntüsü **şablonları** (4 adet: Keşfet, Karşılaştır, Motor Detayı, Profil) |

**Önemli:** Ekran görüntüsü şablonları gerçek uygulama arayüzünü göstermiyor — sadece doğru
boyut ve marka renklerinde birer yer tutucu. Play Store'a yüklemeden önce bunları **gerçek
uygulama ekran görüntüleriyle** değiştirmen gerekiyor. Bunun en kolay yolu:
1. `eas build --profile preview` ile bir APK al ve telefonuna kur, **veya** `expo start` ile
   Expo Go üzerinden çalıştır.
2. İlgili ekranlarda (Keşfet, Karşılaştır, Motor Detayı, Profil) ekran görüntüsü al.
3. Bu görüntüleri Play Console → Store listing → Ekran görüntüleri kısmına yükle
   (en az 2 tane zorunlu, telefon için önerilen oran 16:9 veya 9:16).

## Toplam Sahip Olma Maliyeti Hesaplayıcı — Fiyatları Güncel Tutma

Karşılaştırma ekranındaki "Toplam Sahip Olma Maliyeti" özelliği (yakıt + MTV + bakım tahmini),
`docs/pricing.json` dosyasından beslenir. Bu, uygulamayı Play Store'a tekrar yüklemeden
fiyatları güncelleyebilmen için tasarlandı:

1. `docs/pricing.json`'ı GitHub Pages'te yayınla (zaten `docs/privacy-policy.html` için
   anlattığımız adımların aynısı — repo Settings → Pages → kaynak olarak `docs/` klasörünü seç).
2. `src/state/PricingContext.tsx` içindeki `REMOTE_PRICING_URL` sabitini kendi yayınladığın
   gerçek URL ile değiştir (örn. `https://kullaniciadi.github.io/motorkarne/pricing.json`).
3. Fiyatları güncellemek istediğinde tek yapman gereken `docs/pricing.json`'ı düzenleyip
   GitHub'a push'lamak — uygulama bir sonraki açılışında otomatik çeker.

**Bunun otomatik olmadığını unutma:** Yakıt fiyatlarını ayda bir, MTV dilimlerini
(Ocak ayında resmi tarife değiştiğinde) yılda bir senin güncellemen gerekiyor. Uygulama
kendi kendine güncel veriyi bulamaz. İnternet yoksa veya URL çekilemezse, uygulama önce
en son başarıyla çekilen önbelleğe, o da yoksa koda gömülü varsayılan değerlere sessizce
düşer — kullanıcı hiçbir hata görmez, sadece rakamlar bir süre eskiyebilir.

Kullanıcılar ayrıca ekrandaki "Ayarlar" düğmesinden kendi bildikleri güncel fiyatı elle
girip kaydedebilir; bu durumda o kullanıcı için kişisel giriş her zaman öncelikli olur.

## Kapalı Test Sürecini Kurma (yeni bireysel hesaplar için zorunlu)



1. Play Console'da uygulamanı oluşturduktan sonra sol menüden **Test → Kapalı testler**'e git.
2. **"Yeni kapalı test oluştur"** → bir isim ver (örn. "İlk Test").
3. **Build'ler** sekmesinden `eas build --profile production` ile aldığın `.aab` dosyasını yükle.
4. **Testerlar** sekmesinde bir e-posta listesi oluştur — **en az 12 kişinin** Gmail/Google
   hesabı e-postasını gir.
5. Kaydet → **Teste gönder**.
6. Play Console'un verdiği **davet linkini** testerlara paylaş; her biri linke tıklayıp
   "test kullanıcısı ol"u onaylamalı ve uygulamayı Play Store üzerinden indirip **en az bir
   kez açmalı**.
7. Bu 12 kişi **kesintisiz 14 gün** boyunca test aşamasında görünmeli (indirip açmaları
   yeterli; sürekli kullanmaları şart değil ama kaldırmamaları önerilir).
8. 14 gün sonra Play Console otomatik olarak "Production'a geçiş için uygunsunuz" bildirimi
   gösterir. **Production** sekmesinden aynı (veya güncellenmiş) build'i seçip yayına
   gönderebilirsin. Google'ın son incelemesi genelde birkaç gün sürer.


