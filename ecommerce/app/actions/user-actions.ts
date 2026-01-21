import { connectToDatabase } from "@/app/api/db";
import { Db } from "mongodb";
import { ObjectId } from "mongodb";

async function getNextUserId(db: Db): Promise<string> {
  const counterCollection = db.collection("counters");

  // Try to increment the userId counter
  const result = await counterCollection.findOneAndUpdate(
    { _id: new ObjectId("userId") },
    { $inc: { sequence_value: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  // If the document was just created, it starts at 1
  if (!result || !result.sequence_value) {
    // Check if there are any existing users to determine starting point
    const existingUsers = await db
      .collection("users")
      .find({ userId: { $exists: true } })
      .sort({ userId: -1 })
      .limit(1)
      .toArray();

    if (existingUsers.length > 0) {
      const maxUserId = parseInt(existingUsers[0].userId) || 0;
      const nextUserId = maxUserId + 1;
      await counterCollection.updateOne(
        { _id: new ObjectId("userId") },
        { $set: { sequence_value: nextUserId } },
        { upsert: true }
      );
      return nextUserId.toString();
    }

    // Start from 1 if no users exist
    await counterCollection.updateOne(
      { _id: new ObjectId("userId") },
      { $set: { sequence_value: 1 } },
      { upsert: true }
    );
    return "1";
  }

  return result.sequence_value.toString();
}

export async function login(name: string, password: string) {
  const { db } = await connectToDatabase();
  const user = await db.collection("users").findOne({ name });
  if (!user) {
    return {
      success: false,
      message: "Invalid name or password",
      user: null,
    };
  }
  if (user.password !== password) {
    return {
      success: false,
      message: "Invalid name or password",
      user: null,
    };
  }
  return {
    success: true,
    message: "Login successful",
    user: JSON.parse(JSON.stringify(user)),
  };
}

export async function register(name: string, password: string) {
  const { db } = await connectToDatabase();
  const user = await db.collection("users").findOne({ name });
  if (user) {
    if (user.password === password) {
      return {
        success: true,
        message: "User already exists and is logged in",
        user: JSON.parse(JSON.stringify(user)),
      };
    }
    return {
      success: false,
      message: "User already exists but password is incorrect",
      user: null,
    };
  }
  const userId = await getNextUserId(db);
  const newUser = await db
    .collection("users")
    .insertOne({ userId, name, password });

  const insertedUser = await db
    .collection("users")
    .findOne({ _id: newUser.insertedId });

  return {
    success: true,
    message: "User registered successfully",
    user: JSON.parse(JSON.stringify(insertedUser)),
  };
}
