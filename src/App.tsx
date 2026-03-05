import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, 
  Settings as SettingsIcon, 
  Trash2, 
  Play, 
  Pause, 
  ChevronRight, 
  ChevronLeft, 
  Plus,
  Monitor,
  Clock,
  Shuffle,
  ListOrdered,
  Maximize2,
  X,
  Lock,
  Unlock
} from "lucide-react";

interface Gif {
  id: number;
  name: string;
  data: string;
  sort_order: number;
}

interface Settings {
  interval: string;
  mode: string;
  switch_on_lock: string;
}

export default function App() {
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [settings, setSettings] = useState<Settings>({
    interval: "10000",
    mode: "order",
    switch_on_lock: "false"
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isWallpaperMode, setIsWallpaperMode] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [lastSwitchTime, setLastSwitchTime] = useState(Date.now());

  const fetchGifs = useCallback(async () => {
    const res = await fetch("/api/gifs");
    const data = await res.json();
    setGifs(data);
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setSettings(data);
  }, []);

  useEffect(() => {
    fetchGifs();
    fetchSettings();
  }, [fetchGifs, fetchSettings]);

  const nextGif = useCallback(() => {
    if (gifs.length === 0) return;
    
    setGifs(prevGifs => {
      if (settings.mode === "random") {
        let nextIdx = Math.floor(Math.random() * prevGifs.length);
        if (nextIdx === currentIndex && prevGifs.length > 1) {
          nextIdx = (nextIdx + 1) % prevGifs.length;
        }
        setCurrentIndex(nextIdx);
      } else {
        setCurrentIndex(prev => (prev + 1) % prevGifs.length);
      }
      return prevGifs;
    });
    setLastSwitchTime(Date.now());
  }, [gifs.length, settings.mode, currentIndex]);

  // Interval logic
  useEffect(() => {
    if (gifs.length === 0) return;
    
    const intervalMs = parseInt(settings.interval);
    if (isNaN(intervalMs) || intervalMs <= 0) return;

    const timer = setInterval(() => {
      nextGif();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [gifs.length, settings.interval, nextGif]);

  // Lock/Unlock logic (Visibility Change)
  useEffect(() => {
    if (settings.switch_on_lock !== "true") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        nextGif();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [settings.switch_on_lock, nextGif]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    for (const file of Array.from(files) as File[]) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await fetch("/api/gifs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, data: base64 })
        });
        fetchGifs();
      };
      reader.readAsDataURL(file);
    }
    setIsUploading(false);
  };

  const deleteGif = async (id: number) => {
    await fetch(`/api/gifs/${id}`, { method: "DELETE" });
    fetchGifs();
  };

  const updateSetting = async (key: string, value: string) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value })
    });
    fetchSettings();
  };

  const currentGif = gifs[currentIndex];

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Wallpaper Layer */}
      <div className="wallpaper-container">
        <AnimatePresence mode="wait">
          {currentGif && (
            <motion.img
              key={currentGif.id}
              src={currentGif.data}
              alt={currentGif.name}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="wallpaper-img"
              referrerPolicy="no-referrer"
            />
          )}
        </AnimatePresence>
        
        {/* Overlay to make UI readable if needed */}
        {!isWallpaperMode && (
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        )}
      </div>

      {/* UI Layer */}
      <AnimatePresence>
        {isDashboardOpen && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            className="absolute left-6 top-6 bottom-6 w-96 glass-panel rounded-3xl p-6 flex flex-col z-10 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <Monitor className="text-black w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Live GIF</h1>
              </div>
              <button 
                onClick={() => setIsDashboardOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
              {/* Upload Section */}
              <section>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Upload size={14} /> Library
                </h2>
                <label className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-white/40 transition-all cursor-pointer bg-zinc-800/20">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Plus className="w-8 h-8 text-zinc-500 group-hover:text-white transition-colors mb-2" />
                    <p className="text-sm text-zinc-500 group-hover:text-zinc-300">Upload GIFs</p>
                  </div>
                  <input type="file" className="hidden" multiple accept="image/gif" onChange={handleUpload} disabled={isUploading} />
                </label>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  {gifs.map((gif, idx) => (
                    <div 
                      key={gif.id} 
                      className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${currentIndex === idx ? 'border-white' : 'border-transparent'}`}
                      onClick={() => setCurrentIndex(idx)}
                    >
                      <img src={gif.data} alt={gif.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteGif(gif.id); }}
                          className="p-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Settings Section */}
              <section>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <SettingsIcon size={14} /> Settings
                </h2>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Clock size={16} /> Switch Interval
                    </label>
                    <select 
                      value={settings.interval}
                      onChange={(e) => updateSetting("interval", e.target.value)}
                      className="w-full bg-zinc-800/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-white/40 transition-all"
                    >
                      <option value="100">Fastest (100ms)</option>
                      <option value="5000">5 Seconds</option>
                      <option value="10000">10 Seconds</option>
                      <option value="15000">15 Seconds</option>
                      <option value="30000">30 Seconds</option>
                      <option value="60000">1 Minute</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <ListOrdered size={16} /> Switch Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => updateSetting("mode", "order")}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${settings.mode === 'order' ? 'bg-white text-black border-white' : 'bg-zinc-800/50 text-zinc-400 border-white/10 hover:border-white/20'}`}
                      >
                        <ListOrdered size={16} /> Order
                      </button>
                      <button 
                        onClick={() => updateSetting("mode", "random")}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${settings.mode === 'random' ? 'bg-white text-black border-white' : 'bg-zinc-800/50 text-zinc-400 border-white/10 hover:border-white/20'}`}
                      >
                        <Shuffle size={16} /> Random
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-700/50 rounded-lg">
                        {settings.switch_on_lock === 'true' ? <Unlock size={18} /> : <Lock size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Switch on Wake</p>
                        <p className="text-xs text-zinc-500">Change GIF when tab focused</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateSetting("switch_on_lock", settings.switch_on_lock === 'true' ? 'false' : 'true')}
                      className={`w-12 h-6 rounded-full relative transition-colors ${settings.switch_on_lock === 'true' ? 'bg-white' : 'bg-zinc-700'}`}
                    >
                      <motion.div 
                        animate={{ x: settings.switch_on_lock === 'true' ? 26 : 2 }}
                        className={`absolute top-1 w-4 h-4 rounded-full ${settings.switch_on_lock === 'true' ? 'bg-black' : 'bg-zinc-400'}`}
                      />
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <button 
                onClick={() => setIsWallpaperMode(true)}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                <Maximize2 size={18} /> Enter Wallpaper Mode
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Controls when in Wallpaper Mode */}
      <AnimatePresence>
        {!isDashboardOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 glass-panel rounded-2xl z-20"
          >
            <button onClick={() => setCurrentIndex(prev => (prev - 1 + gifs.length) % gifs.length)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <ChevronLeft size={24} />
            </button>
            <button onClick={() => setIsDashboardOpen(true)} className="px-6 py-2 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors">
              Settings
            </button>
            <button onClick={nextGif} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <ChevronRight size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallpaper Mode Indicator */}
      {isWallpaperMode && !isDashboardOpen && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          whileHover={{ opacity: 1 }}
          onClick={() => setIsWallpaperMode(false)}
          className="absolute top-6 right-6 p-3 glass-panel rounded-full z-20"
        >
          <X size={24} />
        </motion.button>
      )}

      {/* Empty State */}
      {gifs.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-0 text-zinc-500">
          <Upload size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">No GIFs uploaded yet</p>
          <p className="text-sm">Open the dashboard to add some</p>
        </div>
      )}
    </div>
  );
}
