import {
  getBlueprints,
  getBlueprintsOrder,
  syncBlueprints,
} from "../actions/arc-blueprints-actions";
import AdminBlueprints from "./AdminBlueprints";

export default async function AdminPage() {
  const blueprintsOrder = await getBlueprintsOrder();
  const blueprints = await getBlueprints();

  return (
    <AdminBlueprints
      blueprintsOrder={blueprintsOrder}
      blueprints={blueprints}
    />
  );
}
