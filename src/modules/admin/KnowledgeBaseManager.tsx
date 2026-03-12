import React, { useEffect, useState } from 'react';
import { useKnowledgeStore } from '../../store/knowledgeStore';
import { Database, Plus, Trash2, Edit2, Loader2, Save, X } from 'lucide-react';

export default function KnowledgeBaseManager() {
    const { sources, isLoading, error, fetchSources, addSource, deleteSource } = useKnowledgeStore();

    const [isAdding, setIsAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchSources();
    }, [fetchSources]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newContent.trim()) return;

        setIsSubmitting(true);
        try {
            await addSource({ title: newTitle, content: newContent, source_type: 'text' });
            setNewTitle('');
            setNewContent('');
            setIsAdding(false);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold font-cairo text-gray-900 flex items-center gap-2">
                        <Database className="w-6 h-6 text-primary-600" />
                        قاعدة المعرفة (تدريب الذكاء الاصطناعي)
                    </h2>
                    <p className="text-gray-500 font-cairo text-sm mt-1">
                        أضف نصوصاً، شروطاً، ومعلومات ليتعلمها الذكاء الاصطناعي ويجيب العملاء بناءً عليها فوراً.
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-primary font-cairo flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة معلومات جديدة
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl font-cairo text-sm">
                    {error}
                </div>
            )}

            {isAdding && (
                <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold font-cairo text-gray-800">إضافة قاعدة جديدة</h3>
                        <button type="button" onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                            العنوان / الموضوع
                        </label>
                        <input
                            type="text"
                            required
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="مثال: سياسة الضمان للإطارات والبطاريات"
                            className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 font-cairo text-right"
                            dir="rtl"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 font-cairo mb-1">
                            النص والمعلومات التفصيلية (سيتم حفظها بذاكرة النظام)
                        </label>
                        <textarea
                            required
                            rows={5}
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder="اكتب هنا كل التفاصيل التي تريد للذكاء الاصطناعي أن يعرفها عن هذا الموضوع..."
                            className="w-full rounded-xl border-gray-200 focus:border-primary-500 focus:ring-primary-500 font-cairo text-right"
                            dir="rtl"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary font-cairo flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    جاري المعالجة والتلخيص...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    حفظ وتدريب
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {isLoading && !isSubmitting ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sources.length === 0 && !isAdding && (
                        <div className="col-span-full bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                            <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="font-cairo text-gray-500">لا توجد مصادر معرفة حتى الآن.</p>
                            <p className="font-cairo text-xs text-gray-400 mt-1">أضف سياسات للشركة، عروض خاصة، أو معلومات تقنية.</p>
                        </div>
                    )}

                    {sources.map(source => (
                        <div key={source.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                            <button
                                onClick={() => {
                                    if (window.confirm('هل أنت متأكد من حذف هذه القاعدة المعرفية؟ سينساها الذكاء الاصطناعي!')) {
                                        deleteSource(source.id);
                                    }
                                }}
                                className="absolute top-4 left-4 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                title="حذف"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <Database className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold font-cairo text-gray-900">{source.title}</h4>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-xs font-cairo px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100">
                                            مُحلل في {source.chunks_count} مقطع
                                        </span>
                                        <span className="text-xs font-cairo text-gray-500">
                                            {new Date(source.created_at).toLocaleDateString('ar-IQ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
