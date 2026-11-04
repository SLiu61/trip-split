import { excelFormat, fromMinor } from './money';
import { buildReport } from './summary';
import type { Trip } from './types';
import type { MessageKey, TFunc } from '../i18n/messages';

/** A cell: plain value, or a number with an Excel number format. */
export type Cell = string | number | null | { v: number; z: string };
export interface SheetSpec {
  name: string;
  rows: Cell[][];
  /** column widths in characters */
  widths: number[];
}

/**
 * Build the workbook contents as plain data. Kept separate from SheetJS so it can
 * be unit-tested and so the (large) xlsx library is only loaded on export.
 */
export function buildSheets(trip: Trip, t: TFunc, generatedAt = new Date()): SheetSpec[] {
  const base = trip.baseCurrency;
  const fmt = excelFormat(base);
  const money = (minor: number): Cell => ({ v: fromMinor(minor, base), z: fmt });
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? '?';
  const r = buildReport(trip);
  const vars = { base };

  // --- Expenses ---
  const memberCols = trip.members.map((m) => t('x_shareOf', { name: m.name, base }));
  const expenseRows: Cell[][] = [
    [
      t('x_date'),
      t('x_description'),
      t('x_category'),
      t('x_paidBy'),
      t('x_amount'),
      t('x_currency'),
      t('x_rate', vars),
      t('x_rateSource'),
      t('x_rateDate'),
      t('x_baseAmount', vars),
      t('x_splitMethod'),
      ...memberCols,
    ],
  ];
  const splitLabel: Record<string, MessageKey> = {
    equal: 'splitEqual',
    amount: 'splitAmount',
    shares: 'splitShares',
  };
  for (const e of r.expenses) {
    expenseRows.push([
      e.date,
      e.description,
      t(`cat_${e.category}`),
      name(e.payerId),
      { v: e.amount, z: excelFormat(e.currency) },
      e.currency,
      { v: e.rate, z: '0.000000##' },
      t(`x_src_${e.rateSource}`),
      e.rateDate ?? e.date,
      money(e.baseTotal),
      t(splitLabel[e.split.mode]),
      ...trip.members.map((m) => (e.shares[m.id] ? money(e.shares[m.id]) : null)),
    ]);
  }
  expenseRows.push([
    t('x_total'),
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    money(r.total),
    null,
    ...r.balances.map((b) => money(b.share)),
  ]);

  // --- Balances ---
  const status = (net: number) => (net > 0 ? t('getsBack') : net < 0 ? t('owes') : t('settled'));
  const balanceRows: Cell[][] = [
    [t('x_member'), t('x_paid', vars), t('x_share', vars), t('x_net', vars), t('x_status')],
    ...r.balances.map((b) => [name(b.memberId), money(b.paid), money(b.share), money(b.net), status(b.net)]),
    [
      t('x_total'),
      money(r.balances.reduce((s, b) => s + b.paid, 0)),
      money(r.balances.reduce((s, b) => s + b.share, 0)),
      money(r.balances.reduce((s, b) => s + b.net, 0)),
      null,
    ],
  ];

  // --- Settlement ---
  const transferRows: Cell[][] = [
    [t('x_from'), t('x_to'), t('x_transferAmount', vars)],
    ...r.transfers.map((tr) => [name(tr.from), name(tr.to), money(tr.amount)]),
  ];

  // --- Summary ---
  const pct = (part: number): Cell => ({ v: r.total ? part / r.total : 0, z: '0.0%' });
  const summaryRows: Cell[][] = [
    [t('x_trip'), trip.name],
    [t('x_baseCurrency'), base],
    [t('totalSpent'), money(r.total)],
    [t('x_generated'), generatedAt.toISOString().slice(0, 16).replace('T', ' ')],
    [],
    [t('byCategory')],
    [t('x_category'), t('x_baseAmount', vars), t('x_count'), t('x_percent')],
    ...r.byCategory
      .filter((c) => c.count > 0)
      .map((c) => [t(`cat_${c.category}`), money(c.total), c.count, pct(c.total)]),
    [],
    [t('byMember')],
    [t('x_member'), t('x_paid', vars), t('x_share', vars), t('x_net', vars), t('x_percent')],
    ...r.balances.map((b) => [name(b.memberId), money(b.paid), money(b.share), money(b.net), pct(b.share)]),
    [],
    [t('byCurrency')],
    [t('x_currency'), t('x_originalTotal'), t('x_baseAmount', vars), t('x_count')],
    ...r.byCurrency.map((c) => [
      c.currency,
      { v: fromMinor(c.originalTotal, c.currency), z: excelFormat(c.currency) },
      money(c.baseTotal),
      c.count,
    ]),
  ];

  return [
    {
      name: 'Expenses',
      rows: expenseRows,
      widths: [11, 28, 14, 12, 14, 9, 14, 18, 11, 16, 10, ...memberCols.map(() => 16)],
    },
    { name: 'Balances', rows: balanceRows, widths: [16, 16, 16, 16, 12] },
    { name: 'Settlement transfers', rows: transferRows, widths: [16, 16, 16] },
    { name: 'Summary', rows: summaryRows, widths: [24, 18, 18, 18, 12] },
  ];
}

export function exportFileName(trip: Trip): string {
  // Letters (any script) and digits only — some browsers drop names with symbols like "·".
  const safe = trip.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'trip';
  return `${safe}-TripSplit.xlsx`;
}

/** Build and download the .xlsx. SheetJS is loaded lazily to keep the initial bundle small. */
export async function downloadXlsx(trip: Trip, t: TFunc): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const sheet of buildSheets(trip, t)) {
    const aoa = sheet.rows.map((row) => row.map((c) => (c && typeof c === 'object' ? c.v : c)));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    sheet.rows.forEach((row, ri) =>
      row.forEach((c, ci) => {
        if (c && typeof c === 'object') {
          const cell = ws[XLSX.utils.encode_cell({ r: ri, c: ci })];
          if (cell) cell.z = c.z;
        }
      }),
    );
    ws['!cols'] = sheet.widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true }) as ArrayBuffer;
  const url = URL.createObjectURL(
    new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(trip);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
