import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '../theme/theme';

type Props = {
  score: number;
  size?: number;
  stroke?: number;
  color?: string;
  max?: number;
};

export function ScoreRing({ score, size = 76, stroke = 6, color = colors.chart3, max = 10 }: Props) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(score / max, 1) * circ;
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.muted} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.inner}>
          <Text style={{ fontFamily: fonts.heading.bold, fontSize: size * 0.24, color: colors.foreground, lineHeight: size * 0.24 }}>
            {score.toFixed(1)}
          </Text>
          <Text style={{ fontSize: 9, color: colors.mutedForeground, marginTop: 4 }}>/ 10</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
