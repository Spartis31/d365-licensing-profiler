import { en } from './en';
import { fr } from './fr';
import { da } from './da';
import { de } from './de';
import { es } from './es';
import { it } from './it';
import { pt } from './pt';
import { sv } from './sv';

/** Side-effect free, so the Excel export can read translations outside a browser. */
export const RESOURCES = { en, fr, da, de, es, it, pt, sv } as const;
