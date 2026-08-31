import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronUp, ExternalLink, ShoppingBag, Sparkles, WandSparkles, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { COLORS, type DesignItem } from '@/lib/interi';

interface DesignItemsProps {
  items: DesignItem[];
  loading: boolean;
  onRefine: (instruction: string) => void;
}

const RETAILERS = [
  { name: 'Google', getUrl: (query: string) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}` },
  { name: 'Amazon', getUrl: (query: string) => `https://www.amazon.co.uk/s?k=${encodeURIComponent(query)}` },
  { name: 'Wayfair', getUrl: (query: string) => `https://www.wayfair.co.uk/keyword.php?keyword=${encodeURIComponent(query)}` },
  { name: 'IKEA', getUrl: (query: string) => `https://www.ikea.com/gb/en/search/?q=${encodeURIComponent(query)}` },
] as const;

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function DesignItems({ items, loading, onRefine }: DesignItemsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id ?? null);

  const runRefinement = (instruction: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRefine(`${instruction} Keep the room architecture, camera angle, lighting, and every other design choice unchanged.`);
  };

  const openRetailer = (url: string) => {
    void Haptics.selectionAsync();
    void Linking.openURL(url);
  };

  return (
    <View testID="design-items-section" className="mt-9 overflow-hidden rounded-[28px] border" style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
      <View className="flex-row items-center border-b px-5 py-5" style={{ borderBottomColor: COLORS.line }}>
        <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: '#F3E3C3' }}>
          <ShoppingBag size={18} color="#A56C11" strokeWidth={1.8} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-lg" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>Items in this design</Text>
          <Text className="mt-0.5 text-xs" style={{ color: COLORS.olive }}>Tap an item to shop, recolour or replace it</Text>
        </View>
        <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: '#EEE7DB' }}>
          <Text className="text-xs font-semibold" style={{ color: COLORS.oliveDark }}>{items.length}</Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View testID="design-items-empty" className="items-center px-7 py-9">
          <Sparkles size={24} color={COLORS.coral} />
          <Text className="mt-3 text-center text-base" style={{ color: COLORS.espresso, fontFamily: 'Georgia' }}>Shopping details are still being composed.</Text>
          <Text className="mt-2 text-center text-xs leading-5" style={{ color: COLORS.olive }}>Create or refine the room once more to generate its item list.</Text>
        </View>
      ) : null}

      {items.map((item, index) => {
        const expanded = expandedId === item.id;
        const itemSlug = slug(item.id || item.name);
        return (
          <View key={`${item.id}-${index}`} className={index > 0 ? 'border-t' : undefined} style={{ borderTopColor: COLORS.line }}>
            <Pressable
              testID={`design-item-${itemSlug}`}
              onPress={() => {
                setExpandedId(expanded ? null : item.id);
                void Haptics.selectionAsync();
              }}
              className="min-h-[78px] flex-row items-center px-5 py-4 active:opacity-70">
              <Text className="w-10 text-2xl">{item.emoji}</Text>
              <View className="ml-2 flex-1 pr-3">
                <Text className="text-[15px] font-semibold" style={{ color: COLORS.espresso }}>{item.name}</Text>
                <Text className="mt-1 text-xs capitalize" style={{ color: COLORS.olive }}>{item.color} · {item.material}</Text>
              </View>
              <View className="items-end">
                <Text className="text-xs" style={{ color: COLORS.oliveDark }}>{item.priceRange}</Text>
                {expanded ? <ChevronUp size={17} color={COLORS.olive} style={{ marginTop: 7 }} /> : <ChevronDown size={17} color={COLORS.olive} style={{ marginTop: 7 }} />}
              </View>
            </Pressable>

            {expanded ? (
              <View testID={`design-item-details-${itemSlug}`} className="border-t px-5 pb-5 pt-4" style={{ borderTopColor: COLORS.line, backgroundColor: '#F8F4EC' }}>
                <Text className="text-sm leading-5" style={{ color: COLORS.oliveDark }}>{item.description}</Text>

                <Text className="mt-5 text-[10px] font-semibold uppercase tracking-[1.8px]" style={{ color: COLORS.olive }}>Shop similar</Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {RETAILERS.map((retailer) => (
                    <Pressable
                      key={retailer.name}
                      testID={`shop-${retailer.name.toLowerCase()}-${itemSlug}`}
                      onPress={() => openRetailer(retailer.getUrl(item.searchTerms))}
                      className="min-h-10 flex-row items-center justify-center rounded-full border px-3.5 active:opacity-60"
                      style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper }}>
                      <Text className="text-xs font-medium" style={{ color: COLORS.espresso }}>{retailer.name}</Text>
                      <ExternalLink size={12} color={COLORS.olive} style={{ marginLeft: 6 }} />
                    </Pressable>
                  ))}
                </View>

                <Text className="mt-5 text-[10px] font-semibold uppercase tracking-[1.8px]" style={{ color: COLORS.olive }}>Try another colour</Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {item.colorOptions.map((color) => (
                    <Pressable
                      key={color.name}
                      testID={`color-${slug(color.name)}-${itemSlug}`}
                      disabled={loading}
                      onPress={() => runRefinement(`Change only the ${item.name} from ${item.color} to ${color.name}.`)}
                      className="min-h-10 flex-row items-center rounded-full border px-3 active:opacity-60"
                      style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper, opacity: loading ? 0.55 : 1 }}>
                      <View className="h-4 w-4 rounded-full border" style={{ backgroundColor: color.hex, borderColor: 'rgba(42,33,28,0.18)' }} />
                      <Text className="ml-2 text-xs capitalize" style={{ color: COLORS.espresso }}>{color.name}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text className="mt-5 text-[10px] font-semibold uppercase tracking-[1.8px]" style={{ color: COLORS.olive }}>Swap for something else</Text>
                <View className="mt-2 gap-2">
                  {item.swapSuggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      testID={`swap-${slug(suggestion)}-${itemSlug}`}
                      disabled={loading}
                      onPress={() => runRefinement(`Replace only the ${item.name} with a ${suggestion}.`)}
                      className="min-h-12 flex-row items-center rounded-2xl border px-4 active:opacity-60"
                      style={{ borderColor: COLORS.line, backgroundColor: COLORS.paper, opacity: loading ? 0.55 : 1 }}>
                      <WandSparkles size={15} color="#B67B19" />
                      <Text className="ml-3 flex-1 text-sm" style={{ color: COLORS.espresso }}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  testID={`remove-${itemSlug}`}
                  disabled={loading}
                  onPress={() => runRefinement(`Remove the ${item.name} and leave the space naturally balanced without replacing it.`)}
                  className="mt-4 min-h-12 flex-row items-center justify-center rounded-2xl border active:opacity-60"
                  style={{ borderColor: COLORS.line, opacity: loading ? 0.55 : 1 }}>
                  <X size={15} color={COLORS.oliveDark} />
                  <Text className="ml-2 text-sm font-medium" style={{ color: COLORS.oliveDark }}>Remove this item</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      {items.length > 0 ? (
        <Text className="border-t px-5 py-4 text-[10px] leading-4" style={{ borderTopColor: COLORS.line, color: COLORS.olive }}>
          Prices are broad estimates. Retailer buttons open searches for visually similar products, not guaranteed exact matches.
        </Text>
      ) : null}
    </View>
  );
}
