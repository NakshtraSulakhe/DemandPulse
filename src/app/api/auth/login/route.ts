import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Default admin credentials for DemandFlow Operations
    // In production, can verify against CRM users table or hashed credential
    if (
      (email === "admin@demandflow.io" && password === "DemandFlow2026!") ||
      (email === "admin" && password === "admin123")
    ) {
      const response = NextResponse.json({
        ok: true,
        user: {
          id: "admin-1",
          name: "Operations Director",
          email: "admin@demandflow.io",
          role: "admin",
        },
      });

      createSessionCookie(response, {
        id: "admin-1",
        name: "Operations Director",
        email: "admin@demandflow.io",
        role: "admin",
      });

      return response;
    }

    return NextResponse.json(
      { ok: false, error: "Invalid email or password" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Authentication processing failed" },
      { status: 500 }
    );
  }
}
