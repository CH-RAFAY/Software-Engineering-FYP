'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Updated Icons
const MusicNoteIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18V5l12-2v13"/>
    <circle cx="6" cy="18" r="3"/>
    <circle cx="18" cy="16" r="3"/>
  </svg>
);

// Tab Notation Icon
const TabNotationIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 5h18"/> {/* Top string */}
    <path d="M3 9h18"/> {/* Second string */}
    <path d="M3 13h18"/> {/* Third string */}
    <path d="M3 17h18"/> {/* Bottom string */}
    <circle cx="6" cy="5" r="1.5"/> {/* Note on first string */}
    <path d="M10 9h4"/> {/* Bar across second string */}
    <text x="17" y="15" fontSize="6" fill="currentColor">5</text> {/* Number on third string */}
  </svg>
);

const DownloadIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

// Music notation background component (client-only, subtle design)
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

// Progress visualization component (client-only)
const ProcessingVisualizer = dynamic(() => Promise.resolve(() => {
  const [waveform, setWaveform] = useState([]);

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

// Tab preview component (client-only)
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

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setProcessingComplete(false);
    }
  };

  const handleStartProcess = useCallback(() => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProcessingProgress(0);
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
            setProcessingComplete(true);
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 300);
  }, [selectedFile]);

  const handleDownload = () => {
    alert('Your guitar tablature has been prepared for download!');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'audio/mpeg') {
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
        <nav className="flex space-x-6">
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
        </nav>
      </header>
      {/* Main Content */}
      <main className="relative flex-grow flex items-center justify-center p-6 z-10">
        <motion.div 
          className="max-w-2xl w-full space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Transform Audio into Guitar Tabs Block */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden p-6">
            <div className="space-y-6">
              {/* Hero section */}
              <div className="text-center space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Transform Audio into Guitar Tabs</h1>
                <p className="text-gray-600 max-w-lg mx-auto">
                  Upload any guitar recording, and our AI will convert it into accurate, 
                  easy-to-read guitar tablature in seconds.
                </p>
              </div>
              {/* File upload area */}
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
              {/* Processing state */}
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
              {/* Result state */}
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
          {/* Features Block */}
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
              <h3 className="text-lg font-bold mb-4">Subscribe</h3>
              <p className="text-gray-400 text-sm mb-4">
                Get updates on new features and early access to upcoming tools.
              </p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 flex-grow"
                />
                <button className="bg-amber-800 hover:bg-amber-900 transition px-4 py-2 rounded-r-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} SoundTab. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              {['facebook', 'twitter', 'instagram', 'youtube'].map(social => (
                <a
                  key={social}
                  href="#"
                  className="text-gray-400 hover:text-white transition"
                >
                  <span className="sr-only">{social}</span>
                  <div className="w-8 h-8 bg-stone-700 rounded-full flex items-center justify-center hover:bg-stone-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 16h-2v-6h2v6zm-1-6.891c-.607 0-1.1-.496-1.1-1.109 0-.612.492-1.109 1.1-1.109s1.1.497 1.1 1.109c0 .613-.493 1.109-1.1 1.109zm8 6.891h-1.998v-2.861c0-1.881-2.002-1.722-2.002 0v2.861h-2v-6h2v1.093c.872-1.616 4-1.736 4 1.548v3.359z" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
      {/* Add animation styles */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}