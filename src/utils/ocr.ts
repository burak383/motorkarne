// Motor kodu OCR (Optik Karakter Tanıma) için Google Cloud Vision API kullanılıyor.
//
// NEDEN BÖYLE: Expo'nun standart (managed) yapısında cihaz üzerinde gerçek bir OCR
// motoru YOK — bu ya native bir modül (ki bu da EAS Build ile özel bir "dev client"
// gerektirir, Expo Go'da çalışmaz) ya da bulut tabanlı bir OCR servisi gerektirir.
// En pratik ve güvenilir yol olarak bulut servisini seçtik.
//
// GÜVENLİK NOTU — ÖNEMLİ: Bu anahtar artık kodda SABİT DEĞİL, `EXPO_PUBLIC_GOOGLE_VISION_API_KEY`
// ortam değişkeninden okunuyor (bkz. .env.example). Bunun sebebi anahtarı git geçmişinden
// çıkarmak ve build'ler arasında (dev/preview/prod) farklı anahtar kullanılabilmesini
// sağlamak. AMA dikkat: `EXPO_PUBLIC_` ile başlayan değişkenler yine de derlenen JS paketine
// gömülür — yani anahtar telefon üzerindeki APK/IPA içinde okunabilir durumda olmaya devam
// eder (client-side bir uygulamada bu kaçınılmaz). Anahtarı gerçekten korumak için MUTLAKA:
//   1) Google Cloud Console'da bu anahtarı "Application restrictions" ile Android paket adı
//      (com.buraktufekci.motorkarne) + imzalama SHA-1'i (ve varsa iOS bundle ID) ile kısıtla,
//      ayrıca "API restrictions" ile sadece Cloud Vision API'ye izin ver.
//   2) Daha sağlamı: bu isteği doğrudan Google'a değil, kendi Railway backend'ine
//      (bkz. src/config/api.ts) at; anahtarı yalnızca backend'de sakla, istemciye hiç gitmesin.
//
// KURULUM: .env dosyanıza EXPO_PUBLIC_GOOGLE_VISION_API_KEY=... satırını ekleyin
// (bkz. .env.example). Anahtar yoksa özellik devre dışı kalır ve kullanıcıya bunu
// açıkça söyleriz (sessizce başarısız olmaz).
//
// Anahtar almak için: https://cloud.google.com/vision/docs/setup
// Not: Bu bir ücretli/kullanım bazlı Google servisidir — kendi faturalandırma
// hesabınızı bağlamanız gerekir. Aylık belirli bir kullanım ücretsizdir.
const GOOGLE_VISION_API_KEY: string = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY ?? '';

export function isOcrConfigured(): boolean {
  return GOOGLE_VISION_API_KEY.length > 0 && GOOGLE_VISION_API_KEY !== 'REPLACE_ME';
}

export interface OcrResult {
  success: boolean;
  text?: string;
  error?: string;
}

// base64 kodlu bir görsel içinde metin tanır ve en olası motor kodu adayını döndürür.
export async function recognizeTextFromImage(base64Image: string): Promise<OcrResult> {
  if (!isOcrConfigured()) {
    return {
      success: false,
      error: 'OCR özelliği henüz yapılandırılmadı. Bunun için bir Google Cloud Vision API anahtarı gerekiyor.',
    };
  }

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Görsel işlenirken bir sorun oluştu.' };
    }

    const data = await response.json();
    const detectedText: string | undefined = data?.responses?.[0]?.fullTextAnnotation?.text;

    if (!detectedText) {
      return { success: false, error: 'Görselde okunabilir bir metin bulunamadı. Daha net bir fotoğraf deneyin.' };
    }

    // Motor kodları genelde büyük harf + rakam karışımı, boşluksuz kısa dizilerdir
    // (örn. "EA288", "B48", "K9K"). En olası adayı seçmeye çalışıyoruz.
    const candidates = detectedText
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => /^[A-Z0-9]{2,10}$/.test(w));

    const bestGuess = candidates.length > 0 ? candidates[0] : detectedText.split('\n')[0];

    return { success: true, text: bestGuess };
  } catch (e) {
    return { success: false, error: 'Görsel gönderilirken bir ağ hatası oluştu.' };
  }
}
