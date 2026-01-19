'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MusicNoteIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);

const TabNotationIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 5h18"/> {}
    <path d="M3 9h18"/> {}
    <path d="M3 13h18"/> {}
    <path d="M3 17h18"/> {}
    <circle cx="6" cy="5" r="1.5"/> {}
    <path d="M10 9h4"/> {}
    <text x="17" y="15" fontSize="6" fill="currentColor">5</text> {}
  </svg>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const MusicNotationBackground = dynamic(() => Promise.resolve(() => {
  return (
    <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full">
        {Array.from({ length: 10 }).map((_, i) => (
          <div 
            key={`staff-${i}`} 
            className="absolute h-px bg-stone-600 w-full" 
            style={{ top: `${(i * 10) + 5}%` }}
          />
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={`note-${i}`} 
            className="absolute"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
              opacity: 0.5
            }}
          >
            <MusicNoteIcon className="w-4 h-4 text-stone-600" />
          </div>
        ))}
      </div>
    </div>
  );
}), { ssr: false });

const ProcessingVisualizer = dynamic(() => Promise.resolve(() => {
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    const generateWaveform = () => {
      const newWaveform = Array.from({ length: 40 }, () => 
        Math.random() * 30 + 10
      );
      setWaveform(newWaveform);
    };
    generateWaveform();
    const interval = setInterval(generateWaveform, 300);
    return () => clearInterval(interval);
  }, []);

  if (!waveform.length) return null;

  return (
    <div className="w-full h-16 flex items-center justify-center space-x-1">
      {waveform.map((height, index) => (
        <div 
          key={index}
          className="bg-amber-800 rounded-full w-1"
          style={{ 
            height: `${height}px`,
            opacity: Math.random() * 0.5 + 0.5,
            animation: 'pulse 1.5s infinite'
          }}
        />
      ))}
    </div>
  );
}), { ssr: false });

const TabPreview = dynamic(() => Promise.resolve(() => {
  return (
    <div className="w-full bg-stone-50 rounded-lg p-3 border border-stone-200 shadow-inner overflow-hidden">
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, staffIndex) => (
          <div key={staffIndex} className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, lineIndex) => (
              <div key={lineIndex} className="w-full h-px bg-stone-400 relative flex items-center">
                {Array.from({ length: 6 }).map((_, numIndex) => (
                  <span 
                    key={numIndex} 
                    className="absolute text-xs font-mono"
                    style={{ left: `${15 + numIndex * 18}%` }}
                  >
                    {Math.floor(Math.random() * 12)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}), { ssr: false });

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setProcessingComplete(false);
      setPdfUrl(null);
    }
  };

  const handleStartProcess = useCallback(async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const startTime = Date.now();

    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) return prev; // Hold at 90%
        return prev + Math.random() * 1.5;
      });
    }, 200);

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('http://localhost:8000/process-audio', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Processing failed: ${errorText}`);
        }

        const blob = await response.blob();
        
        // Ensure animation runs for at least 20 seconds for better UX
        const elapsedTime = Date.now() - startTime;
        const minTime = 20000; // 20 seconds
        if (elapsedTime < minTime) {
            await new Promise(resolve => setTimeout(resolve, minTime - elapsedTime));
        }

        const url = window.URL.createObjectURL(blob);
        setPdfUrl(url);
        
        clearInterval(interval);
        setProcessingProgress(100);
        setTimeout(() => {
            setIsProcessing(false);
            setProcessingComplete(true);
        }, 500);
    } catch (error) {
        console.error(error);
        alert('Error processing file. Please check backend connection.');
        clearInterval(interval);
        setIsProcessing(false);
        setProcessingProgress(0);
    }
  }, [selectedFile]);

  const handleDownload = () => {
    if (pdfUrl) {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'sheet_music.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert('Download not ready');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'audio/mpeg' || file.type === 'audio/wav' || file.type === 'audio/ogg' || file.name.endsWith('.mp3') || file.name.endsWith('.wav'))) {
      setSelectedFile(file);
      setProcessingComplete(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-stone-50 to-white flex flex-col relative overflow-hidden">
      <MusicNotationBackground />
      {/* Header */}
      <header className="relative bg-white/90 backdrop-blur-sm border-b border-amber-100 py-4 px-6 flex items-center justify-between z-10 shadow-sm">
        <motion.div 
          className="flex items-center space-x-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 bg-amber-800 text-white rounded-full flex items-center justify-center">
            <MusicNoteIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-800 to-stone-700 text-transparent bg-clip-text">SoundTab</h1>
            <p className="text-xs text-gray-500">Audio to Guitar Tablature Converter</p>
          </div>
        </motion.div>
        <nav className="flex items-center space-x-6">
          <div className="hidden md:flex space-x-6">
            {['Home', 'How it Works', 'Examples', 'FAQ'].map((item, index) => (
              <motion.a
                key={item}
                href="#"
                className="text-sm font-medium text-gray-600 hover:text-amber-800 hover:bg-amber-50 px-3 py-2 rounded-md transition-all"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ y: -2 }}
              >
                {item}
              </motion.a>
            ))}
          </div>
          <div className="flex items-center space-x-3 border-l border-amber-100 pl-6">
            <Link href="/login">
              <motion.button
                className="text-sm font-medium text-gray-600 hover:text-amber-800 px-3 py-2 rounded-md transition-all"
                whileHover={{ y: -2 }}
              >
                Log In
              </motion.button>
            </Link>
            <Link href="/signup">
              <motion.button
                className="text-sm font-medium bg-amber-800 text-white px-4 py-2 rounded-lg hover:bg-amber-900 transition-all shadow-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign Up
              </motion.button>
            </Link>
          </div>
        </nav>
      </header>
      <main className="relative flex-grow flex items-center justify-center p-6 z-10">
        <motion.div 
          className="max-w-2xl w-full space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden p-6">
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Transform Audio into Guitar Tabs</h1>
                <p className="text-gray-600 max-w-lg mx-auto">
                  Upload any guitar recording, and our AI will convert it into accurate, 
                  easy-to-read guitar tablature in seconds.
                </p>
              </div>
              <div 
                className={`border-2 border-dashed rounded-xl p-6 transition-all ${
                  selectedFile ? 'border-amber-300 bg-amber-50' : 'border-gray-300 hover:border-amber-300'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  accept=".mp3,.wav,.ogg"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <AnimatePresence mode="wait">
                  {!selectedFile ? (
                    <motion.div 
                      key="upload"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center space-y-4"
                    >
                      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                        <MusicNoteIcon className="w-10 h-10 text-amber-800" />
                      </div>
                      <div className="text-center">
                        <p className="text-gray-700 font-medium mb-2">Drag and drop your audio file here</p>
                        <p className="text-gray-500 text-sm">or</p>
                      </div>
                      <label
                        htmlFor="file-upload"
                        className="bg-amber-800 text-white px-6 py-3 rounded-lg hover:bg-amber-900 transition cursor-pointer font-medium"
                      >
                        Browse Files
                      </label>
                      <p className="text-xs text-gray-500">Supports MP3, WAV, OGG (Max 10MB)</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="file-selected"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center space-y-6"
                    >
                      <div className="w-full flex items-center space-x-4 bg-white p-4 rounded-lg border border-gray-200">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <MusicNoteIcon className="w-6 h-6 text-amber-800" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-medium text-gray-800 truncate">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <button 
                          onClick={() => setSelectedFile(null)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {!isProcessing && !processingComplete && (
                        <motion.button
                          onClick={handleStartProcess}
                          className="w-full bg-gradient-to-r from-amber-800 to-stone-700 text-white py-4 rounded-lg transition-all font-medium flex items-center justify-center space-x-2 group shadow-md"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <TabNotationIcon className="w-5 h-5" />
                          <span>Convert to Tablature</span>
                        </motion.button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                      <div className="text-center mb-4">
                        <h3 className="font-medium text-amber-800 mb-1">Processing your audio</h3>
                        <p className="text-sm text-amber-700">Converting audio frequencies to guitar tablature</p>
                      </div>
                      <ProcessingVisualizer />
                      <div className="mt-4">
                        <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-800 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${processingProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-amber-700">
                          <span>Analyzing audio patterns</span>
                          <span>{Math.round(processingProgress)}%</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {processingComplete && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-stone-50 rounded-xl p-6 border border-stone-200">
                      <div className="text-center mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="font-medium text-stone-800 text-lg mb-1">Conversion Complete!</h3>
                        <p className="text-sm text-stone-600">Your guitar tablature is ready</p>
                      </div>
                      <TabPreview />
                      <div className="flex space-x-4 mt-6">
                        <motion.button
                          onClick={handleDownload}
                          className="flex-1 bg-gradient-to-r from-amber-800 to-stone-700 text-white py-3 rounded-lg transition-all font-medium flex items-center justify-center space-x-2 group shadow"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <DownloadIcon className="w-5 h-5" />
                          <span>Download Tablature</span>
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            setSelectedFile(null);
                            setProcessingComplete(false);
                            setPdfUrl(null);
                          }}
                          className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          New Conversion
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Accurate Detection",
                  description: "Advanced algorithms detect notes, chords and techniques with precision",
                  icon: (
                    <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )
                },
                {
                  title: "Multiple Formats",
                  description: "Export your tabs as PDF, Guitar Pro, or plain text files",
                  icon: (
                    <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )
                },
                {
                  title: "Technique Recognition",
                  description: "Identifies bends, slides, hammer-ons, pull-offs and more",
                  icon: (
                    <svg className="w-6 h-6 text-amber-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )
                }
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center text-center space-y-2 p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.5 }}
                >
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                    {feature.icon}
                  </div>
                  <h3 className="font-medium text-gray-800">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>
      {/* Footer */}
      <footer className="relative bg-stone-800 text-white py-8 px-6 z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">SoundTab</h3>
              <p className="text-gray-400 text-sm">
                Converting your guitar recordings into accurate tablature with AI-powered technology.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {['Home', 'Features', 'Pricing', 'FAQ', 'Contact'].map(item => (
                  <li key={item}>
                    <a href="#" className="text-gray-400 hover:text-white text-sm transition">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Connect</h3>
              <div className="flex space-x-4">
                {/* Social icons would go here */}
                <div className="w-8 h-8 bg-stone-700 rounded-full"></div>
                <div className="w-8 h-8 bg-stone-700 rounded-full"></div>
                <div className="w-8 h-8 bg-stone-700 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-700 mt-8 pt-8 text-center text-gray-500 text-sm">
            © 2024 SoundTab. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
