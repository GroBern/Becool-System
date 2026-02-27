import CrudPage from "../CrudPage";

export default function StudentsPage() {
  return (
    <CrudPage
      title="Students"
      sub="Customer database"
      dk="students"
      fields={[
        { k: "name", l: "Name" },
        { k: "email", l: "Email", t: "email" },
        { k: "phone", l: "Phone" },
        { k: "nationality", l: "Nationality" },
        { k: "hotel", l: "Hotel" },
        { k: "notes", l: "Notes" },
      ]}
    />
  );
}
