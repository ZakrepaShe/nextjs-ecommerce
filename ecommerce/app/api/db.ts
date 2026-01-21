import { MongoClient, ServerApiVersion, type Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

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

  return { client: cachedClient, db: cachedDb };
}
