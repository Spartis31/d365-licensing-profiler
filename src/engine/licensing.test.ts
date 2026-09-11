import { describe, expect, it } from 'vitest';
import { computeProject } from './licensing';
import type { Profile, Project } from '../types';

/**
 * Regression fixture rebuilt from the reference workbook
 * (Microsoft_profiling_licencesDyn365_Sample.xlsx, sheet "Profiling_By_Business
 * Process"). The expected values below are the BJ165:BJ182 totals of that file.
 */
function profile(id: string, counts: Record<string, number>, processIds: string[], roleIds: string[] = []): Profile {
  return {
    id,
    department: id,
    name: id,
    description: '',
    counts,
    selections: Object.fromEntries(processIds.map((p) => [p, true])),
    standardRoles: Object.fromEntries(roleIds.map((r) => [r, true])),
  };
}

const PURCHASING_FULL = [
  'pur-requisitions',
  'pur-orders',
  'pur-receiving',
  'pur-product',
  'pur-supplier-view',
  'pur-supplier-edit',
  'pur-agreement-edit',
  'pur-agreement-view',
  'pur-approve',
];

const sample: Project = {
  fileFormat: 'd365-licensing-profiler',
  version: 1,
  meta: {
    name: 'Sample',
    customer: '',
    author: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  profilingMode: 'processes',
  legalEntities: [
    { id: 'fr', name: 'FR' },
    { id: 'uk', name: 'UK' },
    { id: 'in', name: 'IN' },
  ],
  customProcesses: [],
  profiles: [
    profile('cmo', { fr: 8 }, ['pur-requisitions']),
    profile('gl', { fr: 10, uk: 2 }, ['fin-accounting', 'fin-ar', 'fin-ap', 'fin-tax']),
    profile('ar', { fr: 2 }, ['fin-ar', 'fin-tax', ...PURCHASING_FULL, 'pur-invoicing', 'prj-forecast']),
    profile('ap', { fr: 1 }, ['fin-ap', 'fin-tax']),
    profile('audit', { fr: 4 }, [
      'fin-accounting',
      'fin-ar',
      'fin-ap',
      'fin-tax',
      'fin-cost',
      'fin-collection',
      'fin-audit',
      'fin-tax-reporting',
      'fin-perf',
      'fin-treasury',
      'fin-reports',
    ]),
    profile('sales-manager', { fr: 5 }, ['sal-quotes', 'sal-orders', 'sal-product-view', 'sal-customer-view']),
    profile('full-appro', { fr: 10 }, PURCHASING_FULL),
    profile('light-appro', { fr: 60 }, [
      'pur-requisitions',
      'pur-orders',
      'pur-receiving',
      'pur-supplier-view',
      'pur-agreement-view',
      'pur-approve',
    ]),
    profile('mes-device', { fr: 50 }, ['prd-device']),
    profile('wms-device', { fr: 40 }, ['whs-device']),
  ],
};

describe('computeProject — parity with the reference workbook', () => {
  const { totals } = computeProject(sample);

  it('matches the base and add-on counters (rows 165/166)', () => {
    expect(totals.totalBase).toBe(29);
    expect(totals.totalAddOn).toBe(4);
  });

  it('matches the additional licence counters (rows 167/168/169)', () => {
    expect(totals.activity).toBe(65);
    expect(totals.teamMembers).toBe(8);
    expect(totals.device).toBe(90);
  });

  it('matches the base licence allocation (rows 171:176)', () => {
    expect(totals.base).toEqual({
      finance: 17,
      financePremium: 0,
      supplyChain: 12,
      supplyChainPremium: 0,
      commerce: 0,
      projectOperations: 0,
      humanResources: 0,
      fullCrossApps: 0,
    });
  });

  it('matches the attach licence allocation (rows 177:182)', () => {
    expect(totals.attach).toEqual({
      finance: 2,
      financePremium: 0,
      supplyChain: 0,
      supplyChainPremium: 0,
      commerce: 0,
      projectOperations: 2,
      humanResources: 0,
      fullCrossApps: 0,
    });
  });

  it('splits totals per legal entity without changing licence decisions', () => {
    const { byLegalEntity } = computeProject(sample);
    expect(byLegalEntity.fr.base.finance).toBe(15);
    expect(byLegalEntity.uk.base.finance).toBe(2);
    expect(byLegalEntity.in.totalBase).toBe(0);
  });
});

describe('computeProject — priority rules', () => {
  it('never issues an Activity licence to a user who already holds a base licence', () => {
    const result = computeProject({
      ...sample,
      profiles: [profile('mixed', { fr: 3 }, ['fin-accounting', 'sal-quotes', 'exp-create'])],
    });
    expect(result.totals.totalBase).toBe(3);
    expect(result.totals.activity).toBe(0);
    expect(result.totals.teamMembers).toBe(0);
  });

  it('prefers Activity over Team Members for a user without a base licence', () => {
    const result = computeProject({
      ...sample,
      profiles: [profile('light', { fr: 3 }, ['sal-quotes', 'exp-create'])],
    });
    expect(result.totals.activity).toBe(3);
    expect(result.totals.teamMembers).toBe(0);
  });

  it('assigns SCM as base and Finance as attach when both families are needed', () => {
    const result = computeProject({
      ...sample,
      profiles: [profile('both', { fr: 4 }, ['whs-planning', 'fin-accounting'])],
    });
    expect(result.totals.base.supplyChain).toBe(4);
    expect(result.totals.base.finance).toBe(0);
    expect(result.totals.attach.finance).toBe(4);
  });
});

describe('computeProject — standard security roles', () => {
  it('derives the licence from an assigned standard role', () => {
    const result = computeProject({
      ...sample,
      profilingMode: 'roles',
      profiles: [profile('ap', { fr: 3 }, [], ['fin-accounts-payable-clerk'])],
    });
    expect(result.totals.base.finance).toBe(3);
    expect(result.totals.totalBase).toBe(3);
  });

  it('keeps a Team Members role at Team Members level', () => {
    const result = computeProject({
      ...sample,
      profilingMode: 'roles',
      profiles: [profile('ess', { fr: 12 }, [], ['hum-self-service-employee'])],
    });
    expect(result.totals.teamMembers).toBe(12);
    expect(result.totals.totalBase).toBe(0);
  });
});

describe('computeProject — profiling mode isolation', () => {
  const mixed = profile('mixed', { fr: 5 }, ['fin-accounting'], ['sup-warehouse-manager']);

  it('ignores standard roles while profiling by business process', () => {
    const result = computeProject({ ...sample, profilingMode: 'processes', profiles: [mixed] });
    expect(result.totals.base.finance).toBe(5);
    expect(result.totals.base.supplyChain).toBe(0);
    expect(result.totals.totalAddOn).toBe(0);
  });

  it('ignores business processes while profiling by standard role', () => {
    const result = computeProject({ ...sample, profilingMode: 'roles', profiles: [mixed] });
    expect(result.totals.base.supplyChain).toBe(5);
    expect(result.totals.base.finance).toBe(0);
    expect(result.totals.attach.finance).toBe(0);
    expect(result.totals.totalAddOn).toBe(0);
  });

  it('restores the previous result when switching back', () => {
    const first = computeProject({ ...sample, profilingMode: 'processes', profiles: [mixed] });
    computeProject({ ...sample, profilingMode: 'roles', profiles: [mixed] });
    const again = computeProject({ ...sample, profilingMode: 'processes', profiles: [mixed] });
    expect(again.totals).toEqual(first.totals);
  });
});

describe('computeProject — Premium editions', () => {
  it('requires Finance Premium to create plans, budgets and forecasts', () => {
    const result = computeProject({
      ...sample,
      profiles: [profile('fpa', { fr: 6 }, ['bpp-admin'])],
    });
    expect(result.totals.base.financePremium).toBe(6);
    expect(result.totals.base.finance).toBe(0);
  });

  it('absorbs the standard edition instead of adding it as an attach licence', () => {
    const result = computeProject({
      ...sample,
      profiles: [profile('controller', { fr: 4 }, ['bpp-admin', 'fin-accounting', 'bpa-reporting'])],
    });
    expect(result.totals.base.financePremium).toBe(4);
    expect(result.totals.attach.finance).toBe(0);
    expect(result.totals.totalAddOn).toBe(0);
  });

  it('requires SCM Premium for full demand planning but not for read-only', () => {
    const readOnly = computeProject({
      ...sample,
      profiles: [profile('planner', { fr: 3 }, ['demand-planning-read'])],
    });
    expect(readOnly.totals.base.supplyChain).toBe(3);
    expect(readOnly.totals.base.supplyChainPremium).toBe(0);

    const full = computeProject({
      ...sample,
      profiles: [profile('planner', { fr: 3 }, ['demand-planning-full'])],
    });
    expect(full.totals.base.supplyChainPremium).toBe(3);
    expect(full.totals.base.supplyChain).toBe(0);
  });

  it('gives the base licence to the Premium edition when both families are needed', () => {
    const result = computeProject({
      ...sample,
      profiles: [profile('mixed', { fr: 2 }, ['demand-planning-full', 'fin-accounting'])],
    });
    expect(result.totals.base.supplyChainPremium).toBe(2);
    expect(result.totals.attach.finance).toBe(2);
    expect(result.totals.totalAddOn).toBe(2);
  });

  it('maps the Demand Planning Manager role to SCM Premium', () => {
    const result = computeProject({
      ...sample,
      profilingMode: 'roles',
      profiles: [profile('dp', { fr: 1 }, [], ['sup-demand-planning-manager'])],
    });
    expect(result.totals.base.supplyChainPremium).toBe(1);
  });
});
