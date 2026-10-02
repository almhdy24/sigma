# نشر سيغما على Google Play (PWA → TWA)

سيغما تطبيق ويب تقدّمي (PWA). يُغلَّف للنشر على Google Play كـ **Trusted Web Activity (TWA)**: تطبيق أندرويد صغير يفتح موقع سيغما بملء الشاشة، بلا شريط متصفح، ويعمل دون إنترنت بفضل الـ Service Worker.

> **English summary:** Sigma ships to Google Play as a Trusted Web Activity built with Bubblewrap from `https://sigma.almhdy24.com/manifest.webmanifest`. Digital Asset Links are served from `/.well-known/assetlinks.json`, generated at build time from the `TWA_PACKAGE_ID` and `TWA_SHA256_FINGERPRINTS` environment variables (set them in Vercel). The steps are below.

## المتطلبات

| المطلوب | ملاحظة |
|---|---|
| النطاق `sigma.almhdy24.com` يعمل على Vercel | راجع [deployment.md](deployment.md). يجب أن يكون التطبيق في **جذر** النطاق |
| حساب مطوّر Google Play | رسوم لمرة واحدة 25$ |
| Node.js 20+ | لتشغيل Bubblewrap |
| JDK 17 و Android SDK | يثبّتهما Bubblewrap تلقائياً عند أول تشغيل |

> **للحسابات الشخصية الجديدة:** تشترط Google اختباراً مغلقاً مع **12 مختبِراً على الأقل لمدة 14 يوماً** قبل السماح بالنشر للإنتاج. خطّط لذلك مبكراً.

## 1. توليد مشروع أندرويد

```bash
npm install -g @bubblewrap/cli
mkdir sigma-android && cd sigma-android
bubblewrap init --manifest https://sigma.almhdy24.com/manifest.webmanifest
```

أجب على الأسئلة كالتالي:

| السؤال | الإجابة |
|---|---|
| Domain | `sigma.almhdy24.com` |
| Application ID (package) | `com.almhdy24.sigma` |
| App name / Launcher name | `Sigma — التحليل الإحصائي` / `Sigma` |
| Display mode | `standalone` |
| Status bar color | `#1f5fa6` |
| Splash background | `#f2f5f8` |
| Icon / Maskable icon | تُقرأ تلقائياً من الـ manifest |
| Signing key | أنشئ مفتاحاً جديداً (`android.keystore`) |

> ⚠️ **احتفظ بملف `android.keystore` وكلمة مروره في مكان آمن خارج Git.** بدونه لن تستطيع تحديث التطبيق. احفظ مجلد `sigma-android` في مستودع منفصل أو احتياطي، وليس داخل هذا المستودع.

## 2. البناء

```bash
bubblewrap build
```

النتيجة:
- `app-release-bundle.aab`: ارفعه على Google Play.
- `app-release-signed.apk`: للتجربة على جوالك مباشرة.

## 3. ربط النطاق بالتطبيق (Digital Asset Links)

بدون هذه الخطوة يظهر شريط عنوان المتصفح أعلى التطبيق.

1. استخرج بصمة SHA-256 لمفتاح الرفع:
   ```bash
   keytool -list -v -keystore android.keystore -alias android
   ```
2. بعد إنشاء التطبيق في Play Console انسخ بصمة **App signing key** من:
   **Play Console ← التطبيق ← Test and release ← App integrity ← App signing**
3. في Vercel افتح **Project ← Settings ← Environment Variables** وأضف (للـ Production):

   | Name | Value |
   |---|---|
   | `TWA_PACKAGE_ID` | `com.almhdy24.sigma` |
   | `TWA_SHA256_FINGERPRINTS` | `بصمة_مفتاح_الرفع,بصمة_مفتاح_Play` (مفصولة بفاصلة) |

4. أعد النشر (Redeploy)، ثم تأكد من أن هذا الرابط يُظهر ملف JSON صحيحاً:
   `https://sigma.almhdy24.com/.well-known/assetlinks.json`
5. يمكنك التحقق بأداة Google:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://sigma.almhdy24.com&relation=delegate_permission/common.handle_all_urls`

## 4. صفحة المتجر

كل المواد جاهزة في المستودع:

| العنصر | الملف |
|---|---|
| أيقونة 512×512 | [`public/icon-512.png`](../public/icon-512.png) |
| صورة العرض 1024×500 | [`docs/google-play/feature-graphic.png`](google-play/feature-graphic.png) |
| لقطات الجوال (1080×1920) | [`public/screenshots/phone-*.png`](../public/screenshots) (عربي)، [`docs/images/phone-*-en.png`](images) (إنجليزي) |
| سياسة الخصوصية | `https://sigma.almhdy24.com/privacy.html` |
| الفئة | Education |

**وصف قصير (80 حرفاً):**
> تحليل إحصائي بأسلوب SPSS على جوالك: اختبار t، ANOVA، الانحدار — يعمل دون إنترنت

**وصف كامل (مقترح):**
> سيغما أداة تحليل إحصائي مجانية ومفتوحة المصدر لطلاب الطب والباحثين.
> • أدخل بياناتك أو استورد ملفات CSV و Excel
> • الإحصاء الوصفي، جداول التكرار، كاي تربيع، الارتباط، اختبارات t، تحليل التباين مع توكي، الانحدار الخطي، ألفا كرونباخ، منحنى ROC، دقة الاختبارات التشخيصية
> • رسوم بيانية ونتائج جاهزة مع فقرة المنهجية بأسلوب APA وتصدير PDF بالعربية
> • بياناتك لا تغادر جهازك، ولا إعلانات ولا تتبّع
> • يعمل دون إنترنت بعد التنزيل الأول

## 5. استمارات Play Console

| الاستمارة | الإجابة |
|---|---|
| **Data safety** | لا يجمع التطبيق أي بيانات ولا يشاركها (No data collected / No data shared) |
| **Ads** | لا إعلانات |
| **App access** | كل الميزات متاحة دون تسجيل دخول |
| **Content rating** | استبيان IARC: تطبيق تعليمي/أدوات، لا محتوى حساس |
| **Target audience** | 18+ (طلاب جامعات وباحثون) |

## 6. التحديثات

لا تحتاج لإعادة رفع التطبيق عند تحديث سيغما: أي تحديث يُدمج في `main` يُنشر على الموقع ويصل للمستخدمين تلقائياً (يظهر لهم إشعار «يتوفر إصدار جديد»). أعد البناء بـ Bubblewrap فقط عند تغيير الأيقونة أو الاسم أو الألوان، مع رفع `appVersionCode` في `twa-manifest.json`.
