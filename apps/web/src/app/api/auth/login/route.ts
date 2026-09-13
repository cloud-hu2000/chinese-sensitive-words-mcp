import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  hashToken,
  newSessionToken,
  sessionExpiry,
  verifyPassword,
} from "@/lib/auth";
import { database, query } from "@/lib/database";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() || "";
  const user = await query<
    {
      id: string;
      password_hash: string;
    } & import("mysql2/promise").RowDataPacket
  >("SELECT id, password_hash FROM users WHERE email = ?", [email]);
  const record = user[0];
  if (
    !record ||
    !body.password ||
    !(await verifyPassword(body.password, record.password_hash))
  )
    return NextResponse.json({ error: "邮箱或密码不正确。" }, { status: 401 });
  const token = newSessionToken();
  const expiresAt = sessionExpiry();
  await database().execute(
    "DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP()",
  );
  await database().execute(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?,?,?,?)",
    [randomUUID(), record.id, hashToken(token), expiresAt],
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
