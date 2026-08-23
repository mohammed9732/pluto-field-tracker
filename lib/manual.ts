import { Lang } from "./i18n";

/* The user manual.
 *
 * Written here rather than as a PDF for two reasons. It stays in step with the
 * app — a screen that gets renamed gets renamed here in the same commit — and
 * it can be filtered by role, so a rep opening Help reads six sections about
 * their day rather than forty about everybody's.
 *
 * Both languages are written out in full. The t() fallback pattern used
 * everywhere else suits short labels; for paragraphs a half-translated page
 * reads worse than either language on its own.
 */

export type ManualRole = "rep" | "supervisor" | "accountant" | "admin";

export interface ManualSection {
  id: string;
  roles: ManualRole[];
  title: Record<Lang, string>;
  body: Record<Lang, string[]>;
}

export const MANUAL: ManualSection[] = [
  // ————————————————————————————————————————————————— everyone
  {
    id: "signing-in",
    roles: ["rep", "supervisor", "accountant", "admin"],
    title: { en: "Signing in", ar: "تسجيل الدخول" },
    body: {
      en: [
        "Sign in with your phone number and the password the office gave you.",
        "If you forget it, ask the owner to reset it — nobody else can, and nobody can see your current one.",
        "On the phone, use “Add to Home Screen” in your browser once. After that it opens like any other app, full screen.",
      ],
      ar: [
        "سجّل الدخول برقم هاتفك وكلمة المرور التي أعطاك إياها المكتب.",
        "إذا نسيتها، اطلب من المالك إعادة تعيينها — لا أحد غيره يستطيع ذلك، ولا أحد يستطيع رؤية كلمتك الحالية.",
        "على الهاتف، استخدم «إضافة إلى الشاشة الرئيسية» في المتصفح مرة واحدة. بعدها يفتح التطبيق كأي تطبيق آخر، بملء الشاشة.",
      ],
    },
  },
  {
    id: "language",
    roles: ["rep", "supervisor", "accountant", "admin"],
    title: { en: "Arabic or English", ar: "العربية أو الإنجليزية" },
    body: {
      en: [
        "Every screen works in both. Change it from the menu at the top — your choice is remembered and does not affect anybody else.",
        "In Arabic the whole app mirrors: menus move to the right, and text reads right to left. Numbers and money stay in the usual direction so figures are never misread.",
      ],
      ar: [
        "كل الشاشات تعمل باللغتين. غيّر اللغة من القائمة في الأعلى — اختيارك محفوظ ولا يؤثر على أحد آخر.",
        "بالعربية ينعكس التطبيق بالكامل: القوائم تنتقل إلى اليمين، والنص يُقرأ من اليمين إلى اليسار. الأرقام والمبالغ تبقى باتجاهها المعتاد حتى لا تُقرأ خطأً.",
      ],
    },
  },
  {
    id: "offline",
    roles: ["rep", "supervisor"],
    title: { en: "When there is no signal", ar: "عند انقطاع الشبكة" },
    body: {
      en: [
        "Visits, orders and payments can be saved with no internet. They wait in a queue and send themselves the moment signal comes back — you will see a small bar at the top telling you how many are waiting.",
        "Do not log the same visit twice because you were unsure it saved. The app recognises a repeat and will not double-count it.",
        "A payment photo is the one thing that needs signal. If you have none, log the visit now and record the payment once you are back in coverage.",
      ],
      ar: [
        "يمكن حفظ الزيارات والطلبيات والدفعات بدون إنترنت. تنتظر في قائمة وتُرسل نفسها فور عودة الشبكة — سترى شريطاً صغيراً في الأعلى يخبرك بعددها.",
        "لا تسجّل الزيارة مرتين لأنك لم تتأكد من حفظها. التطبيق يتعرّف على التكرار ولا يحتسبها مرتين.",
        "صورة الإيصال هي الشيء الوحيد الذي يحتاج إنترنت. إن لم تكن لديك شبكة، سجّل الزيارة الآن وسجّل الدفعة عند عودة التغطية.",
      ],
    },
  },

  // ————————————————————————————————————————————————— reps
  {
    id: "your-day",
    roles: ["rep"],
    title: { en: "Your working day", ar: "يوم عملك" },
    body: {
      en: [
        "Press Start day when you set out. The app records where and when, and starts counting your field time.",
        "Your route for the day is on the home screen. You can visit them in any order — tap whichever one you are standing in front of, not necessarily the highlighted one.",
        "Press End day when you finish. A day never started counts as a day not worked, so start it even if you only have one call.",
      ],
      ar: [
        "اضغط «ابدأ اليوم» عند خروجك. يسجّل التطبيق المكان والوقت ويبدأ بحساب ساعات عملك الميداني.",
        "خط سيرك لليوم موجود في الشاشة الرئيسية. يمكنك زيارتهم بأي ترتيب — اضغط على الطبيب الذي تقف أمامه، وليس بالضرورة المميّز باللون.",
        "اضغط «إنهاء اليوم» عند انتهائك. اليوم الذي لم يبدأ يُحتسب يوماً غير مُنجَز، فابدأه حتى لو كانت لديك زيارة واحدة فقط.",
      ],
    },
  },
  {
    id: "logging-a-visit",
    roles: ["rep"],
    title: { en: "Logging a visit", ar: "تسجيل زيارة" },
    body: {
      en: [
        "Open the doctor and press Log visit. Choose what came of it: an order, a follow-up, or a payment collected.",
        "Always set the next visit date. It is what builds next week's plan for you.",
        "You can attach a photo — from the camera or from your gallery. It is a memory aid, not proof of anything.",
        "If you are far from the clinic's saved location the app will say so and ask you to confirm. Confirming is fine when there is a good reason; it simply tells your supervisor, with the doctor's name and the distance.",
      ],
      ar: [
        "افتح ملف الطبيب واضغط «تسجيل زيارة». اختر نتيجتها: طلبية، أو متابعة، أو تحصيل دفعة.",
        "حدّد دائماً موعد الزيارة القادمة. هو ما يبني لك خطة الأسبوع القادم.",
        "يمكنك إرفاق صورة — من الكاميرا أو من معرض الصور. الصورة للتذكير فقط وليست إثباتاً لشيء.",
        "إذا كنت بعيداً عن موقع العيادة المحفوظ سينبّهك التطبيق ويطلب التأكيد. التأكيد لا مشكلة فيه عند وجود سبب وجيه؛ سيُبلّغ مشرفك فقط، مع اسم الطبيب والمسافة.",
      ],
    },
  },
  {
    id: "doctor-file",
    roles: ["rep", "supervisor"],
    title: { en: "The doctor's file", ar: "ملف الطبيب" },
    body: {
      en: [
        "Every visit, order and payment for that doctor is on one page — including visits made by your colleagues, so you are never the last to know.",
        "Google Maps and Waze buttons take you there. If nobody has pinned the clinic yet, they search for the address instead — so pin it the first time you go.",
        "My private note is yours alone. Your supervisor and the owner cannot read it. Use it for the things worth remembering: who the gatekeeper is, when they take visitors, what they always argue about.",
        "The secretary's number is often the one that actually gets answered. Add it — it belongs to the company, not to whoever's phone it happens to be in.",
      ],
      ar: [
        "كل الزيارات والطلبيات والدفعات لهذا الطبيب في صفحة واحدة — بما فيها زيارات زملائك، فلا تكون آخر من يعلم.",
        "زرّا خرائط جوجل و«ويز» يوصلانك إليه. إن لم يحدّد أحد موقع العيادة بعد، يبحثان بالعنوان بدلاً من ذلك — لذا حدّد الموقع في أول زيارة.",
        "«ملاحظتي الخاصة» لك وحدك. لا يستطيع مشرفك ولا المالك قراءتها. استخدمها لما يستحق التذكّر: من هو حارس الباب، ومتى يستقبل الزوار، وما الذي يجادل فيه دائماً.",
        "رقم السكرتير غالباً هو الرقم الذي يُردّ عليه فعلاً. أضِفه — فهو ملك الشركة، لا ملك الهاتف الذي صادف وجوده فيه.",
      ],
    },
  },
  {
    id: "orders",
    roles: ["rep"],
    title: { en: "Orders and samples", ar: "الطلبيات والعيّنات" },
    body: {
      en: [
        "An order goes to your supervisor first, then to the accountant for the invoice. You will be told at each step.",
        "If it comes back rejected, open it and read the note underneath. Fix what was flagged and send it again.",
        "Mark free samples as samples. The stock still moves, but they carry no value and no credit towards your target — which is the honest way round.",
        "If the company has product lines, you only see and sell your own range. You still share the same doctors with your colleagues.",
      ],
      ar: [
        "تذهب الطلبية إلى مشرفك أولاً، ثم إلى المحاسب لإصدار الفاتورة. ستُبلَّغ في كل خطوة.",
        "إذا عادت مرفوضة، افتحها واقرأ الملاحظة أسفلها. صحّح ما أُشير إليه وأعد إرسالها.",
        "علّم العيّنات المجانية كعيّنات. المخزون ينقص فعلاً، لكنها بلا قيمة ولا تُحتسب ضمن هدفك — وهذا هو الوجه الصحيح للأمر.",
        "إذا كانت لدى الشركة خطوط منتجات، فأنت ترى وتبيع خطّك فقط. لكنك تشارك زملاءك الأطباء أنفسهم.",
      ],
    },
  },
  {
    id: "money-in",
    roles: ["rep"],
    title: { en: "Collecting money", ar: "تحصيل المبالغ" },
    body: {
      en: [
        "Record every collection the same day. A photo of the signed receipt is required — it protects you far more than it protects the company.",
        "Amounts are typed in Iraqi dinars and grouped with commas as you type, so a missing zero is easy to spot before you save.",
      ],
      ar: [
        "سجّل كل تحصيل في يومه. صورة الإيصال الموقّع مطلوبة — وهي تحميك أنت أكثر مما تحمي الشركة.",
        "تُكتب المبالغ بالدينار العراقي وتُفصل بفواصل أثناء الكتابة، فيسهل ملاحظة صفر ناقص قبل الحفظ.",
      ],
    },
  },
  {
    id: "stock-rep",
    roles: ["rep"],
    title: { en: "Your stock", ar: "مخزونك" },
    body: {
      en: [
        "If you hold stock in your own city, count it once a week and submit the count. Count what is physically in front of you first — do not read the system's number and copy it.",
        "Run short? Use Ask for stock. Your supervisor agrees it is needed, then the accountant moves it. Nothing changes in the numbers until the accountant confirms it has actually gone.",
      ],
      ar: [
        "إذا كنت تحتفظ بمخزون في مدينتك، اجرده مرة في الأسبوع وأرسل الجرد. اعدّ ما أمامك فعلياً أولاً — لا تنظر إلى رقم النظام وتنسخه.",
        "نفد مخزونك؟ استخدم «طلب مخزون». يوافق مشرفك على الحاجة، ثم ينقله المحاسب. لا تتغير الأرقام إطلاقاً حتى يؤكد المحاسب أنه خرج فعلاً.",
      ],
    },
  },
  {
    id: "leave",
    roles: ["rep", "supervisor"],
    title: { en: "Asking for leave", ar: "طلب إجازة" },
    body: {
      en: [
        "One or two days needs two days' notice. Anything longer needs ten, so your territory can be covered.",
        "Sick leave is different — report it as soon as you can, there is no notice period.",
      ],
      ar: [
        "يوم أو يومان يحتاجان إشعاراً قبل يومين. وما زاد على ذلك يحتاج عشرة أيام، حتى تُغطّى منطقتك.",
        "الإجازة المرضية مختلفة — أبلغ عنها بأسرع ما يمكن، ولا توجد مدة إشعار.",
      ],
    },
  },

  // ————————————————————————————————————————————————— supervisors
  {
    id: "supervising",
    roles: ["supervisor"],
    title: { en: "Running your team", ar: "إدارة فريقك" },
    body: {
      en: [
        "The Team screen shows who has started, how long they have been out, and how they are tracking against their visit target.",
        "Out-of-location visits are listed by doctor and day, not as a number. Open one and ask about it — most have a perfectly good explanation.",
        "Approve orders promptly. Nothing reaches the accountant, and no invoice is raised, until you do.",
        "You can work from a computer as well as a phone. The desktop layout gives you the whole week at once, which is the better way to plan.",
      ],
      ar: [
        "شاشة «الفريق» تُظهر من بدأ يومه، وكم مضى على خروجه، وأين هو من هدف زياراته.",
        "الزيارات خارج الموقع مُدرَجة باسم الطبيب واليوم، لا كرقم مجرّد. افتح واحدة واسأل عنها — لمعظمها تفسير وجيه تماماً.",
        "وافق على الطلبيات بسرعة. لا شيء يصل إلى المحاسب ولا تُصدر فاتورة قبل موافقتك.",
        "يمكنك العمل من الحاسوب كما من الهاتف. تصميم سطح المكتب يعرض الأسبوع كاملاً دفعة واحدة، وهو أفضل للتخطيط.",
      ],
    },
  },

  // ————————————————————————————————————————————————— accountant
  {
    id: "accounting",
    roles: ["accountant"],
    title: { en: "The invoice queue", ar: "قائمة الفواتير" },
    body: {
      en: [
        "Approved orders land in the queue. Raise the invoice in your own system, then attach it here and mark the order invoiced.",
        "Stock counts from the cities arrive weekly. Compare them with the system, and accept the count when you are satisfied — that is what sets the new figure.",
        "Batch numbers and expiry dates can be typed straight into the stock table. Anything expiring inside the warning window turns amber; anything already past turns red.",
        "Transfer requests reach you only after a supervisor has agreed. Move the stock, then mark it moved.",
      ],
      ar: [
        "الطلبيات المعتمدة تصل إلى القائمة. أصدر الفاتورة في نظامك، ثم أرفقها هنا وعلّم الطلبية كـ«صدرت الفاتورة».",
        "جرد المخزون من المدن يصل أسبوعياً. قارنه بالنظام، واقبل الجرد عندما تطمئن — فالقبول هو ما يحدّد الرقم الجديد.",
        "أرقام التشغيلة وتواريخ الانتهاء تُكتب مباشرة في جدول المخزون. ما يقترب انتهاؤه ضمن مدة التنبيه يصبح برتقالياً، وما انتهى فعلاً يصبح أحمر.",
        "طلبات نقل المخزون تصلك فقط بعد موافقة المشرف. انقل البضاعة، ثم علّمها كـ«تم النقل».",
      ],
    },
  },
  {
    id: "month-end",
    roles: ["accountant", "admin"],
    title: { en: "Closing the month", ar: "إقفال الشهر" },
    body: {
      en: [
        "Closing a month locks it: no visit, order or payment can be added or altered with a date inside it.",
        "Settle anything outstanding first — the screen lists what is still undecided and will not let you close over it.",
        "If something genuinely has to be corrected afterwards, the owner can reopen the month. Every reopening is recorded.",
      ],
      ar: [
        "إقفال الشهر يقفله فعلاً: لا يمكن إضافة أو تعديل أي زيارة أو طلبية أو دفعة بتاريخ داخله.",
        "احسم المعلّق أولاً — الشاشة تعرض ما لم يُبتّ فيه ولن تسمح لك بالإقفال فوقه.",
        "إذا لزم تصحيح شيء بعد ذلك فعلاً، يستطيع المالك إعادة فتح الشهر. وكل إعادة فتح تُسجَّل.",
      ],
    },
  },

  // ————————————————————————————————————————————————— owner
  {
    id: "owner-setup",
    roles: ["admin"],
    title: { en: "Setting the company up", ar: "إعداد الشركة" },
    body: {
      en: [
        "Control panel holds everything that makes the app yours: the company name, the logo, the brand colour, and the words the app uses — if you sell to pharmacies rather than doctors, rename them and every screen follows.",
        "Cities come first: every person, doctor and stock location belongs to one. A city still in use cannot be deleted.",
        "Product lines are only needed if two reps work the same city on different ranges. They share the doctors; each sells and is paid on their own range. Leave it empty and everybody sells everything.",
        "Only you can reset a password. Nobody — including you — can read an existing one.",
      ],
      ar: [
        "«لوحة التحكم» تضم كل ما يجعل التطبيق تطبيقك: اسم الشركة، والشعار، ولون العلامة، والمصطلحات المستخدمة — فإن كنت تبيع للصيدليات بدل الأطباء، غيّر التسمية وستتبعها كل الشاشات.",
        "المدن أولاً: كل شخص وطبيب وموقع مخزون ينتمي إلى مدينة. والمدينة المستخدمة لا يمكن حذفها.",
        "خطوط المنتجات لازمة فقط إذا كان مندوبان يعملان في المدينة نفسها على خطوط مختلفة. يتشاركان الأطباء، وكلٌّ يبيع ويُحاسَب على خطّه. اتركها فارغة ليبيع الجميع كل شيء.",
        "أنت وحدك من يعيد تعيين كلمة المرور. ولا أحد — بمن فيهم أنت — يستطيع قراءة كلمة قائمة.",
      ],
    },
  },
  {
    id: "training-mode",
    roles: ["admin"],
    title: { en: "Training, then going live", ar: "التدريب ثم التشغيل الفعلي" },
    body: {
      en: [
        "Load the sample data to train people on something that looks real without touching anything real.",
        "When you are ready to start properly, use the wipe button in the control panel. It clears the made-up records and keeps your company setup — your name, logo, colour, cities and people.",
        "Do it once, before the first real working day. There is no undo.",
      ],
      ar: [
        "حمّل البيانات التجريبية لتدريب فريقك على شيء يبدو حقيقياً دون المساس بأي شيء حقيقي.",
        "وعندما تصبح جاهزاً للبدء فعلياً، استخدم زر المسح في لوحة التحكم. يمسح السجلات التجريبية ويُبقي إعدادات شركتك — الاسم والشعار واللون والمدن والموظفين.",
        "افعلها مرة واحدة، قبل أول يوم عمل حقيقي. ولا يمكن التراجع عنها.",
      ],
    },
  },
  {
    id: "audit",
    roles: ["admin", "supervisor"],
    title: { en: "What is recorded", ar: "ما الذي يُسجَّل" },
    body: {
      en: [
        "Changes to important records keep a history: what changed, from what to what, by whom, and when. You will find it at the bottom of the record itself.",
        "Deleting is deliberately rare. Most things are corrected rather than removed, so that the trail stays readable a year later.",
      ],
      ar: [
        "التعديلات على السجلات المهمة تحتفظ بتاريخها: ما الذي تغيّر، ومن ماذا إلى ماذا، وبواسطة من، ومتى. تجده أسفل السجل نفسه.",
        "الحذف نادر عن قصد. معظم الأمور تُصحَّح بدل أن تُحذف، ليبقى المسار مقروءاً بعد سنة.",
      ],
    },
  },
];

export function manualFor(role: string): ManualSection[] {
  return MANUAL.filter((s) => s.roles.includes(role as ManualRole));
}
