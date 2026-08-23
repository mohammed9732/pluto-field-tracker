"use client";
import { useSyncExternalStore } from "react";

/* English and Arabic, switchable per person.
 *
 * Two decisions shape this file:
 *
 * 1. Every lookup carries its English text as the fallback:
 *
 *        t("visit.save", "Save visit")
 *
 *    So a string that has not been translated yet shows correct English rather
 *    than a raw key like "visit.save". That lets the app be translated screen by
 *    screen without ever looking broken in between — which matters, because
 *    there are several hundred strings and they will not all land at once.
 *
 * 2. This is separate from `terms` in lib/terms.ts, which renames things per
 *    company ("Doctor" → "Customer"). That is one company's vocabulary; this is
 *    one person's language. A pharmacy chain using Arabic needs both.
 */

export type Lang = "en" | "ar";

// Arabic only. Anything missing here falls back to the English passed at the
// call site, so this file can grow without breaking anything.
const AR: Record<string, string> = {
  // — shell & navigation —
  "nav.home": "الرئيسية",
  "nav.plan": "الخطة",
  "nav.orders": "الطلبات",
  "nav.progress": "الأداء",
  "nav.chat": "المحادثة",
  "nav.team": "الفريق",
  "nav.approvals": "الموافقات",
  "nav.doctors": "الأطباء",
  "nav.money": "المالية",
  "nav.queue": "قائمة الفواتير",
  "nav.stock": "المخزون",
  "nav.payroll": "الرواتب",
  "nav.today": "اليوم",
  "nav.map": "الخريطة",
  "nav.report": "التقرير",
  "nav.manage": "الإدارة",
  "nav.monthEnd": "إقفال الشهر",
  "nav.stockChecks": "المخزون والجرد",
  "group.reference": "مرجع",
  "nav.daySummary": "ملخص اليوم",
  "nav.monthlyReport": "التقرير الشهري",
  "nav.liveMap": "الخريطة المباشرة",
  "nav.marketIntel": "معلومات السوق",
  "nav.tasks": "المهام",
  "nav.performance": "الأداء",
  "nav.invoiceQueue": "قائمة الفواتير",
  "nav.spendings": "المصروفات",
  "nav.payouts": "المستحقات",
  "nav.products": "المنتجات",
  "nav.usersProducts": "المستخدمون والمنتجات",
  "nav.controlPanel": "لوحة التحكم",
  "nav.dashboard": "اللوحة الرئيسية",
  "nav.leave": "الإجازات",
  "group.overview": "نظرة عامة",
  "group.field": "الميدان",
  "group.moneyStock": "المالية والمخزون",
  "group.setup": "الإعدادات",
  "group.money": "المالية",
  "group.stock": "المخزون",
  "group.team": "الفريق",

  // — common actions —
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.close": "إغلاق",
  "common.back": "رجوع",
  "common.add": "إضافة",
  "common.edit": "تعديل",
  "common.delete": "حذف",
  "common.remove": "إزالة",
  "common.search": "بحث",
  "common.approve": "موافقة",
  "common.reject": "رفض",
  "common.send": "إرسال",
  "common.submit": "إرسال",
  "common.confirm": "تأكيد",
  "common.retry": "إعادة المحاولة",
  "common.loading": "جارٍ التحميل…",
  "common.none": "لا يوجد",
  "common.today": "اليوم",
  "common.yesterday": "أمس",
  "common.all": "الكل",
  "common.notes": "ملاحظات",
  "common.phone": "الهاتف",
  "common.city": "المدينة",
  "common.date": "التاريخ",
  "common.amount": "المبلغ",
  "common.total": "المجموع",
  "common.status": "الحالة",
  "common.signOut": "تسجيل الخروج",
  "common.language": "اللغة",

  // — sign in —
  "login.phone": "رقم الهاتف أو الاسم",
  "login.password": "كلمة المرور",
  "login.signIn": "تسجيل الدخول",
  "login.signingIn": "جارٍ الدخول…",
  "login.wrong": "رقم الهاتف أو كلمة المرور غير صحيحة",

  // — the working day —
  "day.startDay": "ابدأ اليوم",
  "day.inField": "في الميدان",
  "day.endDay": "إنهاء اليوم",
  "day.completed": "اكتمل اليوم ✓",
  "day.resume": "استئناف اليوم",
  "day.notCheckedIn": "لم تسجّل الحضور",
  "day.checkInPrompt": "ابدأ يومك — سجّل الحضور من صفحة الخريطة",
  "day.todayRoute": "خط سير اليوم",
  "day.backup": "احتياطي",
  "day.tapToLog": "اضغط للتسجيل",

  // — visits —
  "visit.title": "تسجيل زيارة",
  "visit.outcome": "نتيجة الزيارة",
  "visit.order": "طلبية",
  "visit.followUp": "متابعة",
  "visit.payment": "تحصيل",
  "visit.nextVisit": "الزيارة القادمة",
  "visit.photo": "صورة الزيارة",
  "visit.takePhoto": "التقاط صورة",
  "visit.fromGallery": "اختيار من الصور",
  "visit.saved": "تم حفظ الزيارة",
  "visit.outOfLocation": "زيارة خارج الموقع",

  // — orders —
  "order.new": "طلبية جديدة",
  "order.myOrders": "طلبياتي",
  "order.pending": "بانتظار الموافقة",
  "order.approved": "تمت الموافقة",
  "order.rejected": "مرفوضة",
  "order.invoiced": "صدرت الفاتورة",
  "order.sample": "عيّنة مجانية",
  "order.quantity": "الكمية",
  "order.price": "السعر",

  // — payments —
  "pay.title": "تحصيل دفعة",
  "pay.collected": "المبلغ المحصّل",
  "pay.method": "طريقة الدفع",
  "pay.cash": "نقداً",
  "pay.transfer": "حوالة",
  "pay.receiptPhoto": "صورة الإيصال الموقّع (مطلوبة)",
  "pay.recorded": "تم تسجيل الدفعة",

  // — stock —
  "stock.title": "المخزون",
  "stock.qty": "الكمية",
  "stock.batch": "رقم التشغيلة",
  "stock.expiry": "تاريخ الانتهاء",
  "stock.transfer": "تحويل مخزون",
  "stock.requestTransfer": "طلب تحويل من مدينة أخرى",
  "stock.lowStock": "مخزون منخفض",

  // — leave —
  "leave.title": "الإجازات",
  "leave.annual": "سنوية",
  "leave.sick": "مرضية",
  "leave.request": "طلب إجازة",
  "leave.from": "من",
  "leave.to": "إلى",

  // — doctor profile —
  "doctor.profile": "ملف الطبيب",
  "doctor.clinic": "العيادة",
  "doctor.secretary": "رقم السكرتير",
  "doctor.privateNote": "ملاحظتي الخاصة",
  "doctor.privateNoteHint": "لا يراها أحد غيرك",
  "doctor.history": "السجل",
  "doctor.openInMaps": "فتح في الخرائط",
  "doctor.openInWaze": "فتح في ويز",
  "doctor.lifetime": "إجمالي المبيعات",
  "doctor.collected": "المحصّل",
  "doctor.thisMonth": "هذا الشهر",

  // — approvals & money —
  "approvals.title": "الموافقات",
  "approvals.nothing": "لا يوجد شيء بانتظارك",
  "money.title": "المالية",
  "money.thisMonth": "هذا الشهر",
  "money.commission": "العمولة",
  "money.salary": "الراتب",
  "money.deductions": "الاستقطاعات",

  // — help —
  "help.title": "كيف تستخدم التطبيق",
  "help.open": "كيف تستخدم التطبيق",
  "help.intro": "مكتوب لما تقوم به أنت. اضغط على أي عنوان لفتحه.",
  "help.footer": "هل هناك شيء قديم أو ناقص هنا؟ أخبر المالك — الدليل جزء من التطبيق، فيمكن إصلاحه.",

  // — added with the twelve updates —
  "nav.targets": "الأهداف",
  "common.saved": "تم الحفظ",
  "doctor.privateNotePlaceholder": "يفضّل الصباح الباكر · يسأل دائماً عن الخصم · السكرتير هو حارس الباب",
  "stock.transferRequests": "طلبات نقل المخزون",
  "stock.askForStock": "طلب مخزون",
  "stock.sendRequest": "إرسال الطلب",
  "stock.takeFrom": "خذه من",
  "stock.sendTo": "أرسله إلى",
  "stock.waitingSupervisor": "بانتظار المشرف",
  "stock.waitingAccountant": "بانتظار المحاسب",
  "stock.moved": "تم النقل",
  "stock.markMoved": "تعليم كمنقول",
  "stock.expires": "ينتهي في",
  "common.declined": "مرفوض",
  "common.name": "الاسم",
  "doctor.editDetails": "تعديل البيانات",
  "doctor.specialty": "التخصص",
  "doctor.area": "المنطقة",
  "doctor.address": "العنوان",
  "doctor.class": "التصنيف",
  "doctor.potential": "الإمكانية الشهرية",
  "common.decline": "رفض",
};

const DICTS: Record<Lang, Record<string, string>> = { en: {}, ar: AR };

let current: Lang = "en";
const listeners = new Set<() => void>();

export function setLang(next: Lang | undefined) {
  const lang: Lang = next === "ar" ? "ar" : "en";
  if (lang === current) return;
  current = lang;
  if (typeof document !== "undefined") {
    // The whole page mirrors for Arabic — navigation, alignment, the lot.
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }
  listeners.forEach((l) => l());
}

export function getLang(): Lang {
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, () => "en" as Lang);
}

export type TFn = (key: string, english: string) => string;

/* t("nav.home", "Home")
 *
 * The English is not a default in the usual sense — it is the actual source
 * text. Arabic overrides it when a translation exists.
 */
export function useT(): TFn {
  const lang = useLang();
  return (key: string, english: string) => DICTS[lang][key] ?? english;
}

// For the rare place that needs a translation outside a component.
export function tr(key: string, english: string): string {
  return DICTS[current][key] ?? english;
}
