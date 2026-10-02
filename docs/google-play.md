# نشر سيغما على Google Play (PWA → TWA)

سيغما تطبيق ويب تقدّمي (PWA). يُغلَّف للنشر على Google Play كـ **Trusted Web Activity (TWA)**: تطبيق أندرويد صغير يفتح موقع سيغما بملء الشاشة، بلا شريط متصفح، ويعمل دون إنترنت بفضل الـ Service Worker.

> **English summary:** Sigma ships to Google Play as a Trusted Web Activity. The Android project (generated with Bubblewrap) lives in `android/`, and the **Android app (Google Play)** GitHub workflow builds a signed `.aab` and `.apk` from it using the `SIGMA_KEYSTORE_BASE64` and `SIGMA_KEYSTORE_PASSWORD` secrets. Digital Asset Links are served from `/.well-known/assetlinks.json`, generated at build time from the `TWA_PACKAGE_ID` and `TWA_SHA256_FINGERPRINTS` environment variables (set them in Vercel). The steps are below.

## المتطلبات

| المطلوب | ملاحظة |
|---|---|
| النطاق `sigma.almhdy24.com` يعمل على Vercel | راجع [deployment.md](deployment.md). يجب أن يكون التطبيق في **جذر** النطاق |
| حساب مطوّر Google Play | رسوم لمرة واحدة 25$ |
| مفتاح رفع (upload key) | ملف `sigma-upload.keystore` وكلمة مروره |

> **للحسابات الشخصية الجديدة:** تشترط Google اختباراً مغلقاً مع **12 مختبِراً على الأقل لمدة 14 يوماً** قبل السماح بالنشر للإنتاج. خطّط لذلك مبكراً.

## 1. مشروع أندرويد (جاهز في المستودع)

مشروع التطبيق موجود في مجلد [`android/`](../android)، ومولَّد بـ Bubblewrap 1.25 (يستهدف Android 16 / API 36 كما تشترط Google Play):

| الإعداد | القيمة |
|---|---|
| Package | `com.almhdy24.sigma` |
| الموقع | `https://sigma.almhdy24.com` |
| إعدادات التطبيق | [`android/twa-manifest.json`](../android/twa-manifest.json) |

## 2. بناء ملف AAB (عبر GitHub Actions، بدون تثبيت أي شيء)

1. أضف مفتاح التوقيع كـ **Secrets** في المستودع (مرة واحدة):
   **Settings ← Secrets and variables ← Actions ← New repository secret**

   | Secret | القيمة |
   |---|---|
   | `SIGMA_KEYSTORE_BASE64` | محتوى ملف المفتاح بترميز base64 (`base64 -w0 sigma-upload.keystore`) |
   | `SIGMA_KEYSTORE_PASSWORD` | كلمة مرور المفتاح |

2. افتح **Actions ← Android app (Google Play) ← Run workflow**.
3. بعد دقائق، نزّل الـ artifact المسمّى **sigma-android** من صفحة التشغيل. بداخله:
   - `sigma-1.0.N.aab`: ارفعه على Google Play.
   - `sigma-1.0.N.apk`: ثبّته على جوالك للتجربة.

رقم الإصدار (`versionCode`) يزيد تلقائياً مع كل تشغيل، لأن Google Play يرفض تكرار الرقم.

> بدون الـ Secrets يُبنى التطبيق بمفتاح مؤقت للتجربة فقط، **لا ترفعه على Google Play**.

**بديل محلي:** إن كان عندك Android SDK وJDK 17:
```bash
cd android
SIGMA_KEYSTORE_FILE=/path/sigma-upload.keystore SIGMA_KEYSTORE_PASSWORD=*** ./gradlew bundleRelease
```
أو استخدم `bubblewrap build` داخل مجلد `android/`.

> ⚠️ **احتفظ بملف المفتاح وكلمة مروره في مكان آمن خارج Git.** فعّل **Play App Signing** في Play Console. بذلك تحتفظ Google بمفتاح توقيع التطبيق، ويكون ملفك «مفتاح رفع» فقط، تستطيع Google إعادة تعيينه إن ضاع.

## 3. ربط النطاق بالتطبيق (Digital Asset Links)

بدون هذه الخطوة يظهر شريط عنوان المتصفح أعلى التطبيق.

1. استخرج بصمة SHA-256 لمفتاح الرفع (أو انسخها من ملخص تشغيل «Android app» في Actions):
   ```bash
   keytool -list -v -keystore sigma-upload.keystore -alias sigma-upload
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

لا تحتاج لإعادة رفع التطبيق عند تحديث سيغما: أي تحديث يُدمج في `main` يُنشر على الموقع ويصل للمستخدمين تلقائياً (يظهر لهم إشعار «يتوفر إصدار جديد»). أعد بناء ملف AAB من Actions فقط عند تغيير الأيقونة أو الاسم أو الألوان في مجلد `android/`. رقم الإصدار يزيد تلقائياً.
