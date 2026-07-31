export const darkColors = {
  background: '#090d16',
  card: '#111827',
  cardForeground: '#f9fafb',
  foreground: '#f9fafb',
  muted: '#1f2937',
  mutedForeground: '#9ca3af',
  border: '#1f2937',
  input: '#111827',
  primary: '#2563eb',
  primaryForeground: '#ffffff',
  secondary: '#1f2937',
  secondaryForeground: '#f9fafb',
  destructive: '#ef4444',
  success: '#10b981',
  chart3: '#f59e0b',
  accent: '#8b5cf6',
};

export const colors = {
  background: '#f8fafc',
  card: '#ffffff',
  cardForeground: '#0f172a',
  foreground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  border: '#e2e8f0',
  input: '#ffffff',
  primary: '#2563eb',
  primaryForeground: '#ffffff',
  secondary: '#e2e8f0',
  secondaryForeground: '#0f172a',
  destructive: '#ef4444',
  success: '#10b981',
  chart3: '#f59e0b',
  accent: '#8b5cf6',
};

// 🔴 Çökmenin ana sebebi çözüldü: lightColors eklendi!
export const lightColors = colors;
export type ThemeColors = typeof colors;

export const fonts = {
  heading: { bold: 'System', semibold: 'System' },
  body: { bold: 'System', semibold: 'System', regular: 'System' },
};

export const radius = 12;

// Opaklık hesaplayan doğru rgba fonksiyonu
export function rgba(color: string, alpha: number) {
  if (!color) return `rgba(0, 0, 0, ${alpha})`;
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}