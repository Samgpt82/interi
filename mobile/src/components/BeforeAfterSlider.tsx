import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { MoveHorizontal } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { COLORS } from '@/lib/interi';

interface BeforeAfterSliderProps {
  beforeUri: string;
  afterUri: string;
}

const MIN_POSITION = 0.08;
const MAX_POSITION = 0.92;

export function BeforeAfterSlider({ beforeUri, afterUri }: BeforeAfterSliderProps) {
  const containerRef = useRef<View | null>(null);
  const [width, setWidth] = useState<number>(0);
  const [containerX, setContainerX] = useState<number | null>(null);
  const [position, setPosition] = useState<number>(0.5);
  const clipWidth = width * position;

  const panResponder = useMemo(() => {
    const updateFromPageX = (pageX: number) => {
      if (!width || containerX === null) return;
      const nextPosition = (pageX - containerX) / width;
      setPosition(Math.min(MAX_POSITION, Math.max(MIN_POSITION, nextPosition)));
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2,
      onPanResponderGrant: (event) => {
        updateFromPageX(event.nativeEvent.pageX);
        void Haptics.selectionAsync();
      },
      onPanResponderMove: (event) => updateFromPageX(event.nativeEvent.pageX),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    });
  }, [containerX, width]);

  const adjustPosition = (change: number) => {
    setPosition((current) => Math.min(MAX_POSITION, Math.max(MIN_POSITION, current + change)));
    void Haptics.selectionAsync();
  };

  return (
    <View
      ref={containerRef}
      testID="before-after-slider"
      accessibilityRole="adjustable"
      accessibilityLabel="Before and after room comparison"
      accessibilityValue={{ min: 8, max: 92, now: Math.round(position * 100), text: `${Math.round(position * 100)} percent original room` }}
      accessibilityActions={[{ name: 'increment', label: 'Show more of the original room' }, { name: 'decrement', label: 'Show more of the redesigned room' }]}
      onAccessibilityAction={(event) => adjustPosition(event.nativeEvent.actionName === 'increment' ? 0.1 : -0.1)}
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width);
        containerRef.current?.measureInWindow((x) => setContainerX(x));
      }}
      {...panResponder.panHandlers}
      className="relative overflow-hidden rounded-[28px]"
      style={{ height: 430, backgroundColor: COLORS.sand }}>
      <Image testID="result-image" source={{ uri: afterUri }} contentFit="cover" style={{ position: 'absolute', width: '100%', height: '100%' }} transition={250} />

      {width > 0 ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: clipWidth, overflow: 'hidden' }}>
          <Image testID="source-image" source={{ uri: beforeUri }} contentFit="cover" style={{ width, height: '100%' }} transition={250} />
        </View>
      ) : null}

      <View pointerEvents="none" style={{ position: 'absolute', left: clipWidth - 1, top: 0, bottom: 0, width: 2, backgroundColor: COLORS.white }} />
      <View
        testID="before-after-slider-handle"
        pointerEvents="none"
        className="absolute h-12 w-12 items-center justify-center rounded-full border"
        style={{
          left: clipWidth - 24,
          top: 191,
          borderColor: 'rgba(42,33,28,0.12)',
          backgroundColor: COLORS.white,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 5,
        }}>
        <MoveHorizontal size={21} color={COLORS.espresso} strokeWidth={1.8} />
      </View>

      <View pointerEvents="none" className="absolute bottom-4 left-4 rounded-full bg-black/65 px-3 py-2">
        <Text className="text-[11px] font-semibold" style={{ color: COLORS.white }}>Before</Text>
      </View>
      <View pointerEvents="none" className="absolute bottom-4 right-4 rounded-full px-3 py-2" style={{ backgroundColor: COLORS.coral }}>
        <Text className="text-[11px] font-semibold" style={{ color: COLORS.white }}>After</Text>
      </View>
    </View>
  );
}
