"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInUser } from "@/lib/supabase/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export const LoginForm: React.FC = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.email || !formData.password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signInUser({
        email: formData.email,
        password: formData.password,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Invalid login credentials.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Login successful! Redirecting to dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } catch {
      setErrorMessage("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Email Field */}
      <Input
        id="login-email"
        name="email"
        type="email"
        label="Email Address"
        placeholder="your.email@gmail.com"
        value={formData.email}
        onChange={handleChange}
        leftIcon={<Mail size={16} />}
        required
        autoComplete="email"
      />

      {/* Password Field */}
      <Input
        id="login-password"
        name="password"
        type={showPassword ? "text" : "password"}
        label="Password"
        placeholder="••••••••"
        value={formData.password}
        onChange={handleChange}
        leftIcon={<Lock size={16} />}
        rightAction={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        required
        autoComplete="current-password"
      />

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isLoading}
          rightIcon={<ArrowRight size={18} />}
        >
          Sign In to LabadaGo
        </Button>
      </div>

      {/* Register Prompt */}
      <div className="pt-4 text-center border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/register"
            className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </form>
  );
};
