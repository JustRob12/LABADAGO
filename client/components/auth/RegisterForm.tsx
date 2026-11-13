"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpUser } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import { RegisterFormData } from "@/types/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle,
  Check,
} from "lucide-react";

// Strict Password Regex: Minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-~`[\]{}|:;"'<>,./\\]).{8,}$/;

export const RegisterForm: React.FC = () => {
  const router = useRouter();

  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: "",
    dateOfBirth: "2000-01-01", // Default to satisfy database not-null constraint
    phoneNumber: "",
    gender: "Prefer not to say", // Default to satisfy database check constraint
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  // Password requirement checks for visual feedback
  const hasMinLength = formData.password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(formData.password);
  const hasLowerCase = /[a-z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);
  const hasSpecialChar = /[@$!%*?&#^()_+=\-~`[\]{}|:;"'<>,./\\]/.test(formData.password);

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return false;
    }

    if (!formData.phoneNumber.trim()) {
      setErrorMessage("Please enter your phone number.");
      return false;
    }

    if (!formData.email.trim() || !formData.email.includes("@")) {
      setErrorMessage("Please provide a valid email address.");
      return false;
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      setErrorMessage(
        "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
      );
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Role is automatically assigned to Costumer (2) inside signUpUser
      const result = await signUpUser(formData);

      if (!result.success) {
        setErrorMessage(result.error || "Failed to create account. Please check your details.");
        setIsLoading(false);
        return;
      }

      // Explicitly sign out to guarantee the user is NOT automatically logged in
      await supabase.auth.signOut();

      setSuccessMessage("Account created successfully! Please sign in with your email and password.");
      setTimeout(() => {
        router.push("/login?registered=true");
      }, 1500);
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Fullname & Phone Number in responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Input
          id="register-fullname"
          name="fullName"
          type="text"
          label="Full Name"
          placeholder="Enter your full name"
          value={formData.fullName}
          onChange={handleChange}
          leftIcon={<User size={15} />}
          required
        />

        <Input
          id="register-phone"
          name="phoneNumber"
          type="tel"
          label="Phone Number"
          placeholder="09XXXXXXXXX"
          value={formData.phoneNumber}
          onChange={handleChange}
          leftIcon={<Phone size={15} />}
          required
        />
      </div>

      {/* Email Address */}
      <Input
        id="register-email"
        name="email"
        type="email"
        label="Email Address"
        placeholder="your.email@gmail.com"
        value={formData.email}
        onChange={handleChange}
        leftIcon={<Mail size={15} />}
        required
        autoComplete="email"
      />

      {/* Password and Confirm Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Input
          id="register-password"
          name="password"
          type={showPassword ? "text" : "password"}
          label="Password"
          placeholder="Min. 8 chars (A-z, 0-9, @#$)"
          value={formData.password}
          onChange={handleChange}
          leftIcon={<Lock size={15} />}
          rightAction={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
          required
          autoComplete="new-password"
        />

        <Input
          id="register-confirm-password"
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          label="Confirm Password"
          placeholder="Repeat password"
          value={formData.confirmPassword}
          onChange={handleChange}
          leftIcon={<Lock size={15} />}
          rightAction={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
              tabIndex={-1}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
          required
          autoComplete="new-password"
        />
      </div>

      {/* Strict Password Requirement Helpers */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 text-slate-600">
        <p className="font-bold text-slate-700">Password Requirements:</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
          <span className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasMinLength ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
              {hasMinLength ? "✓" : "•"}
            </span>
            At least 8 characters
          </span>
          <span className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasUpperCase ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
              {hasUpperCase ? "✓" : "•"}
            </span>
            Uppercase letter (A-Z)
          </span>
          <span className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasLowerCase ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
              {hasLowerCase ? "✓" : "•"}
            </span>
            Lowercase letter (a-z)
          </span>
          <span className={`flex items-center gap-1.5 ${hasNumber && hasSpecialChar ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasNumber && hasSpecialChar ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
              {hasNumber && hasSpecialChar ? "✓" : "•"}
            </span>
            Number &amp; Symbol (@$!%*?#)
          </span>
        </div>
      </div>

      {/* Notice that Role is automatically Customer (Clean shadcn style) */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600">
        <UserCheck size={15} className="text-emerald-600 shrink-0" />
        <span>
          Registering creates your default <strong>Costumer</strong> account.
        </span>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="submit"
          variant="success"
          size="lg"
          className="w-full"
          isLoading={isLoading}
          rightIcon={<CheckCircle size={16} />}
        >
          Create LabadaGo Account
        </Button>
      </div>

      {/* Sign In Prompt */}
      <div className="pt-4 text-center border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            Sign In Here
          </Link>
        </p>
      </div>
    </form>
  );
};
