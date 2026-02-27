// ════════════════════════════════════════════════════════════════════
//  DEFAULT SETTINGS, DATA KEYS & SEED USERS
// ════════════════════════════════════════════════════════════════════

export const DEF_USERS = [
  { id: "u1", username: "admin", password: "admin123", name: "Admin", role: "admin" },
  { id: "u2", username: "cashier", password: "cashier123", name: "Cashier", role: "cashier" },
];

export const DEF_SETTINGS = {
  businessName: "Be Cool Surf School",
  currencySymbol: "LKR ",
  location: "Weligama, Sri Lanka",
  singlePrices: { beginner: 25, intermediate: 30, advanced: 40 },
  groupPrices: { beginner: 20, intermediate: 25, advanced: 35 },
  surfboardRental: { hourly: 5, daily: 15 },
  sunbedRental: { hourly: 3, daily: 10 },
  packages: [
    { id: "pkg1", name: "Beginner 5-Day", level: "beginner", lessons: 5, duration: 90, price: 100 },
    { id: "pkg2", name: "Intermediate 7-Day", level: "intermediate", lessons: 7, duration: 90, price: 160 },
    { id: "pkg3", name: "Advanced 10-Day", level: "advanced", lessons: 10, duration: 120, price: 350 },
  ],
  commissions: { instructorFixed: 10, instructorPercent: 30, agentPercent: 10 },
  timeSlots: [
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM",
  ],
  lessonDurations: { beginner: 90, intermediate: 90, advanced: 120 },
};

export const DATA_KEYS = [
  "singleLessons",
  "groupLessons",
  "packageLessons",
  "students",
  "instructors",
  "agents",
  "sunbeds",
  "sunbedRentals",
  "equipment",
  "equipmentRentals",
  "payments",
  "instructorAdvances",
  "instructorExpenses",
  "dailyExpenses",
  "users",
  "deleteRequests",
];
