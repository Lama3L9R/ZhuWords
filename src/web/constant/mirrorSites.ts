export interface MirrorSite {
  name: string;
  origin: string;
  provider: string;
  technology: string;
}

export const mirrorSites: Array<MirrorSite> = [
    {
        name: 'Bypass-CloudFlare CDN（请忽略SSL警告）',
        origin: 'https://bypass.zw.lama.icu',
        provider: 'Lama',
        technology: 'Aliyun HK',
    }
];

export const mainSite: MirrorSite = {
  name: 'zw.lama.icu（主站）',
  origin: 'https://zw.lama.icu',
  provider: 'Lama',
  technology: 'Aliyun HK with CloudFlare CDN',
};

export const mirrorSitesPlusMainSite: Array<MirrorSite> = [mainSite, ...mirrorSites];
