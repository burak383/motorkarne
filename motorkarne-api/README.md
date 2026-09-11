# MotorKarne API

TiDB Serverless'e bağlanan, motor/araç verisini ve kullanıcı üyeliklerini yöneten REST API.

## Kurulum

```bash
npm install
npm start
```

Başarılıysa terminalde şunu görürsün:
```
MotorKarne API http://localhost:3000 üzerinde çalışıyor
Sağlık kontrolü: http://localhost:3000/health
```

Tarayıcıda `http://localhost:3000/health` adresine gidip `motor_count: 136`, `vehicle_count: 192` görüyorsan her şey doğru bağlanmış demektir.

## Endpoint'ler

### Motorlar
| Metod | Yol | Açıklama | Yetki gerekli mi? |
|---|---|---|---|
| GET | `/api/motors` | Tüm motorları listeler | Hayır |
| GET | `/api/motors/:id` | Tek motor getirir | Hayır |
| POST | `/api/motors` | Yeni motor ekler | **Evet (x-api-key)** |
| PUT | `/api/motors/:id` | Motoru günceller | **Evet (x-api-key)** |
| DELETE | `/api/motors/:id` | Motoru siler | **Evet (x-api-key)** |

### Araçlar
| Metod | Yol | Açıklama | Yetki gerekli mi? |
|---|---|---|---|
| GET | `/api/vehicles` | Tüm araçları listeler (`?brand=Toyota` ile filtrelenebilir) | Hayır |
| GET | `/api/vehicles/:id` | Tek araç getirir | Hayır |
| POST | `/api/vehicles` | Yeni araç ekler | **Evet (x-api-key)** |
| PUT | `/api/vehicles/:id` | Aracı günceller | **Evet (x-api-key)** |
| DELETE | `/api/vehicles/:id` | Aracı siler | **Evet (x-api-key)** |

### Üyelik / Kimlik Doğrulama (mobil uygulama kullanıyor)
| Metod | Yol | Açıklama | Yetki gerekli mi? |
|---|---|---|---|
| POST | `/api/auth/register` | E-posta/şifre ile yeni üyelik oluşturur | Hayır |
| POST | `/api/auth/login` | E-posta/şifre ile giriş yapar | Hayır |
| POST | `/api/auth/social-login` | Google ile giriş yapar (yoksa hesap oluşturur) | Hayır |
| GET | `/api/auth/check-email` | Bir e-postanın kayıtlı olup olmadığını döner (`?email=...`) | Hayır |
| PUT | `/api/auth/reset-password` | E-posta + yeni şifre ile şifreyi sıfırlar* | Hayır |
| GET | `/api/auth/me` | Giriş yapmış kullanıcının profilini döner | **Evet (Bearer token)** |
| PUT | `/api/auth/me` | Ad/e-posta/telefon günceller | **Evet (Bearer token)** |
| PUT | `/api/auth/me/password` | Mevcut şifreyle doğrulayıp yeni şifre belirler | **Evet (Bearer token)** |
| DELETE | `/api/auth/me` | Hesabı kalıcı olarak siler | **Evet (Bearer token)** |

\* `reset-password` gerçek bir e-posta doğrulaması yapmaz (kod/link göndermez) — bu, uygulamanın önceki cihaz-yerel sürümündeki davranışın aynısı, bilinen bir sınırlama. Gerçek bir doğrulama için ileride bir e-posta gönderme servisi eklenmesi gerekir.

## Yetkilendirme

**Katalog yazma işlemleri** (motor/araç POST/PUT/DELETE) için isteğe şu başlığı (header) eklemen gerekir:

```
x-api-key: .env dosyandaki ADMIN_API_KEY değeri
```

**Üyelik uç noktaları** (`/api/auth/me` altındakiler) için ise `register`/`login`/`social-login` yanıtında dönen `token` değeri, sonraki isteklerde şu şekilde gönderilmeli:

```
Authorization: Bearer <token>
```

Bu iki mekanizma birbirinden bağımsızdır: `x-api-key` tek bir paylaşılan admin anahtarıyken, üyelik token'ı her kullanıcıya özeldir ve 30 gün geçerlidir.

## Kurulum: yeni `members` tablosu ve `JWT_SECRET`

Üyelik özelliğini eklerken TiDB'ye yeni bir tablo eklemen ve yeni bir ortam değişkeni tanımlaman gerekiyor:

1. TiDB Cloud SQL Editor'de `sql/add-members-table.sql` dosyasındaki komutu çalıştır.
2. `.env` dosyana (ve Railway'deki Variables bölümüne) rastgele, uzun bir `JWT_SECRET` değeri ekle:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   çıktısını `JWT_SECRET=` satırına yapıştır.
3. `npm install` çalıştırarak yeni bağımlılıkları (`bcryptjs`, `jsonwebtoken`) kur.

## Güvenlik önlemleri

- **Şifreler asla düz metin tutulmaz**: bcrypt ile hash'lenir (10 round).
- **Oturum token'ları (JWT)** 30 gün geçerli; `JWT_SECRET` sızarsa tüm oturumlar taklit edilebilir hale gelir — bu değeri asla koda veya repoya yazma.
- **Rate limiting**: Genel trafik dakikada 100 istek/IP ile sınırlı; yazma işlemleri (POST/PUT/DELETE, `/api/auth/*` dahil) dakikada 20 istek/IP ile daha sıkı sınırlı — bu, kaba kuvvet (brute-force) şifre denemelerini de yavaşlatır.
- **Denetim günlüğü**: Katalog (motor/araç) üzerindeki her ekleme/güncelleme/silme işlemi `audit_log` tablosuna kaydediliyor. Üyelik işlemleri bilerek bu günlüğe yazılmıyor (şifre hash'i gibi hassas veriler denetim kaydına karışmasın diye).
- **CORS bilinçli olarak açık**: GET endpoint'leri (katalog) herkese açık, hassas olmayan referans verisi döndürüyor. Tüm yazma endpoint'leri ve üyelik uç noktaları kimlik doğrulamayla korunuyor.

## Örnek istekler

**Yeni motor ekleme:**
```bash
curl -X POST http://localhost:3000/api/motors \
  -H "Content-Type: application/json" \
  -H "x-api-key: BURAYA_ADMIN_API_KEY" \
  -d '{
    "id": "test-motor-1",
    "name": "Test Motoru 1.0",
    "riskLevel": "medium",
    "score": 7.5,
    "brands": ["Test Marka"],
    "pros": ["Örnek artı"],
    "cons": ["Örnek eksi"],
    "chronic": []
  }'
```

**Motor listeleme:**
```bash
curl http://localhost:3000/api/motors
```

**Motor silme:**
```bash
curl -X DELETE http://localhost:3000/api/motors/test-motor-1 \
  -H "x-api-key: BURAYA_ADMIN_API_KEY"
```

**Yeni üyelik oluşturma:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Test Kullanıcı", "email": "test@example.com", "password": "sifre123"}'
```

**Giriş yapma:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "sifre123"}'
```

**Profil görüntüleme (token ile):**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer BURAYA_TOKEN"
```
