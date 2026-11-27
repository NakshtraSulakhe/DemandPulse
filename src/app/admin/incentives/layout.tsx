import React from "react";
import IncentiveWorkspaceShell from "@/components/incentives/incentive-workspace-shell";

export default function IncentivesLayout({ children }: { children: React.ReactNode }) {
  return <IncentiveWorkspaceShell>{children}</IncentiveWorkspaceShell>;
}
