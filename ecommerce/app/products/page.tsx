import ProductsList from "../ProductsList";
import { getCartProducts } from "../actions/cart-actions";
import { getAllProducts } from "../actions/product-actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getAllProducts();
  const cartProducts = await getCartProducts("1");

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Products</h1>
      <ProductsList products={products} initialCartProducts={cartProducts} />
    </div>
  );
}
