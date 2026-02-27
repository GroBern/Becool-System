import CrudPage from "../CrudPage";

export default function InstructorsPage() {
  return (
    <CrudPage
      title="Instructors"
      sub="Instructor profiles"
      dk="instructors"
      fields={[
        { k: "name", l: "Name" },
        { k: "email", l: "Email", t: "email" },
        { k: "phone", l: "Phone" },
        { k: "specialty", l: "Specialty" },
        { k: "commissionRate", l: "Commission %", t: "number" },
        { k: "availability", l: "Availability", t: "select", opts: [{ v: "available", l: "Available" }, { v: "busy", l: "Busy" }, { v: "off", l: "Off" }] },
      ]}
    />
  );
}
