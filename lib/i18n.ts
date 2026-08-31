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


  // — the working day —
  "home.followUpsDue": "متابعات مستحقة",
  "home.noApprovedPlanFor": "لا توجد خطة معتمدة لليوم — جهّز خطتك الأسبوعية ←",
  "home.order": "طلبية",
  "home.payment": "تحصيل",
  "home.signOutPh": "تسجيل الخروج",
  "home.startYourDayCheck": "ابدأ يومك — سجّل الحضور من صفحة الخريطة",

  // — weekly plan —
  "plan.approved": "معتمدة",
  "plan.areaRoutePh": "المنطقة / خط السير",
  "plan.awaitingApproval": "بانتظار الموافقة",
  "plan.backup": "احتياطي:",
  "plan.done": "تم",
  "plan.doubleVisitsWith": "زيارات مشتركة مع:",
  "plan.followUpsDueThat": "المتابعات المستحقة ذلك الأسبوع — اضغط لإضافتها:",
  "plan.myWeeklyPlan": "خطتي الأسبوعية",
  "plan.noMoreDoctorsMatch": "لا يوجد أطباء آخرون مطابقون.",
  "plan.nobodySoloDay": "لا أحد — يوم منفرد",
  "plan.notSubmitted": "لم تُرسَل",
  "plan.noteOptionalPh": "ملاحظة (اختياري)",
  "plan.returned": "مُعادة",
  "plan.returnedWithANote": "أُعيدت مع ملاحظة",
  "plan.searchDoctorsInThisPh": "ابحث عن أطباء في هذه المدينة…",
  "plan.soloDayPickThe": "يوم منفرد — اختر الأطباء الذين ستزورهم",

  // — visits —
  "visit.competitorEGRegenovuePh": "المنافس (مثال: Regenovue)",
  "visit.competitorSeenAtThis": "منافس شوهد في هذه العيادة",
  "visit.goesToTheMarket": "يذهب إلى تقرير السوق — يراه المالك والمشرف.",
  "visit.jointVisitWithA": "زيارة مشتركة مع مندوب",
  "visit.jointVisitWithSupervisor": "زيارة مشتركة مع المشرف",
  "visit.logVisitPh": "تسجيل زيارة",
  "visit.none": "لا شيء",
  "visit.noteOptionalPh": "ملاحظة (اختياري)",
  "visit.notesOptional": "ملاحظات (اختياري)",
  "visit.savedNextVisitDates": "مواعيد الزيارة القادمة تغذّي قائمة متابعاتك وخطتك الأسبوعية.",
  "visit.setClinicLocation": "تحديد موقع العيادة",
  "visit.theirPriceIqdOptionalPh": "سعرهم (دينار، اختياري)",
  "visit.theirProductPh": "منتجهم",
  "visit.whichRep": "أي مندوب؟",

  // — new order —
  "neworder.freeSample": "عيّنة مجانية",
  "neworder.newOrderPh": "طلبية جديدة",

  // — orders —
  "orders.collectedToday": "المحصّل اليوم",
  "orders.invoiceAttachedOpen": "الفاتورة مرفقة — افتح",
  "orders.noOrdersYetPh": "لا توجد طلبيات بعد",
  "orders.nothingCollectedYetPh": "لا توجد تحصيلات بعد",
  "orders.orders": "الطلبيات",
  "orders.payments": "الدفعات",

  // — payments —
  "pay.amountCollected": "المبلغ المحصّل",
  "pay.amountCollectedIqd": "المبلغ المحصّل (دينار)",
  "pay.clinic": "العيادة",
  "pay.collectedBy": "حصّلها",
  "pay.done": "تم",
  "pay.eGPartPaymentPh": "مثال: دفعة جزئية عن توريد تموز",
  "pay.from": "من",
  "pay.gpsPinned": "تم تثبيت الموقع",
  "pay.noteOptional": "ملاحظة (اختياري)",
  "pay.paymentRecorded": "تم تسجيل الدفعة",
  "pay.recordAnother": "تسجيل دفعة أخرى",
  "pay.recordPaymentPh": "تسجيل الدفعة",
  "pay.reference": "رقم المرجع",
  "pay.saved": "تم الحفظ",
  "pay.signedReceiptPh": "الإيصال الموقّع",

  // — the doctor list —
  "docs.address": "العنوان",
  "docs.area": "المنطقة",
  "docs.cancel": "إلغاء",
  "docs.centerClinicName": "اسم المركز / العيادة",
  "docs.city": "المدينة",
  "docs.class": "التصنيف",
  "docs.confirmImport": "تأكيد الاستيراد",
  "docs.dentist": "طبيب أسنان",
  "docs.dermatologist": "طبيب جلدية",
  "docs.doctorName": "اسم الطبيب",
  "docs.downloadBlankTemplate": "تنزيل نموذج فارغ",
  "docs.importXlsx": "استيراد .xlsx",
  "docs.monthlyPotentialIqdOptional": "الإمكانية الشهرية (دينار، اختياري)",
  "docs.newDoctor": "طبيب جديد",
  "docs.other": "أخرى",
  "docs.phone": "الهاتف",
  "docs.plasticSurgeon": "جرّاح تجميل",
  "docs.saveDoctor": "حفظ الطبيب",
  "docs.secretaryPhoneOptional": "رقم السكرتير (اختياري)",
  "docs.setClinicLocationFrom": "تحديد موقع العيادة من موقعي الحالي",
  "docs.specialty": "التخصص",
  "docs.streetBuildingFloorPh": "الشارع، البناية، الطابق…",
  "docs.whatThisDoctorShouldPh": "ما ينبغي أن يشتريه هذا الطبيب شهرياً",

  // — a doctor's file —
  "docp.backToMyDoctors": "العودة إلى أطبائي",
  "docp.collected": "المحصّل",
  "docp.competitorsAtThisClinic": "المنافسون في هذه العيادة",
  "docp.doctorNotAvailable": "الطبيب غير متاح",
  "docp.lifetimeSales": "إجمالي المبيعات",
  "docp.noOrdersYet": "لا توجد طلبيات بعد.",
  "docp.noPaymentsRecorded": "لم تُسجَّل أي دفعات.",
  "docp.noVisitsYet": "لا توجد زيارات بعد.",
  "docp.reorderLast": "إعادة آخر طلبية",
  "docp.thisMonthVsPotential": "هذا الشهر مقابل الإمكانية",
  "docp.visitPh": "زيارة",

  // — doctor picker —
  "pick.area": "المنطقة",
  "pick.backToSearch": "العودة إلى البحث",
  "pick.change": "تغيير",
  "pick.city": "المدينة",
  "pick.class": "التصنيف",
  "pick.clinic": "العيادة",
  "pick.dentist": "طبيب أسنان",
  "pick.dermatologist": "طبيب جلدية",
  "pick.doctorName": "اسم الطبيب",
  "pick.newDoctor": "طبيب جديد",
  "pick.noDoctorsMatch": "لا يوجد أطباء مطابقون.",
  "pick.other": "أخرى",
  "pick.phone": "الهاتف",
  "pick.plasticSurgeon": "جرّاح تجميل",
  "pick.saveSelect": "حفظ واختيار",
  "pick.specialty": "التخصص",

  // — tasks —
  "task.allReps": "كل المندوبين",
  "task.assign": "إسناد",
  "task.assignedByMe": "أسندتها أنا",
  "task.assignedByOthers": "أسندها آخرون",
  "task.clear": "مسح",
  "task.details": "التفاصيل",
  "task.done": "منجَزة",
  "task.eGCollectPaymentPh": "مثال: تحصيل دفعة من د. ريبين",
  "task.everyone": "الجميع",
  "task.markDone": "تعليم كمنجَز",
  "task.myTasks": "مهامي",
  "task.noOpenTasksFor": "لا توجد مهام مفتوحة لك — أحسنت.",
  "task.noTasksDatedThis": "لا توجد مهام بتاريخ هذا الشهر.",
  "task.overdue": "متأخرة",
  "task.recentlyFinished": "أُنجزت مؤخراً",
  "task.task": "المهمة",
  "task.tasks": "المهام",
  "task.tasksAreSwitchedOff": "المهام معطّلة من قِبل المالك.",
  "task.verifiedCloseIt": "تم التحقق — أغلقها",
  "task.whoPickOneOr": "لمن — اختر واحداً أو أكثر",
  "task.yourPartIsDone": "أنجزت دورك — بانتظار الآخرين",

  // — leave —
  "leave.leave": "الإجازات",
  "leave.myRequests": "طلباتي",
  "leave.reason": "السبب",
  "leave.requestLeave": "طلب إجازة",
  "leave.type": "النوع",

  // — progress —
  "prog.accrued": "المتراكم",
  "prog.noTargetsThisMonthPh": "لا توجد أهداف هذا الشهر",
  "prog.paidQuarterlyReadOnly": "تُدفع ربع سنوياً، للاطلاع فقط",
  "prog.performance": "الأداء",
  "prog.progress": "التقدّم",

  // — the map —
  "map.betweenClinics": "بين العيادات",
  "map.inTheField": "في الميدان",
  "map.noVisitsLoggedYet": "لم تُسجَّل زيارات اليوم بعد.",
  "map.outsideClinicAreas": "خارج مناطق العيادات",
  "map.thatSTheDayPh": "انتهى اليوم",

  // — chat —
  "chat.chat": "المحادثة",
  "chat.direct": "مباشرة…",
  "chat.messagePh": "رسالة…",
  "chat.recordingTapTheMic": "جارٍ التسجيل… اضغط المايك مرة أخرى للإرسال",
  "chat.sendFilePh": "إرسال ملف",
  "chat.sendImagePh": "إرسال صورة",
  "chat.sendPh": "إرسال",
  "chat.voiceMessagePh": "رسالة صوتية",

  // — the desktop chat dock —
  "dock.closeChatPh": "إغلاق المحادثة",
  "dock.holdAVoiceNotePh": "اضغط مطوّلاً لتسجيل رسالة صوتية",
  "dock.messagePh": "رسالة…",
  "dock.noMessagesYet": "لا توجد رسائل بعد.",
  "dock.openChatPh": "فتح المحادثة",
  "dock.openFullChatPh": "فتح المحادثة كاملة",
  "dock.recordingTapTheMic": "جارٍ التسجيل… اضغط المايك للإرسال",
  "dock.sendAFilePh": "إرسال ملف",
  "dock.sendAPicturePh": "إرسال صورة",
  "dock.sendPh": "إرسال",
  "dock.voiceMessagePh": "رسالة صوتية",

  // — catalogue —
  "cat.noBrochureYet": "لا يوجد بروشور بعد",
  "cat.nothingUploadedYet": "لم يُرفع شيء بعد.",
  "cat.openAPhotoOr": "افتح صورة أو بروشوراً لعرضه على الطبيب، أو شاركه من المحادثة.",
  "cat.products": "المنتجات",
  "cat.remove": "إزالة",
  "cat.youCanAddA": "يمكنك إضافة صورة وبروشور لكل منتج",

  // — stock —
  "stk.acceptCountsFixSystem": "قبول الجرد (تصحيح النظام)",
  "stk.approve": "موافقة",
  "stk.blankTemplate": "نموذج فارغ",
  "stk.cancel": "إلغاء",
  "stk.choose": "اختر…",
  "stk.confirm": "تأكيد",
  "stk.decline": "رفض",
  "stk.differences": "فروقات",
  "stk.expires": "ينتهي في",
  "stk.markMoved": "تعليم كمنقول",
  "stk.markReviewed": "تعليم كمراجَع",
  "stk.matches": "مطابق",
  "stk.noteDamageMissingEtcPh": "ملاحظة (تلف، نقص، إلخ)",
  "stk.nothingRequested": "لا توجد طلبات.",
  "stk.product": "المنتج",
  "stk.product2": "المنتج…",
  "stk.qtyPh": "الكمية",
  "stk.quantity": "الكمية",
  "stk.recentTransfers": "عمليات النقل الأخيرة",
  "stk.recordTransfer": "تسجيل النقل",
  "stk.reviewed": "تمت المراجعة",
  "stk.sendItTo": "أرسله إلى",
  "stk.sendRequest": "إرسال الطلب",
  "stk.stock": "المخزون",
  "stk.stockTransferRequests": "طلبات نقل المخزون",
  "stk.submitCountToAccountant": "إرسال الجرد إلى المحاسب",
  "stk.takeItFrom": "خذه من",
  "stk.total": "المجموع",
  "stk.transferToACity": "نقل إلى مدينة",
  "stk.uploadMainWarehouseCount": "رفع جرد المخزن الرئيسي (.xlsx)",
  "stk.weeklyChecksFromReps": "الجرد الأسبوعي من المندوبين",
  "stk.whyDoYouNeedPh": "لماذا تحتاجه؟ (اختياري)",

  // — the accountant's desk —
  "acct.base": "الراتب الأساسي",
  "acct.cash": "نقداً",
  "acct.collectedMtd": "المحصّل منذ بداية الشهر",
  "acct.commission": "العمولة",
  "acct.date": "التاريخ",
  "acct.deducted": "المستقطع",
  "acct.exportToExcel": "تصدير إلى Excel",
  "acct.invoiceQueue": "قائمة الفواتير",
  "acct.noPaymentsThisMonth": "لا توجد دفعات هذا الشهر.",
  "acct.nothingCollectedThisMonth": "لا توجد تحصيلات هذا الشهر بعد.",
  "acct.paid": "المدفوع",
  "acct.payroll": "الرواتب",
  "acct.person": "الموظف",
  "acct.products": "المنتجات",
  "acct.quarterlyPayouts": "المستحقات الربعية",
  "acct.receipts": "الإيصالات",
  "acct.salesMtd": "المبيعات منذ بداية الشهر",
  "acct.signOutPh": "تسجيل الخروج",
  "acct.spendings": "المصروفات",
  "acct.tasks": "المهام",
  "acct.thisMonthPerPerson": "هذا الشهر لكل موظف — التفاصيل الكاملة في",
  "acct.transfer": "حوالة",

  // — invoice queue —
  "queue.cashCollectedToday": "النقد المحصّل اليوم",
  "queue.confirmInvoice": "تأكيد وإصدار الفاتورة",
  "queue.invoicingQueue": "قائمة إصدار الفواتير",
  "queue.nothingCollectedYetToday": "لا توجد تحصيلات اليوم بعد.",
  "queue.queueIsClearPh": "القائمة فارغة",
  "queue.signOutPh": "تسجيل الخروج",

  // — month-end —
  "monthend.base": "الراتب الأساسي",
  "monthend.cashCollected": "النقد المحصّل",
  "monthend.closedTheseFiguresCan": "مُقفل — لم يعد بالإمكان تغيير هذه الأرقام",
  "monthend.commission": "العمولة",
  "monthend.dealWithTheseFirst": "عالِج هذه أولاً",
  "monthend.deducted": "المستقطع",
  "monthend.deductions": "الاستقطاعات",
  "monthend.everyoneIsPaidAnd": "تم دفع مستحقات الجميع ولا يوجد شيء معلّق",
  "monthend.expenses": "المصروفات",
  "monthend.goAndCloseIt": "اذهب لإقفاله",
  "monthend.handOver": "التسليم",
  // Back and forward swap sides in Arabic, so each arrow travels inside its
  // own string rather than being hard-coded in the JSX.
  "monthend.earlier": "الأقدم →",
  "monthend.later": "لاحقاً ←",
  "monthend.monthEndPack": "ملف إقفال الشهر",
  "monthend.nothingIsWaitingOnPh": "لا يوجد شيء بانتظار قرار",
  "monthend.open": "افتح ←",
  "monthend.person": "الموظف",
  "monthend.personByPerson": "التفصيل حسب الموظف",
  "monthend.quarter": "الربع",
  "monthend.salesThisMonth": "مبيعات هذا الشهر",
  "monthend.thisIsTheThird": "هذا هو الشهر الثالث من الربع، لذا تُضاف حوافز المبيعات المتراكمة البالغة",
  "monthend.toHandOver": "المبلغ الواجب تسليمه",
  "monthend.wages": "الأجور",

  // — payroll —
  "payroll.deduct": "استقطاع",
  "payroll.excuse": "إعفاء",
  "payroll.markAsPaid": "تعليم كمدفوع",
  "payroll.paid": "مدفوع",
  "payroll.payBack": "استرداد",
  "payroll.payroll": "الرواتب",
  "payroll.quarterEndMonthsAdd": "أشهر نهاية الربع تُضاف إليها الحوافز",
  "payroll.spendingsToPayBack": "مصروفات واجبة الاسترداد:",

  // — payouts —
  "payouts.markAsPaid": "تعليم كمدفوع",
  "payouts.noPayoutHistoryYet": "لا يوجد سجل مستحقات بعد.",
  "payouts.paid": "مدفوع",
  "payouts.payouts": "المستحقات",

  // — spendings —
  "spend.amountIqd": "المبلغ (دينار)",
  "spend.approve": "موافقة",
  "spend.approvedSpendingsArePaid": "المصروفات المعتمدة تُسترد في نهاية الشهر.",
  "spend.eGFuelForPh": "مثال: وقود لجولة سوران",
  "spend.mySpendings": "مصروفاتي",
  "spend.noReceiptAttached": "لا يوجد إيصال مرفق",
  "spend.note": "ملاحظة",
  "spend.nothingLoggedYet": "لم يُسجَّل شيء بعد.",
  "spend.reject": "رفض…",
  "spend.spendings": "المصروفات",
  "spend.spendingsAreSwitchedOff": "المصروفات معطّلة من قِبل المالك.",
  "spend.type": "النوع",
  "spend.viewReceipt": "عرض الإيصال",
  "spend.waitingForYourDecision": "بانتظار قرارك",

  // — the team —
  "team.daySummary": "ملخص اليوم",
  "team.jointVisits": "الزيارات المشتركة",
  "team.mapView": "عرض الخريطة",
  "team.marketIntel": "معلومات السوق",
  "team.setTargets": "تحديد الأهداف",
  "team.teamToday": "الفريق اليوم",
  "team.teamVisits": "زيارات الفريق",
  "team.thisWeekVsPlan": "هذا الأسبوع مقابل الخطة",

  // — approvals —
  "appr.approvals": "الموافقات",
  "appr.approve": "موافقة",
  "appr.decidedRecently": "تم البتّ فيها مؤخراً",
  "appr.noLeaveRequestsWaiting": "لا توجد طلبات إجازة منتظرة.",
  "appr.noPlansWaiting": "لا توجد خطط منتظرة.",
  "appr.nothingWaitingOnYouPh": "لا يوجد شيء بانتظارك",
  "appr.reject": "رفض…",
  "appr.return": "إعادة…",

  // — day summary —
  "sum.collected": "المحصّل",
  "sum.daySummary": "ملخص اليوم",
  "sum.fieldTime": "ساعات الميدان",
  "sum.needsAttention": "يحتاج انتباهك",
  "sum.nothingNeedsYourAttention": "لا شيء يحتاج انتباهك اليوم.",
  "sum.orders": "الطلبيات",
  "sum.person": "الموظف",
  "sum.samples": "العيّنات",
  "sum.visits": "الزيارات",

  // — targets —
  "tgt.incentive": "الحافز %",
  "tgt.min": "الحد الأدنى %",
  "tgt.month": "الشهر",
  "tgt.quantitiesPerProductPer": "الكميات لكل منتج شهرياً",
  "tgt.setTargets": "تحديد الأهداف",
  "tgt.targetQty": "الكمية المستهدفة",
  "tgt.targetsSaved": "تم حفظ الأهداف",

  // — performance —
  "perf.performance": "الأداء",
  "perf.performanceIsSwitchedOff": "الأداء معطّل من قِبل المالك.",

  // — performance detail —
  "pv.average": "المعدل",
  "pv.class": "التصنيف",
  "pv.collected": "المحصّل",
  "pv.daysPerCity": "الأيام لكل مدينة",
  "pv.doctorsReached": "الأطباء الذين تمت زيارتهم",
  "pv.everyoneHasBeenReached": "تمت زيارة الجميع.",
  "pv.fieldTime": "ساعات الميدان",
  "pv.jointVisits": "الزيارات المشتركة",
  "pv.mostVisited": "الأكثر زيارة",
  "pv.noVisitsYetThis": "لا توجد زيارات هذا الشهر بعد.",
  "pv.notVisitedYet": "لم تتم زيارته بعد",
  "pv.productTargets": "أهداف المنتجات",
  "pv.reached": "تمت زيارتهم",
  "pv.visits": "الزيارات",
  "pv.visitsThisMonth": "زيارات هذا الشهر",

  // — market intel —
  "comp.atWhichDoctorOptional": "عند أي طبيب (اختياري)",
  "comp.competitor": "المنافس",
  "comp.competitorTrackingIsSwitched": "رصد المنافسين معطّل من قِبل المالك.",
  "comp.eGRegenovuePh": "مثال: Regenovue",
  "comp.generalMarketNote": "ملاحظة عامة عن السوق",
  "comp.marketIntel": "معلومات السوق",
  "comp.note": "ملاحظة",
  "comp.nothingLoggedYetAdd": "لم يُسجَّل شيء بعد. أضف ما يفعله المنافسون في الميدان.",
  "comp.save": "حفظ",
  "comp.theirPriceIqd": "سعرهم (دينار)",
  "comp.theirProduct": "منتجهم",
  "comp.whatDidYouSeePh": "ماذا رأيت أو سمعت؟",

  // — the owner's view —
  "owner.companyToday": "الشركة اليوم",
  "owner.goTo": "اذهب إلى",
  "owner.joint": "مشتركة",
  "owner.pendingOrders": "طلبيات معلّقة",
  "owner.person": "الموظف",
  "owner.plan": "الخطة",
  "owner.product": "المنتج",
  "owner.salesByProductCity": "المبيعات حسب المنتج × المدينة — هذا الشهر (علب)",
  "owner.salesMtd": "المبيعات منذ بداية الشهر",
  "owner.signOutPh": "تسجيل الخروج",
  "owner.stockAlerts": "تنبيهات المخزون",
  "owner.targetHeatThisMonth": "خريطة تحقيق الأهداف — هذا الشهر",
  "owner.value": "القيمة",
  "owner.visits": "الزيارات",
  "owner.visitsToday": "زيارات اليوم",
  "owner.visitsVsMinimumThis": "الزيارات مقابل الحد الأدنى — هذا الأسبوع",

  // — the owner's map —
  "amap.atClinics": "في العيادات",
  "amap.checkIn": "الحضور",
  "amap.checkOut": "الانصراف",
  "amap.checkOutPending": "الانصراف معلّق",
  "amap.dailyMapView": "خريطة اليوم",
  "amap.fieldTime": "ساعات الميدان",

  // — the monthly report —
  "report.achieved": "المُنجَز",
  "report.city": "المدينة",
  "report.competitor": "المنافس",
  "report.competitorActivitySeenInPh": "نشاط المنافسين المرصود في الميدان",
  "report.doctor": "الطبيب",
  "report.expiry": "تاريخ الانتهاء",
  "report.exportExcel": "تصدير Excel",
  "report.exportPdf": "تصدير PDF",
  "report.from": "من",
  "report.incentivesAccruedPh": "الحوافز المتراكمة",
  "report.joint": "مشتركة",
  "report.leavesTakenPh": "الإجازات المأخوذة",
  "report.monthlyReport": "التقرير الشهري",
  "report.noApprovedLeaveThis": "لا توجد إجازات معتمدة هذا الشهر.",
  "report.noApprovedSalesThis": "لا توجد مبيعات معتمدة هذا الشهر.",
  "report.ordersFunnelPh": "مسار الطلبيات",
  "report.person": "الموظف",
  "report.plan": "الخطة",
  "report.product": "المنتج",
  "report.salesQtyValuePerPh": "المبيعات — الكمية والقيمة لكل منتج × مندوب",
  "report.salesValueByProduct": "قيمة المبيعات حسب المنتج",
  "report.salesValueByRep": "قيمة المبيعات حسب المندوب",
  "report.samples": "العيّنات",
  "report.seenBy": "رصده",
  "report.stockPositionExpiryAlertsPh": "وضع المخزون وتنبيهات الانتهاء",
  "report.targetAchievementPh": "نسبة تحقيق الهدف %",
  "report.theirPrice": "سعرهم",
  "report.type": "النوع",
  "report.value": "القيمة",
  "report.visits": "الزيارات",
  "report.visitsVsPlanInclPh": "الزيارات مقابل الخطة (شاملة المشتركة)",

  // — users & products —
  "manage.accountant": "محاسب",
  "manage.active": "نشط",
  "manage.admin": "مالك",
  "manage.allCities": "كل المدن",
  "manage.allProducts": "كل المنتجات",
  "manage.alsoSwitchTheLeaving": "إيقاف حساب المغادر أيضاً",
  "manage.baseSalary": "الراتب الأساسي",
  "manage.cancel": "إلغاء",
  "manage.city": "المدينة",
  "manage.dailyMin": "الحد اليومي",
  "manage.doctorsDirectory": "دليل الأطباء",
  "manage.edit": "تعديل",
  "manage.everyoneSellsIt": "يبيعه الجميع",
  "manage.from": "من",
  "manage.handATerritoryOver": "تسليم منطقة",
  "manage.handOver": "تسليم",
  "manage.leavingAway": "المغادر / الغائب",
  "manage.line": "الخط",
  "manage.name": "الاسم",
  "manage.phone": "الهاتف",
  "manage.pickAPerson": "اختر شخصاً",
  "manage.priceIqd": "السعر (دينار)",
  "manage.product": "المنتج",
  "manage.productLine": "خط المنتجات",
  "manage.role": "الدور",
  "manage.save": "حفظ",
  "manage.supervisor": "مشرف",
  "manage.takingOver": "المستلِم",
  "manage.unit": "الوحدة",
  "manage.unitPrice": "سعر الوحدة",
  "manage.usersBaseSalariesVisible": "المستخدمون · الرواتب الأساسية مرئية لك وللمحاسب فقط",

  // — the control panel —
  "settings.addACityEPh": "أضف مدينة (مثال: السليمانية)",
  "settings.addALineEPh": "أضف خطاً (مثال: التجميل)",
  "settings.announcements": "الإعلانات",
  "settings.brandColour": "لون العلامة",
  "settings.brandColourPh": "لون العلامة",
  "settings.cancel": "إلغاء",
  "settings.chat": "المحادثة",
  "settings.cities": "المدن",
  "settings.clear": "مسح",
  "settings.clearPracticeRecords": "مسح سجلات التدريب",
  "settings.closingTheMonth": "إقفال الشهر",
  "settings.company": "الشركة",
  "settings.companyData": "بيانات الشركة",
  "settings.companyName": "اسم الشركة",
  "settings.controlPanel": "لوحة التحكم",
  "settings.currencyLabel": "رمز العملة",
  "settings.defaultLanguage": "لغة المستخدمين الجدد",
  "settings.dangerZone": "منطقة الخطر",
  "settings.delete": "حذف",
  "settings.downloadABackup": "تنزيل نسخة احتياطية",
  "settings.drawn": "مرسومة",
  "settings.edit": "تعديل",
  "settings.everyone": "الجميع",
  "settings.featureSwitches": "مفاتيح الميزات",
  "settings.groupName": "اسم المجموعة",
  "settings.leaveEmptyToHidePh": "اتركه فارغاً للإخفاء",
  "settings.logoPh": "الشعار",
  "settings.mascotArtwork": "صور الشخصية",
  "settings.metrics": "المؤشرات",
  "settings.nobodyGroupsOnly": "لا أحد — المجموعات فقط",
  "settings.none": "لا يوجد",
  "settings.post": "نشر",
  "settings.productLines": "خطوط المنتجات",
  "settings.remove": "إزالة",
  "settings.reopenAllMonths": "إعادة فتح كل الأشهر",
  "settings.sampleData": "البيانات التجريبية",
  "settings.saveGroup": "حفظ المجموعة",
  "settings.saved": "تم الحفظ",
  "settings.signInScreenFooter": "تذييل شاشة الدخول",
  "settings.startCompletelyFresh": "البدء من جديد تماماً",
  "settings.stop": "إيقاف",
  "settings.subtitleUnderTheCompany": "سطر فرعي تحت اسم الشركة",
  "settings.supervisorAndAccountantOnly": "المشرف والمحاسب فقط",
  "settings.supervisorVisitLabel": "تسمية زيارة المشرف",
  "settings.thisCannotBeUndone": "لا يمكن التراجع عن هذا من داخل التطبيق. اكتب",
  "settings.whatYouCallThings": "المصطلحات المستخدمة",
  "settings.whoCanRepsDirect": "من يستطيع المندوبون مراسلته مباشرة؟",
  "settings.writeAPinnedAnnouncementPh": "اكتب إعلاناً مثبّتاً…",

  // — shell —
  "shell.loading": "جارٍ التحميل…",
  "shell.nothingYet": "لا يوجد شيء بعد.",
  "shell.notificationsPh": "الإشعارات",

  // — sign in —
  "login.demoSignInsPassword": "حسابات تجريبية (كلمة المرور:",
  "login.hello": "أهلاً",
  "login.phoneNumberOrName": "رقم الهاتف أو الاسم",

  // — language —
  "lang.languagePh": "اللغة",

  // — charts —
  "chart.noDataYet": "لا توجد بيانات بعد.",

  // — record history —
  "hist.history": "السجل",
  "hist.loading": "جارٍ التحميل…",
  "hist.nothingHasBeenChanged": "لم يطرأ أي تغيير منذ إنشائه.",

  // — schematic map —
  "smap.checkInOut": "الحضور/الانصراف",
  "smap.clinicVisit": "زيارة عيادة",
  "smap.movement": "التنقّل",
  "smap.noGpsPointsYet": "لا توجد نقاط GPS اليوم بعد",

  // — outbox —
  "out.discard": "تجاهل",


  // — text that sits alongside a value, so the whole phrase is one
  //   string with the number dropped in. Arabic does not pluralise by
  //   adding an s, so these cannot be assembled from fragments. —
  "acct.due": "مستحق",
  "acct.moneyFor": "المالية",
  "acct.noPhoto": "بلا صورة",
  "acct.receipt": "الإيصال",
  "acct.rep": "المندوب",
  "acct.today": "اليوم",
  "acct.waiting": "بالانتظار",
  "monthend.alreadyPaid": "{a} من {b} تم دفعهم",
  "monthend.approvedInvoiced": "طلبيات معتمدة وصادرة الفاتورة",
  "monthend.commissionWord": "العمولة",
  "monthend.expensesWord": "المصروفات",
  "monthend.paidOn": "دُفع في",
  "monthend.pending": "معلّقة",
  "monthend.quarterEnd": "نهاية الربع",
  "monthend.undecided": "بلا قرار",
  "monthend.wagesWord": "الأجور",
  "payouts.paidWithWages": "دُفعت مع أجور نهاية الربع بتاريخ",
  "payouts.salesCommission": "عمولة المبيعات",
  "payouts.targetIncentives": "حوافز الأهداف",
  "payroll.deductedFor": "استُقطع",
  "payroll.forMissedDays": "عن أيام الغياب",
  "payroll.missedDays": "{n} يوماً بلا تسجيل حضور — يرجى المراجعة",
  "prog.incentiveAccrued": "حافز متراكم",
  "prog.paidQuarterly": "تُدفع ربع سنوياً، للاطلاع فقط",
  "prog.salesCommission": "عمولة المبيعات",
  "prog.targetIncentives": "حوافز الأهداف",
  "queue.waitingLine": "{n} طلبية معتمدة بانتظار إصدار الفاتورة — الأطباء ينتظرون.",
  "task.doneOn": "أُنجزت في",
  "task.doneWord": "منجَزة",
  "task.dueWord": "الموعد",
  "task.finished": "منجَزة",
  "task.monthReview": "مراجعة هذا الشهر",
  "task.stillOpen": "ما زالت مفتوحة",
  "team.excludedFromMinimums": "مستثنى من الحد الأدنى",
  "team.leaveUntil": "في إجازة حتى",
  "team.outOfLocationWeek": "{n} زيارة خارج الموقع هذا الأسبوع",
  "visit.nextVisitLabel": "الزيارة القادمة",
  "visit.optional": "(اختياري)",
  "visit.required": "(مطلوب)",


  // — text that sits alongside a value, so the whole phrase is one
  //   string with the number dropped in. Arabic does not pluralise by
  //   adding an s, so these cannot be assembled from fragments. —
  "owner.awaitingApproval": "بانتظار الموافقة",
  "owner.boxes": "علبة",
  "owner.fullTeamIn": "الفريق كامل",
  "owner.inField": "{n} في الميدان",
  "owner.liveTeamMap": "خريطة الفريق المباشرة",
  "owner.nOrders": "{n} طلبية",
  "owner.nPlans": "{n} خطة",
  "owner.onLeave": "{n} في إجازة",
  "owner.outOfLocation": "{n} خارج الموقع",
  "owner.productsBrochures": "المنتجات والبروشورات",
  "owner.teamPerformance": "أداء الفريق",


  // — text that sits alongside a value, so the whole phrase is one
  //   string with the number dropped in. Arabic does not pluralise by
  //   adding an s, so these cannot be assembled from fragments. —
  "owner.controlPanelLine": "لوحة التحكم — المفاتيح والمؤشرات",
  "owner.payrollPayouts": "الرواتب والمستحقات",
  "owner.sameDataFooter": "البيانات نفسها على الحاسوب والهاتف — عرض المالك أثناء التنقّل.",


  // — text that sits alongside a value, so the whole phrase is one
  //   string with the number dropped in. Arabic does not pluralise by
  //   adding an s, so these cannot be assembled from fragments. —
  "monthend.blockerDeductions": "أيام غياب لم يُبتّ فيها",
  "monthend.blockerInvoices": "طلبيات معتمدة لم تصدر فواتيرها",
  "monthend.blockerOrders": "طلبيات ما زالت بانتظار الموافقة",
  "monthend.blockerSpendings": "مصروفات لم تُعتمد بعد",
  "monthend.blockersWhy": "كل واحد من هذه قد يغيّر ما هو مستحق لأحدهم. الدفع الآن يعني دفع رقم سيتغيّر بعده.",
  "monthend.footer": "الأجور والمصروفات تُدفع بشكل منفصل. التطبيق يسجّل دفع الأجور هنا، أما الاستردادات فتُعلَّم في شاشة المصروفات. «التسليم» هو ما يستلمه الموظف إجمالاً.",
  "monthend.payWages": "دفع الأجور",
  "monthend.safeToPay": "كل يوم غياب ومصروف وطلبية لهذا الشهر تم البتّ فيه. يمكنك الدفع بأمان.",


  // — text that sits alongside a value, so the whole phrase is one
  //   string with the number dropped in. Arabic does not pluralise by
  //   adding an s, so these cannot be assembled from fragments. —
  "appr.nLeaves": "{n} طلب إجازة",
  "appr.nOrders": "{n} طلبية",
  "appr.nPlans": "{n} خطة",
  "appr.waitingOnYou": "بانتظارك",
  "boost.rafiSays": "رافي يقول…",
  "boost.rafiSaysName": "رافي يقول لك يا {name}…",
  "home.clientMeeting": "اجتماع عميل",
  "home.visitWord": "زيارة",


  // — text that sits alongside a value, so the whole phrase is one
  //   string with the number dropped in. Arabic does not pluralise by
  //   adding an s, so these cannot be assembled from fragments. —
  "coll.allItems": "كل التحصيلات المجدولة",
  "coll.amountIqd": "المبلغ (دينار)",
  "coll.collect": "تحصيل",
  "coll.collectedFull": "حُصّلت كاملة",
  "coll.customer": "العميل",
  "coll.done": "حُصّلت",
  "coll.due": "مستحقة",
  "coll.dueNow": "مستحقة الآن",
  "coll.gotOf": "استُلم {a} من {b}",
  "coll.hint": "يحددها المحاسب. تسجيل دفعة من العميل يشطب البند تلقائياً — حصّل ما تستطيع، والمحاسب يرى أي فرق.",
  "coll.homeButton": "تحصيلات مستحقة",
  "coll.homeSub": "{n} بانتظارك — اضغط لترى من وكم",
  "coll.invoice": "فاتورة",
  "coll.invoiceNo": "رقم الفاتورة",
  "coll.missed": "فائتة",
  "coll.noneYet": "لا يوجد شيء مجدول بعد.",
  "coll.nothingDue": "لا يوجد شيء مستحق — كل شيء منجز.",
  "coll.recent": "حُصّلت مؤخراً",
  "coll.schedule": "جدولة",
  "coll.scheduleOne": "جدولة تحصيل",
  "coll.scheduleTitle": "جدول التحصيل",
  "coll.scheduled": "تمت الجدولة — تم إشعار المندوب.",
  "coll.shortfall": "نقص",
  "coll.shortfallLine": "حُصّل {a} من {b}",
  "coll.title": "التحصيلات",
  "coll.upcoming": "القادمة",
  "coll.whoCollects": "من يحصّل",
  "docs.ceilingFull": "بلغ السقف",
  "docs.clinicPhone": "هاتف العيادة",
  "orders.printInvoice": "طباعة",
  "stk.importErp": "استيراد جرد النظام المحاسبي (.csv)",
  "stk.erpRows": "{n} سطراً",
  "stk.erpWarehouses": "المستودعات في الملف",
  "stk.erpProducts": "أسماء جديدة — اربط كلاً منها بمنتج (يُسأل مرة واحدة)",
  "stk.erpSkip": "لا تستورد",
  "stk.erpAllMatched": "كل أسماء المنتجات معروفة.",
  "stk.erpReplaceHint": "التطبيق يستبدل أرصدة المستودعات المرتبطة بأرصدة الملف (غياب المنتج هناك يعني صفراً). اختياراتك تُحفظ للشهر القادم.",
  "stk.erpConfirm": "تطبيق الجرد",
  "stk.erpEmpty": "لا توجد أسطر جرد في هذا الملف — هل هو ملف تصدير المخزون؟",
  "acct.fixPayment": "تصحيح الدفعة",
  "acct.fix": "تصحيح",
  "acct.correctionReason": "لماذا يُصحَّح؟ إلزامي — يُحفظ في السجل",
  "doctor.clinicPhone": "هاتف العيادة",
  "doctor.ceilingMath": "الطلبات {a} − المدفوع {b}",
  "doctor.ceilingNear": "يقترب من السقف — خطط للمساحة المتبقية.",
  "doctor.ceilingReached": "بلغ السقف — الطلب مغلق حتى ينخفض الرصيد.",
  "doctor.monthlyCeiling": "سقف المبيعات",
  "doctor.noCeiling": "غير محدد",
  "nav.collections": "التحصيلات",
  "neworder.ceilingOverride": "ما زال بإمكانك إتمام الطلبية — ستتجاوز السقف عن علم.",
  "neworder.ceilingReached": "هذا العميل بلغ سقف مبيعاته.",
  "neworder.ceilingRep": "يُفتح الطلب عندما يسدد رصيده — أو اطلب من مشرفك.",
  "pick.ceiling": "بلغ السقف",


  // — text that sits alongside a value, so the whole phrase is one
  //   string with the number dropped in. Arabic does not pluralise by
  //   adding an s, so these cannot be assembled from fragments. —
  "dlib.archived": "مؤرشف",
  "dlib.capped": "تُعرض أول 300 — ضيّق البحث أو التواريخ للبقية.",
  "dlib.invoice": "فاتورة",
  "dlib.invoices": "الفواتير",
  "dlib.none": "لا شيء مطابق.",
  "dlib.off": "مكتبة المستندات معطّلة للفريق الميداني — اطلب من المالك.",
  "dlib.receipt": "إيصال",
  "dlib.receipts": "الإيصالات",
  "dlib.searchPh": "ابحث بالعميل أو المرجع أو المبلغ…",
  "dlib.showArchive": "شمول الأرشيف ({n} أقدم من سنتين)",
  "dlib.title": "المستندات",
  "nav.documents": "المستندات",
  "settings.announcePush": "ادفعها أيضاً إلى كل الهواتف — الشريط لا يصل إلا لمن يفتح التطبيق",
  "settings.docLibrarySwitch": "مكتبة المستندات للفريق الميداني",
  "settings.migrateCloud": "نقل الصور إلى التخزين السحابي",
  "settings.migrated": "{a} نُقلت إلى السحابة، {b} موجودة أصلاً، {c} فشلت",
  "settings.phonePushes": "إشعارات الهاتف",
  "settings.phonePushesSub": "أي الأحداث تصل إلى الهاتف المقفل. على مستوى الشركة — قرارك أنت، لا قرار كل شخص. جرس التطبيق يسجّل كل شيء على أي حال.",
  "settings.pushCollection": "جدول التحصيل",
  "settings.pushCustom": "رسائلك وإعلاناتك",
  "settings.pushDm": "الرسائل المباشرة",
  "settings.pushEveryone": "الجميع",
  "settings.pushGroup": "محادثة المجموعات",
  "settings.pushLeave": "طلبات الإجازة وقراراتها",
  "settings.pushOnePerson": "…أو شخص واحد",
  "settings.pushOrderNew": "طلبية جديدة بانتظار الموافقة",
  "settings.pushOrderStatus": "الموافقة / الرفض / إصدار الفاتورة",
  "settings.pushPayment": "الدفعات والمصروفات",
  "settings.pushPlan": "قرارات الخطة الأسبوعية",
  "settings.pushSentTo": "أُرسلت إلى {n} أشخاص",
  "settings.pushTask": "المهام",
  "settings.pushTextPh": "اكتب الرسالة…",
  "settings.pushTransfer": "نقل المخزون",
  "settings.sendPush": "إرسال رسالة إلى الهواتف",
  "settings.sendPushSub": "رسالة واحدة، مباشرة إلى الهاتف — للجميع أو لدور واحد أو لشخص واحد.",


  // — text that sits alongside a value, so the whole phrase is one
  //   string with the number dropped in. Arabic does not pluralise by
  //   adding an s, so these cannot be assembled from fragments. —
  "acct.moneyInSub": "الجدول والدفعات المستلمة وفحص النقد — مع المجاميع.",
  "coll.allReps": "كل المندوبين",
  "coll.dismissHint": "أزِله من هذه القائمة — السجل نفسه يبقى",
  "coll.moneyIn": "الأموال الواردة",
  "coll.needsAttention": "يحتاج انتباهك",
  "coll.receivedCount": "{n} دفعة",
  "coll.reconHint": "لكل مندوب لكل يوم — طابق عمود النقد مع ما سُلّم فعلياً، ثم أدخله في النظام المحاسبي.",
  "coll.reschedule": "إعادة جدولة",
  "coll.tabCashCheck": "فحص النقد",
  "coll.tabReceived": "المستلمة",
  "coll.tabSchedule": "الجدول",
  "nav.moneyIn": "الأموال الواردة",
  "nav.payPeople": "رواتب الموظفين",
  "payouts.confirmPay": "تدفع لـ {name} مبلغ {amount} عن {q}؟",
  "payouts.history": "سجل المدفوعات",
  "payouts.nothingAccrued": "لا شيء متراكم هذا الربع بعد.",
  "payouts.quarterly": "الحوافز الربعية",
  "payouts.withWages": "مع الراتب",
  "payroll.confirmPay": "تدفع لـ {name} مبلغ {amount} عن {month}؟",
  "payroll.decideFirst": "احسم هذه قبل الدفع",
  "payroll.footer": "الرواتب مرئية للمالك والمحاسب فقط. كل دفعة تسجّل الوقت ومن ضغط الزر؛ والمبلغ يحسبه النظام دائماً، لا يؤخذ من الشاشة.",
  "payroll.incentives": "الحوافز",
  "payroll.monthlyWages": "الرواتب الشهرية",
  "payroll.noCheckin": "بلا تسجيل حضور",
  "payroll.paidSoFar": "المدفوع",
  "payroll.payBtn": "دفع",
  "payroll.payPeople": "رواتب الموظفين",
  "payroll.quarterNote": "حوافز الربع تُضاف إلى الشهر الثالث من كل ربع — أو تُدفع منفصلة أدناه.",
  "payroll.stillDue": "المتبقي",
  "payroll.wageBill": "إجمالي الرواتب",
  "queue.returnBtn": "إعادة…",
  "queue.returnWhy": "لماذا تُعاد؟ سيقرأ المشرف والمندوب هذا:",

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

const STORE_KEY = "pluto.lang";

let current: Lang = "en";
const listeners = new Set<() => void>();

function apply(lang: Lang) {
  current = lang;
  if (typeof document !== "undefined") {
    // The whole page mirrors for Arabic — navigation, alignment, the lot.
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }
  listeners.forEach((l) => l());
}

export function setLang(next: Lang | undefined) {
  const lang: Lang = next === "ar" ? "ar" : "en";
  if (lang === current) return;
  apply(lang);
}

/* The choice the person made on THIS device.
 *
 * Kept separately from the signed-in profile because the login screen has no
 * profile to read: without this, the first screen anybody sees is always
 * English and there is nothing they can do about it until after they are in.
 */
export function rememberLang(lang: Lang) {
  try { window.localStorage.setItem(STORE_KEY, lang); } catch {}
  setLang(lang);
}

export function storedLang(): Lang | null {
  try {
    const v = window.localStorage.getItem(STORE_KEY);
    return v === "ar" || v === "en" ? v : null;
  } catch { return null; }
}

/* Called once, as early as possible, before anything is drawn. */
export function initLang() {
  const v = storedLang();
  if (v && v !== current) apply(v);
}

/* Which language wins, once we know who is signed in.
 *
 *   1. the person's own saved choice  — they asked for this explicitly
 *   2. what they picked on this device at the login screen
 *   3. the company default the owner set
 *   4. English
 *
 * Order matters: without step 2, someone who switches to Arabic on the login
 * screen gets thrown back to English the moment they sign in, which reads as
 * the setting not working.
 */
export function resolveLang(userLang?: Lang | null, companyDefault?: Lang | null): Lang {
  return (userLang ?? storedLang() ?? companyDefault ?? "en") as Lang;
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
