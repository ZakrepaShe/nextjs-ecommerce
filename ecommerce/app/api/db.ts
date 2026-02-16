import { MongoClient, ServerApiVersion, type Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
const HAS_EXTRA_MIGRATION_KEY = "users_blueprints_has_extra_v1";

async function migrateUsersBlueprintsHasExtraField(db: Db) {
  const migrationRecord = await db
    .collection("counters")
    .findOne({ type: HAS_EXTRA_MIGRATION_KEY });

  if (migrationRecord) {
    return;
  }

  await db.collection("users_blueprints").updateMany({}, [
    {
      $set: {
        blueprints: {
          $arrayToObject: {
            $map: {
              input: { $objectToArray: "$blueprints" },
              as: "bp",
              in: {
                k: "$$bp.k",
                v: {
                  $mergeObjects: [
                    "$$bp.v",
                    { extraCount: { $ifNull: ["$$bp.v.extraCount", 0] } },
                  ],
                },
              },
            },
          },
        },
      },
    },
  ]);

  await db
    .collection("counters")
    .updateOne(
      { type: HAS_EXTRA_MIGRATION_KEY },
      { $set: { type: HAS_EXTRA_MIGRATION_KEY, migratedAt: new Date() } },
      { upsert: true }
    );
}

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  const uri = `mongodb+srv://${process.env.MONGODB_NAME}:${process.env.MONGODB_PASSWORD}@cluster0.ss64xej.mongodb.net/?appName=Cluster0`;
  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  cachedClient = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await cachedClient.connect();
  cachedDb = cachedClient.db("ecommerce-nextjs");

  // Create unique indexes once on first connection
  await cachedDb
    .collection("users_blueprints")
    .createIndex({ userId: 1 }, { unique: true });
  await migrateUsersBlueprintsHasExtraField(cachedDb);

  return { client: cachedClient, db: cachedDb };
}
