import React, { useEffect, useRef, useState } from 'react';
import { useConfigStore } from '../../store/configStore';
import { MapPin, X, Square, CheckCircle2 } from 'lucide-react';

interface MapAreaEstimatorProps {
    onAreaCalculated: (areaSqm: number) => void;
    onClose: () => void;
}

declare global {
    interface Window {
        google: any;
        initGoogleMaps: () => void;
    }
}

export default function MapAreaEstimator({ onAreaCalculated, onClose }: MapAreaEstimatorProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
    const [area, setArea] = useState<number | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const mapInstance = useRef<any>(null);
    const drawingManager = useRef<any>(null);
    const currentPolygon = useRef<any>(null);

    // This relies on having the API key stored in Global Settings or Env
    // Ideally, you'd fetch this from the backend if it's dynamic
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    useEffect(() => {
        if (window.google?.maps) {
            setGoogleMapsLoaded(true);
            return;
        }

        if (!apiKey) {
            console.warn("No VITE_GOOGLE_MAPS_API_KEY found.");
            return;
        }

        window.initGoogleMaps = () => {
            setGoogleMapsLoaded(true);
        };

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry,places&callback=initGoogleMaps`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        return () => {
            // document.head.removeChild(script);
            delete window.initGoogleMaps;
        };
    }, [apiKey]);

    useEffect(() => {
        if (googleMapsLoaded && mapRef.current && !mapInstance.current) {
            // Default center (Baghdad)
            const baghdad = { lat: 33.3128, lng: 44.3615 };

            mapInstance.current = new window.google.maps.Map(mapRef.current, {
                center: baghdad,
                zoom: 16,
                mapTypeId: 'satellite',
                tilt: 0,
            });

            // Try to get user's location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        mapInstance.current.setCenter(pos);
                        mapInstance.current.setZoom(19); // High zoom for rooftops
                    },
                    () => { } // Silently fail and use default (Baghdad)
                );
            }

            drawingManager.current = new window.google.maps.drawing.DrawingManager({
                drawingMode: window.google.maps.drawing.OverlayType.POLYGON,
                drawingControl: false, // We control this via custom UI buttons
                polygonOptions: {
                    fillColor: '#FFC107',
                    fillOpacity: 0.4,
                    strokeWeight: 2,
                    clickable: false,
                    editable: true,
                    zIndex: 1,
                },
            });

            drawingManager.current.setMap(mapInstance.current);

            window.google.maps.event.addListener(drawingManager.current, 'polygoncomplete', (polygon: any) => {
                if (currentPolygon.current) {
                    currentPolygon.current.setMap(null); // Clear previous if any
                }
                currentPolygon.current = polygon;

                // Disable drawing mode after completing one polygon
                drawingManager.current.setDrawingMode(null);
                setIsDrawing(false);

                // Calculate Area
                const path = polygon.getPath();
                const sqMeters = window.google.maps.geometry.spherical.computeArea(path);
                setArea(Math.round(sqMeters));

                // Listen for edits to recalculate
                ['insert_at', 'remove_at', 'set_at'].forEach((eventName) => {
                    window.google.maps.event.addListener(path, eventName, () => {
                        const newAreaSqMeters = window.google.maps.geometry.spherical.computeArea(path);
                        setArea(Math.round(newAreaSqMeters));
                    });
                });
            });
        }
    }, [googleMapsLoaded]);

    const toggleDrawingMode = () => {
        if (isDrawing) {
            drawingManager.current?.setDrawingMode(null);
            setIsDrawing(false);
        } else {
            if (currentPolygon.current) {
                currentPolygon.current.setMap(null);
                setArea(null);
            }
            drawingManager.current?.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
            setIsDrawing(true);
        }
    };

    const handleConfirm = () => {
        if (area) {
            onAreaCalculated(area);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100] font-cairo" dir="rtl">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary-50 p-2 rounded-lg">
                            <MapPin className="w-5 h-5 text-primary-600" />
                        </div>
                        <h2 className="font-bold text-lg text-gray-800">تحديد وحساب مساحة السطح</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Map Container */}
                <div className="relative flex-1 bg-gray-100 min-h-[400px]">
                    {!apiKey ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                            <MapPin className="w-12 h-12 mb-4 text-gray-300" />
                            <p>مفتاح Google Maps API غير متوفر.</p>
                            <p className="text-sm mt-2">يرجى إضافة <code>VITE_GOOGLE_MAPS_API_KEY</code> في ملف البيئة الخاص بك أو في إعدادات التطبيق.</p>
                        </div>
                    ) : !googleMapsLoaded ? (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                            جاري تحميل الخرائط...
                        </div>
                    ) : (
                        <div ref={mapRef} className="absolute inset-0" />
                    )}

                    {/* Floating UI Controls */}
                    {googleMapsLoaded && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <button
                                onClick={toggleDrawingMode}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-md transition-all ${isDrawing
                                        ? 'bg-red-50 text-red-600 border border-red-200'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <Square className="w-4 h-4" />
                                {isDrawing ? 'إلغاء الرسم' : 'ارسم حدود السطح'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="text-gray-600">
                        المساحة المحددة:{' '}
                        <span className={`font-bold text-lg ${area ? 'text-primary-600' : 'text-gray-400'}`}>
                            {area ? `${area} م²` : '---'}
                        </span>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={!area}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${area
                                ? 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        اعتماد وحساب للذكاء الاصطناعي
                    </button>
                </div>
            </div>
        </div>
    );
}
