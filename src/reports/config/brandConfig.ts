/**
 * Central branding configuration.
 * Change company name, logo, contact, and report text from this single file.
 * All report templates and the sidebar consume this config.
 */

export const brandConfig = {
  company: {
    nameAr: 'الشمس الذكية',
    nameEn: 'Smart Solar Systems',
    sloganAr: 'للأنظمة الهندسية والطاقة المتجددة',
    sloganEn: 'Engineering Systems & Renewable Energy',
    sidebarSubtitleAr: 'منظومات الطاقة الشمسية',
  },

  contact: {
    addressAr: 'بغداد، العراق',
    addressEn: 'Baghdad, Iraq',
    email: 'info@smartsolar.iq',
    phone: '',
    website: '',
  },

  logo: {
    /** 'icon' uses the Sun icon from lucide-react; 'image' uses logoUrl */
    type: 'icon' as 'icon' | 'image',
    /** URL or path for logo image (used when type is 'image') */
    logoUrl: '',
    /** Icon background color class */
    iconBgClass: 'bg-amber-500',
    /** Icon text color class */
    iconTextClass: 'text-slate-900',
  },

  report: {
    /** Copyright line in report footer */
    copyright: `Smart Solar Systems © ${new Date().getFullYear()}`,
    /** Default quote validity in days */
    quoteValidityDays: 7,
    /** Default payment terms (Arabic) */
    paymentTermsAr: '50% مقدم، 30% توريد، 20% بعد التشغيل المبدئي',
    /** Generic disclaimer lines (Arabic) */
    disclaimersAr: [
      'الأسعار قابلة للتغيير وتعتمد على سعر الصرف وتوفر المواد وقت التجهيز.',
      'العرض صالح لمدة 7 أيام من تاريخ الإصدار المنصوص أعلاه.',
      'آلية الدفع: 50% مقدم، 30% توريد، 20% بعد التشغيل المبدئي.',
    ],
    /** Footer text shown below the report body */
    footerNoteAr: '',
  },

  /** Current app version shown in sidebar footer */
  version: 'v2.0',
} as const;

export type BrandConfig = typeof brandConfig;
