import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { UsageStatsProvider, useUsageStats } from '../UsageStatsContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UsageStatsProvider>{children}</UsageStatsProvider>
);

describe('UsageStatsContext', () => {
  it('starts with no recorded stats', () => {
    const { result } = renderHook(() => useUsageStats(), { wrapper });
    expect(result.current.stats).toEqual({});
  });

  it('recordView increments the view count for a motor', () => {
    const { result } = renderHook(() => useUsageStats(), { wrapper });
    act(() => {
      result.current.recordView('motor-a');
    });
    expect(result.current.stats['motor-a'].views).toBe(1);
    expect(result.current.stats['motor-a'].compares).toBe(0);
  });

  it('recordCompare increments the compare count for a motor', () => {
    const { result } = renderHook(() => useUsageStats(), { wrapper });
    act(() => {
      result.current.recordCompare('motor-b');
    });
    expect(result.current.stats['motor-b'].compares).toBe(1);
    expect(result.current.stats['motor-b'].views).toBe(0);
  });

  it('accumulates multiple views for the same motor', () => {
    const { result } = renderHook(() => useUsageStats(), { wrapper });
    act(() => {
      result.current.recordView('motor-c');
      result.current.recordView('motor-c');
      result.current.recordView('motor-c');
    });
    expect(result.current.stats['motor-c'].views).toBe(3);
  });

  it('getTopMotorIds excludes motors with zero score', () => {
    const { result } = renderHook(() => useUsageStats(), { wrapper });
    expect(result.current.getTopMotorIds(5)).toEqual([]);
  });

  it('getTopMotorIds ranks compares higher than views (2x weight)', () => {
    const { result } = renderHook(() => useUsageStats(), { wrapper });
    act(() => {
      // motor-views: 3 görüntülenme = skor 3
      result.current.recordView('motor-views');
      result.current.recordView('motor-views');
      result.current.recordView('motor-views');
      // motor-compares: 2 karşılaştırma = skor 4 (2*2)
      result.current.recordCompare('motor-compares');
      result.current.recordCompare('motor-compares');
    });

    const top = result.current.getTopMotorIds(2);
    expect(top[0]).toBe('motor-compares');
    expect(top[1]).toBe('motor-views');
  });

  it('getTopMotorIds respects the limit parameter', () => {
    const { result } = renderHook(() => useUsageStats(), { wrapper });
    act(() => {
      result.current.recordView('m1');
      result.current.recordView('m2');
      result.current.recordView('m3');
    });
    expect(result.current.getTopMotorIds(2).length).toBe(2);
  });
});
