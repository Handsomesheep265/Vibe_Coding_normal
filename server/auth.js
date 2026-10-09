/**
 * 认证：scrypt 口令散列 + HMAC 签名令牌。
 * 令牌格式 base64url(payload).base64url(hmacSha256(payload))，无第三方依赖。
 */
"use strict";

const crypto = require("crypto");

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 小时
const SECRET = process.env.MALL_TOKEN_SECRET || "mall-exam-dev-only-secret-change-me";

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return body + "." + sig;
}

function issueToken(user) {
  const now = Date.now();
  return sign({ sub: user.id, role: user.role, name: user.name, iat: now, exp: now + TOKEN_TTL_MS });
}

function verifyToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}

/** Express 中间件：解析 Authorization: Bearer <token>，把 currentUser 挂到 req */
function attachUser(findUserById) {
  return function auth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const payload = verifyToken(token);
    if (payload) {
      const user = findUserById(payload.sub);
      if (user) {
        req.currentUser = { id: user.id, account: user.account, name: user.name, role: user.role };
      }
    }
    next();
  };
}

/** 要求登录 */
function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ success: false, message: "未登录或登录已过期" });
  }
  next();
}

/** 要求管理员 */
function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ success: false, message: "未登录或登录已过期" });
  }
  if (req.currentUser.role !== "admin") {
    return res.status(403).json({ success: false, message: "无权限：需要管理员" });
  }
  next();
}

module.exports = { issueToken, verifyToken, attachUser, requireAuth, requireAdmin };
