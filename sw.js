/* v11 — PayLoop — Service Worker: إشعارات الهاتف (Web Push) + شاشة «لا يوجد إنترنت» عند فتح التطبيق بدون شبكة. لا يخزّن أي صفحات ولا بيانات: التطبيق يعمل أونلاين فقط. */
/* رقم الإصدار: يجب أن يطابق window.PL_BUILD في index.html. عند تغييره يحذف الـ SW نسخة الصفحة القديمة المحفوظة ويبلّغ الصفحات المفتوحة بوجود تحديث. */
var BUILD = '2026.10.29-r67';
var SHELL = 'pl-shell-' + BUILD;
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try { var ks = await caches.keys(); await Promise.all(ks.filter(function (k) { return k.indexOf('pl-shell-') === 0 && k !== SHELL; }).map(function (k) { return caches.delete(k); })); } catch (x) {}
    await self.clients.claim();
    /* r63: أبلغ كل الصفحات المفتوحة بالإصدار الجديد ليظهر لها «يتوفر تحديث» */
    try { var cl = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); cl.forEach(function (c) { try { c.postMessage({ type: 'build', build: BUILD }); } catch (y) {} }); } catch (z) {}
  })());
});
self.addEventListener('message', function (e) { try { if (e.data && e.data.type === 'getBuild' && e.source) e.source.postMessage({ type: 'build', build: BUILD }); } catch (x) {} });

/* فتح التطبيق بدون إنترنت: بدل صفحة المتصفح الرمادية تظهر شاشة PayLoop. لا يوجد أي تخزين: إن نجح الطلب يُمرَّر كما هو دون تدخل. */
var OFFLINE_HTML = '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#05070d"><title>PayLoop</title>' +
  '<style>html,body{margin:0;height:100%;background:#05070d;color:#fff;font-family:Tajawal,system-ui,sans-serif}body{display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:28px;box-sizing:border-box;background:radial-gradient(120% 80% at 50% 0,#0c1424,#05070d 70%)}' +
  '.i{font-size:56px;margin-bottom:22px}h1{margin:0 0 10px;font-size:22px;color:#fbbf24}p{margin:0 0 28px;color:#cbd5e1;line-height:1.9;font-size:14.5px}' +
  'button{font:900 16px Tajawal,system-ui,sans-serif;color:#1a1200;border:0;border-radius:16px;padding:14px 34px;min-width:210px;background:linear-gradient(135deg,#ffd60a,#ffa200)}small{display:block;margin-top:22px;color:#7c8aa3;font-size:12px}</style></head>' +
  '<body><div class="i">\ud83d\udce1</div><h1>\u0644\u0627 \u064a\u0648\u062c\u062f \u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a</h1>' +
  '<p>\u064a\u0628\u062f\u0648 \u0623\u0646 \u0627\u062a\u0635\u0627\u0644\u0643 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u0627\u0646\u0642\u0637\u0639.<br>\u064a\u0631\u062c\u0649 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629.</p>' +
  '<button onclick="location.reload()">\ud83d\udd04 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629</button><small>\u0646\u062a\u062d\u0642\u0642 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0648\u064a\u0639\u0648\u062f \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0641\u0648\u0631 \u0631\u062c\u0648\u0639 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a</small>' +
  '<script>setInterval(function(){fetch(location.href,{cache:"no-store"}).then(function(r){if(r.status!==503)location.reload();}).catch(function(){});},3000)<\/script></body></html>';
/* فتح سريع حتى على إنترنت ضعيف: الشبكة أولًا بمهلة 2.5 ثانية؛ إن تأخرت (أو انقطعت) يُفتح التطبيق فورًا من النسخة المحفوظة في الهاتف،
   وتتحدّث النسخة المحفوظة في الخلفية دائمًا. أول زيارة بلا نسخة محفوظة: تنتظر الشبكة كالمعتاد؛ وإن لم يوجد إنترنت أصلًا تظهر شاشة «لا يوجد اتصال».
   لا تُخزَّن إلا صفحة التطبيق نفسها (200 وHTML)، ولا يُخزَّن أي طلب إلى الخادم أو الشبكات. */
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.mode !== 'navigate' || r.method !== 'GET') return;
  /* v8: نتعامل فقط مع صفحة التطبيق نفسها. الصفحات الأخرى (الشروط، الخصوصية) تُترك للمتصفح كما هي، فلا تُخزَّن مكان التطبيق ولا يُعرض التطبيق مكانها. */
  var u0 = ''; try { u0 = String(r.url).split('#')[0].split('?')[0]; } catch (x) {}
  var sc0 = self.registration.scope;
  if (u0 !== sc0 && u0 !== sc0 + 'index.html') return;
  e.respondWith((async function () {
    var key = self.registration.scope;
    var cache = null, cached = null;
    try { cache = await caches.open(SHELL); cached = await cache.match(key); } catch (x) {}
    var net = fetch(r, { cache: 'no-cache' }).then(function (res) {
      try {
        var ct = (res.headers.get('content-type') || '').toLowerCase();
        if (cache && res.status === 200 && ct.indexOf('text/html') >= 0) cache.put(key, res.clone());
      } catch (x) {}
      return res;
    });
    if (cached) {
      e.waitUntil(net.catch(function () {}));
      return await Promise.race([net, new Promise(function (ok) { setTimeout(function () { ok(cached); }, 2500); })]).catch(function () { return cached; });
    }
    try { return await net; } catch (x) {
      return new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
  })());
});

/* تسجيل تشخيصي بسيط: متى وصل آخر إشعار وهل نجح عرضه (يقرؤه التطبيق في الإعدادات) */
async function diag(k, v) { try { var c = await caches.open('pl-diag'); await c.put('/' + k, new Response(String(v))); } catch (x) {} }

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { title: 'PayLoop', body: e.data.text() }; } catch (y) { d = {}; } }
  e.waitUntil((async function () {
    /* أولًا: اعرض الإشعار فورًا (لا شيء قبله يؤخّره). بعدها فقط نسجّل التشخيص ونخبر الصفحة المفتوحة. */
    /* العنوان كما كتبته أنت تمامًا (بدون إضافة اسم التطبيق: أندرويد يعرض اسم التطبيق أصلًا في أعلى الإشعار) */
    var title = String(d.title || '').trim() || 'PayLoop';
    var opt = {
      body: String(d.body || '').slice(0, 300), tag: d.tag || undefined, icon: 'icon-192.png', badge: 'badge-96.png?v=5',
      data: { go: d.go || null }, dir: 'auto', lang: 'ar',
      silent: false, vibrate: [200, 100, 200], timestamp: Date.now(), renotify: !!d.tag,
      actions: [{ action: 'open', title: '\u0641\u062a\u062d' }, { action: 'dismiss', title: '\u062a\u062c\u0627\u0647\u0644' }]
    };
    try { if (typeof d.image === 'string' && /^https:\/\//.test(d.image)) opt.image = d.image.slice(0, 500); } catch (x) {}
    var shown = self.registration.showNotification(title.slice(0, 120), opt);
    try { await shown; await diag('last-show', 'ok'); } catch (err) { await diag('last-show', String((err && err.name) || 'error') + ':' + String((err && err.message) || '').slice(0, 80)); }
    await diag('last-push', Date.now());
    try { var cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true }); cs.forEach(function (c) { try { c.postMessage({ type: 'push', go: d.go || null }); } catch (x) {} }); } catch (x) {}
  })());
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  if (e.action === 'dismiss') return;
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
