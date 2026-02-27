import RentalPage from "../RentalPage";

export default function EquipmentPage() {
  return <RentalPage title="Equipment" invKey="equipment" rentKey="equipmentRentals" typeOpts={["surfboard", "wetsuit", "rash guard", "fins", "leash"]} />;
}
