import CrudPage from "../CrudPage";

export default function AgentsPage() {
  return (
    <CrudPage
      title="Agents / Referrers"
      sub="Track referrals"
      dk="agents"
      fields={[
        { k: "name", l: "Name" },
        { k: "email", l: "Email", t: "email" },
        { k: "phone", l: "Phone" },
        { k: "commissionType", l: "Commission Type", t: "select", opts: [{ v: "percentage", l: "Percentage" }, { v: "fixed", l: "Fixed" }] },
        { k: "commissionRate", l: "Rate", t: "number" },
      ]}
    />
  );
}
