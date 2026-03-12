import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Settings, Database, Plus, Trash2, User, Briefcase, GraduationCap, Loader2, Bot, X, Save, MapPin } from 'lucide-react';
import { useAiChatStore } from '../store/aiChatStore';
import { apiJson } from '../utils/apiFetch';
import MapAreaEstimator from '../modules/smart-assistant/MapAreaEstimator';

export default function AiAssistantPage() {
    const { messages, isLoading, persona, setPersona, sendMessage, clearChat, error } = useAiChatStore();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sources, setSources] = useState<any[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Settings Modal State
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [aiModel, setAiModel] = useState('gemini-2.5-flash');
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Map Integration State
    const [isMapOpen, setIsMapOpen] = useState(false);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Fetch sources
    const fetchSources = async () => {
        try {
            const data = await apiJson<any[]>('/api/ai/knowledge-sources');
            setSources(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await apiJson<any>('/api/ai/settings');
            if (data.api_key) setApiKey(data.api_key);
            if (data.model) setAiModel(data.model);
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenSettings = () => {
        fetchSettings();
        setIsSettingsModalOpen(true);
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            await apiJson('/api/ai/settings', {
                method: 'PUT',
                body: JSON.stringify({ api_key: apiKey, model: aiModel })
            });
            setIsSettingsModalOpen(false);
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save settings.');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage(input);
        setInput('');
    };

    const handleQuickAction = (action: string) => {
        sendMessage(action);
    };

    return (
        <div className="h-[calc(100vh-4rem)] md:h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden" dir="rtl">
            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">المساعد الذكي لمهندس الطاقة</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">RAG + Function Calling Domain Engine</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Persona Switcher */}
                        <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setPersona('engineer')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${persona === 'engineer' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-500 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <Settings className="w-4 h-4" /> مهندس
                            </button>
                            <button
                                onClick={() => setPersona('sales')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${persona === 'sales' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-500 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <Briefcase className="w-4 h-4" /> مبيعات
                            </button>
                            <button
                                onClick={() => setPersona('beginner')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${persona === 'beginner' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-500 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <GraduationCap className="w-4 h-4" /> مبسط
                            </button>
                        </div>

                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 md:hidden bg-slate-100 dark:bg-slate-800 rounded-lg"
                        >
                            <Database className="w-5 h-5" />
                        </button>
                        <button
                            onClick={clearChat}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            مسح المحادثة
                        </button>
                    </div>
                </header>

                {/* Quick Actions (suggested prompts) */}
                {messages.length === 0 && (
                    <div className="shrink-0 p-6 max-w-4xl mx-auto w-full">
                        <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">إجراءات سريعة المبنية على الدوال:</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <button onClick={() => handleQuickAction('احسب لي منظومة شمسية هجينة لحمل مقداره 3 كيلو واط يعمل لمدة 12 ساعة يومياً على نظام 48 فولت.')} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-sm transition-all text-right group">
                                <Settings className="w-5 h-5 text-amber-500 mb-2" />
                                <h3 className="font-medium text-slate-900 dark:text-white mb-1">حساب منظومة كاملة</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">حساب الألواح والبطاريات بناءً على الحمل المخصص</p>
                            </button>
                            <button onClick={() => handleQuickAction('عندي تيار 50 أمبير وكابل نحاس مساحته 16 ملم مربع طوله 20 متر على نظام 48 فولت، كم يكون الهبوط بالفولتية؟')} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-sm transition-all text-right group">
                                <Database className="w-5 h-5 text-amber-500 mb-2" />
                                <h3 className="font-medium text-slate-900 dark:text-white mb-1">حساب فقد الكابلات</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">حساب الهبوط الجهدي (Voltage Drop) والتيار</p>
                            </button>
                            <button onClick={() => setIsMapOpen(true)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-sm transition-all text-right group">
                                <MapPin className="w-5 h-5 text-amber-500 mb-2" />
                                <h3 className="font-medium text-slate-900 dark:text-white mb-1">حساب المساحة عبر الخرائط</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">حساب مساحة السطح لرؤية أقصى عدد ألواح ممكن</p>
                            </button>
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user'
                                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500'
                                    }`}>
                                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                    <div className={`p-4 rounded-2xl whitespace-pre-wrap ${msg.role === 'user'
                                        ? 'bg-amber-500 text-white rounded-tr-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                                        {msg.timestamp.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm p-4 text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                    يقوم المحرك الذكي بمعالجة الطلب...
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl rounded-tl-sm p-4 text-red-700 dark:text-red-400">
                                    <div className="font-semibold text-sm mb-1">تحذير من المحرك الذكي:</div>
                                    <div className="text-sm whitespace-pre-wrap">{error}</div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="shrink-0 p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                    <div className="max-w-4xl mx-auto">
                        <form onSubmit={handleSubmit} className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="اسأل المساعد الذكي، أو اطلب حساب مواصفات، أو قارن الأنظمة..."
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl py-4 pr-4 pl-14 outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-colors"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute left-2 top-2 p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-5 h-5 rtl:-scale-x-100" />
                            </button>
                        </form>
                        <div className="text-center mt-2 text-xs text-slate-500 dark:text-slate-400">
                            يستخدم هذا المساعد Gemini Pro ومدعم بنظام RAG ومكتبة دوال الحسابات الهندسية.
                        </div>
                    </div>
                </div>
            </div>

            {/* Knowledge Base Sidebar */}
            <aside className={`absolute md:static top-0 right-0 h-full z-30 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <Database className="w-5 h-5 text-indigo-500" />
                        قاعدة المعرفة (RAG)
                    </h2>
                    <button className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">المصادر المدمجة</div>

                    {sources.length === 0 ? (
                        <div className="text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500">
                            <Database className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm">لا توجد مصادر مضافة.</p>
                            <p className="text-xs mt-1">أضف ملفات نصية بتنسيق لزيادة دقة الإجابات.</p>
                        </div>
                    ) : (
                        sources.map(src => (
                            <div key={src.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{src.title}</span>
                                    <div className={`w-2 h-2 rounded-full ${src.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <span>{src.source_type}</span>
                                    <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{src.chunks_count} Chunks</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <button onClick={handleOpenSettings} className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <Settings className="w-4 h-4" /> إعدادات سلوك الذكاء
                    </button>
                </div>
            </aside>

            {/* AI Settings Modal */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden relative" dir="rtl">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-amber-500" />
                                إعدادات الذكاء الاصطناعي
                            </h2>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    مفتاح اتصال Gemini (API Key)
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="AIzaSyB..."
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-3 outline-none focus:border-amber-500 transition-colors text-left"
                                    dir="ltr"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    احصل على مفتاحك مجاناً من Google AI Studio
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    النموذج المستخدم (Model)
                                </label>
                                <select
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg py-2 px-3 outline-none focus:border-amber-500 transition-colors"
                                >
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (سريع واقتصادي)</option>
                                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (أكثر ذكاءً)</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end gap-3">
                            <button onClick={() => setIsSettingsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                إلغاء
                            </button>
                            <button onClick={handleSaveSettings} disabled={isSavingSettings} className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2">
                                {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                حفظ الإعدادات
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Map Area Estimator Modal */}
            {isMapOpen && (
                <MapAreaEstimator
                    onClose={() => setIsMapOpen(false)}
                    onAreaCalculated={(area) => {
                        setInput(`مساحة السطح المتوفرة لدي هي ${area} متر مربع. كم لوح شمسي يمكن تركيبه وما هي القدرة القصوى للمنظومة التي تناسب هذا السطح؟`);
                    }}
                />
            )}
        </div>
    );
}
