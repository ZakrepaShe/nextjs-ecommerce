"use server";

import { connectToDatabase } from "@/app/api/db";
import type { UpdateFilter } from "mongodb";
import { revalidatePath } from "next/cache";

export async function getCartProducts(userId: string) {
  const { db } = await connectToDatabase();
  const userCart = await db.collection("carts").findOne({ userId });

  if (!userCart) {
    return [];
  }

  const cartProducts = await db
    .collection("products")
    .find({ id: { $in: userCart.cartIds } })
    .toArray();
  return JSON.parse(JSON.stringify(cartProducts));
}

export async function addToCart(userId: string, productId: string) {
  const { db } = await connectToDatabase();
  const updatedCart = await db
    .collection("carts")
    .findOneAndUpdate(
      { userId },
      { $addToSet: { cartIds: productId } },
      { upsert: true, returnDocument: "after" }
    );

  const cartProducts = await db
    .collection("products")
    .find({ id: { $in: updatedCart?.cartIds || [] } })
    .toArray();

  // Revalidate both cart and products pages
  revalidatePath("/cart");
  revalidatePath("/products");

  return JSON.parse(JSON.stringify(cartProducts));
}

export async function removeFromCart(userId: string, productId: string) {
  const { db } = await connectToDatabase();
  const updatedCart = await db
    .collection("carts")
    .findOneAndUpdate(
      { userId },
      { $pull: { cartIds: productId } as UpdateFilter<Document> },
      { returnDocument: "after" }
    );

  const cartProducts = await db
    .collection("products")
    .find({ id: { $in: updatedCart?.cartIds || [] } })
    .toArray();

  // Revalidate both cart and products pages
  revalidatePath("/cart");
  revalidatePath("/products");

  return JSON.parse(JSON.stringify(cartProducts));
}
