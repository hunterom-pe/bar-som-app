"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, isFirebaseEnabled } from "@/lib/firebase";

interface AuthScreenProps {
  onSuccess: () => void;
  onContinueOffline: () => void;
}

export default function AuthScreen({ onSuccess, onContinueOffline }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const firebaseEnabled = isFirebaseEnabled();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseEnabled || !auth) {
      setError("Account services are currently offline. Please use Offline Mode.");
      return;
    }

    setError(null);

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (activeTab === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      if (activeTab === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      console.error("Auth error:", firebaseError);
      let friendlyMessage = "An error occurred during authentication.";
      if (
        firebaseError.code === "auth/invalid-credential" || 
        firebaseError.code === "auth/wrong-password" || 
        firebaseError.code === "auth/user-not-found"
      ) {
        friendlyMessage = "Incorrect email or password.";
      } else if (firebaseError.code === "auth/email-already-in-use") {
        friendlyMessage = "An account with this email already exists.";
      } else if (firebaseError.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      } else if (firebaseError.message) {
        friendlyMessage = firebaseError.message;
      }
      setError(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-grow items-center justify-center max-w-sm mx-auto px-6 py-12 animate-reveal select-none">
      <div className="w-full text-center mb-8">
        <h2 className="text-3xl font-bold font-serif text-amber-500 mb-2">Welcome to Spec</h2>
        <p className="text-zinc-400 text-sm">
          {activeTab === "login" 
            ? "Log in to sync your sommelier palate and favorite drinks."
            : "Create an account to keep your preferences saved in the cloud."
          }
        </p>
      </div>

      {!firebaseEnabled && (
        <div className="w-full mb-6 p-4 bg-amber-950/20 border border-amber-900/30 rounded-2xl text-amber-500/90 text-xs text-center leading-relaxed">
          ⚠️ <strong>Offline Mode:</strong> Firebase credentials are not configured. Account sync is unavailable, but you can continue offline!
        </div>
      )}

      {error && (
        <div className="w-full mb-4 p-4 bg-rose-950/20 border border-rose-900/30 rounded-2xl text-rose-400 text-xs text-center leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={handleAuth} className="w-full flex flex-col gap-4">
        {/* Tab Headers */}
        {firebaseEnabled && (
          <div className="flex bg-zinc-950 border border-zinc-850 p-1 rounded-xl mb-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setError(null);
              }}
              className={`flex-grow py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "login"
                  ? "bg-zinc-900 text-amber-500 border border-zinc-800 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("signup");
                setError(null);
              }}
              className={`flex-grow py-2.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "signup"
                  ? "bg-zinc-900 text-amber-500 border border-zinc-800 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Email Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 font-sans text-xs font-semibold uppercase tracking-wider pl-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!firebaseEnabled || isLoading}
            placeholder="barman@spec.com"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-sm transition-colors disabled:opacity-50"
            required
          />
        </div>

        {/* Password Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-zinc-400 font-sans text-xs font-semibold uppercase tracking-wider pl-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!firebaseEnabled || isLoading}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-sm transition-colors disabled:opacity-50"
            required
          />
        </div>

        {/* Confirm Password Input (Signup only) */}
        {activeTab === "signup" && firebaseEnabled && (
          <div className="flex flex-col gap-1.5 animate-reveal">
            <label className="text-zinc-400 font-sans text-xs font-semibold uppercase tracking-wider pl-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 text-sm transition-colors disabled:opacity-50"
              required
            />
          </div>
        )}

        {/* Action Button */}
        {firebaseEnabled && (
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-base transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : activeTab === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        )}
      </form>

      {/* Offline Continue Fallback */}
      <div className="w-full mt-6 flex flex-col items-center">
        {firebaseEnabled && (
          <div className="w-full flex items-center justify-center gap-3 my-4">
            <span className="h-px bg-zinc-900 flex-grow" />
            <span className="text-zinc-650 text-xs font-semibold uppercase tracking-wider">or</span>
            <span className="h-px bg-zinc-900 flex-grow" />
          </div>
        )}

        <button
          onClick={onContinueOffline}
          className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-zinc-200 font-semibold rounded-xl text-sm transition-colors"
        >
          {firebaseEnabled ? "Continue Offline (Demo)" : "Continue Offline"}
        </button>
      </div>
    </div>
  );
}
