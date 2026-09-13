import { NextResponse } from "next/server";
import {
  hashToken,
  newSessionToken,
  sessionExpiry,
  verifyPassword,
} from "@/lib/auth";
import { database } from "@/lib/database";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() || "";
  const user = await database().query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email],
  );
  const record = user.rows[0];
  if (
    !record ||
    !body.password ||
    !(await verifyPassword(body.password, record.password_hash))
  )
    return NextResponse.json({ error: "邮箱或密码不正确。" }, { status: 401 });
  const token = newSessionToken();
  const expiresAt = sessionExpiry();
  await database().query("DELETE FROM sessions WHERE expires_at <= now()");
  await database().query(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3)",
    [record.id, hashToken(token), expiresAt],
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set("note_guard_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return response;
}
