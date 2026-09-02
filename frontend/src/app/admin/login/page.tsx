import { Suspense } from "react";

import AdminLoginContent from "./admin-login-content";

export const metadata = {
  title: "Admin Login",
  description: "Sign in to the Velora Enterprise admin dashboard",
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
