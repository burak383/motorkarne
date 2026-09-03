import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Motor } from '../data/catalog';
import type { SavedComparison } from '../state/FavoritesContext';
import { getRiskInfo } from './risk';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildComparisonRowHtml(comparison: SavedComparison, motorA: Motor | undefined, motorB: Motor | undefined): string {
  const nameA = escapeHtml(motorA?.name ?? comparison.motorA);
  const nameB = escapeHtml(motorB?.name ?? comparison.motorB);
  const scoreA = motorA ? motorA.score.toFixed(1) : '—';
  const scoreB = motorB ? motorB.score.toFixed(1) : '—';
  const riskA = motorA ? getRiskInfo(motorA.score).label : '—';
  const riskB = motorB ? getRiskInfo(motorB.score).label : '—';

  return `
    <div class="comparison">
      <div class="date">${escapeHtml(comparison.savedAt)}</div>
      <table>
        <tr>
          <th></th>
          <th>${nameA}</th>
          <th>${nameB}</th>
        </tr>
        <tr>
          <td>Güvenilirlik Skoru</td>
          <td>${scoreA} / 10</td>
          <td>${scoreB} / 10</td>
        </tr>
        <tr>
          <td>Risk Seviyesi</td>
          <td>${riskA}</td>
          <td>${riskB}</td>
        </tr>
      </table>
    </div>
  `;
}

export async function exportComparisonHistoryAsPdf(
  comparisons: SavedComparison[],
  getMotorById: (id: string) => Motor | undefined
): Promise<{ success: boolean; error?: string }> {
  if (comparisons.length === 0) {
    return { success: false, error: 'Dışa aktarılacak kayıtlı bir karşılaştırma yok.' };
  }

  try {
    const rowsHtml = comparisons
      .map((c) => buildComparisonRowHtml(c, getMotorById(c.motorA), getMotorById(c.motorB)))
      .join('\n');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            .subtitle { font-size: 12px; color: #666; margin-bottom: 24px; }
            .comparison { margin-bottom: 24px; page-break-inside: avoid; }
            .date { font-size: 11px; color: #888; margin-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
            th { background: #f4f6fb; }
          </style>
        </head>
        <body>
          <h1>MotorKarne — Karşılaştırma Geçmişi</h1>
          <div class="subtitle">Dışa aktarım tarihi: ${new Date().toLocaleDateString('tr-TR')}</div>
          ${rowsHtml}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    const shareAvailable = await Sharing.isAvailableAsync();
    if (!shareAvailable) {
      return { success: false, error: 'Bu cihazda paylaşım özelliği kullanılamıyor.' };
    }

    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Karşılaştırma Geçmişini Paylaş' });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'PDF oluşturulurken bir sorun oluştu.' };
  }
}
