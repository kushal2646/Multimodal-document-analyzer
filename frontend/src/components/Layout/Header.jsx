import React from 'react';
import { Download, FileDown } from 'lucide-react';
import { analyticsService } from '../../services/api';

const Header = ({ selectedDoc, onDownloadReport }) => {
  return (
    <header className="h-16 border-b flex items-center justify-between px-8 bg-white dark:bg-darkPanel border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm z-10 select-none">
      <div>
        {selectedDoc ? (
          <div className="flex items-center space-x-3">
            <h1 className="font-display font-bold text-lg max-w-sm md:max-w-md truncate">
              {selectedDoc.filename}
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-600/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/10">
              {selectedDoc.file_type.split('/').pop().toUpperCase()}
            </span>
          </div>
        ) : (
          <h1 className="font-display font-bold text-lg text-slate-700 dark:text-slate-200">
            System Workspace
          </h1>
        )}
      </div>
      
      {selectedDoc && selectedDoc.status === 'ready' && (
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => onDownloadReport(selectedDoc._id)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 dark:hover:bg-indigo-600/20 transition cursor-pointer"
          >
            <FileDown className="h-4 w-4" />
            <span>Export Intelligence Report</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
