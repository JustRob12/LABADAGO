import React from "react";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login | LabadaGo - Fresh & Easy Laundry",
  description: "Sign in to your LabadaGo account to manage your laundry orders and profile.",
};

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your LabadaGo account to manage your laundry orders"
    >
      <LoginForm />
    </AuthLayout>
  );
}
