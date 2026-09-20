"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpUser } from "@/lib/supabase/auth";
import { Gender, RegisterFormData } from "@/types/auth";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  User,
  Calendar,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle,
} from "lucide-react";

export const RegisterForm: React.FC = () => {
  const router = useRouter();

  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: "",
    dateOfBirth: "",
    phoneNumber: "",
    gender: "Male",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const genderOptions: { value: Gender; label: string }[] = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
    { value: "Prefer not to say", label: "Prefer not to say" },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return false;
    }
    if (!formData.dateOfBirth) {
      setErrorMessage("Please select your date of birth.");
      return false;
    }

    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    if (birthDate > today) {
      setErrorMessage("Date of birth cannot be in the future.");
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

    if (formData.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
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

      if (result.needsEmailConfirmation) {
        setSuccessMessage(
          "Registration successful! Please check your email to confirm your account, then sign in."
        );
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setSuccessMessage("Account created successfully! Redirecting to dashboard...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1200);
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errorMessage && <Alert type="error" message={errorMessage} />}
      {successMessage && <Alert type="success" message={successMessage} />}

      {/* Fullname */}
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

      {/* Date of Birth & Gender in responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Input
          id="register-dob"
          name="dateOfBirth"
          type="date"
          label="Date of Birth"
          value={formData.dateOfBirth}
          onChange={handleChange}
          leftIcon={<Calendar size={15} />}
          required
        />

        <Select
          id="register-gender"
          name="gender"
          label="Gender"
          value={formData.gender}
          onChange={handleChange}
          options={genderOptions}
          required
        />
      </div>

      {/* Phone Number */}
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
          placeholder="Min. 6 chars"
          value={formData.password}
          onChange={handleChange}
          leftIcon={<Lock size={15} />}
          rightAction={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
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
              className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
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
