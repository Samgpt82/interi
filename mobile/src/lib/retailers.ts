import type { ShoppingCountry } from '@/lib/interi';

export interface Retailer {
  name: string;
  getUrl: (query: string) => string;
}

export interface ShoppingMarket {
  code: ShoppingCountry;
  name: string;
  flag: string;
  currencyLabel: string;
  retailers: Retailer[];
}

const encoded = (query: string): string => encodeURIComponent(query);

export const SHOPPING_MARKETS: ShoppingMarket[] = [
  {
    code: 'SE',
    name: 'Sweden',
    flag: '🇸🇪',
    currencyLabel: 'Swedish kronor (SEK)',
    retailers: [
      { name: 'Google', getUrl: (query) => `https://www.google.se/search?tbm=shop&q=${encoded(query)}` },
      { name: 'Amazon.se', getUrl: (query) => `https://www.amazon.se/s?k=${encoded(query)}` },
      { name: 'IKEA', getUrl: (query) => `https://www.ikea.com/se/sv/search/?q=${encoded(query)}` },
      { name: 'JYSK', getUrl: (query) => `https://jysk.se/search?query=${encoded(query)}` },
      { name: 'Nordic Nest', getUrl: (query) => `https://www.nordicnest.se/sok/?q=${encoded(query)}` },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currencyLabel: 'British pounds (GBP)',
    retailers: [
      { name: 'Google', getUrl: (query) => `https://www.google.co.uk/search?tbm=shop&q=${encoded(query)}` },
      { name: 'Amazon.co.uk', getUrl: (query) => `https://www.amazon.co.uk/s?k=${encoded(query)}` },
      { name: 'Wayfair', getUrl: (query) => `https://www.wayfair.co.uk/keyword.php?keyword=${encoded(query)}` },
      { name: 'IKEA', getUrl: (query) => `https://www.ikea.com/gb/en/search/?q=${encoded(query)}` },
    ],
  },
];

export function getShoppingMarket(country: ShoppingCountry): ShoppingMarket {
  return SHOPPING_MARKETS.find((market) => market.code === country) ?? SHOPPING_MARKETS[0]!;
}
