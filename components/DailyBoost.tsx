"use client";
import { Mascot } from "./Mascot";
import { tr, useLang } from "@/lib/i18n";

/* One line of encouragement a day, from Rafi — in English and Arabic.
 *
 * The Arabic is NOT a translation of the English. Each line was rewritten to
 * carry the same meaning the way an Arabic-speaking sales manager would actually
 * say it, because word-for-word versions came out stiff and in places meaningless.
 * A few deliberately diverge: "shows up in August as well as January" becomes
 * "visits in the dead season, not only in season", which is the point rather
 * than the calendar.
 *
 * The line is chosen by the date, so the whole team sees the same one and it
 * changes at midnight rather than on every render.
 */

type Line = { en: string; ar: string };

const LINES: Line[] = [
  {
    en: "A “no” today is just a “not yet”. Write the next visit date before you leave.",
    ar: "رفض اليوم ليس رفضاً للأبد. لا تخرج من العيادة قبل أن تحجز موعد الزيارة القادمة.",
  },
  {
    en: "The doctor who kept you waiting is often the one who orders. Patience pays.",
    ar: "الطبيب الذي يطيل انتظارك هو غالباً من يطلب في النهاية. اصبر ولا تنزعج.",
  },
  {
    en: "Five real conversations beat fifteen rushed hellos.",
    ar: "خمس زيارات تتكلم فيها بجدية أفضل من خمس عشرة زيارة تُلقي فيها السلام وتمشي.",
  },
  {
    en: "Log the visit while you are still in the car. Tonight you will not remember the details.",
    ar: "سجّل الزيارة وأنت في السيارة قبل أن تنساها؛ في آخر اليوم تختلط عليك التفاصيل.",
  },
  {
    en: "Ask what they are using now, then listen longer than feels comfortable.",
    ar: "اسأل الطبيب ماذا يستخدم الآن، ثم اسكت واسمع. أكثر المندوبين يتكلمون أكثر مما يسمعون.",
  },
  {
    en: "The best rep in any company is the one who shows up in August as well as January.",
    ar: "المندوب الناجح هو الذي يزور عياداته في الأوقات الميتة، لا في المواسم فقط.",
  },
  {
    en: "A samples box opens doors. A follow-up call keeps them open.",
    ar: "العيّنة تفتح لك الباب، لكن المتابعة هي التي تُبقيه مفتوحاً.",
  },
  {
    en: "If a clinic went quiet, go in person. A message is easy to ignore.",
    ar: "إذا انقطعت عنك عيادة، زُرها بنفسك. الرسالة يسهل تجاهلها، أما وجودك فلا.",
  },
  {
    en: "Know your price tiers cold. Hesitation costs more than a discount.",
    ar: "أتقن جدول الأسعار. ترددك أمام الطبيب يكلّفك أكثر من أي خصم تعطيه.",
  },
  {
    en: "Collect the payment while you are smiling, not by phone next month.",
    ar: "خذ المبلغ وأنت في العيادة والوجه بشوش، لا بالتلفون بعد شهر.",
  },
  {
    en: "Every clinic on your list was a stranger once.",
    ar: "كل عيادة في قائمتك اليوم كانت يوماً ما لا تعرفك.",
  },
  {
    en: "Small orders build the habit. Habits build the year.",
    ar: "الطلبية الصغيرة تصنع العادة، والعادة تصنع رقم السنة.",
  },
  {
    en: "The rep who knows every street in his city never loses a clinic to a competitor.",
    ar: "المندوب الذي يعرف كل شارع في مدينته لا يخسر عيادة لمنافس.",
  },
  {
    en: "Your route is a plan, not a promise — but start it on time anyway.",
    ar: "خط سيرك اليوم قد يتغير، لكن ابدأ في وقتك على كل حال.",
  },
  {
    en: "The doctor remembers who turned up when there was nothing to sell.",
    ar: "الطبيب يتذكّر المندوب الذي زاره بلا مصلحة، لا الذي يأتي وقت الطلبية فقط.",
  },
  {
    en: "Write down what the competitor is charging. That note wins the next deal.",
    ar: "دوّن سعر المنافس اليوم؛ هذه المعلومة تكسب لك الطلبية القادمة.",
  },
  {
    en: "One more clinic before lunch. That is where the month is decided.",
    ar: "عيادة واحدة إضافية قبل الغداء؛ من هذه الزيارات يُبنى رقم الشهر.",
  },
  {
    en: "Being trusted takes ten visits. Losing it takes one broken promise.",
    ar: "الثقة تُبنى في عشر زيارات، وتنهار بوعد واحد لم تفِ به.",
  },
  {
    en: "If it is worth an order, it is worth a receipt photo.",
    ar: "أي مبلغ تستلمه يستحق صورة إيصال؛ بلا صورة لا يوجد إثبات.",
  },
  {
    en: "Good territory is not found. It is built, one visit at a time.",
    ar: "المنطقة القوية لا تأتي جاهزة؛ تبنيها زيارة بعد زيارة.",
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
  const lang = useLang();
  const line = lineForDate(date);
  const first = (name ?? "").split(" ")[0];

  return (
    <div className="boost">
      <div className="boost-art">
        <Mascot size={76} mood="idle" />
      </div>
      <div className="boost-text">
        <div className="boost-kicker">
          {first
            ? tr("boost.rafiSaysName", "Rafi says, {name}…").replace("{name}", first)
            : tr("boost.rafiSays", "Rafi says…")}
        </div>
        {/* One language — the reader's. Showing both made the card twice as
            tall and read like a language lesson rather than a nudge. */}
        {lang === "ar"
          ? <div className="boost-line" dir="rtl" lang="ar">{line.ar}</div>
          : <div className="boost-line">{line.en}</div>}
      </div>
    </div>
  );
}
