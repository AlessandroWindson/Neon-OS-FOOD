const CACHE_NAME = 'neon-food-os-v3';
const DYNAMIC_CACHE_NAME = 'neon-food-os-dynamic-v3';

// Core assets to pre-cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.svg',
  '/alerta-pedido.mp3'
];

// Check if request is a static asset (images, fonts, scripts, stylesheets, audio, svg)
function isStaticAsset(url) {
  return (
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico|json|mp3)$/i) ||
    url.pathname.startsWith('/assets/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  );
}

// 1. Installation: Pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. Activation: Clean up old versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper: Broadcast message to all active window clients
async function broadcastToClients(message) {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage(message);
  }
}

// 3. Fetch Strategy: Cache-First for static assets, Network-First for navigation & dynamic data
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, chrome extensions and other protocols
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // A. Cache-First Strategy for Static Assets (Scripts, Styles, Fonts, Icons, Audio)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache immediately
          return cachedResponse;
        }

        // Otherwise fetch from network, cache dynamically and return
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[SW] Fetch failed for static asset:', request.url, err);
            // Fallback for image requests
            if (request.destination === 'image') {
              return caches.match('/icon.svg');
            }
          });
      })
    );
    return;
  }

  // B. Network-First Strategy for HTML Navigation & Dynamic Requests with Offline Shell Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // First try finding matching cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If it's a page navigation / HTML request and network failed, serve the cached single page app shell
        if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
          const fallbackShell = (await caches.match('/index.html')) || (await caches.match('/'));
          if (fallbackShell) {
            return fallbackShell;
          }
        }

        // For health check route when offline
        if (url.pathname === '/api/health') {
          return new Response(JSON.stringify({ status: 'offline', offline: true, message: 'Operando localmente' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('NEON FOOD OS - Modo Offline do Restaurante Ativo', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      })
  );
});

// 4. Background Sync: Triggered automatically by browser when connection restores
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-restaurant-data' || event.tag === 'neon-sync-orders') {
    event.waitUntil(
      (async () => {
        console.log('[SW Sync] Background Sync disparado pelo navegador! Notificando aplicação cliente.');
        await broadcastToClients({
          type: 'SERVICE_WORKER_BACKGROUND_SYNC',
          timestamp: Date.now(),
          tag: event.tag
        });
      })()
    );
  }
});

// 5. Message Event Listener: Communications between React Client & Service Worker
self.addEventListener('message', async (event) => {
  if (!event.data) return;

  // A. Native Push Notification trigger
  if (event.data.type === 'SHOW_NATIVE_NOTIFICATION') {
    const { title, options } = event.data;
    const notificationOptions = {
      body: options?.body || 'Novo pedido recebido no restaurante.',
      icon: options?.icon || '/icon.svg',
      badge: options?.badge || '/icon.svg',
      tag: options?.tag || `neon_order_${Date.now()}`,
      vibrate: options?.vibrate || [300, 100, 300, 100, 300],
      data: options?.data || { url: '/', targetView: 'kds' },
      requireInteraction: true,
      renotify: true,
      actions: options?.actions || [
        { action: 'open_kds', title: '👨‍🍳 Abrir KDS Cozinha' },
        { action: 'open_orders', title: '📋 Ver Pedidos' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title || '🍔 NEON FOOD OS • Alerta', notificationOptions)
    );
  }

  // B. Client notifies Service Worker to execute batch synchronization
  if (event.data.type === 'SYNC_DATA_BATCH') {
    const actions = event.data.actions || [];
    try {
      const response = await fetch('/api/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions })
      });
      const data = await response.json();
      await broadcastToClients({
        type: 'SW_SYNC_SUCCESS',
        syncedCount: data.syncedCount || actions.length,
        processedIds: data.processedIds || [],
        timestamp: Date.now()
      });
    } catch (err) {
      console.warn('[SW Sync Error]', err);
      await broadcastToClients({
        type: 'SW_SYNC_FAILED',
        error: err.message || 'Falha ao sincronizar dados',
        timestamp: Date.now()
      });
    }
  }

  // C. Ping status check
  if (event.data.type === 'CHECK_SW_STATUS') {
    event.source?.postMessage({
      type: 'SW_STATUS_RESPONSE',
      version: CACHE_NAME,
      status: 'active',
      timestamp: Date.now()
    });
  }
});

// 6. Push Event Listener: Server Webhook Push Notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Novo Pedido no Restaurante!', body: event.data.text() };
    }
  }

  const title = data.title || '🍔 NEON FOOD OS • Novo Pedido!';
  const options = {
    body: data.body || 'Um novo pedido acaba de chegar via Webhook.',
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    tag: data.tag || `order_${Date.now()}`,
    vibrate: data.vibrate || [300, 100, 300, 100, 400],
    data: data.data || { url: '/', targetView: 'kds' },
    requireInteraction: true,
    renotify: true,
    actions: data.actions || [
      { action: 'open_kds', title: '👨‍🍳 Abrir KDS Cozinha' },
      { action: 'open_orders', title: '📋 Ver Pedidos' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 7. Notification Click Handler: Route to KDS / Pedidos / Caixa
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetAction = event.action;
  const notificationData = event.notification.data || {};

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If window is open, focus it and dispatch custom event
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            action: targetAction,
            data: notificationData
          });
          return;
        }
      }

      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(notificationData.url || '/');
      }
    })
  );
});
