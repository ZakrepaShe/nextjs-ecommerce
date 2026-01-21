"use client";

import { useState } from "react";
import Link from "next/link";
import { products, type Product } from "../product-data";
import { removeFromCart } from "../actions/cart-actions";
import toast from "react-hot-toast";

export default function CartPage({
  initialCartProducts,
}: {
  initialCartProducts: Product[];
}) {
  const [cartProducts, setCartProducts] = useState(initialCartProducts);

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

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

      <ul className="space-y-4">
        {" "}
        {/* List for cart items */}
        {cartProducts.map((product) => (
          <li
            key={product.id}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition duration-300"
          >
            <Link href={`/products/${product.id}`}>
              <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
              <p className="text-gray-600">${product.price}</p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleRemoveFromCart(product.id);
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-md"
              >
                Remove from Cart
              </button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
