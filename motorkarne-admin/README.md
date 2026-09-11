# MotorKarne Admin Panel

Tek dosyalık, kurulum gerektirmeyen bir web arayüzü. Motor/araç ekleme, düzenleme, silme işlemlerini yapmanı sağlar.

## Nasıl çalıştırılır

1. Önce **motorkarne-api** projesini çalıştır (`npm start`) — bu panel o API'ye bağlanıyor.
2. `index.html` dosyasına çift tıkla (herhangi bir tarayıcıda açılır) — sunucu kurmana gerek yok.

## İlk bağlantı

1. Üstteki **"API Adresi"** kutusuna API'nin çalıştığı adresi gir: `http://localhost:3000`
2. **"API Anahtarı"** kutusuna, `motorkarne-api/.env` dosyandaki `ADMIN_API_KEY` değerini yapıştır
3. **"Bağlan & Kaydet"** butonuna bas

Bu bilgiler tarayıcının hafızasında (localStorage) saklanır, bir sonraki açılışta otomatik bağlanır.

## Kullanım

- **Motorlar** ve **Araçlar** sekmeleri arasında geçiş yapabilirsin
- Arama kutusuyla isim/marka/koda göre filtreleyebilirsin
- **"+ Yeni Motor"** / **"+ Yeni Araç"** ile ekleme yapabilirsin
- Her satırdaki **"Düzenle"** / **"Sil"** butonlarıyla mevcut kayıtları yönetebilirsin
- Motor eklerken Markalar, Artılar, Eksiler ve Kronik Sorunlar bölümlerini "+ Ekle" butonlarıyla genişletebilirsin

## Önemli notlar

- **ID alanı** benzersiz olmalı (örn. `bmw-b47-20d`) — mevcut kayıtları düzenlerken ID değiştirilemez
- Araç eklerken **"Motor ID"** alanına, o aracın kullandığı motorun `motors` tablosundaki tam ID'sini yazmalısın (yanlış/var olmayan bir ID girersen kayıt başarısız olur)
- Bu panel sadece kendi bilgisayarında, kendi kullanımın için tasarlandı — internete açık bir sunucuya koyacaksan mutlaka ek güvenlik önlemi (HTTPS, IP kısıtlaması vb.) düşün
