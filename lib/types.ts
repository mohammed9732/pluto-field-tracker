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
