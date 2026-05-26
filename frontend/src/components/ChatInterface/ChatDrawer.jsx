import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Loader2, 
  HelpCircle 
} from 'lucide-react';
import { chatService } from '../../services/api';

const ChatDrawer = ({ docId, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(true);
  
  // Open citations state per message index
  const [openCitations, setOpenCitations] = useState({});

  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load chat history when drawer opens or document changes
  useEffect(() => {
    if (isOpen && docId) {
      const loadHistory = async () => {
        setLoading(true);
        try {
          const history = await chatService.getHistory(docId);
          setMessages(history);
        } catch (e) {
          console.error("Failed to load chat logs", e);
        } finally {
          setLoading(false);
        }
      };
      loadHistory();
    }
  }, [isOpen, docId]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;
    
    const userMsgText = query;
    setQuery('');
    
    // Add user message locally
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMsgText,
      timestamp: new Date().toISOString()
    }]);
    
    setLoading(true);
    
    try {
      const response = await chatService.ask(docId, userMsgText);
      const assistantMsg = response.assistant_message;
      
      setMessages(prev => [...prev, assistantMsg]);
      
      // Speak response if voice output is enabled
      if (voiceOutput) {
        speakText(assistantMsg.content);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I encountered an error querying the RAG vector space. Verify Groq API configurations.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Browser Speech-to-Text Recognition
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    
    if (isListening) {
      setIsListening(false);
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsListening(true);
    };
    
    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setQuery(speechToText);
    };
    
    recognition.onerror = (event) => {
      console.error("STT Error:", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  // Browser Text-to-Speech synthesis
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    
    // Clear currently speaking voice queues
    window.speechSynthesis.cancel();
    
    // Remove Page tags like [Page 3] for natural vocal tone
    const readableText = text.replace(/\[Page\s*\d+\]/gi, '');
    
    const utterance = new SpeechSynthesisUtterance(readableText);
    window.speechSynthesis.speak(utterance);
  };

  const toggleCitation = (idx) => {
    setOpenCitations(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-darkPanel h-screen flex flex-col z-20 select-none shadow-2xl relative">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-darkPanel/60">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-indigo-500" />
          <span className="font-semibold text-sm">Ask Document Assistant</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* TTS voice output switch toggle */}
          <button
            onClick={() => {
              setVoiceOutput(!voiceOutput);
              if (voiceOutput) window.speechSynthesis?.cancel();
            }}
            className={`p-1.5 rounded-lg border transition ${
              voiceOutput 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-350 dark:border-slate-700'
            }`}
            title={voiceOutput ? "Voice output active" : "Voice output muted"}
          >
            {voiceOutput ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Message List viewport */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30 dark:bg-slate-950/10 select-text">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          
          return (
            <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                  isUser 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-750'
                }`}
              >
                {msg.content}
                
                {/* Sources Citation Footnote */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-300 dark:border-slate-700">
                    <button
                      onClick={() => toggleCitation(idx)}
                      className="flex items-center space-x-1 text-xs text-indigo-500 dark:text-indigo-400 font-semibold hover:underline"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>References ({msg.sources.length})</span>
                      {openCitations[idx] ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    
                    {openCitations[idx] && (
                      <div className="mt-2 space-y-1.5 animate-fadeIn max-h-40 overflow-y-auto pr-1">
                        {msg.sources.map((src, sIdx) => (
                          <div 
                            key={sIdx} 
                            className="text-xxs p-2 rounded bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-950 text-slate-600 dark:text-slate-400"
                          >
                            <span className="font-semibold text-indigo-400">Page {src.page_number}</span>: 
                            <p className="mt-0.5 italic">"...{src.snippet}..."</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-600 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        
        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
            <Loader2 className="h-4.5 w-4.5 animate-spin text-indigo-500" />
            <span>Thinking...</span>
          </div>
        )}
        
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
            <MessageSquare className="h-10 w-10 text-slate-600" />
            <div className="text-sm font-medium">Ask anything about this document</div>
            <p className="text-xs text-slate-600">
              Try: "Summarize this page", "Find dates mentioned" or "Highlight business risks."
            </p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkPanel/60 flex items-center space-x-2">
        {/* Microphone STT input trigger */}
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2.5 rounded-xl border transition cursor-pointer ${
            isListening 
              ? 'bg-rose-500 text-white border-rose-600 animate-pulse' 
              : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-350 dark:border-slate-700'
          }`}
          title={isListening ? "Listening... click to pause" : "Click to speak"}
        >
          {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
        </button>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isListening ? "Listening voice..." : "Type query..."}
          className="flex-1 py-2 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400"
        />
        
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition cursor-pointer"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
      
    </div>
  );
};

export default ChatDrawer;
