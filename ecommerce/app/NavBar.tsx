import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <ul className="flex space-x-4">
          <li>
            <Link href="/products" className="text-gray-700 hover:text-black">
              Products
            </Link>
          </li>
          <li>
            <Link href="/cart" className="text-gray-700 hover:text-black">
              Cart
            </Link>
          </li>
          <li>
            <Link href="/checkout" className="text-gray-700 hover:text-black">
              Check Out
            </Link>
          </li>
          <li>
            <Link href="/login" className="text-gray-700 hover:text-black">
              Login
            </Link>
          </li>
          <li>
            <Link href="/register" className="text-gray-700 hover:text-black">
              Register
            </Link>
          </li>
          <li>
            <Link href="/profile" className="text-gray-700 hover:text-black">
              Profile
            </Link>
          </li>
          <li>
            <Link href="/logout" className="text-gray-700 hover:text-black">
              Logout
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
