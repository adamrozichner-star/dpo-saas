// Seed URLs for the regulatory ingest pipeline.
//
// v1 corpus from Amir's research — Israeli Privacy Protection Authority
// landing/index pages. Note: these are SPA-rendered index pages on
// gov.il; static HTML parse will yield meta tags + Open Graph data but
// not the linked document list (which loads via JS).
//
// TODO (v2): build an index-page recursive walker — fetch the index,
// extract document links (either via discovered JSON endpoints or
// headless-browser render), queue each linked doc URL for ingest.
// Estimated >30 min of work — deferred per spec.
//
// TODO (v1.5): replace these index URLs with hardcoded direct doc URLs
// once Amir/Roy curate 5-10 specific תיקון 13/14/15 documents.

import type { RegulatorySourceOrg } from '@/lib/types/regulatory';

export interface SeedUrl {
  url: string;
  source_org: RegulatorySourceOrg;
  title_override?: string;
}

export const SEED_URLS: SeedUrl[] = [
  {
    url: 'https://www.gov.il/he/departments/legalInfo/?OfficeId=4aadba43-3d71-4e7c-a4fe-5bf47b723d4e',
    source_org: 'privacy_protection_authority',
    title_override: 'רשות הגנת הפרטיות — מידע משפטי',
  },
  {
    url: 'https://www.gov.il/he/departments/publications/?OfficeId=4aadba43-3d71-4e7c-a4fe-5bf47b723d4e',
    source_org: 'privacy_protection_authority',
    title_override: 'רשות הגנת הפרטיות — פרסומים',
  },
  {
    url: 'https://www.gov.il/he/departments/policies/?OfficeId=4aadba43-3d71-4e7c-a4fe-5bf47b723d4e',
    source_org: 'privacy_protection_authority',
    title_override: 'רשות הגנת הפרטיות — מדיניות',
  },
];
