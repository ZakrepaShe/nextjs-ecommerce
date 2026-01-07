import { NextRequest } from "next/server";
import { connectToDatabase } from "../../db";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const productId =  params.id;

  const { db } = await connectToDatabase();
  const product = await db.collection('products').findOne({ id: productId });

  if (!product) {
    return new Response(JSON.stringify({ error: 'Product not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(product), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}