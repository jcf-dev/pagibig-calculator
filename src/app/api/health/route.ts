import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", service: "pagibig-calculator" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
