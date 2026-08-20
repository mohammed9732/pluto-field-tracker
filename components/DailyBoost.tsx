"use client";
import { Mascot } from "./Mascot";

/* One line of encouragement a day, from Rafi — in English and Arabic.
 *
 * Written for field sales specifically: a rep walking into their fifth clinic of
 * the day does not need a poster slogan, they need something that sounds like a
 * colleague who has done the job. The line is chosen by the date, so the whole
 * team sees the same one and it changes at midnight rather than on every render.
 *
 * The Arabic is written to read naturally rather than translated word for word,
 * and is marked dir="rtl" so punctuation lands on the correct side.
 */

type Line = { en: string; ar: string };

const LINES: Line[] = [
  {
    en: "A “no” today is just a “not yet”. Write the next visit date before you leave.",
    ar: "«لا» اليوم تعني «ليس بعد». حدّد موعد الزيارة القادمة قبل أن تغادر.",
  },
  {
    en: "The doctor who kept you waiting is often the one who orders. Patience pays.",
    ar: "الطبيب الذي أطال انتظارك هو غالباً من سيطلب. الصبر يؤتي ثماره.",
  },
  {
    en: "Five real conversations beat fifteen rushed hellos.",
    ar: "خمس محادثات حقيقية أفضل من خمس عشرة تحية عابرة.",
  },
  {
    en: "Log the visit while you are still in the car. Tonight you will not remember the details.",
    ar: "سجّل الزيارة وأنت ما زلت في السيارة؛ في المساء لن تتذكّر التفاصيل.",
  },
  {
    en: "Ask what they are using now, then listen longer than feels comfortable.",
    ar: "اسأل عمّا يستخدمونه الآن، ثم أنصت أطول ممّا اعتدت.",
  },
  {
    en: "The best rep in any company is the one who shows up in August as well as January.",
    ar: "أفضل مندوب هو من يحضر في آب كما يحضر في كانون الثاني.",
  },
  {
    en: "A samples box opens doors. A follow-up call keeps them open.",
    ar: "العيّنات تفتح الأبواب، والمتابعة تُبقيها مفتوحة.",
  },
  {
    en: "If a clinic went quiet, go in person. A message is easy to ignore.",
    ar: "إذا صمتت العيادة، اذهب بنفسك؛ الرسالة يسهل تجاهلها.",
  },
  {
    en: "Know your price tiers cold. Hesitation costs more than a discount.",
    ar: "اعرف شرائح الأسعار عن ظهر قلب؛ التردد يكلّفك أكثر من الخصم.",
  },
  {
    en: "Collect the payment while you are smiling, not by phone next month.",
    ar: "حصّل الدفعة وأنت مبتسم، لا عبر الهاتف الشهر القادم.",
  },
  {
    en: "Every clinic on your list was a stranger once.",
    ar: "كل عيادة في قائمتك كانت يوماً ما غريبة عنك.",
  },
  {
    en: "Small orders build the habit. Habits build the year.",
    ar: "الطلبات الصغيرة تبني العادة، والعادة تبني السنة.",
  },
  {
    en: "Honey badgers do not quit halfway down the road. Neither do you.",
    ar: "غرير العسل لا يتوقف في منتصف الطريق، وأنت كذلك.",
  },
  {
    en: "Your route is a plan, not a promise — but start it on time anyway.",
    ar: "خطّ سيرك خطة لا وعد، لكن ابدأه في وقته على أي حال.",
  },
  {
    en: "The doctor remembers who turned up when there was nothing to sell.",
    ar: "الطبيب يتذكّر من زاره حين لم يكن هناك ما يُباع.",
  },
  {
    en: "Write down what the competitor is charging. That note wins the next deal.",
    ar: "دوّن سعر المنافس؛ تلك الملاحظة تكسب الصفقة القادمة.",
  },
  {
    en: "One more clinic before lunch. That is where the month is decided.",
    ar: "عيادة أخرى قبل الغداء؛ هناك يُحسم الشهر.",
  },
  {
    en: "Being trusted takes ten visits. Losing it takes one broken promise.",
    ar: "كسب الثقة يحتاج عشر زيارات، وفقدانها وعدٌ واحد لم يُوفَ.",
  },
  {
    en: "If it is worth an order, it is worth a receipt photo.",
    ar: "إن كان يستحق طلباً، فهو يستحق صورة إيصال.",
  },
  {
    en: "Good territory is not found. It is built, one visit at a time.",
    ar: "المنطقة الجيدة لا تُوجد، بل تُبنى زيارة بعد زيارة.",
  },
];

// Same line for everyone, all day — derived from the date, not from chance.
function lineForDate(dateIso: string): Line {
  const key = dateIso.slice(0, 10);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return LINES[h % LINES.length];
}

export function DailyBoost({ date, name }: { date: string; name?: string }) {
  const line = lineForDate(date);
  const first = (name ?? "").split(" ")[0];

  return (
    <div className="boost">
      <div className="boost-art">
        <Mascot size={78} mood="idle" />
      </div>
      <div className="boost-text">
        <div className="boost-kicker">
          {first ? `Rafi says, ${first}…` : "Rafi says…"}
        </div>
        <div className="boost-line">{line.en}</div>
        <div className="boost-ar" dir="rtl" lang="ar">{line.ar}</div>
      </div>
    </div>
  );
}
