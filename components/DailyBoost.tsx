"use client";
import { Mascot } from "./Mascot";

/* One line of encouragement a day, from Rafi.
 *
 * Written for field sales specifically — a rep walking into their fifth clinic
 * of the day does not need a poster slogan, they need something that sounds like
 * a colleague who has done the job. The line is chosen by the date, so the whole
 * team sees the same one and it changes at midnight rather than on every render.
 */

const LINES: string[] = [
  "A “no” today is just a “not yet”. Write the next visit date before you leave.",
  "The doctor who kept you waiting is often the one who orders. Patience pays.",
  "Five real conversations beat fifteen rushed hellos.",
  "Log the visit while you are still in the car. Tonight you will not remember the details.",
  "Ask what they are using now, then listen longer than feels comfortable.",
  "The best rep in any company is the one who shows up in August as well as January.",
  "A samples box opens doors. A follow-up call keeps them open.",
  "If a clinic went quiet, go in person. A message is easy to ignore.",
  "Know your price tiers cold. Hesitation costs more than a discount.",
  "Collect the payment while you are smiling, not by phone next month.",
  "Every clinic on your list was a stranger once.",
  "Small orders build the habit. Habits build the year.",
  "Honey badgers do not quit halfway down the road. Neither do you.",
  "Your route is a plan, not a promise — but start it on time anyway.",
  "The doctor remembers who turned up when there was nothing to sell.",
  "Write down what the competitor is charging. That note wins the next deal.",
  "One more clinic before lunch. That is where the month is decided.",
  "Being trusted takes ten visits. Losing it takes one broken promise.",
  "If it is worth an order, it is worth a receipt photo.",
  "Good territory is not found. It is built, one visit at a time.",
];

// Same line for everyone, all day — derived from the date, not from chance.
function lineForDate(dateIso: string): string {
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
        <div className="boost-line">{line}</div>
      </div>
    </div>
  );
}
