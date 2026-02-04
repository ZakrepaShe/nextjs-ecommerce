"use client";

import Link from "next/link";
import { useUser } from "./components/UserProvider";
import { useRouter } from "next/navigation";
import { logout } from "./actions/user-actions";
import toast from "react-hot-toast";

export default function NavBar() {
  const { user, setUser } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <ul className="flex space-x-4">
          {/* <li>
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
          </li> */}
          <li>
            <Link
              href="/arc-raiders/blueprints"
              className="text-gray-700 hover:text-black"
            >
              My Blueprints
            </Link>
          </li>
          <li>
            <Link href="/arc-raiders/users" className="text-gray-700 hover:text-black">
              Friends Blueprints
            </Link>
          </li>
          {user?.isAdmin && (
            <li>
              <Link href="/admin" className="text-gray-700 hover:text-black">
                Admin
              </Link>
            </li>
          )}
        </ul>
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-gray-700">Hello, {user.name}!</span>
              <button
                onClick={handleLogout}
                className="text-gray-700 hover:text-black"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-black">
                Login
              </Link>
              <Link href="/register" className="text-gray-700 hover:text-black">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
