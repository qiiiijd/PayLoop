/* v5 — PayLoop — Service Worker: يستقبل إشعارات الهاتف (Web Push) فقط. لا يخزّن أي صفحات ولا يتدخل في تحميل التطبيق. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

/* تسجيل تشخيصي بسيط: متى وصل آخر إشعار وهل نجح عرضه (يقرؤه التطبيق في الإعدادات) */
async function diag(k, v) { try { var c = await caches.open('pl-diag'); await c.put('/' + k, new Response(String(v))); } catch (x) {} }

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { title: 'PayLoop', body: e.data.text() }; } catch (y) { d = {}; } }
  e.waitUntil((async function () {
    /* أولًا: اعرض الإشعار فورًا (لا شيء قبله يؤخّره). بعدها فقط نسجّل التشخيص ونخبر الصفحة المفتوحة. */
    var shown = self.registration.showNotification(String(d.title || 'PayLoop').slice(0, 100), {
      body: String(d.body || '').slice(0, 200), tag: d.tag || undefined, icon: 'icon-192.png', badge: 'badge-96.png?v=5',
      data: { go: d.go || null }, dir: 'auto',
      silent: false, vibrate: [200, 100, 200], timestamp: Date.now(), renotify: !!d.tag
    });
    try { await shown; await diag('last-show', 'ok'); } catch (err) { await diag('last-show', String((err && err.name) || 'error') + ':' + String((err && err.message) || '').slice(0, 80)); }
    await diag('last-push', Date.now());
    try { var cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); cs.forEach(function (c) { try { c.postMessage({ type: 'push', go: d.go || null }); } catch (x) {} }); } catch (x) {}
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
