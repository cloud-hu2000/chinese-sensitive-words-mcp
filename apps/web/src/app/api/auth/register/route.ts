import { NextResponse } from "next/server";
import {
  hashPassword,
  hashToken,
  newSessionToken,
  sessionExpiry,
} from "@/lib/auth";
import { database } from "@/lib/database";

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
  const existing = await db.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);
  if (existing.rowCount)
    return NextResponse.json({ error: "该邮箱已经注册。" }, { status: 409 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const user = await client.query<{ id: string }>(
      "INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [
        email,
        body.displayName?.trim().slice(0, 40) || null,
        await hashPassword(body.password),
      ],
    );
    await client.query(
      "INSERT INTO memberships (user_id, plan, status, monthly_quota) VALUES ($1, 'FREE', 'ACTIVE', 3)",
      [user.rows[0].id],
    );
    const token = newSessionToken();
    const expiresAt = sessionExpiry();
    await client.query(
      "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [user.rows[0].id, hashToken(token), expiresAt],
    );
    await client.query("COMMIT");
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
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
