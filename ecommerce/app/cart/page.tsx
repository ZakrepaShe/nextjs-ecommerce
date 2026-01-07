
import ShoppingCartList from './ShoppingCartList';
import { getApiUrl } from '../lib/api-url';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const response = await fetch(`${getApiUrl()}/api/users/1/cart`, {
    cache: 'no-cache',
  });
  const cartProducts = await response.json();


  return (
    <ShoppingCartList initialCartProducts={cartProducts} />
  );
}