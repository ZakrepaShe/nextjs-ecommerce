import { redirect } from "next/navigation";
import AuthForm, { AuthFormType } from "../components/AuthForm";
import { register } from "../actions/user-actions";

export default function RegisterPage() {
  const handleRegister = async (
    type: AuthFormType,
    name: string,
    password: string
  ) => {
    const result = await register(name, password);
    if (result.success) {
      redirect("/arc-raiders/blueprints");
    }
    return result;
  };
  return (
    <div className="container mx-auto p-8 flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Register</h1>
      <AuthForm type="register" onSubmit={handleRegister} />
    </div>
  );
}
