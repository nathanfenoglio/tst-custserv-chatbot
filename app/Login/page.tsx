"use client";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";

const Login = () => {
  const { login } = useAuth(); // login function defined in context/AuthContext which uses firebase signInWithEmailAndPassword function
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.push("/"); // redirect to home page after successful login
    } catch (err: unknown) { // login unsuccessful
      if (err instanceof FirebaseError) {
        setError(err.message); 
      } else {
        setError("An unexpected error occurred."); 
      }
      console.clear(); // clear console so that error doesn't show up for user on screen
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <h1 className="text-[#00FFFF] text-3xl mb-4">TST Chatbot Login</h1>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col">
        <input
          className="p-3 mb-4 rounded-lg bg-gray-800 text-white"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="p-3 mb-4 rounded-lg bg-gray-800 text-white"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">
          Login
        </button>

        {/* link to reset password page */}
        <p className="text-white mt-4">
          Reset Password?{" "}
          <a href="/ResetPassword" className="text-blue-500">
            <u>Click Here</u>
          </a>
        </p>
        
      </form>
    </div>
  );
};

export default Login;
