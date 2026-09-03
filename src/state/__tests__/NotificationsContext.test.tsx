import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { NotificationsProvider, useNotifications } from '../NotificationsContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationsProvider>{children}</NotificationsProvider>
);

describe('NotificationsContext', () => {
  it('starts with a default welcome notification', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current.notifications.length).toBeGreaterThanOrEqual(1);
    expect(result.current.notifications.some((n) => n.id === 'welcome')).toBe(true);
  });

  it('counts the default welcome notification as unread', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    expect(result.current.unreadCount).toBeGreaterThanOrEqual(1);
  });

  it('addNotification prepends a new unread notification', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    const initialCount = result.current.notifications.length;

    act(() => {
      result.current.addNotification('Test Başlık', 'Test İçerik');
    });

    expect(result.current.notifications.length).toBe(initialCount + 1);
    expect(result.current.notifications[0].title).toBe('Test Başlık');
    expect(result.current.notifications[0].body).toBe('Test İçerik');
    expect(result.current.notifications[0].read).toBe(false);
  });

  it('markAllRead marks every notification as read and zeroes the unread count', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.addNotification('Yeni Bildirim', 'İçerik');
    });
    expect(result.current.unreadCount).toBeGreaterThan(0);

    act(() => {
      result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
  });
});
