import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  FileText, 
  FileCheck, 
  Layers, 
  AlertOctagon, 
  Clock, 
  Tag, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { analyticsService } from '../../services/api';

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];

const MetricsDashboard = ({ onSelectDoc }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await analyticsService.getMetrics();
        setMetrics(data);
      } catch (e) {
        console.error("Dashboard compilation failed", e);
        setError("Failed to compile dashboard metrics. Verify database state.");
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
        <Layers className="h-10 w-10 animate-pulse text-indigo-500 mb-3" />
        <span className="text-sm font-semibold">Compiling workspace analytics...</span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
        <AlertOctagon className="h-12 w-12 text-rose-500 mb-3" />
        <h3 className="font-semibold text-lg">Error loading metrics</h3>
        <p className="text-sm text-slate-500 max-w-sm mt-1">{error}</p>
      </div>
    );
  }

  // Format chart data
  const fileDistributionData = Object.entries(metrics.file_type_distribution || {}).map(([key, val]) => ({
    name: key,
    value: val
  }));

  const urgencyData = Object.entries(metrics.urgency_distribution || {}).map(([key, val]) => ({
    name: key,
    value: val
  }));

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50 dark:bg-darkBg text-slate-800 dark:text-slate-100">
      
      {/* HEADER TITLE */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-3xl tracking-tight bg-gradient-to-r from-slate-800 to-indigo-900 dark:from-slate-100 dark:to-indigo-300 bg-clip-text text-transparent">
            Workspace Summary
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global insights across all ingested files and active RAG indexes.
          </p>
        </div>
      </div>

      {/* METRICS PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Card 1: Total Docs */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkPanel border border-slate-200 dark:border-slate-800 shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xxs font-bold uppercase tracking-wider text-slate-500 block">Total Documents</span>
            <span className="text-2xl font-extrabold tracking-tight">{metrics.total_documents}</span>
          </div>
        </div>

        {/* Card 2: Pages Processed */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkPanel border border-slate-200 dark:border-slate-800 shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-xl">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xxs font-bold uppercase tracking-wider text-slate-500 block">Total Pages OCRed</span>
            <span className="text-2xl font-extrabold tracking-tight">{metrics.total_pages}</span>
          </div>
        </div>

        {/* Card 3: Urgent Items */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkPanel border border-slate-200 dark:border-slate-800 shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xxs font-bold uppercase tracking-wider text-slate-500 block">High Urgency Alerts</span>
            <span className="text-2xl font-extrabold tracking-tight text-rose-500">
              {metrics.urgency_distribution?.HIGH || 0}
            </span>
          </div>
        </div>

        {/* Card 4: Processing Rate */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkPanel border border-slate-200 dark:border-slate-800 shadow-lg flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xxs font-bold uppercase tracking-wider text-slate-500 block">Active Status</span>
            <span className="text-base font-bold text-emerald-500">Ready</span>
          </div>
        </div>
      </div>

      {/* GRAPH SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: File formats distribution */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkPanel border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col h-80">
          <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider mb-4">
            Ingestion Formats Distribution
          </h3>
          <div className="flex-1 min-h-0">
            {fileDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fileDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {fileDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      borderRadius: '8px', 
                      border: 'none',
                      color: '#F8FAFC' 
                    }} 
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                No file types registered.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Urgency Bar Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkPanel border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col h-80">
          <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider mb-4">
            Document Priority distribution
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={urgencyData}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderRadius: '8px', 
                    border: 'none',
                    color: '#F8FAFC' 
                  }} 
                />
                <Bar dataKey="value" fill="#6366F1" radius={[8, 8, 0, 0]}>
                  {urgencyData.map((entry, index) => {
                    const color = entry.name === 'HIGH' ? '#EF4444' : entry.name === 'MEDIUM' ? '#F59E0B' : '#10B981';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RECENT UPLOADS & SMART TAGS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Uploads Table (left 2/3) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-darkPanel border border-slate-200 dark:border-slate-800 shadow-lg">
          <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider mb-4 flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Recent Activity Logs</span>
          </h3>
          
          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
              <thead>
                <tr className="text-slate-400 font-medium">
                  <th className="pb-3 font-semibold text-xs uppercase">Filename</th>
                  <th className="pb-3 font-semibold text-xs uppercase">Format</th>
                  <th className="pb-3 font-semibold text-xs uppercase">Status</th>
                  <th className="pb-3 font-semibold text-xs uppercase">Uploaded</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {metrics.recent_activity?.map((doc) => (
                  <tr key={doc.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="py-3 font-medium truncate max-w-xs">{doc.filename}</td>
                    <td className="py-3 text-slate-500">{doc.file_type}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xxs font-semibold ${
                        doc.status === 'ready' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : doc.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-indigo-500/10 text-indigo-500'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      {doc.status === 'ready' && (
                        <button
                          onClick={() => onSelectDoc(doc.id)}
                          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-indigo-500 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!metrics.recent_activity || metrics.recent_activity.length === 0) && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-slate-500 italic">
                      No documents ingested.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Smart Tags Cloud (right 1/3) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-darkPanel border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col">
          <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider mb-4 flex items-center space-x-2">
            <Tag className="h-4 w-4" />
            <span>Extracted Smart Tags</span>
          </h3>
          
          <div className="flex-1 flex flex-wrap gap-2 content-start">
            {metrics.tag_cloud?.map((tag, i) => (
              <div 
                key={i} 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 text-xs font-semibold text-indigo-400 transition"
              >
                <span>{tag.text}</span>
                <span className="text-[10px] bg-indigo-500/20 px-1.5 py-0.2 rounded-full text-indigo-300">
                  {tag.value}
                </span>
              </div>
            ))}
            {(!metrics.tag_cloud || metrics.tag_cloud.length === 0) && (
              <div className="h-full w-full flex items-center justify-center text-slate-500 text-xs italic text-center">
                Smart tags will appear as files are analyzed.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default MetricsDashboard;
