import {EXTRA_EN} from './translations-extra.js';
let language='ar';
const EN={
 'البحث':'Search','بحث':'Search','الرئيسية':'Home','أفلام':'Movies','مسلسلات':'Series','قائمتي':'My list','متابعة':'Continue','متابعة المشاهدة':'Continue watching','الإعدادات':'Settings','إعدادات':'Settings','سينمانا تي في':'Cinemana TV',
 'الوضع المظلم':'Dark mode','تفعيل':'On','إغلاق':'Off','حجم الخط':'Text size','صغير':'Small','متوسط':'Medium','كبير':'Large','دقة الفيديو':'Video quality','تلقائي':'Auto','اتصل بنا':'Contact us','شروط الاستخدام':'Terms of use','اللغة':'Language','العربية':'Arabic','الإنجليزية':'English','بدون ترجمة':'Subtitles off','حجم الترجمة':'Subtitle size','خيارات المشغّل':'Player options','رجوع':'Back','الجودة':'Quality','الصوت':'Audio','أبعاد الصورة':'Aspect ratio','تشغيل':'Play','إيقاف مؤقت':'Pause','الترجمة':'Subtitles','إعادة المحاولة':'Try again',
 'خصّص تجربة المشاهدة':'Make it yours','تُختار الجودة المناسبة تلقائياً عند بدء الفيديو.':'A suitable quality is selected automatically when playback starts.','جديد على سينمانا':'New on Cinemana','مختارات اليوم':'Today’s picks','اكتشف القصة، وتابعها على شاشتك.':'Discover the story on your screen.','▶  اكتشف وشاهد':'▶  Explore and watch','＋  قائمتي':'＋  My list','✓  في قائمتي':'✓  In my list','عرض التفاصيل':'View details','عرض الكل ←':'View all →','الإصدارات الجديدة':'New releases','أكمل من حيث توقفت':'Continue watching','أفلام لكل مزاج':'Movies for every mood','قصص تستحق المتابعة':'Stories worth following','اختر عنواناً لعرض التفاصيل والمشاهدة':'Choose a title to view details and watch',
 'تحميل المزيد':'Load more','جارٍ التحميل…':'Loading…','لا توجد نتائج':'No results','جرّب قسماً آخر.':'Try another section.','ما الذي تود مشاهدته؟':'What would you like to watch?','ابحث باسم فيلم أو مسلسل':'Search for a movie or series','اكتب اسم الفيلم أو المسلسل':'Enter a movie or series title','اسم الفيلم أو المسلسل':'Movie or series title','التصنيف':'Genre','كل التصنيفات':'All genres','التصنيف المحدد':'Selected genre','ابحث':'Search','اكتب اسماً أو اختر تصنيفاً.':'Enter a title or choose a genre.','لم نجد نتائج لهذا البحث':'No results for this search',
 'قائمتك تبدأ باختيار':'Your list starts with a choice','كل حكاية لها بداية':'Every story has a beginning','أضف الأفلام والمسلسلات التي تحبها لتجدها هنا.':'Add movies and series to find them here.','ابدأ المشاهدة وسنحفظ موضعك تلقائياً.':'Start watching and your progress will be saved.','اختياراتك، دائماً قريبة':'Your choices, always close','ارجع إلى اللحظة التي توقفت عندها':'Pick up where you left off','مساحتك الخاصة':'Your space','استكشف الإصدارات':'Explore new releases',
 '▶  استئناف المشاهدة':'▶  Resume','▶  شاهد الآن':'▶  Watch now','من البداية':'From the beginning','＋  أضف لقائمتي':'＋  Add to my list','أُضيف إلى قائمتك':'Added to your list','أُزيل من قائمتك':'Removed from your list','المواسم والحلقات':'Seasons and episodes','جارٍ تحميل الحلقات…':'Loading episodes…','لا تتوفر حلقات لهذا العنوان.':'No episodes are available.','إعادة تحميل الحلقات':'Reload episodes','لا يتوفر وصف لهذا العنوان.':'No description is available.','فيلم · سينمانا':'Movie · Cinemana','مسلسل · سينمانا':'Series · Cinemana',
 'حلقات المسلسل':'Episodes','أفلام مقترحة':'Recommended movies','الحلقة الحالية وبقية الحلقات · اختر حلقة للمشاهدة':'Current and remaining episodes · Choose an episode','اختر فيلماً للمشاهدة':'Choose a movie to watch','لا توجد مقترحات متاحة لهذا العنوان.':'No recommendations are available.','جودة الفيديو':'Video quality','لغة الترجمة':'Subtitle language','المسار الصوتي':'Audio track','مظهر الترجمة':'Subtitle appearance','إيقاف الترجمة':'Subtitles off','حجم ومظهر الترجمة':'Subtitle appearance','مشغّل الفيديو':'Video player','التحكم بالتشغيل':'Playback controls','تقدم المشاهدة':'Playback timeline','الأبعاد الأصلية':'Original aspect ratio','ملء الشاشة مع قص الأطراف':'Fill and crop','تمديد الصورة':'Stretch',
 'جارٍ جلب مصادر الفيديو…':'Loading video sources…','جارٍ فتح الفيديو…':'Opening video…','جارٍ تحميل الفيديو…':'Buffering…','جارٍ تحديث رابط الفيديو…':'Refreshing video link…','اضغط تشغيل لبدء المشاهدة.':'Press play to start.','لا تتوفر ترجمة لهذه المادة.':'No subtitles are available.','أنت في الصفحة الرئيسية':'You are on the home page','الأسهم للتنقل':'Arrows to navigate','اختيار':'Select','سينمانا · تطبيق مستقل':'Cinemana · Independent app','الدقة الحالية':'Current quality',
 'اكشن':'Action','اثارة':'Thriller','جريمة':'Crime','خيال علمي':'Science fiction','خيالي':'Fantasy','دراما':'Drama','رسوم متحركة':'Animation','رعب':'Horror','رومانسي':'Romance','غموض':'Mystery','كوميدي':'Comedy','مغامرة':'Adventure','وثائقي':'Documentary','عائلي':'Family','تاريخي':'History','رياضي':'Sport','حروب':'War','غنائي':'Musical','سيرة ذاتية':'Biography','حياة الغرب':'Western',
};
Object.assign(EN,{
'سينمانا scis2002':'Cinemana scis2002','نوع المحتوى':'Content type','مسلسلات مقترحة':'Recommended series','الحلقات والاقتراحات':'Episodes and recommendations','الموسم':'Season','الحلقة':'Episode','تشاهد الآن':'Now playing','ابحث في الأفلام':'Search movies','ابحث في المسلسلات':'Search series','البوستر التالي':'Next poster','البوستر السابق':'Previous poster','جارٍ تشغيل الحلقة التالية…':'Starting the next episode…','تعذّر تشغيل الحلقة التالية. اخترها من قائمة الحلقات.':'Could not start the next episode. Choose it from Episodes.','↑ للعودة إلى الفيديو · ↓ للاقتراحات':'Up to return to video · Down for recommendations','بدون اسم: ترتيب كامل من سينمانا. مع الاسم: ترتيب النتائج المحمّلة؛ فرز المشاهدات غير متاح.':'Without a title: full catalog order from Cinemana. With a title: sorts loaded matches; views unavailable.',
'الترتيب الافتراضي':'Default order','الترتيب والفرز':'Sort order','أحدث الإضافات':'Recently added','أقدم الإضافات':'Oldest additions','سنة الإصدار الأقدم':'Release year: oldest','سنة الإصدار الأحدث':'Release year: newest','ترتيب تصاعدي للأبجدية':'Title: A to Z','ترتيب تنازلي للأبجدية':'Title: Z to A','عدد المشاهدات تصاعدي':'Views: ascending','عدد المشاهدات تنازلي':'Views: descending','تصنيف الفئة العمرية تصاعدي':'Age rating: ascending','تصنيف الفئة العمرية تنازلي':'Age rating: descending','تصنيف IMDb تصاعدي':'IMDb: low to high','تصنيف IMDb تنازلي':'IMDb: high to low','يُرتّب النتائج المحمّلة. عدد المشاهدات غير متاح من المصدر.':'Sorts loaded results. View counts are unavailable from the source.',
'نجهّز لك ما يستحق المشاهدة…':'Finding your next watch…','جارٍ البحث…':'Searching…',
'تعرض هذه القائمة المصادر المتاحة فعلياً. تبديل الجودة يحافظ على موضع المشاهدة.':'Available qualities. Switching preserves your playback position.',
'هذا الجهاز لم يستطع فك ترميز الفيديو. جرّب جودة أو مادة أخرى.':'This device could not decode the video. Try another quality or title.',
'المصدر أو ترميز الفيديو غير مدعوم، أو انتهت صلاحية الرابط. أعد المحاولة.':'The source is unsupported or its link expired. Try again.',
'انقطع تحميل الفيديو. تحقق من الشبكة ثم أعد المحاولة لتحديث الرابط.':'Video loading stopped. Check your connection and retry.',
'تعذّر بدء التشغيل. اضغط إعادة المحاولة لتحديث المصدر.':'Playback could not start. Retry to refresh the source.',
'تعذّر تحميل القائمة. اضغط رجوع وحاول مرة أخرى.':'Could not load the list. Go back and try again.'
});
Object.assign(EN,EXTRA_EN,{'نتائج البحث':'Search results'});
export function setLanguage(value){language=value==='en'?'en':'ar';}
export function getLanguage(){return language;}
export function t(value){
 if(language!=='en'||typeof value!=='string')return value;
 if(EN[value])return EN[value];
 const trimmed=value.trim();if(EN[trimmed])return value.slice(0,value.indexOf(trimmed))+EN[trimmed]+value.slice(value.indexOf(trimmed)+trimmed.length);
 if(value.includes(' · '))return value.split(' · ').map(t).join(' · ');
 return value.replace(/^جارٍ جمع النتائج المطابقة… /,'Collecting matching results… ').replace(/^تعذر تحميل المحتوى \(/,'Could not load content (').replace(/^نتائج البحث · /,'Search results · ').replace(/^الموسم (\d+)/,'Season $1').replace(/الحلقة (\d+)/g,'Episode $1').replace(/ · تشاهد الآن/g,' · Watching now').replace(/(\d+) دقيقة/g,'$1 min').replace(/مشغّل الجهاز الأصلي/g,'Native player');
}
Object.assign(EN,{'درع OLED':'OLED Shield','إزاحة خفيفة للواجهة وسكون بعد الخمول؛ حماية مساعدة وليست ضماناً لمنع الاحتراق.':'Subtle UI shifting and idle rest. Extra protection; burn-in prevention is not guaranteed.'});
const originals=new WeakMap();
function translated(node,key,current){
 let entries=originals.get(node);if(!entries){entries={};originals.set(node,entries)}
 let entry=entries[key];if(!entry||current!==entry.last)entry=entries[key]={original:current,last:current};
 const value=language==='en'?t(entry.original):entry.original;entry.last=value;return value;
}
export function translateTree(root){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){if(node.parentElement?.closest('script,style,.subtitle-overlay,.detail-description,.hero-description,.card-title,.episode-title,.original-title'))continue;const value=translated(node,'text',node.nodeValue);if(value!==node.nodeValue)node.nodeValue=value;}
 for(const node of root.querySelectorAll('[aria-label],[placeholder]'))for(const attr of ['aria-label','placeholder'])if(node.hasAttribute(attr)){const current=node.getAttribute(attr),value=translated(node,attr,current);if(value!==current)node.setAttribute(attr,value)}
}
