import type { DesignItem, ShoppingCountry } from '@/lib/interi';

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

type SearchableDesignItem = Pick<DesignItem, 'name' | 'searchTerms'>;

interface ProductCategory {
  query: string;
  keywords: string[];
}

const encoded = (query: string): string => encodeURIComponent(query);

const PRODUCT_CATEGORIES: Record<ShoppingCountry, ProductCategory[]> = {
  SE: [
    { query: 'tv-bänk', keywords: ['tv-bänk', 'tv bänk', 'media console', 'media unit'] },
    { query: 'nattduksbord', keywords: ['nattduksbord', 'sängbord', 'bedside table', 'nightstand'] },
    { query: 'soffbord', keywords: ['soffbord', 'coffee table'] },
    { query: 'matbord', keywords: ['matbord', 'dining table'] },
    { query: 'skrivbord', keywords: ['skrivbord', 'desk'] },
    { query: 'sidobord', keywords: ['sidobord', 'side table'] },
    { query: 'bokhylla', keywords: ['bokhylla', 'bookshelf', 'bookcase'] },
    { query: 'skänk', keywords: ['skänk', 'sideboard'] },
    { query: 'matstol', keywords: ['matstol', 'dining chair'] },
    { query: 'fåtölj', keywords: ['fåtölj', 'armchair', 'lounge chair'] },
    { query: 'soffa', keywords: ['soffa', 'sofa', 'couch'] },
    { query: 'säng', keywords: ['säng', 'bed'] },
    { query: 'golvlampa', keywords: ['golvlampa', 'floor lamp'] },
    { query: 'bordslampa', keywords: ['bordslampa', 'table lamp'] },
    { query: 'vägglampa', keywords: ['vägglampa', 'wall lamp', 'wall light'] },
    { query: 'taklampa', keywords: ['taklampa', 'hänglampa', 'pendel', 'ceiling light', 'pendant light', 'chandelier'] },
    { query: 'matta', keywords: ['matta', 'rug'] },
    { query: 'pläd', keywords: ['pläd', 'throw'] },
    { query: 'kudde', keywords: ['kudde', 'cushion', 'pillow'] },
    { query: 'gardin', keywords: ['gardin', 'curtain'] },
    { query: 'spegel', keywords: ['spegel', 'mirror'] },
    { query: 'puff', keywords: ['puff', 'ottoman', 'pouf'] },
    { query: 'vas', keywords: ['vas', 'vase'] },
    { query: 'stol', keywords: ['stol', 'chair'] },
    { query: 'bord', keywords: ['bord', 'table'] },
    { query: 'lampa', keywords: ['lampa', 'lamp', 'light'] },
  ],
  GB: [
    { query: 'TV stand', keywords: ['tv stand', 'media console', 'media unit', 'tv-bänk'] },
    { query: 'bedside table', keywords: ['bedside table', 'nightstand', 'nattduksbord', 'sängbord'] },
    { query: 'coffee table', keywords: ['coffee table', 'soffbord'] },
    { query: 'dining table', keywords: ['dining table', 'matbord'] },
    { query: 'desk', keywords: ['desk', 'skrivbord'] },
    { query: 'side table', keywords: ['side table', 'sidobord'] },
    { query: 'bookcase', keywords: ['bookcase', 'bookshelf', 'bokhylla'] },
    { query: 'sideboard', keywords: ['sideboard', 'skänk'] },
    { query: 'dining chair', keywords: ['dining chair', 'matstol'] },
    { query: 'armchair', keywords: ['armchair', 'lounge chair', 'fåtölj'] },
    { query: 'sofa', keywords: ['sofa', 'couch', 'soffa'] },
    { query: 'bed', keywords: ['bed', 'säng'] },
    { query: 'floor lamp', keywords: ['floor lamp', 'golvlampa'] },
    { query: 'table lamp', keywords: ['table lamp', 'bordslampa'] },
    { query: 'wall light', keywords: ['wall light', 'wall lamp', 'vägglampa'] },
    { query: 'ceiling light', keywords: ['ceiling light', 'pendant light', 'chandelier', 'taklampa', 'hänglampa', 'pendel'] },
    { query: 'rug', keywords: ['rug', 'matta'] },
    { query: 'throw', keywords: ['throw', 'pläd'] },
    { query: 'cushion', keywords: ['cushion', 'pillow', 'kudde'] },
    { query: 'curtain', keywords: ['curtain', 'gardin'] },
    { query: 'mirror', keywords: ['mirror', 'spegel'] },
    { query: 'ottoman', keywords: ['ottoman', 'pouf', 'puff'] },
    { query: 'vase', keywords: ['vase', 'vas'] },
    { query: 'chair', keywords: ['chair', 'stol'] },
    { query: 'table', keywords: ['table', 'bord'] },
    { query: 'lamp', keywords: ['lamp', 'light', 'lampa'] },
  ],
};

function normaliseSearchText(value: string): string {
  return ` ${value.normalize('NFKC').toLowerCase().replace(/[‐‑‒–—-]/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function fallbackSearchQuery(name: string): string {
  const simplifiedName = name
    .normalize('NFKC')
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\([^)]*\)/g, ' ')
    .split(/[,;/|]/, 1)[0]
    ?.trim();

  return simplifiedName?.split(/\s+/).slice(0, 4).join(' ') || name.trim();
}

export function getRetailerSearchQuery(item: SearchableDesignItem, country: ShoppingCountry): string {
  const searchableText = normaliseSearchText(`${item.name} ${item.searchTerms}`);
  const category = PRODUCT_CATEGORIES[country].find(({ keywords }) =>
    keywords.some((keyword) => searchableText.includes(normaliseSearchText(keyword)))
  );

  return category?.query ?? fallbackSearchQuery(item.name);
}

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
