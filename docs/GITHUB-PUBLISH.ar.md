# نشر ROMANA على GitHub

**وصف المستودع**  
ROMANA by sics2002 — تطبيق عربي وإنجليزي لتلفزيونات LG webOS، يضم البحث ومشغّل فيديو بترجمة ومتابعة مشاهدة محلية وواجهة أخبار ترفيهية احتياطية.

**Repository description**  
ROMANA by sics2002 — an Arabic and English LG webOS TV app with search, subtitles, local watch progress, and an entertainment news fallback.

## رفع المصدر والإصدار

1. فك ضغط `ROMANA-1.0.0-GitHub-Source.zip`. استخدم المجلد الناتج كمستودع، لأن نسخة المصدر تستبعد مخرجات البناء وبيانات الأجهزة والأدلة المحلية.
2. في GitHub أنشئ مستودعاً فارغاً باسم `romana` واجعل الرؤية **Public**. اترك خيارات إنشاء README وLICENSE و.gitignore فارغة، فالملفات موجودة ضمن المصدر.
3. افتح الطرفية داخل المجلد ونفّذ الأوامر التالية بعد استبدال OWNER باسم حسابك.

```sh
git init -b main
git add .
git status --short
git commit -m "Publish ROMANA 1.0.0 source"
git remote add origin https://github.com/OWNER/romana.git
git push -u origin main
```

4. بعد نجاح بناء **Actions**، ادفع الوسم `v1.0.0` لتجهيز صفحة الإصدار ومرفقات البناء تلقائياً.

```sh
git tag v1.0.0
git push origin v1.0.0
```

5. إذا فضّلت رفع الحزم المبنية محلياً، افتح **Releases** واختر الوسم نفسه. أرفق الملفات من `ROMANA-1.0.0-Release.zip`. سير العمل التلقائي يولّد حزمة FHD وملف ZIP الخام. حزمة HD المنفصلة جاهزة للإرفاق يدوياً.

## المساهمات والصلاحيات

- من **Settings → Collaborators → Add people** ادعُ الحسابات التي تريد منحها صلاحية المساهمة المباشرة. في مستودع منظمة، استخدم فريقاً محدداً بصلاحية Write.
- احمِ فرع `main` من **Settings → Branches** أو **Rules → Rulesets**. فعّل **Require a pull request before merging**، واطلب موافقة واحدة على الأقل، وفعّل فحص البناء الإلزامي بعد ظهوره في Actions. عطّل force push والحذف.
- إذا أردت أن يبقى الدمج النهائي بيدك وحدك، امنح أعضاء الفريق صلاحية **Write** على فروع العمل فقط عبر سياسات الفرع عند توفرها، أو اجعلهم يرسلون التغييرات عبر Fork وPull Request واترك صلاحية الكتابة للمستودع لحسابك. راجع قواعد المستودع التي تحدد من يستطيع الدمج.
- المستودع العام يسمح للآخرين بقراءة الكود وعمل Fork واقتراح تغييرات. صلاحية الاقتراح لا تمنحهم صلاحية الكتابة أو الدمج في مستودعك.

ترخيص MIT يغطي كود ROMANA الأصلي وتوثيقه. الاعتماديات وأسماء وشعارات الأطراف الخارجية والمحتوى المعروض تخضع لتراخيصها وحقوق أصحابها. تحقّق من حق نشر أي أصول خارجية قبل جعل المستودع عاماً.

[دعوة المساهمين](https://docs.github.com/en/account-and-profile/how-tos/account-management/managing-access-to-your-personal-repositories/inviting-collaborators-to-a-personal-repository) · [حماية الفروع](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches) · [ترخيص MIT](https://opensource.org/license/mit)
