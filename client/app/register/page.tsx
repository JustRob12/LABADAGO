import React from "react";
import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Register | LabadaGo - Fast, Clean & Easy Laundry",
  description: "Create your LabadaGo customer account to experience fast, professional laundry services.",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Join LabadaGo"
      subtitle="Register your customer account and start fresh today"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
