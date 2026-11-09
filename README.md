# ROMANA by sics2002 · 1.0

واجهة عربية وإنجليزية لتلفزيونات LG webOS، بالتنقل بالأسهم أو Magic Remote. تجمع البحث والتصنيفات ومشغل الفيديو والترجمة وقائمة المتابعة المحلية، مع واجهة أخبار عند تعذر الاتصال بالمصدر الأساسي. يعتمد عرض المحتوى والتشغيل على توفر المصادر وشبكة المستخدم. يبقى سجل المشاهدة في تخزين التطبيق على التلفزيون.

ROMANA is an Arabic and English TV interface with D-pad and Magic Remote navigation, catalog search, playback and subtitles, local watch progress, and an entertainment news fallback. Catalog and playback depend on source and network availability. Watch history stays in the app's storage on the TV.

## الشبكات والأجهزة المجرّبة / Tested networks and TVs

بحسب تجربة صاحب المشروع، عمل ROMANA بشكل كامل على شبكتي **الوطني** و**إيرث لنك** في العراق. جُرّب التطبيق على شاشتَي **LG OLED55C46LA (C4)** و**LG OLED55B7V-T (B7)**. اختبارات الأجهزة تشمل إصدارات تطوير مختلفة، وأُعيد التحقق من إقلاع إصدار 1.0.0 وإعداداته على C4.

The project owner reports full operation on Iraq's **Al-Watani** and **Earthlink** networks. ROMANA has been tested on the **LG OLED55C46LA (C4)** and **LG OLED55B7V-T (B7)** across development builds. Version 1.0.0 startup and settings were rechecked on the C4.

## توافق الشاشات / TV compatibility

الفئات المستهدفة هي OLED وQNED وNanoCell وUHD LED عند توفر إصدار webOS المذكور على الموديل. عمود التحقق يخص **حزمة 1.0.0**. استُخدمت B7 وC4 للتحقق من إصدارات تطوير سابقة. إصدار المحرك الفعلي قد يتغير بتحديث النظام، والتطبيق يختار المسار وفق المحرك والخصائص المتاحة.

Target families are OLED, QNED, NanoCell and UHD LED models running the listed platform versions. The verification column refers to **the 1.0.0 package**. B7 and C4 have been used for earlier development builds. Firmware can change the installed engine. ROMANA selects its runtime using engine and feature detection.

<table>
<thead><tr><th>webOS TV</th><th>Year / السنة</th><th>Chromium</th><th>Runtime / المسار</th><th>Verification / التحقق</th></tr></thead>
<tbody>
<tr><td>3.5</td><td>2017</td><td>38</td><td>Compatible</td><td>Static + simulated bootstrap</td></tr>
<tr><td>4.0</td><td>2018</td><td>53</td><td>Compatible</td><td>Static + simulated bootstrap</td></tr>
<tr><td>4.5</td><td>2019</td><td>53</td><td>Compatible</td><td>Static + simulated bootstrap</td></tr>
<tr><td>5.0</td><td>2020</td><td>68</td><td>Compatible</td><td>Static + simulated bootstrap</td></tr>
<tr><td>6.0</td><td>2021</td><td>79</td><td>Compatible</td><td>Static + simulated bootstrap</td></tr>
<tr><td>22</td><td>2022</td><td>87</td><td>Compatible</td><td>Static + simulated bootstrap</td></tr>
<tr><td>23</td><td>2023</td><td>94</td><td>Modern*</td><td>Static + simulated bootstrap</td></tr>
<tr><td>24</td><td>2024</td><td>108</td><td>Modern*</td><td>Static + simulated bootstrap</td></tr>
<tr><td>25</td><td>2025</td><td>120</td><td>Modern*</td><td>Static + simulated bootstrap</td></tr>
<tr><td>26</td><td>2026</td><td>132</td><td>Modern*</td><td>Static + simulated bootstrap</td></tr>
</tbody>
</table>

\* المسار المتوافق يُستخدم عند غياب خصائص CSS المطلوبة. المحاكاة تغطي قرار الإقلاع عند 1280×720 و1920×1080. قياس التخطيط، والريموت، وفك الفيديو، والشبكة يحتاج اختباراً فعلياً لكل جهاز. تطبيقات LG المحزمة تعمل بمسار ملف، ولذلك تستخدم الحزمة سكربتات IIFE محلية ومسارات نسبية وتوجيهاً داخل الذاكرة. لا يعتمد الإقلاع على cookies. [محركات LG](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine) · [بيانات الحزمة](https://webostv.developer.lge.com/develop/references/appinfo-json)

\* If required CSS features are missing, the compatible runtime is selected. The bootstrap simulation covers 1280×720 and 1920×1080. Physical layout, remote input, decoding, and networking still need device tests. Packaged builds use local classic IIFEs, relative file paths and in-memory routing, with no cookie dependency at startup. [LG engine reference](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine) · [App metadata](https://webostv.developer.lge.com/develop/references/appinfo-json)

LG تحدد 1280×720 كأقصى دقة لواجهة التطبيق في طرازات Full HD، وتوصي بحزمتين عند التقديم إلى Seller Lounge. الحزمة هنا تطلب 1920×1080 حسب إعداد الإصدار، وتتكيّف الواجهة إذا أعطاها النظام مساحة HD. للحصول على حزمة HD مخصصة، استخدم `npm run package:ipk -- --hd`. المخرجات في `release/hd/`.

LG specifies a 1280×720 graphics limit for Full HD models and recommends separate packages for Seller Lounge. This release requests 1920×1080 and adapts its layout if the runtime provides an HD viewport. To build an explicit HD package, run `npm run package:ipk -- --hd`. Output goes to `release/hd/`. [LG app resolution](https://webostv.developer.lge.com/develop/specifications/app-resolution)

## التثبيت / Installation

نزّل ملف IPK من GitHub Releases. ابدأ من تلفزيون وكمبيوتر على شبكة محلية واحدة. ثبّت تطبيق **Developer Mode** من متجر LG على التلفزيون، سجّل الدخول بحساب مطور LG، فعّل **Dev Mode Status** وأعد التشغيل عند الطلب. افتح التطبيق ثانية وشغّل **Key Server** وسجّل عنوان IP ورمز الربط الظاهرين على التلفزيون. [دليل LG](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app)

Download the IPK from GitHub Releases. Put the TV and computer on the same local network. Install LG's **Developer Mode** app on the TV, sign in with your LG developer account, enable **Dev Mode Status**, and restart when prompted. Reopen it, enable **Key Server**, and note the TV's IP and pairing passphrase. [LG Developer Mode guide](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app)

### 1. webOS Dev Manager

1. نزّل وثبّت [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop/releases) على الكمبيوتر.
2. اختر إضافة جهاز بوضع Developer Mode، وأدخل IP ورمز الربط وأكمل الاتصال.
3. اختر **Install** ثم ملف IPK المحلي، وبعد نجاح التثبيت افتح ROMANA من شاشة Home.

1. Download and install [webOS Dev Manager](https://github.com/webosbrew/dev-manager-desktop/releases).
2. Add a Developer Mode device with the TV's IP address and passphrase.
3. Select **Install**, choose the local IPK and launch ROMANA from LG Home.

### 2. LG webOS CLI

ثبّت CLI وأضف التلفزيون بالاسم `myTV`. عند المطالبة استخدم عنوان التلفزيون، المنفذ `9922` والمستخدم `prisoner`. أدخل رمز الربط عند طلبه، ثم ثبّت الحزمة وافتح التطبيق. حافظ على جلسة Developer Mode فعّالة عند استعمال هذا المسار.

Install the CLI and register the TV as `myTV`. When prompted use the TV's IP, port `9922` and user `prisoner`. Enter the passphrase when requested, then install and launch. Keep the Developer Mode session active when using this path.

```sh
npm install -g @webos-tools/cli
ares-config --profile tv
ares-setup-device --add myTV
ares-novacom --device myTV --getkey
ares-install --device myTV com.cinemanatv.app_1.0.0_all.ipk
ares-launch --device myTV com.cinemanatv.app
```

**تحديث تثبيت موجود / Existing installations.** الإصدار العام 1.0.0 أقل رقمياً من 1.1.1 التجريبي. قد يرفض المثبّت خفض الإصدار. حذف التطبيق قد يمسح سجل المشاهدة. Public 1.0.0 sorts below private 1.1.1. The installer may reject a downgrade, and uninstalling can erase local watch history.

## التطوير والبناء / Development and build

نزّل الكود عبر **Code → Download ZIP** أو انسخ رابط المستودع واستخدم `git clone`. من مجلد المشروع استخدم Node.js 24 وnpm. المعاينة المحلية تفتح على `http://127.0.0.1:4173`.

Download the source via **Code → Download ZIP**, or clone the repository URL with `git clone`. Use Node.js 24 and npm from the project directory. Local preview runs at `http://127.0.0.1:4173`.

```sh
npm ci
npm run serve
```

```sh
npm test
npm run build:webos
npm run verify:compat
npm run package:ipk
```

- `release/romana-webos-raw/` واجهة التطبيق المترجمة الجاهزة للتحزيم / Compiled app payload.
- `release/com.cinemanatv.app_1.0.0_all.ipk` حزمة التثبيت الكاملة مع خدمة الأخبار / Installable package with the news service. The raw app folder alone does not carry that service.
- يبني GitHub Actions عند كل Push ويرفع مخرجات الاختبار إلى Artifacts. انشر Release باسم `v1.0.0` أو ادفع الوسم المطابق لنشر IPK وZIP في Releases. GitHub Actions builds each push and saves workflow artifacts. Publish the release or push the matching `v1.0.0` tag to attach the IPK and ZIP to GitHub Releases.
- فحص الصياغة وملفات البناء لا يمنح اعتماد LG. Automated checks are separate from LG approval. [LG approval process](https://webostv.developer.lge.com/distribute/app-approval-process)

## أول رفع على GitHub / First GitHub push

أنشئ مستودعاً فارغاً باسم romana على GitHub. شغّل الأوامر التالية من داخل مجلد المشروع، واستبدل OWNER باسم حسابك. راجع الملفات المدرجة بواسطة git status قبل أول commit. بعد نجاح بناء الفرع، ادفع الوسم لنشر الملفات.

Create an empty GitHub repository named romana. Run the commands from the project folder and replace OWNER with your account name. Review the staged files with git status before the first commit. Push the tag after the branch build passes.

```sh
git init -b main
git add .
git status --short
git commit -m "Prepare ROMANA 1.0.0 for webOS release"
git remote add origin https://github.com/OWNER/romana.git
git push -u origin main
git tag v1.0.0
git push origin v1.0.0
```

## License / الترخيص

The original ROMANA source code and documentation are under the [MIT License](LICENSE). Third-party dependencies, artwork, logos, and catalog or news content retain their respective rights and terms.

كود رومانا الأصلي وتوثيقه تحت [ترخيص MIT](LICENSE). تحتفظ الاعتماديات والأصول الخارجية والمحتوى بحقوقها وشروطها.

[دليل النشر وصلاحيات المساهمين](docs/GITHUB-PUBLISH.ar.md)
