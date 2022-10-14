export interface MirrorSite {
  name: string;
  origin: string;
  provider: string;
  technology: string;
}

export const mirrorSites: Array<MirrorSite> = [
];

export const mainSite: MirrorSite = {
  name: 'TODO.URL.REPLACEME（主站）',
  origin: 'https://TODO.URL.REPLACEME',
  provider: 'Lama',
  technology: 'PENDING',
};

export const mirrorSitesPlusMainSite: Array<MirrorSite> = [mainSite, ...mirrorSites];
