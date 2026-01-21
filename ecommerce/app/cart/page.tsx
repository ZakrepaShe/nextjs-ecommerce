import ShoppingCartList from "./ShoppingCartList";
import { getCartProducts } from "../actions/cart-actions";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cartProducts = await getCartProducts("1");

  return <ShoppingCartList initialCartProducts={cartProducts} />;
}
