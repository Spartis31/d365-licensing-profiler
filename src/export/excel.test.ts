import { describe, expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import type { Worksheet } from 'exceljs';
import { buildWorkbook } from './excel';
import type { Project } from '../types';

const project: Project = {
  fileFormat: 'd365-licensing-profiler',
  version: 1,
  meta: {
    name: 'Sample',
    customer: 'Contoso',
    author: 'SE',
    createdAt: '',
    updatedAt: '',
  },
  profilingMode: 'processes',
  legalEntities: [
    { id: 'fr', name: 'FR' },
    { id: 'uk', name: 'UK' },
  ],
  customProcesses: [],
  profiles: [
    {
      id: 'p1',
      department: 'FINANCE',
      name: 'General Ledger',
      description: '',
      counts: { fr: 10, uk: 2 },
      selections: { 'fin-accounting': true, 'fin-ar': true },
      standardRoles: {},
    },
    {
      id: 'p2',
      department: 'Supply chain',
      name: 'Full Appro',
      description: '',
      counts: { fr: 10 },
      selections: { 'pur-product': true, 'pur-requisitions': true },
      standardRoles: {},
    },
  ],
};

/** Row number of a label in column B, 0 when absent. */
function findRow(ws: Worksheet, label: string): number {
  let found = 0;
  ws.eachRow((row) => {
    if (found === 0 && row.getCell(2).value === label) found = row.number;
  });
  return found;
}

describe('buildWorkbook', () => {
  it('lays the tabs out in reading order, summary first', async () => {
    const wb = await buildWorkbook(project, 'en');
    expect(wb.worksheets.map((ws) => ws.name)).toEqual([
      'Summary',
      'User profiles',
      'By legal entity',
      'What was selected',
      'Calculation detail',
      'Disclaimer',
    ]);
  });

  it('states the licences of each profile in plain words', async () => {
    const wb = await buildWorkbook(project, 'en');
    const ws = wb.getWorksheet('User profiles');
    expect(ws).toBeDefined();
    if (!ws) return;

    const row = findRow(ws, 'FINANCE');
    expect(row).toBeGreaterThan(0);
    expect(ws.getCell(row, 3).value).toBe('General Ledger');
    expect(ws.getCell(row, 5).value).toBe(10);
    expect(ws.getCell(row, 6).value).toBe(2);
    expect(ws.getCell(row, 7).value).toEqual({ formula: `SUM(E${row}:F${row})` });
    expect(ws.getCell(row, 8).value).toBe('D365 Finance \u00d712');
  });

  it('drives the summary quantities from a live sum on the calculation sheet', async () => {
    const wb = await buildWorkbook(project, 'en');
    const summary = wb.getWorksheet('Summary');
    const calc = wb.getWorksheet('Calculation detail');
    expect(summary).toBeDefined();
    expect(calc).toBeDefined();
    if (!summary || !calc) return;

    const financeRow = findRow(summary, 'D365 Finance');
    expect(financeRow).toBeGreaterThan(0);
    const quantity = summary.getCell(financeRow, 3).value as { formula: string };
    expect(quantity.formula).toMatch(/^'Calculation detail'![A-Z]+\d+$/);

    const target = calc.getCell(quantity.formula.split('!')[1]).value as { formula: string };
    expect(target.formula).toMatch(/^SUM\(/);
  });

  it('lists only the rows that at least one profile selected', async () => {
    const wb = await buildWorkbook(project, 'en');
    const ws = wb.getWorksheet('What was selected');
    expect(ws).toBeDefined();
    if (!ws) return;

    expect(findRow(ws, 'Accounting')).toBeGreaterThan(0);
    expect(findRow(ws, 'Product management')).toBeGreaterThan(0);
    expect(findRow(ws, 'Expense reports')).toBe(0);
  });

  it('drops the legal entity sheet when a single entity is in scope', async () => {
    const wb = await buildWorkbook({ ...project, legalEntities: [{ id: 'fr', name: 'FR' }] }, 'en');
    expect(wb.getWorksheet('By legal entity')).toBeUndefined();
  });

  it('writes a readable xlsx file', async () => {
    const wb = await buildWorkbook(project, 'fr');
    const buffer = await wb.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(5000);
    if (process.env.WRITE_SAMPLE) {
      await writeFile('tools/sample-export.xlsx', Buffer.from(buffer));
    }
  });
});
