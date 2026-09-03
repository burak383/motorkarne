import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { fonts } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  score: number;
  size?: number;
  stroke?: number;
  color?: string;
  max?: number;
};

export function ScoreRing({ score, size = 76, stroke = 6, color, max = 10 }: Props) {
  const { themeColors } = useTheme();
  const ringColor = color ?? themeColors.chart3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(score / max, 1) * circ;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={themeColors.muted} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.inner}>
          <Text style={{ fontFamily: fonts.heading.bold, fontSize: size * 0.24, color: themeColors.foreground, lineHeight: size * 0.24 }}>
            {score.toFixed(1)}
          </Text>
          <Text style={{ fontSize: 9, color: themeColors.mutedForeground, marginTop: 4 }}>/ 10</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
