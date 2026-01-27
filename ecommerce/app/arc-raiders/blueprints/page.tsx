import { getBlueprints } from "@/app/actions/arc-blueprints-actions";
import Blueprints from "./Blueprints";

export default async function BlueprintsPage() {
  const blueprints = await getBlueprints();

  return (
    <Blueprints blueprints={blueprints} />
  );
}
