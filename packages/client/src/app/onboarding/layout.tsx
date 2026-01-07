'use client';

import DashboardLayout from '../(dashboard)/layout';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

