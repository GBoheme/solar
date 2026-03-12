# دليل تركيب التحديثات - الشمس الذكية v2.0

## الملفات المُحدَّثة والجديدة

| الملف | الحالة | الوصف |
|-------|--------|--------|
| `server.ts` | 🔄 استبدال | كل مسارات API مع CRUD كاملة |
| `src/App.tsx` | 🔄 استبدال | مسارات جديدة للصفحات |
| `src/components/Layout.tsx` | 🔄 استبدال | قائمة تنقل محسّنة |
| `src/pages/AdminDashboardPage.tsx` | ✨ جديد | لوحة تحكم مع إحصائيات |
| `src/pages/AdminCatalog.tsx` | 🔄 استبدال | إدارة كاملة للكاتالوج |
| `src/pages/AdminSettings.tsx` | ✨ جديد | إعدادات متقدمة |

## خطوات التركيب

```bash
# 1. انسخ كل الملفات إلى مجلد مشروعك

# 2. ثبّت المكتبات إن لم تكن موجودة
npm install

# 3. شغّل التطبيق
npm run dev
```

## البنية الجديدة للصفحات

```
/                  → قائمة المشاريع (Dashboard)
/project/new       → معالج المشروع الجديد
/admin             → 📊 لوحة التحكم (جديدة)
/admin/catalog     → 📦 إدارة الكاتالوج (محدّثة)
/admin/settings    → ⚙️ الإعدادات المتقدمة (جديدة)
```

## مسارات API الجديدة

### المكوّنات (بطاريات، ألواح، انفيرترات، شواحن)
- `GET    /api/admin/components?category=battery`
- `POST   /api/admin/components`
- `PUT    /api/admin/components/:id`
- `DELETE /api/admin/components/:id`

### الأجهزة
- `POST   /api/admin/appliances`
- `PUT    /api/admin/appliances/:id`
- `DELETE /api/admin/appliances/:id`

### المناطق
- `POST   /api/admin/regions`
- `PUT    /api/admin/regions/:id`
- `DELETE /api/admin/regions/:id`

### الإعدادات والإحصائيات
- `GET    /api/admin/settings`
- `PUT    /api/admin/settings`
- `GET    /api/admin/stats`
