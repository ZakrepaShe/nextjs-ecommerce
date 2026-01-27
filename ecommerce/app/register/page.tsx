import AuthForm from "../components/AuthForm";
import { register } from "../actions/user-actions";

export default function RegisterPage() {
  return (
    <div className="container mx-auto p-8 flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Register</h1>
      <AuthForm type="register" action={register} />
    </div>
  );
}
