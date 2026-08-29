import { checkBotId } from "botid/server";
import { type NextRequest, NextResponse } from "next/server";
import { handler } from "@/auth/auth-server";
import { isTurnstileEnabled } from "@/lib/turnstile/config";
import {
  authPathRequiresTurnstile,
  verifyTurnstileToken,
} from "@/lib/turnstile/verify";

async function guardAuthPost(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (request.method !== "POST") return null;

  const botCheck = await checkBotId({
    developmentOptions: {
      bypass: "GOOD-BOT",
    },
  });
  if (botCheck.isBot) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const pathname = request.nextUrl.pathname;
  if (!authPathRequiresTurnstile(pathname)) return null;
  if (!isTurnstileEnabled() || !process.env.TURNSTILE_SECRET_KEY) return null;

  const token = request.headers.get("x-cf-turnstile-token");
  if (!token) {
    return NextResponse.json(
      { error: "Verification required" },
      { status: 400 },
    );
  }

  const remoteIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const valid = await verifyTurnstileToken(token, remoteIp);
  if (!valid) {
    return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  return handler.GET(request);
}

export async function POST(request: NextRequest) {
  const blocked = await guardAuthPost(request);
  if (blocked) return blocked;
  return handler.POST(request);
}
