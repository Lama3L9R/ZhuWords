export interface MirrorSite {
  name: string;
  origin: string;
  provider: string;
  technology: string;
}

export const mirrorSites: Array<MirrorSite> = [
    {
        name: '寄の镜像站',
        origin: 'https://zw.fuckyou.icu/',
        provider: 'nofated',
        technology: '寄的魔法'
    }
];

export const mainSite: MirrorSite = {
  name: 'zw.lama.icu（主站）',
  origin: 'https://zw.lama.icu',
  provider: 'Lama',
  technology: 'Aliyun HK',
};

export const mirrorSitesPlusMainSite: Array<MirrorSite> = [mainSite, ...mirrorSites];
