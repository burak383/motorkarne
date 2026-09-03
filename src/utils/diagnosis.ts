import { motors as staticMotors, type Motor, type ChronicIssue } from '../data/catalog';

export interface Symptom {
  id: string;
  label: string;
  keywords: string[];
}

// Yaygın belirtiler ve bunları kronik arıza metinlerinde arayacağımız anahtar kelimeler.
// Kelimeler motor.chronic[].title / desc ve motor.cons içinde aranır.
export const SYMPTOMS: Symptom[] = [
  { id: 'tikirti', label: 'Tıkırtı / vuruntu sesi', keywords: ['tıkırtı', 'vuruntu', 'zincir sesi', 'metal sesi', 'tıkırdama', 'gıcırtı', 'motor sesi', 'gürültü'] },
  { id: 'yag', label: 'Yağ kaçağı veya aşırı yağ tüketimi', keywords: ['yağ kaçağı', 'yağ tüketimi', 'yağ sızıntısı', 'yağ sızdır', 'yağ yakma', 'yağ kaçırma', 'yağ conta'] },
  { id: 'isinma', label: 'Aşırı ısınma / hararet yapma', keywords: ['ısınma', 'hararet', 'soğutma sistemi', 'soğutma pompası', 'devirdaim'] },
  { id: 'guc-kaybi', label: 'Güç kaybı / performans düşüşü', keywords: ['güç kaybı', 'performans kaybı', 'turbo lag', 'güç kesilmesi', 'turbo arıza'] },
  { id: 'sanziman', label: 'Şanzıman sertliği / vites atlama sorunu', keywords: ['kavrama', 'vites geçiş', 'şanzıman', 'sarsıntılı', 'debriyaj', 'dct', 'dsg', 'ısınma yapabilir'] },
  { id: 'duman', label: 'Egzozdan duman çıkışı', keywords: ['duman', 'emisyon artışı'] },
  { id: 'ariza-lambasi', label: 'Arıza lambası yanıyor / düzensiz çalışma', keywords: ['misfire', 'ateşleme', 'arıza lambası', 'buji', 'dengesiz çalışma', 'rölanti'] },
  { id: 'tuketim', label: 'Beklenenden yüksek yakıt tüketimi', keywords: ['yakıt tüketiminde artış', 'tüketim artışı', 'yüksek tüketim'] },
  { id: 'triger', label: 'Triger kayışı veya zinciri ile ilgili şüphe', keywords: ['triger', 'zincir', 'kayış', 'gerdirici'] },
  { id: 'titresim', label: 'Rölantide titreşim / dengesiz çalışma', keywords: ['rölanti', 'titreşim', 'kaba çalışma', 'dengesiz'] },
  { id: 'adblue', label: 'AdBlue sistemi arızası', keywords: ['adblue', 'ad blue'] },
  { id: 'aku', label: 'Araç çalışmıyor / akü bitiyor', keywords: ['12v', 'akü bitmesi', 'akü boşalması', 'yardımcı akü'] },
  { id: 'geri-cagirma', label: 'Resmi geri çağırma kapsamında mı?', keywords: ['geri çağırma', 'recall'] },
];

export interface DiagnosisMatch {
  motor: Motor;
  issue: ChronicIssue;
  matchedFrom: 'chronic';
}

function textMatchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

// Belirli bir belirtiye (veya serbest metne) uyan tüm motor + kronik arıza eşleşmelerini döndürür.
// Katalogdaki tüm motorları tarar; sadece motor.chronic içindeki gerçek, yapılandırılmış
// kayıtlarla eşleştirir (motor.cons gibi serbest metin alanları yanlış pozitif riski
// taşıdığı için kasıtlı olarak dahil edilmemiştir).
export function findMatchingIssues(keywords: string[], motorsOverride?: Motor[]): DiagnosisMatch[] {
  const pool = motorsOverride ?? staticMotors;
  const matches: DiagnosisMatch[] = [];

  for (const motor of pool) {
    for (const issue of motor.chronic) {
      const combined = `${issue.title} ${issue.desc}`;
      if (textMatchesKeywords(combined, keywords)) {
        matches.push({ motor, issue, matchedFrom: 'chronic' });
      }
    }
  }

  // Aynı motordan birden fazla eşleşme varsa, güvenilirlik skoruna göre sırala.
  return matches.sort((a, b) => b.motor.score - a.motor.score);
}

export function findMatchingIssuesFreeText(query: string, motorsOverride?: Motor[]): DiagnosisMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return findMatchingIssues([q], motorsOverride);
}
