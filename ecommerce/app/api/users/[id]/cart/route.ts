import { connectToDatabase } from "@/app/api/db";
import { products } from "@/app/product-data";
import type { UpdateFilter } from "mongodb";
import { NextRequest } from "next/server";



export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId =  params.id;
  const { db } = await connectToDatabase();
  const userCart = await db.collection('carts').findOne({ userId });

  if (!userCart) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cartProducts = await db.collection('products').find({ id: { $in: userCart.cartIds } }).toArray();

  return new Response(JSON.stringify(cartProducts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
}

type CartBody = {
  productId: string;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId =  params.id;
  const body: CartBody = await request.json();
  const productId = body.productId;


  const { db } = await connectToDatabase();
  const updatedCart = await db.collection('carts').findOneAndUpdate(
    { userId },
    { $addToSet: { cartIds: productId } },
    { upsert: true, returnDocument: 'after' }
  );

  const cartProducts = await db
    .collection('products')
    .find({ id: { $in: updatedCart?.cartIds || [] } }).toArray();

  return new Response(JSON.stringify(cartProducts), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId =  params.id;
  const body: CartBody = await request.json();
  const productId = body.productId;

  const { db } = await connectToDatabase();
  const updatedCart = await db.collection('carts').findOneAndUpdate(
    { userId },
    { $pull: { cartIds: productId } as UpdateFilter<Document> },
    { returnDocument: 'after' }
  );

  const cartProducts = await db
    .collection('products')
    .find({ id: { $in: updatedCart?.cartIds || [] } }).toArray();

  return new Response(JSON.stringify(cartProducts), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}