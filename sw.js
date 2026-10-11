/* v6 — PayLoop — Service Worker: إشعارات الهاتف (Web Push) + شاشة «لا يوجد إنترنت» عند فتح التطبيق بدون شبكة. لا يخزّن أي صفحات ولا بيانات: التطبيق يعمل أونلاين فقط. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

/* فتح التطبيق بدون إنترنت: بدل صفحة المتصفح الرمادية تظهر شاشة PayLoop. لا يوجد أي تخزين: إن نجح الطلب يُمرَّر كما هو دون تدخل. */
var OFFLINE_HTML = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#05070d"><title>PayLoop</title>' +
  '<style>html,body{margin:0;height:100%;background:#05070d;color:#fff;font-family:Tajawal,system-ui,sans-serif}body{display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:28px;box-sizing:border-box;background:radial-gradient(120% 80% at 50% 0,#0c1424,#05070d 70%)}' +
  '.i{font-size:56px;margin-bottom:22px}h1{margin:0 0 10px;font-size:22px;color:#fbbf24}p{margin:0 0 28px;color:#cbd5e1;line-height:1.9;font-size:14.5px}' +
  'button{font:900 16px Tajawal,system-ui,sans-serif;color:#1a1200;border:0;border-radius:16px;padding:14px 34px;min-width:210px;background:linear-gradient(135deg,#ffd60a,#ffa200)}small{display:block;margin-top:22px;color:#7c8aa3;font-size:12px}</style></head>' +
  '<body><div class="i">\ud83d\udce1</div><h1>\u0644\u0627 \u064a\u0648\u062c\u062f \u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a</h1>' +
  '<p>\u064a\u0628\u062f\u0648 \u0623\u0646 \u0627\u062a\u0635\u0627\u0644\u0643 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u0627\u0646\u0642\u0637\u0639.<br>\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629.</p>' +
  '<button onclick="location.reload()">\ud83d\udd04 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629</button><small>\u0646\u062a\u062d\u0642\u0642 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0648\u064a\u0639\u0648\u062f \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0641\u0648\u0631 \u0631\u062c\u0648\u0639 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a</small>' +
  '<script>setInterval(function(){fetch(location.href,{cache:"no-store"}).then(function(r){if(r.status!==503)location.reload();}).catch(function(){});},3000)<\/script></body></html>';
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.mode !== 'navigate') return;
  e.respondWith(fetch(r).catch(function () {
    return new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }));
});

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
