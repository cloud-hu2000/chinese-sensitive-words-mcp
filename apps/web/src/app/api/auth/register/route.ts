import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  hashPassword,
  hashToken,
  newSessionToken,
  sessionExpiry,
} from "@/lib/auth";
import { database, query } from "@/lib/database";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
  };
  const email = body.email?.trim().toLowerCase() || "";
  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    !body.password ||
    body.password.length < 8
  )
    return NextResponse.json(
      { error: "请输入有效邮箱，密码至少 8 位。" },
      { status: 400 },
    );
  const db = database();
  const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length)
    return NextResponse.json({ error: "该邮箱已经注册。" }, { status: 409 });
  const client = await db.getConnection();
  try {
    await client.beginTransaction();
    const userId = randomUUID();
    await client.execute(
      "INSERT INTO users (id, email, display_name, password_hash) VALUES (?, ?, ?, ?)",
      [
        userId,
        email,
        body.displayName?.trim().slice(0, 40) || null,
        await hashPassword(body.password),
      ],
    );
    await client.execute(
      "INSERT INTO memberships (id, user_id, plan, status, monthly_quota) VALUES (?, ?, 'FREE', 'ACTIVE', 3)",
      [randomUUID(), userId],
    );
    const token = newSessionToken();
    const expiresAt = sessionExpiry();
    await client.execute(
      "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
      [randomUUID(), userId, hashToken(token), expiresAt],
    );
    await client.commit();
    const response = NextResponse.json({ ok: true });
    response.cookies.set("note_guard_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });
    return response;
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }
}
