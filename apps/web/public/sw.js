/**
 * Service Worker for Web Push Notifications.
 * Handles push events and notification clicks.
 */

// eslint-disable-next-line no-undef
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, url, icon } = data;

  const options = {
    body: body || '',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: url || '/' },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    // eslint-disable-next-line no-undef
    self.registration.showNotification(title || 'PropAgent', options)
  );
});

// eslint-disable-next-line no-undef
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    // eslint-disable-next-line no-undef
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      // eslint-disable-next-line no-undef
      return clients.openWindow(url);
    })
  );
});
