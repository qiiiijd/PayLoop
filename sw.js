/* PayLoop — Service Worker: يستقبل إشعارات الهاتف (Web Push) فقط. لا يخزّن أي صفحات ولا يتدخل في تحميل التطبيق. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { title: 'PayLoop', body: e.data.text() }; } catch (y) { d = {}; } }
  e.waitUntil((async function () {
    var cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    cs.forEach(function (c) { try { c.postMessage({ type: 'push', go: d.go || null }); } catch (x) {} });
    if (cs.some(function (c) { return c.visibilityState === 'visible'; })) return;   // التطبيق مفتوح أمام المستخدم: الجرس داخل التطبيق يكفي
    await self.registration.showNotification(String(d.title || 'PayLoop').slice(0, 100), {
      body: String(d.body || '').slice(0, 200), tag: d.tag || undefined, icon: 'icon-192.png', badge: 'icon-192.png',
      data: { go: d.go || null }, dir: 'auto'
    });
  })());
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var go = (e.notification.data && e.notification.data.go) || null;
  e.waitUntil((async function () {
    var cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (var i = 0; i < cs.length; i++) {
      if ('focus' in cs[i]) { try { await cs[i].focus(); cs[i].postMessage({ type: 'go', go: go }); return; } catch (x) {} }
    }
    var base = self.registration.scope;
    if (self.clients.openWindow) await self.clients.openWindow(base + (go ? '#go=' + encodeURIComponent(go) : ''));
  })());
});
