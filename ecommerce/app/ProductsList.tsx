"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "./product-data";
import { useState } from "react";
import { addToCart, removeFromCart } from "./actions/cart-actions";
import toast from "react-hot-toast";

export default function ProductsList({
  products,
  initialCartProducts = [],
}: {
  products: Product[];
  initialCartProducts?: Product[];
}) {
  const [cartProducts, setCartProducts] = useState(initialCartProducts);

  const handleAddToCart = async (productId: string) => {
    try {
      const updatedCartProducts = await addToCart("1", productId);
      setCartProducts(updatedCartProducts);
      const product = products.find((p) => p.id === productId);
      toast.success(`${product?.name || "Product"} added to cart!`);
    } catch (error) {
      toast.error("Failed to add product to cart");
    }
  };

  const handleRemoveFromCart = async (productId: string) => {
    try {
      const updatedCartProducts = await removeFromCart("1", productId);
      setCartProducts(updatedCartProducts);
      const product = products.find((p) => p.id === productId);
      toast.success(`${product?.name || "Product"} removed from cart`);
    } catch (error) {
      toast.error("Failed to remove product from cart");
    }
  };
  function productIsInCart(productId: string) {
    return cartProducts.some((product) => product.id === productId);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/products/${product.id}`}
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition duration-300"
        >
          <div className="flex justify-center mb-4 h-48 relative">
            {" "}
            {/* Added height and relative positioning */}
            <Image
              src={"/" + product.imageUrl}
              alt="Product image"
              fill // Fill the container
              className="object-cover rounded-md" // Cover the container, maintaining aspect ratio
            />
          </div>
          <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
          <p className="text-gray-600">${product.price}</p>
          {productIsInCart(product.id) ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                handleRemoveFromCart(product.id);
              }}
              className="bg-red-500 text-white px-4 py-2 rounded-md"
            >
              Remove from Cart
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                handleAddToCart(product.id);
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Add to Cart
            </button>
          )}
        </Link>
      ))}
    </div>
  );
}
