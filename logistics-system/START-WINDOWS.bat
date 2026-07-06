@echo off
REM ===== تشغيل نظام تدقيق وإدارة معاملات النقل اللوجستي على Windows =====
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ============================================================
echo   نظام تدقيق وإدارة معاملات النقل اللوجستي
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [خطأ] Node.js غير مثبت. حمّله من https://nodejs.org ثم أعد المحاولة.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/3] تثبيت الحزم... قد يستغرق بضع دقائق
  call npm install
  if errorlevel 1 ( echo فشل التثبيت & pause & exit /b 1 )
)

echo [2/3] تهيئة قاعدة البيانات والبيانات التجريبية...
call npm run setup
if errorlevel 1 (
  echo.
  echo [خطأ] فشلت تهيئة قاعدة البيانات. تأكد من الاتصال بالإنترنت عند أول تشغيل
  echo        ^(لتنزيل محرك Prisma^) ثم أعد المحاولة.
  pause
  exit /b 1
)

echo [3/3] تشغيل التطبيق على http://localhost:3100
echo.
echo   افتح المتصفح على:  http://localhost:3100
echo   الدخول: admin@example.com  /  كلمة المرور: 123456
echo.
echo   (اترك هذه النافذة مفتوحة. لإيقاف التطبيق اضغط Ctrl+C)
echo.
call npm run dev
pause
