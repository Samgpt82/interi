import { RefreshCw } from 'lucide-react-native';
import React, { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

interface WorkingSpinnerProps {
  color: string;
  size?: number;
  testID: string;
  accessibilityLabel: string;
}

export function WorkingSpinner({ color, size = 28, testID, accessibilityLabel }: WorkingSpinnerProps) {
  const rotation = useSharedValue<number>(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );

    return () => cancelAnimation(rotation);
  }, [rotation]);

  return (
    <Animated.View
      testID={testID}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      style={animatedStyle}>
      <RefreshCw size={size} color={color} />
    </Animated.View>
  );
}
