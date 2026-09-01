import { SHOPPING_COUNTRIES, type ShoppingCountry } from '@/lib/interi';

export type CountryDetectionMethod = 'locale' | 'time-zone' | 'fallback';

export interface ShoppingCountrySuggestion {
  country: ShoppingCountry;
  method: CountryDetectionMethod;
  regionCode?: string;
}

const SUPPORTED_COUNTRIES = new Set<string>(SHOPPING_COUNTRIES);

const TIME_ZONE_COUNTRIES: Record<string, ShoppingCountry> = {
  'Europe/London': 'GB',
  'Europe/Stockholm': 'SE',
};

function getRegionCode(locale: string): string | undefined {
  const parts = locale.replace('_', '-').split('-');

  for (let index = parts.length - 1; index > 0; index -= 1) {
    const part = parts[index];
    if (/^[a-zA-Z]{2}$/.test(part)) return part.toUpperCase();
  }

  return undefined;
}

export function detectShoppingCountry(): ShoppingCountrySuggestion {
  const navigatorLocales = typeof navigator === 'undefined'
    ? []
    : [...(navigator.languages ?? []), navigator.language];
  const resolvedLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  const locales = [...navigatorLocales, resolvedLocale].filter((locale): locale is string => Boolean(locale));

  for (const locale of locales) {
    const regionCode = getRegionCode(locale);
    if (regionCode && SUPPORTED_COUNTRIES.has(regionCode)) {
      return { country: regionCode as ShoppingCountry, method: 'locale', regionCode };
    }
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZoneCountry = timeZone ? TIME_ZONE_COUNTRIES[timeZone] : undefined;
  if (timeZoneCountry) {
    return { country: timeZoneCountry, method: 'time-zone', regionCode: timeZoneCountry };
  }

  const regionCode = locales.map(getRegionCode).find(Boolean);
  return { country: 'GB', method: 'fallback', regionCode };
}
