import { findMatchingIssues, findMatchingIssuesFreeText, SYMPTOMS } from '../diagnosis';
import type { Motor } from '../../data/catalog';

function mockMotor(overrides: Partial<Motor>): Motor {
  return {
    id: 'test-motor',
    name: 'Test Motor',
    code: 'TST',
    brands: ['TestBrand'],
    fuel: 'Benzin',
    power: '100 hp',
    transmission: 'Manuel',
    score: 7,
    risk: 'Orta',
    riskLevel: 'medium',
    note: '',
    pros: [],
    cons: [],
    chronic: [],
    ...overrides,
  };
}

describe('findMatchingIssues', () => {
  it('matches a motor whose chronic issue title contains a keyword', () => {
    const motors = [
      mockMotor({
        id: 'motor-a',
        chronic: [{ title: 'Triger kayışı erimesi', risk: 'Yüksek', desc: 'Yağ içinde eriyor.' }],
      }),
    ];
    const matches = findMatchingIssues(['triger'], motors);
    expect(matches.length).toBe(1);
    expect(matches[0].motor.id).toBe('motor-a');
  });

  it('matches a motor whose chronic issue description contains a keyword', () => {
    const motors = [
      mockMotor({
        id: 'motor-b',
        chronic: [{ title: 'Bilinmeyen başlık', risk: 'Orta', desc: 'Aşırı yağ kaçağı bildiriliyor.' }],
      }),
    ];
    const matches = findMatchingIssues(['yağ kaçağı'], motors);
    expect(matches.length).toBe(1);
    expect(matches[0].motor.id).toBe('motor-b');
  });

  it('does not match motors with no relevant chronic issue', () => {
    const motors = [
      mockMotor({ id: 'motor-c', chronic: [{ title: 'Alakasız sorun', risk: 'Düşük', desc: 'Hiç ilgisi yok.' }] }),
    ];
    expect(findMatchingIssues(['triger'], motors)).toEqual([]);
  });

  it('is case-insensitive', () => {
    const motors = [
      mockMotor({ id: 'motor-d', chronic: [{ title: 'TRİGER Kayışı', risk: 'Orta', desc: '' }] }),
    ];
    // Not: Türkçe büyük/küçük İ/i dönüşümü JS'de düzensiz olabilir, bu yüzden ASCII bir kelime kullanıyoruz.
    const motorsAscii = [
      mockMotor({ id: 'motor-e', chronic: [{ title: 'TURBO Arizasi', risk: 'Orta', desc: '' }] }),
    ];
    expect(findMatchingIssues(['turbo'], motorsAscii).length).toBe(1);
  });

  it('does not match motor.cons free text (only structured chronic entries)', () => {
    const motors = [
      mockMotor({ id: 'motor-f', cons: ['Triger kayışı erken yıpranıyor'], chronic: [] }),
    ];
    expect(findMatchingIssues(['triger'], motors)).toEqual([]);
  });

  it('sorts results by motor score descending', () => {
    const motors = [
      mockMotor({ id: 'low-score', score: 5, chronic: [{ title: 'Triger sorunu', risk: 'Orta', desc: '' }] }),
      mockMotor({ id: 'high-score', score: 9, chronic: [{ title: 'Triger sorunu', risk: 'Orta', desc: '' }] }),
    ];
    const matches = findMatchingIssues(['triger'], motors);
    expect(matches[0].motor.id).toBe('high-score');
    expect(matches[1].motor.id).toBe('low-score');
  });

  it('returns multiple matches when a motor has more than one matching chronic issue', () => {
    const motors = [
      mockMotor({
        id: 'motor-g',
        chronic: [
          { title: 'Triger kayışı sorunu', risk: 'Orta', desc: '' },
          { title: 'Yakıt tüketiminde artış ve triger gerdirici sesi', risk: 'Düşük', desc: '' },
        ],
      }),
    ];
    expect(findMatchingIssues(['triger'], motors).length).toBe(2);
  });
});

describe('findMatchingIssuesFreeText', () => {
  it('returns an empty array for an empty or whitespace-only query', () => {
    expect(findMatchingIssuesFreeText('', [])).toEqual([]);
    expect(findMatchingIssuesFreeText('   ', [])).toEqual([]);
  });

  it('trims and lowercases the query before matching', () => {
    const motors = [
      mockMotor({ id: 'motor-h', chronic: [{ title: 'Adblue arızası', risk: 'Orta', desc: '' }] }),
    ];
    expect(findMatchingIssuesFreeText('  ADBLUE  ', motors).length).toBe(1);
  });
});

describe('SYMPTOMS', () => {
  it('has a non-empty keyword list for every symptom', () => {
    for (const symptom of SYMPTOMS) {
      expect(symptom.keywords.length).toBeGreaterThan(0);
      expect(symptom.id).toBeTruthy();
      expect(symptom.label).toBeTruthy();
    }
  });

  it('has unique symptom ids', () => {
    const ids = SYMPTOMS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
