import { getBlueprints, getBlueprintsOrder, getUsersBlueprints } from "@/app/actions/arc-blueprints-actions";
import { getCurrentUser } from "@/app/actions/user-actions";
import { redirect } from "next/navigation";
import Blueprints from "./Blueprints";

export default async function BlueprintsPage() {
  const user = await getCurrentUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/login");
  }

  const blueprints = await getBlueprints();
  const userBlueprintsData = await getUsersBlueprints(user.userId);
  const blueprintsOrder = await getBlueprintsOrder();

  return (
    <Blueprints blueprints={blueprints} userBlueprints={userBlueprintsData.blueprints} blueprintsOrder={blueprintsOrder} />
  );
}
