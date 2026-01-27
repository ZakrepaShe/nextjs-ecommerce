import AuthForm from "../components/AuthForm";
import { login } from "../actions/user-actions";

export default function LoginPage() {
  return (
    <div className="container mx-auto p-8 flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Login</h1>
      <AuthForm type="login" action={login} />
    </div>
  );
}
