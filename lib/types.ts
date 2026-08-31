export type Role = "admin" | "supervisor" | "rep" | "accountant";
export type City = string; // city id from settings.cities, or "all"

export interface User {
  id: number;
  name: string;
  role: Role;
  city: City;
  phone: string;
  password: string; // dev build: plain seed password
  baseSalary: number;
  dailyMin: number;
  active: boolean;
  productLine?: string | null; // absent or null = sells everything
  lang?: "en" | "ar";          // absent = follow the company default
}

export interface PriceTier {
  minQty: number; // tier applies from this quantity up
  price: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  imageId: string | null;      // product photo the rep can show a doctor
  brochureId: string | null;   // PDF/marketing file
  brochureName: string | null;
  unitPrice: number; // base price (qty 1) — tiers override from their minQty up
  tiers: PriceTier[];
  unit: string;
  active: boolean;
  // Two reps can work the same city on different ranges. Products carry the
  // line, users carry the line they sell, and ordering is filtered by it.
  // Empty means "everyone", so existing data keeps working untouched.
  line?: string | null;
}

export interface Doctor {
  id: number;
  name: string;
  clinic: string;
  city: string;
  area: string;
  address: string;
  class: "A" | "B" | "C";
  specialty: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  locationSetBy: number | null;
  locationSetAt: string | null;
  createdBy: number;
  potentialMonthly: number; // what this doctor should buy per month (IQD), 0 = not set
  secretaryPhone?: string | null; // the person who actually books the appointment
  clinicPhone?: string | null; // the clinic's landline — its own column on the import sheet
  /* Lifetime sales ceiling in IQD — a credit limit, set by the accountant.
     Usage = everything ever ordered (not rejected, samples excluded, pending
     included so orders can't stack under it) minus everything ever paid, so
     a payment brings the bar back down. 0 or absent = no ceiling. Reps are
     blocked at the ceiling; supervisor and owner may order past it. */
  salesCeiling?: number | null;
}

/* One scheduled collection: the accountant tells a rep to collect a specific
 * amount from a specific customer on a specific day, against an invoice
 * number typed from the paper invoice.
 *
 * A recorded payment closes it whatever the amount — a partial payment closes
 * the item and carries a shortfall flag for the accountant, who decides
 * whether to schedule the remainder (their call, not automated). An item
 * whose date passes uncollected is flagged missed. */
export interface CollectionItem {
  id: number;
  doctorId: number;
  repId: number;        // who is to collect it
  date: string;         // YYYY-MM-DD
  amount: number;       // IQD expected
  invoiceNo: string;    // typed by the accountant off the paper invoice
  note: string;
  status: "due" | "done";
  collectedAmount: number | null;  // what actually came in
  paymentId: number | null;        // the payment that closed it
  shortfall: boolean;              // closed with less than scheduled
  missedFlagged: boolean;          // date passed with nothing collected
  /* The accountant has dealt with this item's flag (rescheduled it, or
     decided to let it go). Clears it from the needs-attention list WITHOUT
     rewriting history — the shortfall still happened and still shows in the
     table; it just stops demanding attention. */
  attended?: boolean;
  createdBy: number;
  ts: string;
}

export interface Checkin {
  id: number;
  userId: number;
  type: "in" | "out";
  ts: string; // ISO
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}

export interface Ping {
  id: number;
  userId: number;
  ts: string;
  lat: number;
  lng: number;
  accuracy: number | null;
}

export type VisitOutcome = "order" | "follow_up" | "payment";

export interface Visit {
  // Set by the phone when a record was queued offline. The server uses it to
  // recognise a retry of something it already stored.
  clientRef?: string | null;
  id: number;
  userId: number;
  doctorId: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  jointVisit: boolean;
  jointWith: number | null;
  outcome: VisitOutcome;
  notes: string;
  followUpDate: string | null;
  lat: number | null;
  lng: number | null;
  photo: string | null; // file id — a friendly visit note/memory, not proof
  outOfLocation: boolean; // logged outside the clinic radius (or no GPS) — flagged to supervisor & owner
}

export interface OrderItem {
  productId: number;
  qty: number;
  price: number; // snapshot, may be edited by rep and adjusted at approval
}

export type OrderStatus = "pending" | "approved" | "rejected" | "invoiced";

export interface Order {
  // Set by the phone when a record was queued offline. The server uses it to
  // recognise a retry of something it already stored.
  clientRef?: string | null;
  id: number;
  doctorId: number;
  createdBy: number;
  createdAt: string;
  status: OrderStatus;
  isSample: boolean; // free samples: stock still moves, but no value and no target credit
  items: OrderItem[];
  approvedBy: number | null;
  approvedAt: string | null;
  rejectNote: string | null;
  invoicePdfName: string | null; // invoice document the accountant uploads (optional)
  invoicePdfId: string | null; // stored file id
  invoicedBy: number | null;
  invoicedAt: string | null;
  // Every price the approver changed before approving, kept for review.
  priceEdits?: { productId: number; from: number; to: number; by: number; at: string }[];
}

export interface Payment {
  // Set by the phone when a record was queued offline. The server uses it to
  // recognise a retry of something it already stored.
  clientRef?: string | null;
  id: number;
  ref: string; // app reference only — not an accounting document
  doctorId: number;
  amount: number;
  method: "cash" | "transfer";
  note: string;
  collectedBy: number;
  ts: string;
  lat: number | null;
  lng: number | null;
  photo: string | null; // photo of the signed physical receipt (file id)
}

export interface Target {
  id: number;
  userId: number;
  productId: number;
  period: string; // YYYY-MM
  targetQty: number;
  minPct: number;
  incentivePct: number;
  setBy: number;
}

export interface PayoutPaid {
  id: number;
  userId: number;
  quarter: string; // e.g. 2026-Q3
  amount: number;
  paidAt: string;
  paidBy: number;
}

export interface PayrollPaid {
  id: number;
  userId: number;
  period: string; // YYYY-MM
  amount: number;
  paidAt: string;
  paidBy: number;
}

export type StockLocation = string; // "main" (head warehouse) or a city id

export interface StockItem {
  productId: number;
  location: StockLocation; // main = Erbil warehouse; city stock is held by the rep
  qty: number;
  batch: string | null;
  expiry: string | null; // YYYY-MM-DD
  updatedAt: string;
  updatedBy: number;
}

export interface StockUpload {
  id: number;
  filename: string;
  uploadedBy: number;
  at: string;
  rowsProcessed: number;
  errors: string[];
}

export interface StockTransfer {
  id: number;
  productId: number;
  qty: number;
  from: StockLocation;
  to: StockLocation;
  by: number;
  ts: string;
  note: string;
}

// A note only its author can read. Deliberately not visible to management: a rep
// writes differently when the owner is reading, and the point of this is the
// note they would otherwise keep in their own phone.
export interface PrivateNote {
  id: number;
  userId: number;
  doctorId: number;
  body: string;
  ts: string;
}

// Asking for stock held in another city. Supervisor agrees it is needed, then
// the accountant — who can see what is actually on the shelf — moves it.
export interface TransferRequest {
  id: number;
  productId: number;
  qty: number;
  fromCity: string;
  toCity: string;
  requestedBy: number;
  note: string;
  status: "pending" | "supervisor_ok" | "done" | "rejected";
  decidedBy: number | null;
  decidedNote: string | null;
  ts: string;
}

export interface StockCheck {
  id: number;
  userId: number;
  city: StockLocation;
  weekStart: string; // YYYY-MM-DD Saturday
  rows: { productId: number; counted: number; system: number }[];
  note: string;
  ts: string;
  reviewedBy: number | null;
}

export interface PushSub {
  userId: number;
  sub: any; // browser PushSubscription JSON
  ts: string;
}

export interface Leave {
  id: number;
  userId: number;
  start: string;
  end: string;
  type: "annual" | "sick";
  reason: string;
  status: "pending" | "approved" | "rejected";
  decidedBy: number | null;
}

export interface Message {
  id: number;
  channel: string; // "everyone" | "management" | "erbil" | "duhok" | "kirkuk" | "dm-<a>-<b>"
  senderId: number;
  body: string;
  ts: string;
  kind: "text" | "image" | "file" | "voice";
  fileId: string | null;
  fileName: string | null;
  duration: number | null; // seconds, voice only
}

export interface PlanDay {
  day: string; // SAT..THU
  area: string; // rep: route/area text
  note: string;
  visits: number; // planned count
  doctorIds: number[]; // reps: the doctors to visit that day
  backupIds: number[]; // reps: backup doctors
  city: string | null; // supervisors: which city he works that day
  jointWith: number | null; // supervisors: rep he rides with that day
}

export interface Plan {
  id: number;
  userId: number;
  weekStart: string; // YYYY-MM-DD (a Saturday)
  days: PlanDay[];
  status: "submitted" | "approved" | "returned";
  note: string | null;
  decidedBy: number | null;
  attachment: string | null;
}

export type SpendingType = "gas" | "food" | "gifts" | "accommodation" | "other";

export interface Spending {
  id: number;
  userId: number;
  date: string; // YYYY-MM-DD
  amount: number; // IQD
  type: SpendingType;
  note: string;
  receipt: string | null; // file id
  // pending → (supervisor step if enabled) → approved → paid; or rejected
  status: "pending" | "supervisor_ok" | "approved" | "rejected" | "paid";
  decidedBy: number | null;
  decideNote: string | null;
  paidAt: string | null;
  paidBy: number | null;
}

export interface TaskItem {
  id: number;
  title: string;
  details: string;
  createdBy: number;
  createdByRole: Role; // colors: accountant = green, supervisor = blue, admin = violet
  assigneeIds: number[]; // one, many, all reps, or everyone
  completions: { userId: number; doneAt: string }[]; // each person ticks their own
  dueDate: string | null;
  status: "open" | "done" | "closed"; // done = every assignee finished
  createdAt: string;
  doneAt: string | null;
}

// Marketing material that isn't tied to one product (price lists, campaigns…).
export interface Brochure {
  id: number;
  title: string;
  fileId: string;
  fileName: string;
  mime: string;
  uploadedBy: number;
  ts: string;
}

export interface CompetitorNote {
  id: number;
  doctorId: number | null; // null = general market intel, not tied to a doctor
  userId: number;
  competitor: string;      // e.g. "Regenovue"
  product: string;
  price: number;           // IQD, 0 = unknown
  note: string;
  visitId: number | null;  // set when captured during a visit
  ts: string;
}

export interface ChatGroup {
  id: number;
  name: string;
  memberIds: number[];
  builtin: boolean; // Everyone/Management can't be deleted
}

export interface Notification {
  id: number;
  userId: number;
  body: string;
  href: string | null;
  ts: string;
  read: boolean;
}

// A readable record of who changed what. The activity feed is a flat stream for
// the owner; this is attached to a specific record so you can open one doctor or
// one order and see its whole story.
export interface ChangeLog {
  id: number;
  entity: "doctor" | "order" | "payment" | "user" | "target" | "settings" | "plan" | "visit";
  entityId: number;
  action: string;        // short, human: "price changed", "approved", "city moved"
  detail: string | null; // what actually changed, e.g. "Class B → Class A"
  byId: number;
  at: string;
}

export interface Announcement {
  id: number;
  body: string;
  createdBy: number;
  ts: string;
  active: boolean;
  seenBy: number[];
}

export interface Deduction {
  id: number;
  userId: number;
  date: string; // the missed workday
  amount: number; // daily rate at flag time
  status: "flagged" | "confirmed" | "waived";
  decidedBy: number | null;
}

export interface Activity {
  id: number;
  userId: number;
  action: string; // short verb phrase, e.g. "approved order #12"
  ts: string;
}

export interface StoredFile {
  id: string; // random id, also the filename on disk
  name: string;
  mime: string;
  size: number;
  ownerId: number;
  ts: string;
}

// Every user-facing word a buyer might want to change. Defaults suit a medical
// distributor; a company selling to pharmacies or salons overrides them.
export interface Terms {
  doctor: string;
  doctorPlural: string;
  clinic: string;
  roleAdmin: string;
  roleSupervisor: string;
  roleRep: string;
  roleAccountant: string;
}

export const DEFAULT_TERMS: Terms = {
  doctor: "Doctor",
  doctorPlural: "Doctors",
  clinic: "Clinic",
  roleAdmin: "Owner",
  roleSupervisor: "Supervisor",
  roleRep: "Medical rep",
  roleAccountant: "Accountant",
};

export interface Settings {
  companyName: string;
  companySub: string;
  currency: string; // display label, e.g. "IQD"
  cities: { id: string; name: string }[]; // add/rename cities without code changes
  // feature toggles
  supervisorCanAddDoctors: boolean;
  repsCanAddDoctors: boolean;
  supervisorCanToggleRepAdd: boolean;
  spendingsEnabled: boolean;
  spendingSupervisorStep: boolean;
  plannerEnabled: boolean;
  paymentsEnabled: boolean;
  repPriceEdit: boolean;
  chatAttachments: boolean;
  performanceTab: boolean;
  leaderboard: boolean;
  visitPhotos: boolean;
  tasksEnabled: boolean;
  announcementsEnabled: boolean;
  deductionsEnabled: boolean;
  paymentReceiptRequired: boolean; // signed physical receipt photo on payment collection
  // metrics
  pingMinutes: number;
  dwellRadiusM: number;
  visitRadiusM: number; // rep must be within this distance of the clinic pin to log a visit cleanly
  planVisitTarget: number; // reps: doctors to visit per day
  planBackupTarget: number;
  supervisorPlanVisitTarget: number; // supervisor: client meetings per day
  supervisorPlanBackupTarget: number;
  salesCommissionPct: number; // % of achieved monthly sales — accrues, paid quarterly
  collectionCommissionPct: number; // % of payments collected — paid monthly in payroll
  lowStockThreshold: number;
  expiryWarnMonths: number;
  checkinNudgeHour: number; // 24h local, e.g. 9
  supervisorVisitLabel: string; // "Client meeting"
  dmPolicy: "management" | "none" | "all"; // who reps may direct-message
  managementSeesAllTasks: boolean;
  samplesEnabled: boolean;      // reps can mark an order as a free sample
  competitorTracking: boolean;  // capture competitor info during visits
  dailySummaryHour: number;     // 24h; owner + supervisor get an end-of-day summary
  editWindowMinutes: number;    // how long a rep may fix his own visit/order
 // supervisor + accountant see every task assigned to reps
  weeklyStockCheck: boolean; // non-Erbil reps must count their stock weekly (due Thursday)

  // --- white-label branding ---
  logoId: string | null;      // uploaded logo, served publicly at /api/logo
  // Uploaded mascot artwork, one per mood. When a slot is empty the built-in
  // drawing is used instead, so the app never has a hole where he should be.
  mascotIdleId: string | null;
  mascotHelloId: string | null;
  mascotCheerId: string | null;
  mascotSadId: string | null;

  // Months up to and including this one are closed: nothing dated inside them
  // can be created or edited any more. "YYYY-MM", or null when nothing is closed.
  closedThrough: string | null;

  // Named product ranges. Empty list = the company sells one range and nobody
  // needs to think about it.
  productLines: string[];

  // The language a new person gets before they choose their own.
  defaultLang: "en" | "ar";
  /* Which events push to phones. Owner-controlled, company-wide: the owner
     decides what is worth interrupting somebody for. The in-app bell always
     records everything regardless — these gate only the phone push. */
  pushTypes: {
    dm: boolean;          // direct messages
    group: boolean;       // group chat
    orderNew: boolean;    // a new order landing on an approver
    orderStatus: boolean; // your order approved / rejected / invoiced
    planStatus: boolean;  // weekly plan approved / returned
    leave: boolean;       // leave requests and decisions
    transfer: boolean;    // stock transfer chain
    payment: boolean;     // payment recorded
    task: boolean;        // tasks assigned / completed
    collection: boolean;  // collection schedule
    custom: boolean;      // messages the owner composes
  };
  /* The documents library (invoices + receipts) is always available to the
     accountant and owner; this switch opens it to supervisors and reps —
     reps scoped to their own customers. */
  docLibraryForField: boolean;

  /* ERP import memory. The accounting system's inventory export names
     products and warehouses its own way (and in Arabic); these maps remember
     how the accountant linked them to app products and stock locations, so
     next month's file applies with no questions. null = deliberately skip. */
  erpProductAliases?: Record<string, number | null>;
  erpWarehouseMap?: Record<string, string | null>;

  // Notice required before leave starts, in calendar days.
  leaveShortNoticeDays: number; // 1–2 day requests
  leaveLongNoticeDays: number;  // 3 days or more
  leaveShortMaxDays: number;    // what counts as "short"
  brandColor: string;         // one hex; the accent ramp is derived from it
  loginFooter: string;        // free text under the sign-in form ("" hides it)
  terms: Terms;               // what this company calls things
}

export interface DB {
  users: User[];
  products: Product[];
  doctors: Doctor[];
  checkins: Checkin[];
  pings: Ping[];
  visits: Visit[];
  orders: Order[];
  payments: Payment[];
  targets: Target[];
  payoutsPaid: PayoutPaid[];
  payrollPaid: PayrollPaid[];
  stock: StockItem[];
  stockUploads: StockUpload[];
  leaves: Leave[];
  messages: Message[];
  plans: Plan[];
  spendings: Spending[];
  tasks: TaskItem[];
  notifications: Notification[];
  announcements: Announcement[];
  history: ChangeLog[];
  privateNotes: PrivateNote[];
  transferRequests: TransferRequest[];
  collections: CollectionItem[];
  deductions: Deduction[];
  activity: Activity[];
  files: StoredFile[];
  chatGroups: ChatGroup[];
  competitorNotes: CompetitorNote[];
  brochures: Brochure[];
  stockTransfers: StockTransfer[];
  stockChecks: StockCheck[];
  pushSubs: PushSub[];
  settings: Settings;
  seq: number;
}
