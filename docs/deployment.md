# النشر والاستضافة

سيغما موقع ثابت (static): ناتج `yarn build` هو مجلد `dist/` يمكن رفعه لأي استضافة.

| البيئة | الرابط | متى يُحدَّث |
|---|---|---|
| **الإنتاج: Vercel** | `https://sigma.almhdy24.com` | عند كل دمج في `main` |
| معاينة كل Pull Request: Vercel | رابط يظهر في تعليق Vercel على الـ PR | عند كل push |
| نسخة GitHub Pages | `https://almhdy24.github.io/sigma/` | عند كل دمج في `main` عبر GitHub Actions |

Google Play يستخدم نطاق Vercel لأن TWA يتطلب أن يكون التطبيق في جذر النطاق (انظر [google-play.md](google-play.md)).

## 1. Vercel (الإنتاج)

المستودع مربوط بـ Vercel مسبقاً، والإعدادات في [`vercel.json`](../vercel.json):
- أمر البناء `yarn build` ومجلد الناتج `dist`.
- `sw.js` بلا تخزين مؤقت، و`/assets/*` مخزّنة لسنة كاملة لأن أسماءها تتغير مع كل إصدار.
- ترويسات `assetlinks.json` المطلوبة لـ Google Play، وترويسات أمان أساسية.

تأكد في **Vercel ← Project ← Settings ← Git** أن **Production Branch** هو `main`.

## 2. ربط `sigma.almhdy24.com` عبر Cloudflare

موقعك الرئيسي `almhdy24.com` على HelioHost لا يتأثر، لأننا نضيف نطاقاً فرعياً فقط.

### أ. في Vercel
1. **Project ← Settings ← Domains ← Add**
2. اكتب `sigma.almhdy24.com` واضغط **Add**.
3. سيعرض Vercel سجل DNS مطلوباً، غالباً:
   `CNAME  sigma  →  cname.vercel-dns.com`
   (إن عرض قيمة مختلفة مثل `xxxx.vercel-dns-017.com` فاستخدمها هي.)

### ب. في Cloudflare
1. **Cloudflare Dashboard ← almhdy24.com ← DNS ← Records ← Add record**
2. املأ:

   | الحقل | القيمة |
   |---|---|
   | Type | `CNAME` |
   | Name | `sigma` |
   | Target | `cname.vercel-dns.com` (أو ما عرضه Vercel) |
   | Proxy status | **DNS only** (السحابة رمادية) |
   | TTL | Auto |

3. **Save**.

> **لماذا DNS only؟** Vercel يُصدر شهادة SSL ويقدّم CDN بنفسه. تفعيل البروكسي البرتقالي قد يمنع إصدار الشهادة أو يخزّن `sw.js` مؤقتاً فيتأخر وصول التحديثات. إن أردت البروكسي لاحقاً فاضبط **SSL/TLS ← Full (strict)**.

### ج. التحقق
- بعد دقائق تظهر ✅ **Valid Configuration** بجانب النطاق في Vercel، ويُصدر شهادة HTTPS تلقائياً.
- افتح `https://sigma.almhdy24.com` للتأكد.
- اجعل النطاق **Primary** في Vercel ليُحوَّل إليه رابط `*.vercel.app`.

## 3. GitHub Pages (نسخة إضافية)

الملف [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) يفحص ويختبر ويبني كل Pull Request، وينشر على Pages عند الدمج في `main`.

يلزم تفعيل Pages **مرة واحدة**: **Settings ← Pages ← Build and deployment ← Source ← GitHub Actions**.

## 4. أي استضافة أخرى

```bash
yarn install --frozen-lockfile
yarn build                     # في جذر النطاق
BASE_PATH=/sigma/ yarn build   # إن كان في مجلد فرعي
```

ارفع محتوى `dist/`، واضبط الاستضافة على:
- عدم تخزين `sw.js` مؤقتاً (`Cache-Control: no-cache`).
- تقديم `manifest.webmanifest` بنوع `application/manifest+json`.
- استخدام HTTPS، فهو إلزامي للـ PWA.

---

**English summary:** production is Vercel at `sigma.almhdy24.com`. To connect the domain, add `sigma.almhdy24.com` in Vercel → Settings → Domains, then in Cloudflare DNS add `CNAME sigma → cname.vercel-dns.com` with **DNS only** (grey cloud). GitHub Pages is a secondary copy deployed by the CI workflow; enable it once under Settings → Pages → Source: GitHub Actions. For any other static host, run `yarn build` (set `BASE_PATH` for sub-paths), serve `dist/`, and never cache `sw.js`.
