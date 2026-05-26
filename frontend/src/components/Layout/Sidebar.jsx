import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { ThemeContext } from '../../context/ThemeContext';
import { 
  Folder, 
  BarChart2, 
  PlusCircle, 
  LogOut, 
  Sun, 
  Moon, 
  FileText, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';

const Sidebar = ({ 
  documents, 
  selectedDocId, 
  onSelectDoc, 
  onUploadClick, 
  activeTab, 
  setActiveTab 
}) => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <aside className="w-80 h-screen flex flex-col border-r bg-slate-900 border-slate-800 text-slate-100 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Folder className="h-6 w-6" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            DocMind AI
          </span>
        </div>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
        </button>
      </div>

      {/* Main Action Toggles */}
      <div className="px-4 py-6 space-y-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'
          }`}
        >
          <BarChart2 className="h-5 w-5" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-indigo-500/20 font-semibold transition"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Documents List */}
      <div className="flex-1 px-4 overflow-y-auto min-h-0">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Your Documents
          </span>
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">
            {documents.length}
          </span>
        </div>
        
        <div className="space-y-1 pb-6">
          {documents.map((doc) => {
            const isSelected = selectedDocId === doc._id;
            const isProcessing = doc.status === 'processing';
            const isFailed = doc.status === 'failed';
            
            return (
              <div
                key={doc._id}
                onClick={() => doc.status === 'ready' && onSelectDoc(doc._id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition group cursor-pointer ${
                  isProcessing ? 'opacity-70 pointer-events-none' : ''
                } ${
                  isSelected 
                    ? 'bg-slate-800 text-indigo-400 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3 overflow-hidden pr-2">
                  <FileText className={`h-4.5 w-4.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="truncate pr-1">{doc.filename}</span>
                </div>
                
                <div className="shrink-0 flex items-center">
                  {isProcessing && (
                    <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" />
                  )}
                  {isFailed && (
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" title="Processing failed" />
                  )}
                </div>
              </div>
            );
          })}
          
          {documents.length === 0 && (
            <div className="text-center py-8 text-slate-600 text-sm">
              No files uploaded yet.
            </div>
          )}
        </div>
      </div>

      {/* User Footer info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden pr-2">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm uppercase">
            {user?.full_name?.slice(0, 2) || 'US'}
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-sm truncate">{user?.full_name || 'DocMind User'}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email || ''}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
