// ════════════════════════════════════════════════════════════════════
//  NAVIGATION CONFIG — r = allowed roles
// ════════════════════════════════════════════════════════════════════

const A = ["admin"];
const Cs = ["cashier"];
const AC = ["admin", "cashier"];

export const NAV = [
  // ── Both roles ──────────────────────────────────────────────────
  { k: "dashboard", l: "Dashboard", r: AC },

  // ── Cashier operations ──────────────────────────────────────────
  { k: "activities", l: "Activities", r: Cs },
  { k: "single", l: "Single", r: Cs },
  { k: "group", l: "Group", r: Cs },
  { k: "packages", l: "Packages", r: Cs },
  { k: "students", l: "Students", r: Cs },
  { k: "expenses", l: "Expenses", r: Cs },
  { k: "sunbeds", l: "Sunbeds", r: Cs },
  { k: "equipment", l: "Equipment", r: Cs },
  { k: "payments", l: "Payments", r: Cs },

  // ── Admin only ──────────────────────────────────────────────────
  { k: "instructors", l: "Instructors", r: A },
  { k: "agents", l: "Agents", r: A },
  { k: "finances", l: "Finances", r: A },
  { k: "reports", l: "Reports", r: A },
  { k: "activityLog", l: "Activity Log", r: A },
  { k: "settings", l: "Settings", r: A },
  { k: "deleteRequests", l: "Delete Requests", r: A },
];
