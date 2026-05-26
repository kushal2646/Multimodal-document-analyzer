import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import AuthModal from './components/Dashboard/AuthModal';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import MetricsDashboard from './components/Dashboard/MetricsDashboard';
import UploadBox from './components/DocumentUpload/UploadBox';
import PreviewWorkspace from './components/OCRPreview/PreviewWorkspace';
import ChatDrawer from './components/ChatInterface/ChatDrawer';
import { documentService, analyticsService } from './services/api';
import { MessageSquare, Loader2 } from 'lucide-react';

function App() {
  const { user, loading: authLoading } = useContext(AuthContext);
  
  // Dashboard states
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | preview
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Modal states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [docsLoading, setDocsLoading] = useState(false);

  // Load documents list
  const loadDocuments = async (autoSelectId = null) => {
    if (!user) return;
    setDocsLoading(true);
    try {
      const list = await documentService.list();
      setDocuments(list);
      
      if (autoSelectId) {
        setSelectedDocId(autoSelectId);
        setActiveTab('preview');
      }
    } catch (e) {
      console.error("Failed to load documents", e);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDocuments();
    } else {
      setDocuments([]);
      setSelectedDocId(null);
      setSelectedDoc(null);
      setActiveTab('dashboard');
    }
  }, [user]);

  // Load selected document details
  useEffect(() => {
    if (selectedDocId) {
      const fetchDoc = async () => {
        try {
          const data = await documentService.get(selectedDocId);
          setSelectedDoc(data);
        } catch (e) {
          console.error("Failed to get document detail", e);
        }
      };
      fetchDoc();
    } else {
      setSelectedDoc(null);
    }
  }, [selectedDocId]);

  // Background polling for documents still in 'processing' status
  useEffect(() => {
    const hasProcessing = documents.some(doc => doc.status === 'processing');
    if (hasProcessing && user) {
      const interval = setInterval(async () => {
        try {
          const list = await documentService.list();
          setDocuments(list);
          
          // If active document was processing and is now ready, reload it
          if (selectedDocId) {
            const activeDocLatest = list.find(d => d._id === selectedDocId);
            if (activeDocLatest && activeDocLatest.status === 'ready' && selectedDoc?.status === 'processing') {
              const data = await documentService.get(selectedDocId);
              setSelectedDoc(data);
            }
          }
        } catch (e) {
          console.error("Error polling processing files", e);
        }
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [documents, selectedDocId, selectedDoc, user]);

  const handleSelectDocument = (docId) => {
    setSelectedDocId(docId);
    setActiveTab('preview');
  };

  const handleUploadSuccess = (newDocId) => {
    setIsUploadOpen(false);
    loadDocuments(newDocId);
  };

  const handleDownloadReport = (docId) => {
    const downloadUrl = analyticsService.getReportUrl(docId);
    // Trigger direct browser download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `DocMind_Report_${docId}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mr-2" />
        <span>Verifying secure session...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar 
        documents={documents}
        selectedDocId={selectedDocId}
        onSelectDoc={handleSelectDocument}
        onUploadClick={() => setIsUploadOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          selectedDoc={activeTab === 'preview' ? selectedDoc : null}
          onDownloadReport={handleDownloadReport}
        />

        <main className="flex-1 flex overflow-hidden min-h-0">
          {activeTab === 'dashboard' ? (
            <MetricsDashboard onSelectDoc={handleSelectDocument} />
          ) : (
            selectedDoc && (
              <PreviewWorkspace 
                doc={selectedDoc} 
                onDownloadReport={handleDownloadReport}
              />
            )
          )}
        </main>

        {/* Floating Chat Button (Only available in preview mode) */}
        {activeTab === 'preview' && selectedDoc && selectedDoc.status === 'ready' && !isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="absolute bottom-6 right-6 p-4 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-500 transition-all duration-300 z-10 hover:scale-105 flex items-center justify-center border border-indigo-400/20 cursor-pointer"
          >
            <MessageSquare className="h-6 w-6 animate-pulse" />
          </button>
        )}
      </div>

      {/* Conversational Drawer (RAG Assistant) */}
      <ChatDrawer 
        docId={selectedDocId}
        isOpen={isChatOpen && activeTab === 'preview'}
        onClose={() => setIsChatOpen(false)}
      />

      {/* Upload Overlay Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <UploadBox 
            onUploadSuccess={handleUploadSuccess}
            onCancel={() => setIsUploadOpen(false)}
          />
        </div>
      )}

    </div>
  );
}

export default App;
