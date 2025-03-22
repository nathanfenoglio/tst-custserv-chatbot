"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, User } from "firebase/auth";

// interface for auth context specifying shape of the context's values
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// create auth context to be able to share auth state and functions between components
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// application is wrapped with AuthProvider in layout.tsx
// so all child components of application have access to auth context and will be affected by auth state
// avoiding the need to pass props from component to component
// all components of application can import useAuth() and will have access to the firebase functions login, logout, resetPassword, and user state
// for instance: used to know the user in Home/page.tsx to control if page is displayed or to route user to login screen 
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // subscribe to firebase auth state changes and update the user state
    const unsubscribe = onAuthStateChanged(auth, (user) => setUser(user));
    return () => unsubscribe(); // unsubscribe when component unmounts
  }, []);

  // firebase auth functions
  const login = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // register is not used because do not want to allow users to register
  // instead manually set up users in firebase
  // they can reset their password to something private by selecting to reset password and following email link
  // COULD ADD AN ADMIN PAGE TO CREATE NEW USERS IN THE FUTURE IF YOU WANT...
  const register = async (email: string, password: string): Promise<void> => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth is a react hook that provides access to the auth context, must be used inside of an AuthProvider which you have defined above
export const useAuth = () => {
  const context = useContext(AuthContext); 
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
