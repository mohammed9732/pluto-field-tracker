import { DB, Doctor, Order, OrderItem, User, Settings, DEFAULT_TERMS } from "./types";
import { OWNER } from "./config";
import { hashPassword } from "./passwords";

// A brand-new company: no demo doctors, orders, visits or messages. Just the
// owner, one city and the default settings. The owner then adds the real staff,
// cities, products and doctors from the control panel. Chosen by SEED_DEMO=false.
export function buildEmpty(): DB {
  const demo = buildSeed();
  const owner: User = {
    id: 1, name: OWNER.name, role: "admin", city: "all", phone: OWNER.phone,
    password: hashPassword(OWNER.password), baseSalary: 0, dailyMin: 0, active: true,
  };
  return {
    ...demo,
    users: [owner],
    products: [], doctors: [], checkins: [], pings: [], visits: [], orders: [],
    payments: [], targets: [], payoutsPaid: [], payrollPaid: [], stock: [],
    stockUploads: [], leaves: [], messages: [], plans: [], spendings: [], tasks: [],
    notifications: [], announcements: [], deductions: [], activity: [], files: [],
    competitorNotes: [], brochures: [], stockTransfers: [], stockChecks: [], pushSubs: [],
    chatGroups: [
      { id: 2, name: "Everyone", memberIds: [owner.id], builtin: true },
      { id: 3, name: "Management", memberIds: [owner.id], builtin: true },
    ],
    settings: { ...demo.settings, cities: [{ id: "erbil", name: "Erbil" }] },
    seq: 100,
  };
}


// Seed world: IQD prices with quantity tiers, August 2026 in flight.
export function buildSeed(): DB {
  let seq = 0;
  const id = () => ++seq;

  const settings: Settings = {
    companyName: "Pluto Aesthetics",
    companySub: "Kurdistan Region",
    currency: "IQD",
    cities: [{ id: "erbil", name: "Erbil" }, { id: "duhok", name: "Duhok" }, { id: "kirkuk", name: "Kirkuk" }],
    supervisorCanAddDoctors: true,
    repsCanAddDoctors: false,
    supervisorCanToggleRepAdd: true,
    spendingsEnabled: true,
    spendingSupervisorStep: true,
    plannerEnabled: true,
    paymentsEnabled: true,
    repPriceEdit: false,
    chatAttachments: true,
    performanceTab: true,
    leaderboard: false,
    visitPhotos: true,
    tasksEnabled: true,
    announcementsEnabled: true,
    deductionsEnabled: true,
    paymentReceiptRequired: true,
    pingMinutes: 5,
    dwellRadiusM: 150,
    visitRadiusM: 500,
    planVisitTarget: 5,
    planBackupTarget: 2,
    supervisorPlanVisitTarget: 3,
    supervisorPlanBackupTarget: 2,
    salesCommissionPct: 0.5,
    collectionCommissionPct: 0.5,
    lowStockThreshold: 10,
    expiryWarnMonths: 3,
    checkinNudgeHour: 9,
    supervisorVisitLabel: "Client meeting",
    dmPolicy: "management",
    managementSeesAllTasks: true,
    samplesEnabled: true,
    samplesForReps: true,
    samplesForSupervisors: true,
    competitorTracking: true,
    dailySummaryHour: 18,
    editWindowMinutes: 60,
    weeklyStockCheck: true,
    logoId: null,
    mascotIdleId: null,
    mascotHelloId: null,
    mascotCheerId: null,
    mascotSadId: null,
    closedThrough: null,
    productLines: [],
    defaultLang: "en",
    pushTypes: {
      dm: true, group: true, orderNew: true, orderStatus: true,
      planStatus: true, leave: true, transfer: true, payment: true,
      task: true, collection: true, custom: true,
    },
    docLibraryForField: false,
    erpProductAliases: {},
    erpWarehouseMap: {},
    leaveShortNoticeDays: 2,
    leaveLongNoticeDays: 10,
    leaveShortMaxDays: 2,
    brandColor: "#2f6fe0",
    loginFooter: "",
    terms: { ...DEFAULT_TERMS },
  };

  const users: User[] = [
    { id: id(), name: "Mo", role: "admin", city: "all", phone: "+964 750 000 0001", password: hashPassword("password"), baseSalary: 0, dailyMin: 0, active: true },
    { id: id(), name: "Dr. Alan", role: "supervisor", city: "all", phone: "+964 750 000 0002", password: hashPassword("password"), baseSalary: 1800000, dailyMin: 3, active: true },
    { id: id(), name: "Sami Kareem", role: "rep", city: "erbil", phone: "+964 750 123 4567", password: hashPassword("password"), baseSalary: 1200000, dailyMin: 5, active: true },
    { id: id(), name: "Dara Mustafa", role: "rep", city: "duhok", phone: "+964 750 000 0004", password: hashPassword("password"), baseSalary: 1200000, dailyMin: 5, active: true },
    { id: id(), name: "Aland Talabani", role: "rep", city: "kirkuk", phone: "+964 750 000 0005", password: hashPassword("password"), baseSalary: 1200000, dailyMin: 5, active: true },
    { id: id(), name: "Zhilan Omar", role: "accountant", city: "erbil", phone: "+964 750 000 0006", password: hashPassword("password"), baseSalary: 1400000, dailyMin: 0, active: true },
  ];
  const [MO, ALAN, SAMI, DARA, ALAND, ZHILAN] = users.map((u) => u.id);

  const products = [
    { id: id(), name: "CLAPIO L", sku: "CLP-L", imageId: null, brochureId: null, brochureName: null, unitPrice: 60000, tiers: [{ minQty: 10, price: 58000 }, { minQty: 20, price: 55000 }], unit: "box", active: true },
    { id: id(), name: "CLAPIO Ch", sku: "CLP-CH", imageId: null, brochureId: null, brochureName: null, unitPrice: 85000, tiers: [{ minQty: 10, price: 80000 }], unit: "box", active: true },
    { id: id(), name: "Revita HA Filler", sku: "RVT-HA", imageId: null, brochureId: null, brochureName: null, unitPrice: 40000, tiers: [{ minQty: 20, price: 37000 }], unit: "box", active: true },
    { id: id(), name: "DermaFix Serum", sku: "DFX-S", imageId: null, brochureId: null, brochureName: null, unitPrice: 36000, tiers: [], unit: "unit", active: true },
  ];
  const [CLAPIO_L, CLAPIO_CH, REVITA, DERMAFIX] = products.map((p) => p.id);

  const doc = (
    name: string, clinic: string, city: string, area: string, cls: "A" | "B" | "C",
    specialty: string, phone: string, lat: number | null, lng: number | null
  ): Doctor => ({
    id: id(), name, clinic, city, area, address: "", class: cls, specialty, phone,
    lat, lng, locationSetBy: lat ? SAMI : null, locationSetAt: lat ? "2026-07-10T10:00:00" : null, createdBy: ALAN,
    // Rough monthly potential by class — the supervisor tunes these later.
    potentialMonthly: cls === "A" ? 2000000 : cls === "B" ? 1000000 : 400000,
  });

  const doctors: Doctor[] = [
    doc("Dr. Shirin Ahmed", "Shorsh Derma Clinic", "erbil", "Shorsh", "A", "Dermatologist", "+964 750 111 0001", 36.1911, 44.0093),
    doc("Dr. Karwan Baban", "Erbil Skin Center", "erbil", "60m Road", "A", "Dermatologist", "+964 750 111 0002", 36.1798, 43.9975),
    doc("Dr. Lana Rasool", "Gulan Plastic Surgery", "erbil", "Gulan St.", "B", "Plastic surgeon", "+964 750 111 0003", null, null),
    doc("Dr. Tara Salih", "Naz City Aesthetics", "erbil", "Naz City", "A", "Dermatologist", "+964 750 111 0004", null, null),
    doc("Dr. Hemin Aziz", "Ankawa Medical Complex", "erbil", "Ankawa", "C", "GP", "+964 750 111 0005", 36.2249, 43.9932),
    doc("Dr. Sara Omer", "Dream City Clinic", "erbil", "Dream City", "B", "Dermatologist", "+964 750 111 0006", 36.2101, 44.0421),
    doc("Dr. Avin Tahir", "Duhok Derma House", "duhok", "KRO Street", "A", "Dermatologist", "+964 750 222 0001", 36.8663, 42.9884),
    doc("Dr. Zana Saeed", "Nohadra Skin Clinic", "duhok", "Nohadra", "B", "Dermatologist", "+964 750 222 0002", 36.8578, 43.0021),
    doc("Dr. Rezan Ali", "Mazi Aesthetics", "duhok", "Mazi", "B", "Plastic surgeon", "+964 750 222 0003", null, null),
    doc("Dr. Berivan Hussein", "Zakho Road Clinic", "duhok", "Zakho Road", "C", "GP", "+964 750 222 0004", 36.8721, 42.9663),
    doc("Dr. Rebin Qadir", "Kirkuk Skin Clinic", "kirkuk", "Almas", "A", "Dermatologist", "+964 750 333 0001", 35.4666, 44.3922),
    doc("Dr. Nabaz Fatih", "Baba Gurgur Medical", "kirkuk", "Baba Gurgur", "B", "GP", "+964 750 333 0002", 35.4851, 44.3781),
    doc("Dr. Shene Mahmood", "Rahimawa Derma", "kirkuk", "Rahimawa", "B", "Dermatologist", "+964 750 333 0003", null, null),
    doc("Dr. Hana Jalal", "Kirkuk Citadel Clinic", "kirkuk", "Citadel", "C", "GP", "+964 750 333 0004", 35.4703, 44.4021),
    doc("Dr. Lava Rashid", "Soran Aesthetic Center", "erbil", "Soran", "B", "Dermatologist", "+964 750 111 0007", null, null),
  ];
  const D = (name: string) => doctors.find((d) => d.name === name)!.id;

  // ---- orders --------------------------------------------------------------
  const orders: Order[] = [];
  const mkOrder = (
    createdBy: number, doctorId: number, createdAt: string,
    items: OrderItem[],
    status: Order["status"],
    opts: Partial<Order> = {}
  ): Order => {
    const o: Order = {
      id: id(), doctorId, createdBy, createdAt, status, isSample: false, items,
      approvedBy: null, approvedAt: null, rejectNote: null,
      invoicePdfName: null, invoicePdfId: null, invoicedBy: null, invoicedAt: null,
      ...opts,
    };
    if (status === "approved" || status === "invoiced") {
      o.approvedBy = o.approvedBy ?? ALAN;
      o.approvedAt = o.approvedAt ?? createdAt;
    }
    if (status === "invoiced") {
      o.invoicedBy = ZHILAN;
      o.invoicedAt = o.invoicedAt ?? createdAt;
    }
    return o;
  };

  // Tier helper for seed realism.
  const priceOf = (pid: number, qty: number) => {
    const p = products.find((x) => x.id === pid)!;
    let price = p.unitPrice;
    for (const t of p.tiers) if (qty >= t.minQty && t.price < price) price = t.price;
    return price;
  };
  const it = (pid: number, qty: number): OrderItem => ({ productId: pid, qty, price: priceOf(pid, qty) });

  const jul = (day: number) => `2026-07-${String(day).padStart(2, "0")}T11:00:00`;
  orders.push(
    mkOrder(SAMI, D("Dr. Shirin Ahmed"), jul(6), [it(CLAPIO_L, 30)], "invoiced"),
    mkOrder(SAMI, D("Dr. Karwan Baban"), jul(13), [it(CLAPIO_L, 28), it(CLAPIO_CH, 20)], "invoiced"),
    mkOrder(SAMI, D("Dr. Hemin Aziz"), jul(20), [it(CLAPIO_L, 24), it(CLAPIO_CH, 25)], "invoiced"),
    mkOrder(DARA, D("Dr. Avin Tahir"), jul(7), [it(CLAPIO_L, 26), it(CLAPIO_CH, 12)], "invoiced"),
    mkOrder(DARA, D("Dr. Zana Saeed"), jul(15), [it(CLAPIO_L, 22), it(CLAPIO_CH, 11)], "invoiced"),
    mkOrder(ALAND, D("Dr. Rebin Qadir"), jul(9), [it(CLAPIO_L, 30)], "invoiced"),
    mkOrder(ALAND, D("Dr. Nabaz Fatih"), jul(21), [it(REVITA, 22)], "invoiced"),
    mkOrder(ALAN, D("Dr. Lana Rasool"), jul(11), [it(CLAPIO_L, 38)], "invoiced"),
  );

  const aug = (day: number, hm = "11:00") => `2026-08-${String(day).padStart(2, "0")}T${hm}:00`;
  orders.push(
    mkOrder(SAMI, D("Dr. Shirin Ahmed"), aug(3), [it(CLAPIO_L, 30), it(CLAPIO_CH, 18)], "invoiced"),
    mkOrder(SAMI, D("Dr. Sara Omer"), aug(8), [it(CLAPIO_L, 30), it(CLAPIO_CH, 20), it(REVITA, 12)], "invoiced"),
    mkOrder(DARA, D("Dr. Avin Tahir"), aug(4), [it(CLAPIO_L, 28), it(CLAPIO_CH, 12)], "invoiced"),
    mkOrder(DARA, D("Dr. Zana Saeed"), aug(11), [it(CLAPIO_L, 24), it(CLAPIO_CH, 9), it(REVITA, 8)], "invoiced"),
    mkOrder(ALAND, D("Dr. Rebin Qadir"), aug(5), [it(CLAPIO_L, 16), it(REVITA, 10)], "invoiced"),
    mkOrder(ALAN, D("Dr. Lana Rasool"), aug(6), [it(CLAPIO_L, 20), it(CLAPIO_CH, 6)], "invoiced"),
  );

orders.push(mkOrder(SAMI, D("Dr. Shirin Ahmed"), aug(14, "10:20"), [it(CLAPIO_L, 25)], "invoiced", {
    invoicePdfName: "invoice-shirin-14-08.pdf", invoicedAt: aug(14, "16:00"),
  }));

  // Approved, awaiting invoice.
  orders.push(mkOrder(SAMI, D("Dr. Karwan Baban"), aug(16, "12:10"), [it(CLAPIO_L, 8), it(CLAPIO_CH, 5), it(REVITA, 2)], "approved", { approvedAt: aug(16, "15:30") }));

  // Pending approvals — Sami discounted CLAPIO L below tier.
  orders.push(
    mkOrder(SAMI, D("Dr. Shirin Ahmed"), "2026-08-17T12:14:00", [
      { productId: CLAPIO_L, qty: 10, price: 56000 },
      { productId: CLAPIO_CH, qty: 6, price: 85000 },
    ], "pending"),
    mkOrder(ALAND, D("Dr. Rebin Qadir"), "2026-08-16T10:48:00", [it(REVITA, 10)], "pending"),
  );

  // Rejected example.
  orders.push(mkOrder(SAMI, D("Dr. Hemin Aziz"), aug(11, "13:30"), [it(CLAPIO_L, 4), it(CLAPIO_CH, 4)], "rejected", {
    rejectNote: "Doctor has an unpaid balance from June — re-submit after settlement.", approvedBy: null,
  }));

  // A free sample order — no value, but the boxes still leave the warehouse.
  orders.push(mkOrder(SAMI, D("Dr. Tara Salih"), aug(12, "10:30"), [
    { productId: CLAPIO_L, qty: 2, price: 0 },
  ], "invoiced", { isSample: true }));

  const competitorNotes: DB["competitorNotes"] = [
    { id: id(), doctorId: D("Dr. Avin Tahir"), userId: DARA, competitor: "Regenovue", product: "Regenovue Deep", price: 78000, note: "Doctor says their rep visits weekly.", visitId: null, ts: "2026-08-17T11:10:00" },
    { id: id(), doctorId: null, userId: ALAN, competitor: "Neuramis", product: "Neuramis Volume", price: 72000, note: "New distributor opened in Erbil — pushing hard on price.", visitId: null, ts: "2026-08-16T16:00:00" },
  ];

  // ---- targets -------------------------------------------------------------
  const targets = [] as DB["targets"];
  const tg = (userId: number, productId: number, period: string, targetQty: number, minPct: number, incentivePct: number) =>
    targets.push({ id: id(), userId, productId, period, targetQty, minPct, incentivePct, setBy: ALAN });
  for (const period of ["2026-07", "2026-08"]) {
    tg(SAMI, CLAPIO_L, period, 100, 70, 2);
    tg(SAMI, CLAPIO_CH, period, 60, 70, 2.5);
    tg(SAMI, REVITA, period, 40, 60, 1.5);
    tg(DARA, CLAPIO_L, period, 55, 70, 2);
    tg(DARA, CLAPIO_CH, period, 30, 70, 2.5);
    tg(ALAND, CLAPIO_L, period, 40, 70, 2);
    tg(ALAND, REVITA, period, 30, 60, 1.5);
    tg(ALAN, CLAPIO_L, period, 45, 70, 2);
    tg(ALAN, CLAPIO_CH, period, 25, 70, 2.5);
  }

  // ---- today in the field --------------------------------------------------
  const checkins: DB["checkins"] = [
    { id: id(), userId: SAMI, type: "in", ts: "2026-08-18T08:42:00", lat: 36.1902, lng: 44.0072, accuracy: 12 },
    { id: id(), userId: DARA, type: "in", ts: "2026-08-18T09:03:00", lat: 36.8641, lng: 42.9902, accuracy: 9 },
    { id: id(), userId: ALAN, type: "in", ts: "2026-08-18T08:55:00", lat: 36.1889, lng: 44.0121, accuracy: 15 },
  ];

  const pings: DB["pings"] = [];
  const trail: [number, number, string][] = [
    [36.1905, 44.0080, "08:47"], [36.1910, 44.0090, "08:52"], [36.1911, 44.0093, "09:20"],
    [36.1911, 44.0094, "09:40"], [36.1912, 44.0092, "10:00"], [36.1868, 44.0041, "10:35"],
    [36.1798, 43.9975, "11:05"], [36.1799, 43.9976, "11:25"], [36.1821, 44.0010, "12:00"],
    [36.1850, 44.0055, "12:30"], [36.1872, 44.0102, "13:00"],
  ];
  for (const [lat, lng, hm] of trail) pings.push({ id: id(), userId: SAMI, ts: `2026-08-18T${hm}:00`, lat, lng, accuracy: 15 });

  const mkVisit = (userId: number, doctorId: number, time: string, outcome: "order" | "follow_up" | "payment", extra: Partial<DB["visits"][0]> = {}) => ({
    id: id(), userId, doctorId, date: "2026-08-18", time, jointVisit: false, jointWith: null,
    outcome, notes: "", followUpDate: null, lat: null, lng: null, photo: null, outOfLocation: false, ...extra,
  });
  const visits: DB["visits"] = [
    mkVisit(SAMI, D("Dr. Shirin Ahmed"), "09:20", "order", { lat: 36.1911, lng: 44.0093 }),
    mkVisit(SAMI, D("Dr. Karwan Baban"), "11:05", "follow_up", { followUpDate: "2026-08-20", notes: "Wants to see CLAPIO Ch cases first.", lat: 36.1798, lng: 43.9975 }),
    mkVisit(DARA, D("Dr. Avin Tahir"), "09:40", "order", { lat: 36.8663, lng: 42.9884 }),
    mkVisit(DARA, D("Dr. Zana Saeed"), "10:35", "follow_up", { followUpDate: "2026-08-23", lat: 36.8578, lng: 43.0021 }),
    mkVisit(DARA, D("Dr. Rezan Ali"), "11:30", "payment", { lat: 36.8601, lng: 42.9950 }),
    mkVisit(DARA, D("Dr. Berivan Hussein"), "12:20", "follow_up", { followUpDate: "2026-08-24", lat: 36.8721, lng: 42.9663 }),
    mkVisit(ALAN, D("Dr. Lana Rasool"), "10:10", "follow_up", { followUpDate: "2026-08-19" }),
    mkVisit(ALAN, D("Dr. Sara Omer"), "11:40", "order", { jointVisit: true, jointWith: SAMI, lat: 36.2101, lng: 44.0421 }),
  ];

  // ---- payments ------------------------------------------------------------
  const payments: DB["payments"] = [
    { id: id(), ref: "PAY-0147", doctorId: D("Dr. Shirin Ahmed"), amount: 1375000, method: "cash", note: "Against last month's supply", collectedBy: SAMI, ts: "2026-08-18T13:42:00", lat: 36.1911, lng: 44.0093, photo: null },
    { id: id(), ref: "PAY-0146", doctorId: D("Dr. Avin Tahir"), amount: 900000, method: "cash", note: "", collectedBy: DARA, ts: "2026-08-17T11:20:00", lat: 36.8663, lng: 42.9884, photo: null },
  ];

  // ---- stock ---------------------------------------------------------------
  const stock: DB["stock"] = [
    { productId: CLAPIO_L, location: "erbil", qty: 142, batch: "CL-2603", expiry: "2027-03-31", updatedAt: aug(1, "09:00"), updatedBy: ZHILAN },
    { productId: CLAPIO_CH, location: "erbil", qty: 4, batch: "CC-2701", expiry: "2027-01-31", updatedAt: aug(1, "09:00"), updatedBy: ZHILAN },
    { productId: REVITA, location: "erbil", qty: 67, batch: "RV-2610", expiry: "2026-10-31", updatedAt: aug(1, "09:00"), updatedBy: ZHILAN },
    { productId: DERMAFIX, location: "erbil", qty: 210, batch: null, expiry: "2028-05-31", updatedAt: aug(1, "09:00"), updatedBy: ZHILAN },
    { productId: CLAPIO_L, location: "duhok", qty: 18, batch: "CL-2603", expiry: "2027-03-31", updatedAt: aug(10, "09:00"), updatedBy: ZHILAN },
    { productId: CLAPIO_CH, location: "duhok", qty: 6, batch: "CC-2701", expiry: "2027-01-31", updatedAt: aug(10, "09:00"), updatedBy: ZHILAN },
    { productId: REVITA, location: "duhok", qty: 10, batch: "RV-2610", expiry: "2026-10-31", updatedAt: aug(10, "09:00"), updatedBy: ZHILAN },
    { productId: CLAPIO_L, location: "kirkuk", qty: 12, batch: "CL-2603", expiry: "2027-03-31", updatedAt: aug(10, "09:00"), updatedBy: ZHILAN },
    { productId: REVITA, location: "kirkuk", qty: 14, batch: "RV-2610", expiry: "2026-10-31", updatedAt: aug(10, "09:00"), updatedBy: ZHILAN },
  ];
  const stockTransfers: DB["stockTransfers"] = [
    { id: id(), productId: CLAPIO_L, qty: 20, from: "erbil", to: "duhok", by: ZHILAN, ts: aug(10, "09:00"), note: "Weekly refill" },
    { id: id(), productId: CLAPIO_L, qty: 15, from: "erbil", to: "kirkuk", by: ZHILAN, ts: aug(10, "09:10"), note: "Weekly refill" },
  ];
  const stockChecks: DB["stockChecks"] = [
    {
      id: id(), userId: DARA, city: "duhok", weekStart: "2026-08-15",
      rows: [
        { productId: CLAPIO_L, counted: 18, system: 18 },
        { productId: CLAPIO_CH, counted: 5, system: 6 },
        { productId: REVITA, counted: 10, system: 10 },
      ],
      note: "One CLAPIO Ch box damaged in the car.", ts: "2026-08-17T17:30:00", reviewedBy: null,
    },
  ];
  const stockUploads: DB["stockUploads"] = [
    { id: id(), filename: "stock-count-jul.xlsx", uploadedBy: ZHILAN, at: "2026-08-01T09:00:00", rowsProcessed: 12, errors: [] },
  ];

  // ---- leaves --------------------------------------------------------------
  const leaves: DB["leaves"] = [
    { id: id(), userId: ALAND, start: "2026-08-18", end: "2026-08-19", type: "annual", reason: "Personal", status: "approved", decidedBy: ALAN },
    { id: id(), userId: SAMI, start: "2026-08-03", end: "2026-08-04", type: "sick", reason: "Flu", status: "approved", decidedBy: ALAN },
    { id: id(), userId: SAMI, start: "2026-08-24", end: "2026-08-26", type: "annual", reason: "Family event in Duhok.", status: "pending", decidedBy: null },
    { id: id(), userId: DARA, start: "2026-08-20", end: "2026-08-20", type: "sick", reason: "Clinic appointment", status: "pending", decidedBy: null },
  ];

  // ---- plans (with real doctors) -------------------------------------------
  const plans: DB["plans"] = [
    {
      id: id(), userId: SAMI, weekStart: "2026-08-15", status: "approved", note: null, decidedBy: ALAN, attachment: null,
      days: [
        { day: "SAT", area: "Erbil · Shorsh", note: "", visits: 5, doctorIds: [D("Dr. Shirin Ahmed"), D("Dr. Karwan Baban"), D("Dr. Hemin Aziz"), D("Dr. Sara Omer"), D("Dr. Lana Rasool")], backupIds: [D("Dr. Tara Salih")] , city: null, jointWith: null },
        { day: "SUN", area: "Erbil · Ankawa", note: "", visits: 5, doctorIds: [D("Dr. Hemin Aziz"), D("Dr. Sara Omer"), D("Dr. Shirin Ahmed"), D("Dr. Lana Rasool"), D("Dr. Tara Salih")], backupIds: [D("Dr. Karwan Baban")] , city: null, jointWith: null },
        { day: "MON", area: "Erbil · Naz City", note: "", visits: 5, doctorIds: [D("Dr. Shirin Ahmed"), D("Dr. Karwan Baban"), D("Dr. Tara Salih"), D("Dr. Lana Rasool"), D("Dr. Hemin Aziz")], backupIds: [D("Dr. Sara Omer"), D("Dr. Lava Rashid")] , city: null, jointWith: null },
        { day: "TUE", area: "Soran circuit", note: "travel day", visits: 3, doctorIds: [D("Dr. Lava Rashid")], backupIds: [] , city: null, jointWith: null },
        { day: "WED", area: "Erbil · follow-ups", note: "", visits: 5, doctorIds: [D("Dr. Karwan Baban"), D("Dr. Shirin Ahmed"), D("Dr. Sara Omer"), D("Dr. Hemin Aziz"), D("Dr. Tara Salih")], backupIds: [D("Dr. Lana Rasool")] , city: null, jointWith: null },
        { day: "THU", area: "Erbil · new leads", note: "", visits: 4, doctorIds: [D("Dr. Lana Rasool"), D("Dr. Tara Salih"), D("Dr. Sara Omer"), D("Dr. Hemin Aziz")], backupIds: [D("Dr. Shirin Ahmed")] , city: null, jointWith: null },
      ],
    },
    {
      id: id(), userId: SAMI, weekStart: "2026-08-22", status: "submitted", note: null, decidedBy: null, attachment: "plan-w35-sami.xlsx",
      days: [
        { day: "SAT", area: "Erbil · Shorsh + 60m Road", note: "", visits: 5, doctorIds: [D("Dr. Shirin Ahmed"), D("Dr. Karwan Baban"), D("Dr. Hemin Aziz"), D("Dr. Sara Omer"), D("Dr. Lana Rasool")], backupIds: [D("Dr. Tara Salih"), D("Dr. Lava Rashid")] , city: null, jointWith: null },
        { day: "SUN", area: "Erbil · Ankawa", note: "", visits: 5, doctorIds: [D("Dr. Hemin Aziz"), D("Dr. Sara Omer"), D("Dr. Shirin Ahmed"), D("Dr. Lana Rasool"), D("Dr. Tara Salih")], backupIds: [D("Dr. Karwan Baban")] , city: null, jointWith: null },
        { day: "MON", area: "Erbil · Naz City", note: "joint visit requested", visits: 4, doctorIds: [D("Dr. Tara Salih"), D("Dr. Shirin Ahmed"), D("Dr. Karwan Baban"), D("Dr. Lana Rasool")], backupIds: [D("Dr. Hemin Aziz")] , city: null, jointWith: null },
        { day: "TUE", area: "Soran circuit", note: "travel day", visits: 3, doctorIds: [D("Dr. Lava Rashid")], backupIds: [] , city: null, jointWith: null },
        { day: "WED", area: "Erbil · follow-ups", note: "", visits: 5, doctorIds: [D("Dr. Karwan Baban"), D("Dr. Shirin Ahmed"), D("Dr. Sara Omer"), D("Dr. Hemin Aziz"), D("Dr. Tara Salih")], backupIds: [D("Dr. Lana Rasool")] , city: null, jointWith: null },
        { day: "THU", area: "Erbil · new leads", note: "", visits: 4, doctorIds: [D("Dr. Lana Rasool"), D("Dr. Tara Salih"), D("Dr. Sara Omer"), D("Dr. Hemin Aziz")], backupIds: [D("Dr. Shirin Ahmed")] , city: null, jointWith: null },
      ],
    },
    {
      id: id(), userId: DARA, weekStart: "2026-08-22", status: "submitted", note: null, decidedBy: null, attachment: null,
      days: [
        { day: "SAT", area: "Duhok · KRO Street", note: "", visits: 4, doctorIds: [D("Dr. Avin Tahir"), D("Dr. Zana Saeed"), D("Dr. Rezan Ali"), D("Dr. Berivan Hussein")], backupIds: [] , city: null, jointWith: null },
        { day: "SUN", area: "Duhok · Nohadra", note: "", visits: 4, doctorIds: [D("Dr. Zana Saeed"), D("Dr. Avin Tahir"), D("Dr. Berivan Hussein"), D("Dr. Rezan Ali")], backupIds: [] , city: null, jointWith: null },
        { day: "MON", area: "Duhok · Mazi", note: "", visits: 4, doctorIds: [D("Dr. Rezan Ali"), D("Dr. Avin Tahir"), D("Dr. Zana Saeed"), D("Dr. Berivan Hussein")], backupIds: [] , city: null, jointWith: null },
        { day: "TUE", area: "Zakho Road", note: "", visits: 4, doctorIds: [D("Dr. Berivan Hussein"), D("Dr. Zana Saeed"), D("Dr. Avin Tahir"), D("Dr. Rezan Ali")], backupIds: [] , city: null, jointWith: null },
        { day: "WED", area: "Duhok · follow-ups", note: "", visits: 4, doctorIds: [D("Dr. Avin Tahir"), D("Dr. Rezan Ali"), D("Dr. Zana Saeed"), D("Dr. Berivan Hussein")], backupIds: [] , city: null, jointWith: null },
        { day: "THU", area: "Duhok · new leads", note: "", visits: 4, doctorIds: [D("Dr. Zana Saeed"), D("Dr. Berivan Hussein"), D("Dr. Avin Tahir"), D("Dr. Rezan Ali")], backupIds: [] , city: null, jointWith: null },
      ],
    },
    {
      id: id(), userId: ALAN, weekStart: "2026-08-22", status: "submitted", note: null, decidedBy: null, attachment: null,
      days: [
        { day: "SAT", area: "", note: "", visits: 3, doctorIds: [], backupIds: [], city: "erbil", jointWith: SAMI },
        { day: "SUN", area: "", note: "", visits: 3, doctorIds: [], backupIds: [], city: "erbil", jointWith: null },
        { day: "MON", area: "", note: "", visits: 3, doctorIds: [], backupIds: [], city: "duhok", jointWith: DARA },
        { day: "TUE", area: "", note: "", visits: 3, doctorIds: [], backupIds: [], city: "duhok", jointWith: DARA },
        { day: "WED", area: "", note: "", visits: 3, doctorIds: [], backupIds: [], city: "kirkuk", jointWith: ALAND },
        { day: "THU", area: "", note: "", visits: 3, doctorIds: [], backupIds: [], city: "erbil", jointWith: null },
      ],
    },
  ];

  // ---- money ---------------------------------------------------------------
  const payoutsPaid: DB["payoutsPaid"] = [
    { id: id(), userId: SAMI, quarter: "2026-Q2", amount: 580000, paidAt: "2026-07-05T10:00:00", paidBy: ZHILAN },
    { id: id(), userId: DARA, quarter: "2026-Q2", amount: 615000, paidAt: "2026-07-05T10:00:00", paidBy: ZHILAN },
    { id: id(), userId: ALAND, quarter: "2026-Q2", amount: 495000, paidAt: "2026-07-05T10:00:00", paidBy: ZHILAN },
  ];
  const payrollPaid: DB["payrollPaid"] = [
    { id: id(), userId: DARA, period: "2026-08", amount: 1200000, paidAt: "2026-08-17T09:12:00", paidBy: ZHILAN },
    ...users.filter((u) => u.baseSalary > 0).map((u) => ({ id: id(), userId: u.id, period: "2026-07", amount: u.baseSalary, paidAt: "2026-08-01T10:00:00", paidBy: ZHILAN })),
  ];

  // ---- spendings -----------------------------------------------------------
  const spendings: DB["spendings"] = [
    { id: id(), userId: SAMI, date: "2026-08-16", amount: 25000, type: "gas", note: "Soran circuit fuel", receipt: null, status: "pending", decidedBy: null, decideNote: null, paidAt: null, paidBy: null },
    { id: id(), userId: DARA, date: "2026-08-12", amount: 12000, type: "food", note: "Lunch on Zakho Road day", receipt: null, status: "approved", decidedBy: ZHILAN, decideNote: null, paidAt: null, paidBy: null },
    { id: id(), userId: ALAND, date: "2026-07-22", amount: 30000, type: "gas", note: "Kirkuk remote day", receipt: null, status: "paid", decidedBy: ZHILAN, decideNote: null, paidAt: "2026-08-01T10:00:00", paidBy: ZHILAN },
  ];

  // ---- tasks ---------------------------------------------------------------
  const tasks: DB["tasks"] = [
    { id: id(), title: "Collect payment from Dr. Shirin", details: "She agreed to settle last month s supply — bring the signed receipt.", createdBy: ZHILAN, createdByRole: "accountant", assigneeIds: [SAMI], completions: [{ userId: SAMI, doneAt: "2026-08-18T13:42:00" }], dueDate: "2026-08-18", status: "done", createdAt: "2026-08-16T09:00:00", doneAt: "2026-08-18T13:42:00" },
    { id: id(), title: "Competitor price check — Regenovue & Neuramis", details: "Clinic prices in your city center.", createdBy: ALAN, createdByRole: "supervisor", assigneeIds: [DARA, ALAND], completions: [], dueDate: "2026-08-20", status: "open", createdAt: "2026-08-17T10:00:00", doneAt: null },
    { id: id(), title: "Update Kirkuk clinic phone list", details: "Three clinics changed numbers.", createdBy: ALAN, createdByRole: "supervisor", assigneeIds: [ALAND], completions: [], dueDate: "2026-08-23", status: "open", createdAt: "2026-08-17T10:05:00", doneAt: null },
  ];

  // ---- chat groups ---------------------------------------------------------
  const chatGroups: DB["chatGroups"] = [
    { id: id(), name: "Everyone", memberIds: [MO, ALAN, SAMI, DARA, ALAND, ZHILAN], builtin: true },
    { id: id(), name: "Management", memberIds: [MO, ALAN, ZHILAN], builtin: true },
    { id: id(), name: "Erbil", memberIds: [MO, ALAN, SAMI], builtin: false },
    { id: id(), name: "Duhok", memberIds: [MO, ALAN, DARA], builtin: false },
    { id: id(), name: "Kirkuk", memberIds: [MO, ALAN, ALAND], builtin: false },
  ];

  // ---- notifications & announcements --------------------------------------
  const notifications: DB["notifications"] = [
    { id: id(), userId: SAMI, body: "Your order for Dr. Karwan Baban was approved by Dr. Alan.", href: "/orders", ts: "2026-08-16T15:30:00", read: false },
    { id: id(), userId: SAMI, body: "New task from Zhilan Omar: Collect payment from Dr. Shirin.", href: "/tasks", ts: "2026-08-16T09:00:00", read: true },
    { id: id(), userId: DARA, body: "New task from Dr. Alan: Competitor price check — Duhok.", href: "/tasks", ts: "2026-08-17T10:00:00", read: false },
  ];
  const announcements: DB["announcements"] = [
    { id: id(), body: "CLAPIO Ch restock arrives this week — push it on every visit.", createdBy: MO, ts: "2026-08-17T08:00:00", active: true, seenBy: [] },
  ];

  // ---- deductions (flagged no-check-in days) --------------------------------
  const deductions: DB["deductions"] = [
    { id: id(), userId: DARA, date: "2026-08-12", amount: Math.round(1200000 / 26), status: "flagged", decidedBy: null },
  ];

  // ---- activity ------------------------------------------------------------
  const activity: DB["activity"] = [
    { id: id(), userId: ALAN, action: "approved order #? for Dr. Karwan Baban", ts: "2026-08-16T15:30:00" },
    { id: id(), userId: ZHILAN, action: "invoiced INV-1038 (PHX-21738)", ts: "2026-08-14T16:00:00" },
  ];

  // ---- chat ----------------------------------------------------------------
  const G = (name: string) => `g-${chatGroups.find((g) => g.name === name)!.id}`;
  const msg = (channel: string, senderId: number, body: string, ts: string): DB["messages"][0] =>
    ({ id: id(), channel, senderId, body, ts, kind: "text", fileId: null, fileName: null, duration: null });
  const messages: DB["messages"] = [
    msg(G("Everyone"), ALAN, "Good morning team — CLAPIO Ch restock arrived, push it this week.", "2026-08-18T08:15:00"),
    msg(G("Everyone"), MO, "Q3 numbers looking strong — keep the Kirkuk push up.", "2026-08-18T08:20:00"),
    msg(G("Everyone"), ZHILAN, "Got the receipt photo from Dr. Shirin — entered in the accounts.", "2026-08-18T12:46:00"),
    msg(G("Erbil"), SAMI, "Dr. Shirin confirmed a new order, sending it for approval now.", "2026-08-18T12:20:00"),
    msg(G("Management"), MO, "Weekly plans review at 5pm.", "2026-08-18T09:30:00"),
  ];

  return {
    users, products, doctors, checkins, pings, visits, orders, payments,
    targets, payoutsPaid, payrollPaid, stock, stockUploads, leaves, messages, plans,
    spendings, tasks, notifications, announcements, deductions, activity, files: [],
    history: [],
    privateNotes: [],
    transferRequests: [],
    collections: [],
    chatGroups,
    competitorNotes,
    brochures: [],
    stockTransfers, stockChecks, pushSubs: [],
    settings,
    seq,
  };
}
