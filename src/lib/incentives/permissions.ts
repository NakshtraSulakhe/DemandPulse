import { NextRequest } from "next/server";
import { verifyAdminSession } from "@/lib/auth";

export interface IncentiveCaller {
  id: string | number;
  name: string;
  role: "admin" | "manager" | "director" | "finance" | "viewer";
}

/**
 * Validates whether the incoming request has authority to perform incentive actions
 */
export async function requireIncentiveAuth(
  req: NextRequest,
  requiredRole: "any" | "manager" | "finance" | "admin" = "any"
): Promise<{ authorized: boolean; caller?: IncentiveCaller; error?: string }> {
  const sessionResult = await verifyAdminSession(req);

  if (!sessionResult.authorized) {
    return {
      authorized: false,
      error: sessionResult.error || "Authentication required to access incentive services.",
    };
  }

  // Admin session is authorized for all administrative and manager flows
  return {
    authorized: true,
    caller: {
      id: sessionResult.user?.id || 1,
      name: sessionResult.user?.name || "Operations Admin",
      role: "admin",
    },
  };
}
