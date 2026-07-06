#!/usr/bin/env bash
# ===== تشغيل نظام تدقيق وإدارة معاملات النقل اللوجستي على macOS / Linux =====
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  نظام تدقيق وإدارة معاملات النقل اللوجستي"
echo "============================================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[خطأ] Node.js غير مثبت. حمّله من https://nodejs.org ثم أعد المحاولة."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[1/3] تثبيت الحزم... قد يستغرق بضع دقائق"
  npm install
fi

echo "[2/3] تهيئة قاعدة البيانات والبيانات التجريبية..."
npm run setup

echo "[3/3] تشغيل التطبيق على http://localhost:3100"
echo ""
echo "   افتح المتصفح على:  http://localhost:3100"
echo "   الدخول: admin@example.com  /  كلمة المرور: 123456"
echo ""
echo "   (اترك هذه النافذة مفتوحة. لإيقاف التطبيق اضغط Ctrl+C)"
echo ""
npm run dev
