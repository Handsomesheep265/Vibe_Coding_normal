/** 统一响应帮助函数 */
"use strict";

function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, message });
}

module.exports = { ok, fail };
