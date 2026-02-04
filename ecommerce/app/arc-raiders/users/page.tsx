import {
  getBlueprints,
  getBlueprintsOrder,
  getUsersBlueprints,
} from "@/app/actions/arc-blueprints-actions";
import { getUsers } from "@/app/actions/user-actions";
import UsersPageClient from "./UsersPageClient";

export default async function UsersPage() {
  const users = await getUsers();
  const blueprints = await getBlueprints();
  const blueprintsOrder = await getBlueprintsOrder();

  // Get blueprints for the first user by default
  const firstUserBlueprints = users.length > 0
    ? await getUsersBlueprints(users[0].userId)
    : { blueprints: {} };

  return (
    <UsersPageClient
      users={users}
      blueprints={blueprints}
      blueprintsOrder={blueprintsOrder}
      initialUserBlueprints={firstUserBlueprints.blueprints}
    />
  );
}