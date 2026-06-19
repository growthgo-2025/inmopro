/**
 * Admin authentication — cookie-based signed session for a single admin.
 *
 * Flow:
 *   1. POST /api/admin/login { password } → verifies against ADMIN_PASSWORD env
 *   2. On success, sets an httpOnly cookie `admin_session` containing
 *      `${exp}.${hmacSha256(secret, exp)}` (base64url). Expires in 7 days.
 *   3. `requireAdmin()` / `isAdminAuthenticated()` verify the cookie signature
 *      and expiry on every protected API route.
 *
 * Notes:
 *   - Cookie is httpOnly + secure (prod) + sameSite=strict → not readable by JS,
 *     not sent on cross-site requests.
 *   - HMAC key derived from ADMIN_SESSION_SECRET (or ADMIN_PASSWORD fallback)
 *     via SHA-256 so the raw password is never used as a signing key.
 *   - Single admin model: no user DB needed.
 */
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "admin_session";
const SESSION_TTL_DAYS = 7;

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_SESSION_SECRET o ADMIN_PASSWORD no configurado");
  return s;
}

/** SHA-256 hex of the secret — used as the HMAC key. */
function signingKey(): string {
  return createHmac("sha256", "innovar-key-derivation").update(getSecret()).digest("hex");
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function sign(exp: number): string {
  const payload = String(exp);
  const sig = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/** Verify a token: returns true if signature matches AND not expired. */
export function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  const expected = createHmac("sha256", signingKey()).update(expStr).digest("base64url");
  // timing-safe comparison
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Issue a fresh session token (7-day expiry). */
function makeToken(): string {
  const exp = Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  return sign(exp);
}

/** Set the admin cookie on the response. */
export function setAdminCookie(res: Response): void {
  const token = makeToken();
  const isProd = process.env.NODE_ENV === "production";
  const cookie = [
    `${ADMIN_COOKIE}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_TTL_DAYS * 24 * 60 * 60}`,
    "HttpOnly",
    "SameSite=Strict",
    isProd ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  res.headers.set("Set-Cookie", cookie);
}

/** Clear the admin cookie. */
export function clearAdminCookie(res: Response): void {
  const cookie = [
    `${ADMIN_COOKIE}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Strict",
  ].join("; ");
  res.headers.set("Set-Cookie", cookie);
}

/** Server-side: is the current request authenticated as admin? */
export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return verifyToken(token);
}

/**
 * Guard for protected API routes. Returns null if authenticated, otherwise
 * a 401 NextResponse that the handler should return immediately.
 *
 * Usage:
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 */
export async function requireAdmin(): Promise<Response | null> {
  const ok = await isAdminAuthenticated();
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: "No autorizado", code: "UNAUTHORIZED" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

/** Verify a plaintext password against the env-configured admin password. */
export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
