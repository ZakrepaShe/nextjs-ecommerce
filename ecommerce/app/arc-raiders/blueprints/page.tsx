import { getBlueprints, getBlueprintsOrder, getUsersBlueprints } from "@/app/actions/arc-blueprints-actions";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import Blueprints from "./Blueprints";

export default async function BlueprintsPage() {
  const user = await getAuthenticatedUser();

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
