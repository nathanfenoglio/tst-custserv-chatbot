"use client";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// page for users to reset their password
// they will receive an email with a link to reset their password
// will need to be able to access email to click link and change password
const ResetPassword = () => {
  const { resetPassword } = useAuth(); // resetPassword function defined in context/AuthContext which uses firebase sendPasswordResetEmail function
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(email);
      setMessage("Password reset link sent. Check your email.");
    } catch (err) {
      setMessage("Failed to send password reset email.");
      console.error(err);
    }
  };

  // redirect to login page
  const handleBack = () => {
    window.location.href = "/Login"; 
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <h1 className="text-[#00FFFF] text-3xl mb-4">Reset Password</h1>
      {message && <p className="text-green-500">{message}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* email for user to verify user to have reset password email sent to */}
        <input
          className="p-3 mb-4 rounded-lg bg-gray-800 text-white"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {/* send reset link button */}
        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg">
          Send Reset Link
        </button>
      </form>
      
      {/* button to go back to login page */}
      <button className="bg-green-500 text-white px-4 py-2 rounded-lg mt-4" onClick={handleBack}>
        Login
      </button>
    </div>
  );
};

export default ResetPassword;
