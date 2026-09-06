import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NotificationsProvider, useNotifications } from '../NotificationsContext';
import { MembersProvider, useMembers } from '../MembersContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationsProvider>{children}</NotificationsProvider>
);

// NOT: addNotification/markAllRead giriş yapılmadan da (in-memory) çalışır — yalnızca
// DİSKE yazma bir hesaba bağlıdır (bkz. NotificationsContext.tsx). Hesaba özel
// kalıcılığı ve izolasyonu test edebilmek için bu ek testler MembersProvider'ı da
// sarmalıyor.
const wrapperWithMembers = ({ children }: { children: React.ReactNode }) => (
  <MembersProvider>
    <NotificationsProvider>{children}</NotificationsProvider>
  </MembersProvider>
);

function useHarness() {
  const members = useMembers();
  const notifications = useNotifications();
  return { members, notifications };
}

let emailCounter = 0;

async function flushPendingEffects() {
  await act(async () => {
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderLoggedInHarness() {
  const rendered = renderHook(() => useHarness(), { wrapper: wrapperWithMembers });
  await flushPendingEffects();

  const email = `test-${++emailCounter}@example.com`;

  await act(async () => {
    rendered.result.current.members.registerMember({
      fullName: 'Test User',
      email,
      password: 'password123',
    });
  });

  await waitFor(() => {
    expect(rendered.result.current.members.currentUser).not.toBeNull();
  });

  await flushPendingEffects();

  return rendered;
}

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

  it('keeps a new account added notification isolated from a different account', async () => {
    const first = await renderLoggedInHarness();
    act(() => {
      first.result.current.notifications.addNotification('Sadece birinci hesapta', 'İçerik');
    });
    expect(
      first.result.current.notifications.notifications.some((n) => n.title === 'Sadece birinci hesapta')
    ).toBe(true);

    const second = await renderLoggedInHarness();
    expect(
      second.result.current.notifications.notifications.some((n) => n.title === 'Sadece birinci hesapta')
    ).toBe(false);
  });

  it('clearAll resets the current account back to the default welcome notification', async () => {
    const { result } = await renderLoggedInHarness();
    act(() => {
      result.current.notifications.addNotification('Silinecek Bildirim', 'İçerik');
    });
    expect(result.current.notifications.notifications.some((n) => n.title === 'Silinecek Bildirim')).toBe(true);

    act(() => {
      result.current.notifications.clearAll();
    });
    expect(result.current.notifications.notifications.some((n) => n.title === 'Silinecek Bildirim')).toBe(false);
    expect(result.current.notifications.notifications.some((n) => n.id === 'welcome')).toBe(true);
  });
});
