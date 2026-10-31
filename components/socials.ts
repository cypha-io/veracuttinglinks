export type Social = {
  name: string;
  link: string;
  handle?: string;
  helpWith?: string;
};

export const BUSINESS_PHONE = '+233 (0) 244 932 380';
export const BUSINESS_PHONE_LINK = 'tel:+233244932380';
export const BUSINESS_LOCATION = 'Lashibi, Greater Accra. P/C GT 351-7949';

export const SOCIALS: Social[] = [
  {
    name: 'Call Us',
    link: BUSINESS_PHONE_LINK,
    handle: BUSINESS_PHONE,
    helpWith: `Call ${BUSINESS_PHONE} for support and orders`,
  },
];

export default SOCIALS;
