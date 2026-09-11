import ExcelJS from 'exceljs';
import type { LicenceKey, Project } from '../types';
import { ADDITIONAL_LICENCES, BASE_LICENCES } from '../types';
import { DOMAINS, CUSTOM_DOMAIN_ID, CATALOG_VERSION } from '../data/catalog';
import { STANDARD_ROLES } from '../data/standardRoles';
import { computeProject } from '../engine/licensing';
import type { LicenceTotals, ProfileResult } from '../engine/licensing';
import type { LanguageCode } from '../i18n';
import { en } from '../i18n/en';
import { fr } from '../i18n/fr';

const FONT = 'Segoe UI';

const C = {
  navy: 'FF0A2540',
  navySoft: 'FF2A4A6B',
  band: 'FFCFE4FA',
  tint: 'FFF5F9FE',
  line: 'FFE3E6EA',
  ink: 'FF14161A',
  muted: 'FF646C78',
  faint: 'FFB9BEC6',
  white: 'FFFFFFFF',
  highlight: 'FFFFF4D6',
};

type T = typeof en;

/** Same licence palette as the application, derived from the D365 app logos. */
const LICENCE_COLOR: Record<LicenceKey, string> = {
  finance: 'FF217A4B',
  financePremium: 'FF0E4A2B',
  supplyChain: 'FF0F6CBD',
  supplyChainPremium: 'FF093C6B',
  commerce: 'FFB4600A',
  projectOperations: 'FFC42A45',
  humanResources: 'FF6B2FB5',
  fullCrossApps: 'FF3D434D',
  activity: 'FF3D434D',
  teamMembers: 'FF79828F',
  device: 'FF0B6B72',
};

function border(argb = C.line): Partial<ExcelJS.Borders> {
  const side = { style: 'thin' as const, color: { argb } };
  return { top: side, left: side, bottom: side, right: side };
}

function colName(index: number): string {
  let n = index;
  let name = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/** Title plus project identity, repeated on every sheet so any page stands alone. */
function titleBlock(ws: ExcelJS.Worksheet, t: T, project: Project, heading: string, lastCol: number): number {
  const last = Math.max(lastCol, 4);
  ws.mergeCells(2, 2, 2, last);
  const title = ws.getCell(2, 2);
  title.value = heading;
  title.font = { name: FONT, size: 18, bold: true, color: { argb: C.navy } };
  ws.getRow(2).height = 26;

  ws.mergeCells(3, 2, 3, last);
  const sub = ws.getCell(3, 2);
  sub.value = [project.meta.name, project.meta.customer].filter(Boolean).join('  \u2022  ') || t.excel.reportTitle;
  sub.font = { name: FONT, size: 11, color: { argb: C.muted } };
  return 5;
}

function sectionBand(ws: ExcelJS.Worksheet, row: number, firstCol: number, lastCol: number, label: string): void {
  if (lastCol > firstCol) ws.mergeCells(row, firstCol, row, lastCol);
  const cell = ws.getCell(row, firstCol);
  cell.value = label;
  cell.font = { name: FONT, size: 11, bold: true, color: { argb: C.navy } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.band } };
  cell.alignment = { vertical: 'middle' };
  ws.getRow(row).height = 22;
}

function tableHeader(ws: ExcelJS.Worksheet, row: number, firstCol: number, labels: string[]): void {
  labels.forEach((label, i) => {
    const cell = ws.getCell(row, firstCol + i);
    cell.value = label;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = border(C.navySoft);
  });
  ws.getRow(row).height = 30;
}

function paragraph(
  ws: ExcelJS.Worksheet,
  row: number,
  firstCol: number,
  lastCol: number,
  text: string,
  height = 32,
): void {
  if (lastCol > firstCol) ws.mergeCells(row, firstCol, row, lastCol);
  const cell = ws.getCell(row, firstCol);
  cell.value = text;
  cell.font = { name: FONT, size: 10, color: { argb: C.muted } };
  cell.alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(row).height = height;
}

/** One licence line of the result, readable from both result shapes. */
interface LicenceLine {
  label: string;
  color: string;
  group: 'base' | 'attach' | 'extra';
  isDevice: boolean;
  fromProfile: (r: ProfileResult) => number;
  fromTotals: (x: LicenceTotals) => number;
}

function licenceLines(t: T): LicenceLine[] {
  return [
    ...BASE_LICENCES.map((key): LicenceLine => ({
      label: t.licences[key],
      color: LICENCE_COLOR[key],
      group: 'base',
      isDevice: false,
      fromProfile: (r) => r.baseByProduct[key],
      fromTotals: (x) => x.base[key],
    })),
    ...BASE_LICENCES.map((key): LicenceLine => ({
      label: t.licencesAttach[key],
      color: LICENCE_COLOR[key],
      group: 'attach',
      isDevice: false,
      fromProfile: (r) => r.attachByProduct[key],
      fromTotals: (x) => x.attach[key],
    })),
    ...ADDITIONAL_LICENCES.map((key): LicenceLine => ({
      label: t.licences[key],
      color: LICENCE_COLOR[key],
      group: 'extra',
      isDevice: key === 'device',
      fromProfile: (r) => r[key],
      fromTotals: (x) => x[key],
    })),
  ];
}

function profileLicenceText(lines: LicenceLine[], result: ProfileResult, t: T): string {
  const parts = lines
    .filter((line) => line.fromProfile(result) > 0)
    .map((line) => `${line.label} \u00d7${line.fromProfile(result)}`);
  return parts.length > 0 ? parts.join('\n') : t.excel.noLicence;
}

interface InputRow {
  kind: 'group' | 'item';
  label: string;
  note: string;
  licence: string;
  color: string;
  reference: string;
  id?: string;
}

/** Rows of the active profiling mode, keeping only what at least one profile selected. */
function inputRows(project: Project, t: T, lang: LanguageCode): InputRow[] {
  const rows: InputRow[] = [];

  if (project.profilingMode === 'roles') {
    const selected = STANDARD_ROLES.filter((role) =>
      project.profiles.some((profile) => profile.standardRoles?.[role.id]),
    );
    let group = '';
    for (const role of selected) {
      if (role.group[lang] !== group) {
        group = role.group[lang];
        rows.push({ kind: 'group', label: group, note: '', licence: '', color: C.muted, reference: '' });
      }
      rows.push({
        kind: 'item',
        label: role.name,
        note: role.description,
        licence: t.licences[role.licence],
        color: LICENCE_COLOR[role.licence],
        reference: `p.${role.page}`,
        id: role.id,
      });
    }
    return rows;
  }

  const isSelected = (id: string) => project.profiles.some((profile) => profile.selections[id]);
  const customByDomain = new Map<string, typeof project.customProcesses>();
  for (const custom of project.customProcesses) {
    const list = customByDomain.get(custom.domainId) ?? [];
    list.push(custom);
    customByDomain.set(custom.domainId, list);
  }

  const collectCustom = (domainId: string, into: InputRow[]) => {
    for (const custom of customByDomain.get(domainId) ?? []) {
      if (!isSelected(custom.id)) continue;
      into.push({
        kind: 'item',
        label: custom.label,
        note: '',
        licence: custom.licence ? t.licences[custom.licence] : t.licences.none,
        color: custom.licence ? LICENCE_COLOR[custom.licence] : C.muted,
        reference: '',
        id: custom.id,
      });
    }
  };

  for (const domain of DOMAINS) {
    const items: InputRow[] = [];
    for (const process of domain.processes) {
      if (!isSelected(process.id)) continue;
      items.push({
        kind: 'item',
        label: process.label[lang],
        note: process.note?.[lang] ?? '',
        licence: process.licence ? t.licences[process.licence] : t.licences.none,
        color: process.licence ? LICENCE_COLOR[process.licence] : C.muted,
        reference: process.source ?? '',
        id: process.id,
      });
    }
    collectCustom(domain.id, items);
    if (items.length === 0) continue;
    rows.push({ kind: 'group', label: domain.label[lang], note: '', licence: '', color: C.muted, reference: '' });
    rows.push(...items);
  }

  const orphans: InputRow[] = [];
  collectCustom(CUSTOM_DOMAIN_ID, orphans);
  if (orphans.length > 0) {
    rows.push({
      kind: 'group',
      label: lang === 'fr' ? 'Processus personnalis\u00e9s' : 'Custom processes',
      note: '',
      licence: '',
      color: C.muted,
      reference: '',
    });
    rows.push(...orphans);
  }

  return rows;
}

export async function buildWorkbook(project: Project, lang: LanguageCode): Promise<ExcelJS.Workbook> {
  const t = (lang === 'fr' ? fr : en) as T;
  const result = computeProject(project);
  const used = licenceLines(t).filter((line) => line.fromTotals(result.totals) > 0);

  const wb = new ExcelJS.Workbook();
  wb.creator = project.meta.author || 'D365 Licensing Profiler';
  wb.created = new Date();

  const entities = project.legalEntities;
  const profiles = project.profiles;

  // Created up front so the tabs appear in reading order, then populated below
  // in dependency order (the summary points at the calculation sheet).
  const wsSum = wb.addWorksheet(t.excel.sheetSummary);
  const wsProfiles = wb.addWorksheet(t.excel.sheetProfiles);
  const wsLE = entities.length > 1 ? wb.addWorksheet(t.excel.sheetEntities) : null;
  const wsIn = wb.addWorksheet(t.excel.sheetInputs);
  const wsCalc = wb.addWorksheet(t.excel.sheetCalc);
  const wsDisc = wb.addWorksheet(t.nav.disclaimer);

  // ============================================================= User profiles
  // Populated first: every other sheet points at its headcount totals, so
  // editing a headcount in Excel refreshes the whole workbook.
  const P_LE_FIRST = 5;
  const P_TOTAL_COL = P_LE_FIRST + entities.length;
  const P_LIC_COL = P_TOTAL_COL + 1;

  wsProfiles.getColumn(2).width = 22;
  wsProfiles.getColumn(3).width = 30;
  wsProfiles.getColumn(4).width = 42;
  for (let c = P_LE_FIRST; c < P_TOTAL_COL; c += 1) wsProfiles.getColumn(c).width = 14;
  wsProfiles.getColumn(P_TOTAL_COL).width = 12;
  wsProfiles.getColumn(P_LIC_COL).width = 46;

  let row = titleBlock(wsProfiles, t, project, t.excel.sheetProfiles, P_LIC_COL);
  paragraph(wsProfiles, row, 2, P_LIC_COL, t.excel.profilesIntro, 30);
  row += 2;

  const P_HEADER = row;
  tableHeader(wsProfiles, P_HEADER, 2, [
    t.profiles.department,
    t.profiles.name,
    t.profiles.description,
    ...entities.map((e) => e.name || t.setup.entityName),
    t.excel.total,
    t.excel.licencesRequired,
  ]);

  const P_ROW_FIRST = P_HEADER + 1;
  profiles.forEach((profile, index) => {
    const r = P_ROW_FIRST + index;

    wsProfiles.getCell(r, 2).value = profile.department;
    wsProfiles.getCell(r, 2).font = { name: FONT, size: 10, color: { argb: C.muted } };
    wsProfiles.getCell(r, 3).value = profile.name;
    wsProfiles.getCell(r, 3).font = { name: FONT, size: 10, bold: true, color: { argb: C.ink } };
    wsProfiles.getCell(r, 4).value = profile.description;
    wsProfiles.getCell(r, 4).font = { name: FONT, size: 9, color: { argb: C.muted } };
    wsProfiles.getCell(r, 4).alignment = { wrapText: true, vertical: 'top' };

    entities.forEach((entity, i) => {
      const cell = wsProfiles.getCell(r, P_LE_FIRST + i);
      cell.value = profile.counts[entity.id] || 0;
      cell.alignment = { horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tint } };
    });

    const total = wsProfiles.getCell(r, P_TOTAL_COL);
    total.value = {
      formula: `SUM(${colName(P_LE_FIRST)}${r}:${colName(P_TOTAL_COL - 1)}${r})`,
    };
    total.font = { name: FONT, size: 10, bold: true };
    total.alignment = { horizontal: 'center' };
    total.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.highlight } };

    const licence = wsProfiles.getCell(r, P_LIC_COL);
    licence.value = profileLicenceText(used, result.profiles[index], t);
    licence.font = { name: FONT, size: 10 };
    licence.alignment = { wrapText: true, vertical: 'top' };

    for (let c = 2; c <= P_LIC_COL; c += 1) wsProfiles.getCell(r, c).border = border();
    wsProfiles.getRow(r).height = 30;
  });

  const P_ROW_LAST = P_ROW_FIRST + Math.max(profiles.length, 1) - 1;
  const P_TOTAL_ROW = P_ROW_LAST + 1;
  wsProfiles.getCell(P_TOTAL_ROW, 3).value = t.excel.total;
  for (let c = P_LE_FIRST; c <= P_TOTAL_COL; c += 1) {
    const letter = colName(c);
    wsProfiles.getCell(P_TOTAL_ROW, c).value = {
      formula: `SUM(${letter}${P_ROW_FIRST}:${letter}${P_ROW_LAST})`,
    };
    wsProfiles.getCell(P_TOTAL_ROW, c).alignment = { horizontal: 'center' };
  }
  for (let c = 2; c <= P_LIC_COL; c += 1) {
    const cell = wsProfiles.getCell(P_TOTAL_ROW, c);
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.navy } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.band } };
    cell.border = border();
  }
  wsProfiles.views = [{ state: 'frozen', xSplit: 4, ySplit: P_HEADER }];

  // ======================================================== Calculation detail
  const CALC_LIC_FIRST = 4;
  const CALC_LAST_COL = CALC_LIC_FIRST + Math.max(used.length, 1) - 1;
  wsCalc.getColumn(2).width = 30;
  wsCalc.getColumn(3).width = 12;
  used.forEach((_, i) => {
    wsCalc.getColumn(CALC_LIC_FIRST + i).width = 18;
  });

  row = titleBlock(wsCalc, t, project, t.excel.sheetCalc, CALC_LAST_COL);
  paragraph(wsCalc, row, 2, CALC_LAST_COL, t.excel.calcIntro, 32);
  row += 2;

  const CALC_HEADER = row;
  tableHeader(wsCalc, CALC_HEADER, 2, [t.profiles.name, t.excel.users, ...used.map((line) => line.label)]);
  const CALC_FIRST = CALC_HEADER + 1;

  profiles.forEach((profile, index) => {
    const r = CALC_FIRST + index;
    wsCalc.getCell(r, 2).value = profile.name;
    wsCalc.getCell(r, 2).font = { name: FONT, size: 10, bold: true };
    wsCalc.getCell(r, 3).value = {
      formula: `'${t.excel.sheetProfiles}'!${colName(P_TOTAL_COL)}${P_ROW_FIRST + index}`,
    };
    wsCalc.getCell(r, 3).alignment = { horizontal: 'center' };

    used.forEach((line, i) => {
      const cell = wsCalc.getCell(r, CALC_LIC_FIRST + i);
      const allocated = line.fromProfile(result.profiles[index]) > 0;
      // The licence decision is fixed; only the headcount stays live.
      cell.value = allocated ? { formula: `$C${r}` } : 0;
      cell.alignment = { horizontal: 'center' };
      cell.font = allocated
        ? { name: FONT, size: 10, bold: true, color: { argb: line.color } }
        : { name: FONT, size: 10, color: { argb: C.faint } };
      if (allocated) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tint } };
    });
    for (let c = 2; c <= CALC_LAST_COL; c += 1) wsCalc.getCell(r, c).border = border();
  });

  const CALC_LAST = CALC_FIRST + Math.max(profiles.length, 1) - 1;
  const CALC_TOTAL_ROW = CALC_LAST + 1;
  wsCalc.getCell(CALC_TOTAL_ROW, 2).value = t.excel.total;
  for (let c = 3; c <= CALC_LAST_COL; c += 1) {
    const letter = colName(c);
    wsCalc.getCell(CALC_TOTAL_ROW, c).value = { formula: `SUM(${letter}${CALC_FIRST}:${letter}${CALC_LAST})` };
    wsCalc.getCell(CALC_TOTAL_ROW, c).alignment = { horizontal: 'center' };
  }
  for (let c = 2; c <= CALC_LAST_COL; c += 1) {
    const cell = wsCalc.getCell(CALC_TOTAL_ROW, c);
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.navy } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.band } };
    cell.border = border();
  }
  wsCalc.views = [{ state: 'frozen', xSplit: 3, ySplit: CALC_HEADER }];

  const calcTotalRef = (lineIndex: number) =>
    `'${t.excel.sheetCalc}'!${colName(CALC_LIC_FIRST + lineIndex)}${CALC_TOTAL_ROW}`;
  const sumOfGroup = (predicate: (line: LicenceLine) => boolean) => {
    const refs = used.map((line, i) => (predicate(line) ? calcTotalRef(i) : '')).filter(Boolean);
    return refs.length > 0 ? refs.join('+') : '0';
  };

  // ==================================================================== Summary
  wsSum.getColumn(2).width = 46;
  wsSum.getColumn(3).width = 16;
  wsSum.getColumn(4).width = 62;

  row = titleBlock(wsSum, t, project, t.excel.reportTitle, 4);

  const meta: Array<[string, string]> = [
    [t.setup.customer, project.meta.customer || '\u2014'],
    [t.setup.author, project.meta.author || '\u2014'],
    [t.excel.date, new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')],
    [t.excel.method, project.profilingMode === 'roles' ? t.excel.method_roles : t.excel.method_processes],
    [t.excel.guide, CATALOG_VERSION],
  ];
  for (const [label, value] of meta) {
    wsSum.getCell(row, 2).value = label;
    wsSum.getCell(row, 2).font = { name: FONT, size: 10, color: { argb: C.muted } };
    wsSum.getCell(row, 3).value = value;
    wsSum.getCell(row, 3).font = { name: FONT, size: 10, bold: true, color: { argb: C.ink } };
    row += 1;
  }

  row += 1;
  sectionBand(wsSum, row, 2, 4, t.excel.atAGlance);
  row += 1;

  const kpis: Array<[string, string]> = [
    [t.results.totalUsers, sumOfGroup((line) => line.group === 'base' || (line.group === 'extra' && !line.isDevice))],
    [t.results.fullUsers, sumOfGroup((line) => line.group === 'base')],
    [t.results.attachTotal, sumOfGroup((line) => line.group === 'attach')],
    [t.results.totalDevices, sumOfGroup((line) => line.isDevice)],
  ];
  for (const [label, formula] of kpis) {
    wsSum.getCell(row, 2).value = label;
    wsSum.getCell(row, 2).font = { name: FONT, size: 10 };
    wsSum.getCell(row, 2).border = border();
    const cell = wsSum.getCell(row, 3);
    cell.value = { formula };
    cell.font = { name: FONT, size: 14, bold: true, color: { argb: C.navy } };
    cell.alignment = { horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tint } };
    cell.border = border();
    wsSum.getRow(row).height = 22;
    row += 1;
  }

  row += 1;
  sectionBand(wsSum, row, 2, 4, t.excel.requirements);
  row += 1;
  tableHeader(wsSum, row, 2, [t.excel.licence, t.excel.quantity, t.excel.readingKey]);
  row += 1;

  const GROUP_LABEL: Record<LicenceLine['group'], string> = {
    base: t.results.baseLicences,
    attach: t.results.attachLicences,
    extra: t.results.additionalLicences,
  };
  const GROUP_HINT: Record<LicenceLine['group'], string> = {
    base: t.excel.readingBase,
    attach: t.excel.readingAttach,
    extra: t.excel.readingExtra,
  };

  for (const group of ['base', 'attach', 'extra'] as const) {
    const groupLines = used.map((line, i) => ({ line, i })).filter((x) => x.line.group === group);
    if (groupLines.length === 0) continue;

    sectionBand(wsSum, row, 2, 3, GROUP_LABEL[group].toUpperCase());
    const hint = wsSum.getCell(row, 4);
    hint.value = GROUP_HINT[group];
    hint.font = { name: FONT, size: 9, italic: true, color: { argb: C.muted } };
    hint.alignment = { wrapText: true, vertical: 'middle' };
    wsSum.getRow(row).height = 42;
    row += 1;

    for (const { line, i } of groupLines) {
      wsSum.getCell(row, 2).value = line.label;
      wsSum.getCell(row, 2).font = { name: FONT, size: 10, bold: true, color: { argb: line.color } };
      wsSum.getCell(row, 2).border = border();
      const qty = wsSum.getCell(row, 3);
      qty.value = { formula: calcTotalRef(i) };
      qty.font = { name: FONT, size: 11, bold: true };
      qty.alignment = { horizontal: 'center' };
      qty.border = border();
      row += 1;
    }
  }

  row += 1;
  paragraph(wsSum, row, 2, 4, t.excel.minimumNote, 30);
  row += 2;
  paragraph(wsSum, row, 2, 4, t.disclaimer.note, 18);

  // ========================================================== By legal entity
  if (wsLE) {
    const LE_TOTAL_COL = 3 + entities.length;
    wsLE.getColumn(2).width = 46;
    entities.forEach((_, i) => {
      wsLE.getColumn(3 + i).width = 16;
    });
    wsLE.getColumn(LE_TOTAL_COL).width = 14;

    let r = titleBlock(wsLE, t, project, t.excel.sheetEntities, LE_TOTAL_COL);
    paragraph(wsLE, r, 2, LE_TOTAL_COL, t.excel.entitiesIntro, 28);
    r += 2;

    tableHeader(wsLE, r, 2, [t.excel.licence, ...entities.map((e) => e.name || t.setup.entityName), t.excel.total]);
    r += 1;

    for (const line of used) {
      wsLE.getCell(r, 2).value = line.label;
      wsLE.getCell(r, 2).font = { name: FONT, size: 10, bold: true, color: { argb: line.color } };
      wsLE.getCell(r, 2).border = border();
      entities.forEach((entity, i) => {
        const cell = wsLE.getCell(r, 3 + i);
        cell.value = line.fromTotals(result.byLegalEntity[entity.id]);
        cell.alignment = { horizontal: 'center' };
        cell.border = border();
      });
      const total = wsLE.getCell(r, LE_TOTAL_COL);
      total.value = { formula: `SUM(C${r}:${colName(LE_TOTAL_COL - 1)}${r})` };
      total.font = { name: FONT, size: 10, bold: true };
      total.alignment = { horizontal: 'center' };
      total.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tint } };
      total.border = border();
      r += 1;
    }
  }

  // ======================================================== What was selected
  const rows = inputRows(project, t, lang);
  const IN_PROFILE_FIRST = 6;
  const IN_LAST_COL = IN_PROFILE_FIRST + Math.max(profiles.length, 1) - 1;

  wsIn.getColumn(2).width = 46;
  wsIn.getColumn(3).width = 46;
  wsIn.getColumn(4).width = 30;
  wsIn.getColumn(5).width = 14;
  for (let c = IN_PROFILE_FIRST; c <= IN_LAST_COL; c += 1) wsIn.getColumn(c).width = 18;

  let r = titleBlock(wsIn, t, project, t.excel.sheetInputs, IN_LAST_COL);
  paragraph(
    wsIn,
    r,
    2,
    IN_LAST_COL,
    project.profilingMode === 'roles' ? t.excel.inputsIntro_roles : t.excel.inputsIntro_processes,
    30,
  );
  r += 2;

  const IN_HEADER = r;
  tableHeader(wsIn, IN_HEADER, 2, [
    project.profilingMode === 'roles' ? t.roles.role : t.matrix.process,
    t.profiles.description,
    t.matrix.licence,
    t.excel.reference,
    ...profiles.map((p) => [p.department, p.name].filter(Boolean).join('\n')),
  ]);
  r += 1;

  if (rows.length === 0) paragraph(wsIn, r, 2, IN_LAST_COL, t.excel.inputsEmpty, 20);

  for (const item of rows) {
    if (item.kind === 'group') {
      sectionBand(wsIn, r, 2, IN_LAST_COL, item.label);
      r += 1;
      continue;
    }
    wsIn.getCell(r, 2).value = item.label;
    wsIn.getCell(r, 2).font = { name: FONT, size: 10 };
    wsIn.getCell(r, 3).value = item.note;
    wsIn.getCell(r, 3).font = { name: FONT, size: 9, color: { argb: C.muted } };
    wsIn.getCell(r, 3).alignment = { wrapText: true, vertical: 'top' };
    wsIn.getCell(r, 4).value = item.licence;
    wsIn.getCell(r, 4).font = { name: FONT, size: 10, bold: true, color: { argb: item.color } };
    wsIn.getCell(r, 5).value = item.reference;
    wsIn.getCell(r, 5).font = { name: FONT, size: 9, color: { argb: C.muted } };
    wsIn.getCell(r, 5).alignment = { horizontal: 'center' };

    profiles.forEach((profile, i) => {
      const cell = wsIn.getCell(r, IN_PROFILE_FIRST + i);
      const selected =
        project.profilingMode === 'roles'
          ? profile.standardRoles?.[item.id ?? '']
          : profile.selections[item.id ?? ''];
      if (selected) {
        cell.value = 'X';
        cell.font = { name: FONT, size: 10, bold: true, color: { argb: C.navy } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.tint } };
      }
      cell.alignment = { horizontal: 'center' };
    });

    for (let c = 2; c <= IN_LAST_COL; c += 1) wsIn.getCell(r, c).border = border();
    wsIn.getRow(r).height = 24;
    r += 1;
  }
  wsIn.views = [{ state: 'frozen', xSplit: 5, ySplit: IN_HEADER }];

  // ================================================================ Disclaimer
  wsDisc.getColumn(2).width = 110;
  let d = titleBlock(wsDisc, t, project, t.disclaimer.heading, 2);
  for (const body of [fr.disclaimer.body, en.disclaimer.body]) {
    paragraph(wsDisc, d, 2, 2, body, 150);
    d += 2;
  }
  paragraph(wsDisc, d, 2, 2, `${fr.disclaimer.note}\n${en.disclaimer.note}`, 40);

  return wb;
}

export async function exportToExcel(project: Project, lang: LanguageCode): Promise<Blob> {
  const wb = await buildWorkbook(project, lang);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
