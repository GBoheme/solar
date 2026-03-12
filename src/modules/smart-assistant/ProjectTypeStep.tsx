import { motion } from 'framer-motion';
import { useProjectStore } from '../../store/projectStore';
import { Home, Building2, Store, Factory } from 'lucide-react';

const types = [
  {
    id: 'small_home',
    title: 'منزل صغير',
    desc: 'منزل عائلي صغير — غرفتين إلى ثلاث غرف، إضاءة وأجهزة أساسية',
    hint: 'مثالي لـ: عائلة صغيرة (2-4 أشخاص)',
    icon: Home,
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'medium_home',
    title: 'منزل متوسط',
    desc: 'منزل عائلي متوسط — 4 غرف أو أكثر، مكيفات وأجهزة متعددة',
    hint: 'مثالي لـ: عائلة متوسطة (4-8 أشخاص)',
    icon: Building2,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'shop',
    title: 'محل تجاري',
    desc: 'محل أو متجر — إضاءة تجارية، ثلاجات عرض، تكييف',
    hint: 'مثالي لـ: سوبرماركت، صيدلية، مطعم',
    icon: Store,
    image: 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'office',
    title: 'مكتب / شركة',
    desc: 'مكتب أو مبنى إداري — أجهزة كمبيوتر، خوادم، تكييف مركزي',
    hint: 'مثالي لـ: شركة، عيادة، مختبر',
    icon: Factory,
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80',
  },
];

export default function ProjectTypeStep() {
  const { setProjectType, setStep, projectType } = useProjectStore();

  const handleSelect = (id: string) => {
    setProjectType(id);
    setTimeout(() => setStep(2), 350);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">ما هو نوع مشروعك؟</h2>
        <p className="text-slate-500 dark:text-slate-400 text-lg">اختر نوع المبنى وسنقترح لك الأجهزة المناسبة تلقائياً</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {types.map((type, index) => {
          const isSelected = projectType === type.id;
          return (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(type.id)}
              className={`group relative overflow-hidden rounded-3xl text-right transition-all duration-300 ${isSelected
                ? 'ring-4 ring-amber-500 ring-offset-4 shadow-xl shadow-amber-500/20'
                : 'hover:shadow-2xl hover:shadow-slate-200 ring-1 ring-slate-200 dark:ring-slate-700'
                }`}
            >
              <div className="h-48 w-full relative">
                <img src={type.image} alt={type.title} className={`w-full h-full object-cover transition-transform duration-700 ${isSelected ? 'scale-105' : 'group-hover:scale-110'}`} referrerPolicy="no-referrer" />
                <div className={`absolute inset-0 bg-gradient-to-t ${isSelected ? 'from-amber-900/95 via-slate-900/70' : 'from-slate-900/95 via-slate-900/50'} to-transparent transition-colors duration-500`} />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-4 mb-2">
                  <div className={`p-3 rounded-2xl backdrop-blur-md transition-all duration-300 ${isSelected ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30' : 'bg-white/20 text-white group-hover:bg-white/30'}`}>
                    <type.icon className="w-6 h-6" />
                  </div>
                  <h3 className={`text-xl font-bold transition-colors ${isSelected ? 'text-amber-400' : 'text-white'}`}>{type.title}</h3>
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-1">{type.desc}</p>
                <span className="text-amber-300/70 text-xs font-medium">{type.hint}</span>
              </div>

              {isSelected && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute top-3 right-3 w-4 h-4 bg-amber-500 rounded-full">
                  <div className="absolute inset-0 w-full h-full bg-amber-400 rounded-full animate-ping opacity-75" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
