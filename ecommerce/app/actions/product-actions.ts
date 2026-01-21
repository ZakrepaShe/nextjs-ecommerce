"use server";

import { connectToDatabase } from "@/app/api/db";

export async function getAllProducts() {
  const { db } = await connectToDatabase();
  const products = await db.collection("products").find({}).toArray();
  return JSON.parse(JSON.stringify(products));
}

export async function getProductById(productId: string) {
  const { db } = await connectToDatabase();
  const product = await db.collection("products").findOne({ id: productId });

  if (!product) {
    return null;
  }

  return JSON.parse(JSON.stringify(product));
}
