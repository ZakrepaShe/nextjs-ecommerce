import { redirect } from "next/navigation";
import AuthForm, { AuthFormType } from "../components/AuthForm";
import { login } from "../actions/user-actions";

export default function LoginPage() {
  const handleLogin = async (
    type: AuthFormType,
    name: string,
    password: string
  ) => {
    const result = await login(name, password);
    if (result.success) {
      redirect("/arc-raiders/blueprints");
    }
  };
  return (
    <div className="container mx-auto p-8 flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Login</h1>
      <AuthForm type="login" onSubmit={handleLogin} />
    </div>
  );
}
