// ════════════════════════════════════════════════════════════════════
//  PAYMENT HELPERS — auto-record to the payments ledger
// ════════════════════════════════════════════════════════════════════

import { genId, today } from "./helpers";

export function recordPayment(data, update, { customerName, amount, method, type, refId, status, date, notes }) {
  if (!amount || Number(amount) <= 0) return;
  const payments = [
    ...(data.payments || []),
    {
      id: genId(),
      customerName,
      amount: Number(amount),
      method: method || "cash",
      type,
      refId,
      status: status || "completed",
      date: date || today(),
      notes: notes || "",
    },
  ];
  update("payments", payments);
}
