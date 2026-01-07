import ProductsList from "../ProductsList";
import { getApiUrl } from "../lib/api-url";

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const apiUrl = getApiUrl();
  const productsResponse = await fetch(`${apiUrl}/api/products`);
  const products = await productsResponse.json();

  const cartProductsResponse = await fetch(`${apiUrl}/api/users/1/cart`, {
    cache: 'no-cache',
  });
  const cartProducts = await cartProductsResponse.json();
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Products</h1>
      <ProductsList products={products} initialCartProducts={cartProducts} />
    </div>
  );
}