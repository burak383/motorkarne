// Hiçbir konum/harita verisi saklamıyoruz — kullanıcıyı Google Haritalar'ın
// kendi canlı arama sonucuna yönlendiriyoruz. Konum izni tamamen Google
// Haritalar tarafında, kendi GPS iznine bağlı olarak yönetiliyor.

export function buildNearbyServiceUrl(brand: string, extra?: string): string {
  const query = extra ? `${brand} ${extra}` : `${brand} yetkili servis`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Belirli bir kronik arıza başlığına göre daha spesifik bir usta/servis araması
// oluşturur (örn. "Fiat triger değişimi ustası").
export function buildIssueServiceUrl(brand: string, issueTitle: string): string {
  return buildNearbyServiceUrl(brand, `${issueTitle} ustası`);
}
