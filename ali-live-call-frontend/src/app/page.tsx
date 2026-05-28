'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Settings, Globe, MessageSquare } from 'lucide-react';

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [sourceLang, setSourceLang] = useState('uz');
  const [targetLang, setTargetLang] = useState('en');
  
  const [transcript, setTranscript] = useState<{sender: string, text: string, type: 'original' | 'translated', lang: string}[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('translated-text', (data) => {
      // If we receive a translation
      if (data.senderId !== newSocket.id) {
        // Someone else spoke
        setTranscript(prev => [...prev, 
          { sender: 'them', text: data.original, type: 'original', lang: data.from },
          { sender: 'them', text: data.translated, type: 'translated', lang: data.to }
        ]);
        speakText(data.translated, data.to);
      } else {
        // I spoke
        setTranscript(prev => [...prev, 
          { sender: 'me', text: data.original, type: 'original', lang: data.from },
          { sender: 'me', text: data.translated, type: 'translated', lang: data.to }
        ]);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const speakText = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'uz' ? 'tr-TR' : lang; // fallback to turkish for uzbek TTS if not available
      window.speechSynthesis.speak(utterance);
    }
  };

  const startRecognition = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Sizning brauzeringiz ovoz aniqlashni qo'llab-quvvatlamaydi (Google Chrome ishlating).");
      setInCall(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = sourceLang;
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      
      if (text.trim() && socket) {
        socket.emit('translate-text', {
          text: text,
          from: sourceLang,
          to: targetLang
        });
      }
    };

    recognition.onerror = (event: any) => console.error("Speech recognition error:", event.error);
    
    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleCall = () => {
    if (inCall) {
      setInCall(false);
      stopRecognition();
    } else {
      setInCall(true);
      startRecognition();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#030712] text-white font-sans flex flex-col items-center justify-center p-4 lg:p-8 relative">
      {/* Static Background instead of heavy animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-indigo-900/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-cyan-900/10 blur-[100px] rounded-full" />
      </div>

      <header className="mb-8 mt-4 text-center z-10">
        <motion.h1 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-lg mb-2 tracking-tight flex items-center justify-center gap-3"
        >
          <Globe className="w-10 h-10 text-cyan-400" />
          ALI LIVE CALL
        </motion.h1>
        <p className="text-gray-400 text-sm md:text-base font-medium">
          AI orqali jonli tarjima platformasi
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 bg-gray-900/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-gray-800/50 w-fit mx-auto">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></span>
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">{isConnected ? 'Ulandi' : 'Kutilmoqda...'}</span>
        </div>
      </header>

      <main className="w-full max-w-5xl bg-gray-900/40 backdrop-blur-2xl border border-gray-800/60 rounded-[2.5rem] p-6 md:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row gap-8 z-10">
        
        {/* Settings Panel */}
        <div className="flex-1 space-y-6 lg:border-r border-gray-800/60 lg:pr-8">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-200">
            <Settings className="w-5 h-5 text-purple-400" /> Sozlamalar
          </h2>
          
          <div className="space-y-5">
            <div className="group">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 group-hover:text-cyan-400 transition-colors">
                Sizning Tilingiz
              </label>
              <select 
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                disabled={inCall}
                className="w-full bg-gray-950/50 border border-gray-700/50 rounded-2xl px-4 py-3.5 text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50 appearance-none shadow-inner"
              >
                <option value="uz">🇺🇿 O'zbekcha</option>
                <option value="en">🇺🇸 Inglizcha</option>
                <option value="ru">🇷🇺 Ruscha</option>
              </select>
            </div>

            <div className="group">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 group-hover:text-purple-400 transition-colors">
                Suhbatdosh Tili
              </label>
              <select 
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                disabled={inCall}
                className="w-full bg-gray-950/50 border border-gray-700/50 rounded-2xl px-4 py-3.5 text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50 appearance-none shadow-inner"
              >
                <option value="en">🇺🇸 Inglizcha</option>
                <option value="uz">🇺🇿 O'zbekcha</option>
                <option value="ru">🇷🇺 Ruscha</option>
              </select>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleCall}
            disabled={!isConnected}
            className={`w-full py-4 rounded-2xl font-bold text-lg tracking-wide transition-all duration-300 ease-out flex items-center justify-center gap-3 mt-8 relative overflow-hidden
              ${inCall 
                ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 border border-transparent'
              }`}
          >
            {inCall && (
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-red-500/20"
              />
            )}
            
            {inCall ? (
              <>
                <MicOff className="w-6 h-6 z-10" />
                <span className="z-10">TUGATISH</span>
              </>
            ) : (
              <>
                <Mic className="w-6 h-6 z-10" />
                <span className="z-10">BOSHLASH</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Live Transcript Panel */}
        <div className="flex-[1.5] bg-[#090b14]/80 rounded-[2rem] border border-gray-800/80 p-6 flex flex-col h-[450px] lg:h-auto shadow-inner relative">
          <h2 className="text-lg font-semibold mb-4 text-gray-300 border-b border-gray-800/80 pb-4 flex justify-between items-center">
            <span className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              Jonli Tarjima
            </span>
            {inCall && (
              <span className="flex items-center gap-2 px-3 py-1 bg-cyan-900/30 rounded-full text-xs font-mono text-cyan-400 animate-pulse border border-cyan-800/50">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                Eshitmoqda...
              </span>
            )}
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
            <AnimatePresence>
              {transcript.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-gray-500 text-sm gap-3"
                >
                  <Globe className="w-12 h-12 text-gray-800" />
                  <p>Suhbatni boshlash uchun tugmani bosing...</p>
                </motion.div>
              ) : (
                transcript.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    key={i} 
                    className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-[1.25rem] px-5 py-3 shadow-md ${
                      msg.type === 'original' 
                        ? 'bg-gray-800/80 text-gray-300 rounded-br-sm text-sm border border-gray-700/50' 
                        : 'bg-gradient-to-br from-purple-900/40 to-cyan-900/40 text-purple-50 border border-purple-500/30 rounded-bl-sm font-medium'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1.5 uppercase font-medium tracking-wider px-1">
                      {msg.sender === 'me' ? 'Men' : 'Suhbatdosh'} • {msg.lang} {msg.type === 'original' ? '(Asl)' : '(Tarjima)'}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            <div ref={transcriptEndRef} className="h-1" />
          </div>
        </div>
      </main>

      <footer className="mt-8 text-gray-500 text-xs font-medium tracking-wide">
        Made with ❤️ by Antigravity • Free AI Architecture
      </footer>
    </div>
  );
}

