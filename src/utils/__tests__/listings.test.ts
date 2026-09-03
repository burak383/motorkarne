import { buildListingSearchUrls } from '../listings';
import type { Vehicle } from '../../data/catalog';

function mockVehicle(overrides: Partial<Vehicle>): Vehicle {
  return {
    id: 'test-vehicle',
    name: 'Fiat Egea 1.4 Fire',
    brand: 'Fiat',
    desc: '2015–2023 • Sedan',
    score: 7.5,
    engine: '1.4 Fire 95 hp',
    motorId: 'fiat-14-fire',
    img: '',
    note: '',
    ...overrides,
  };
}

describe('buildListingSearchUrls', () => {
  it('strips trim/displacement numbers from the model name', () => {
    const vehicle = mockVehicle({ name: 'Fiat Egea 1.4 Fire' });
    const urls = buildListingSearchUrls(vehicle);
    expect(urls.arabam).toContain('fiat-egea');
    expect(urls.arabam).not.toContain('1-4');
  });

  it('converts Turkish characters to their ASCII equivalents in the slug', () => {
    const vehicle = mockVehicle({ name: 'Škoda Öctavia', brand: 'Škoda' });
    const urls = buildListingSearchUrls(vehicle);
    expect(urls.arabam).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/);
  });

  it('classifies a van/ticari vehicle into the minivan-van_panelvan category', () => {
    const vehicle = mockVehicle({ desc: '2018–2026 • Ticari Van' });
    const urls = buildListingSearchUrls(vehicle);
    expect(urls.arabam).toContain('/minivan-van_panelvan/');
  });

  it('classifies an SUV vehicle into the arazi-suv-pick-up category', () => {
    const vehicle = mockVehicle({ desc: '2020–2026 • B-SUV' });
    const urls = buildListingSearchUrls(vehicle);
    expect(urls.arabam).toContain('/arazi-suv-pick-up/');
  });

  it('classifies an arazi (off-road) vehicle into the arazi-suv-pick-up category', () => {
    const vehicle = mockVehicle({ desc: '1977–2026 • Arazi Aracı' });
    const urls = buildListingSearchUrls(vehicle);
    expect(urls.arabam).toContain('/arazi-suv-pick-up/');
  });

  it('classifies a plain sedan/hatchback as otomobil', () => {
    const vehicle = mockVehicle({ desc: '2015–2023 • Sedan' });
    const urls = buildListingSearchUrls(vehicle);
    expect(urls.arabam).toContain('/otomobil/');
  });

  it('falls back to the brand name when the model name is entirely numeric/parenthetical', () => {
    const vehicle = mockVehicle({ name: '(2024)', brand: 'TestBrand' });
    const urls = buildListingSearchUrls(vehicle);
    expect(urls.arabam.toLowerCase()).toContain('testbrand');
  });

  it('URL-encodes the sahibinden query text', () => {
    const vehicle = mockVehicle({ name: 'Škoda Octavia 2.0' });
    const urls = buildListingSearchUrls(vehicle);
    expect(urls.sahibinden).toContain('query_text=');
    expect(urls.sahibinden.startsWith('https://www.sahibinden.com/otomobil?query_text=')).toBe(true);
  });

  it('removes parenthetical content before extracting the base model', () => {
    const vehicle = mockVehicle({ name: 'BMW 320d (G20)' });
    const urls = buildListingSearchUrls(vehicle);
    expect(urls.arabam).toContain('bmw');
    expect(urls.arabam).not.toContain('g20');
  });
});
