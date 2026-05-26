import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ShieldAlert, 
  Scale, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Building2, 
  Check, 
  AlertTriangle,
  FileDown,
  ChevronRight,
  TrendingUp,
  Brain
} from 'lucide-react';
import { insightService, analyticsService } from '../../services/api';

const PreviewWorkspace = ({ doc, onDownloadReport }) => {
  const [leftTab, setLeftTab] = useState('text'); // text
  const [rightTab, setRightTab] = useState('summary'); // summary | forensics | legal | resume
  
  // Resume state
  const [jdText, setJdText] = useState('');
  const [atsScore, setAtsScore] = useState(null);
  const [matchingSkills, setMatchingSkills] = useState([]);
  const [missingSkills, setMissingSkills] = useState([]);
  const [improvements, setImprovements] = useState([]);
  const [recRoles, setRecRoles] = useState([]);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState(null);

  // Check if this document is likely a resume based on text indicators
  const isResume = doc.smart_tags?.some(tag => tag.toLowerCase().includes('resume') || tag.toLowerCase().includes('cv')) || 
                   doc.extracted_text?.toLowerCase().includes('experience') || 
                   doc.extracted_text?.toLowerCase().includes('education');

  const handleAtsMatch = async () => {
    if (!jdText.trim()) return;
    setResumeLoading(true);
    setResumeError(null);
    setAtsScore(null);
    
    try {
      const results = await insightService.analyzeResume(doc._id, jdText);
      setAtsScore(results.ats_score || 0);
      setMatchingSkills(results.matching_skills || []);
      setMissingSkills(results.missing_skills || []);
      setImprovements(results.improvement_suggestions || []);
      setRecRoles(results.recommended_roles || []);
    } catch (e) {
      console.error(e);
      setResumeError("Failed to analyze resume. Verify model constraints.");
    } finally {
      setResumeLoading(false);
    }
  };

  const getUrgencyColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'HIGH': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'MEDIUM': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const integrity = doc.insights?.integrity || { is_fake: false, tamper_score: 0.0, fake_reasons: [] };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-darkBg text-slate-800 dark:text-slate-100">
      
      {/* LEFT COLUMN: Extracted text and layouts */}
      <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-darkPanel/20 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkPanel/40">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <span className="font-semibold text-sm">Extracted Document Data</span>
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setLeftTab('text')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                leftTab === 'text'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              Document Text
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap select-text bg-slate-50/50 dark:bg-slate-950/20">
          {doc.extracted_text || "No text could be extracted."}
        </div>
      </div>
      
      {/* RIGHT COLUMN: AI Summaries, Forensics, and advanced tools */}
      <div className="w-[500px] flex flex-col overflow-hidden bg-white dark:bg-darkPanel">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkPanel/40 p-2 space-x-1">
          <button
            onClick={() => setRightTab('summary')}
            className={`flex-1 py-2 px-1 text-center rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              rightTab === 'summary'
                ? 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Brain className="h-4 w-4" />
            <span>Summary</span>
          </button>
          <button
            onClick={() => setRightTab('forensics')}
            className={`flex-1 py-2 px-1 text-center rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              rightTab === 'forensics'
                ? 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Forensics</span>
          </button>
          <button
            onClick={() => setRightTab('legal')}
            className={`flex-1 py-2 px-1 text-center rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
              rightTab === 'legal'
                ? 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>Risks</span>
          </button>
          {isResume && (
            <button
              onClick={() => setRightTab('resume')}
              className={`flex-1 py-2 px-1 text-center rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                rightTab === 'resume'
                  ? 'bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              <span>Resume AI</span>
            </button>
          )}
        </div>
        
        {/* Tab Content Panel */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6">
          
          {/* TAB 1: SUMMARY */}
          {rightTab === 'summary' && (
            <div className="space-y-6">
              {/* TLDR */}
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                <h4 className="text-xs font-bold uppercase text-indigo-500 tracking-wider mb-2">TL;DR Summary</h4>
                <p className="text-sm italic leading-relaxed text-slate-700 dark:text-slate-300">
                  "{doc.summary?.tldr || 'Summarizing context failed.'}"
                </p>
              </div>

              {/* Bullet points */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Key Highlights</h4>
                <ul className="space-y-2.5">
                  {doc.summary?.bullets?.map((b, i) => (
                    <li key={i} className="text-sm flex items-start space-x-3 text-slate-600 dark:text-slate-300">
                      <ChevronRight className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                  {(!doc.summary?.bullets || doc.summary.bullets.length === 0) && (
                    <li className="text-sm italic text-slate-500">No highlights compiled.</li>
                  )}
                </ul>
              </div>

              {/* Action items */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Action Items & Deliverables</h4>
                <div className="space-y-2">
                  {doc.summary?.action_items?.map((item, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 text-sm">
                      <div className="h-4 w-4 shrink-0 rounded border border-slate-400 dark:border-slate-600 flex items-center justify-center text-indigo-500 mt-0.5">
                        <Check className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                      </div>
                      <span className="text-slate-600 dark:text-slate-300">{item}</span>
                    </div>
                  ))}
                  {(!doc.summary?.action_items || doc.summary.action_items.length === 0) && (
                    <p className="text-sm italic text-slate-500 p-2.5 rounded bg-slate-50 dark:bg-slate-800/20 text-center">
                      No actionable checklist items detected.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORENSICS */}
          {rightTab === 'forensics' && (
            <div className="space-y-6">
              {/* Integrity Indicator Header */}
              <div className="text-center p-6 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Document Integrity Rating
                </span>
                <div className="inline-flex items-center justify-center space-x-2 mb-3">
                  <div className={`h-3 w-3 rounded-full ${integrity.is_fake ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`}></div>
                  <span className={`text-lg font-bold tracking-tight ${integrity.is_fake ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {integrity.is_fake ? 'TAMPERED / FAKE DETECTED' : 'CLEAN INTEGRITY'}
                  </span>
                </div>
                
                {/* Visual Gauge bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-1.5">
                  <div 
                    className={`h-full rounded-full transition-all ${integrity.is_fake ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${(integrity.tamper_score * 100).toFixed(0)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Tamper Index Rating: {Math.round(integrity.tamper_score * 100)}%
                </span>
              </div>

              {/* Forensic Details List */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Tamper Forensic Logs</h4>
                <div className="space-y-2">
                  {integrity.fake_reasons?.map((reason, i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-500 text-sm">
                      <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))}
                  {(!integrity.fake_reasons || integrity.fake_reasons.length === 0) && (
                    <p className="text-sm text-slate-500 italic p-4 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-lg">
                      Passes all visual EXIF metadata checks, text-grid alignment tests, and table calculation audits.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEGAL & BUSINESS RISKS */}
          {rightTab === 'legal' && (
            <div className="space-y-6">
              {/* Urgency & Sentiment Header */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border text-center ${getUrgencyColor(doc.insights?.urgency_level)}`}>
                  <span className="text-xxs font-bold uppercase tracking-wider block opacity-70 mb-1">
                    Urgency Level
                  </span>
                  <span className="text-base font-bold uppercase tracking-tight">
                    {doc.insights?.urgency_level || 'LOW'}
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-900/40">
                  <span className="text-xxs font-bold uppercase tracking-wider block text-slate-500 mb-1">
                    Tone Sentiment
                  </span>
                  <span className="text-base font-bold text-slate-700 dark:text-slate-300">
                    {doc.insights?.sentiment || 'Neutral'}
                  </span>
                </div>
              </div>

              {/* Detected Risks */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Extracted Risk Clauses</h4>
                <div className="space-y-2">
                  {doc.insights?.legal_risks?.map((risk, i) => (
                    <div key={i} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-sm">
                      {risk}
                    </div>
                  ))}
                  {(!doc.insights?.legal_risks || doc.insights.legal_risks.length === 0) && (
                    <p className="text-sm text-slate-500 italic p-4 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-lg">
                      No commercial liabilities or indemnity clauses identified.
                    </p>
                  )}
                </div>
              </div>

              {/* Entity extraction */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Entities Highlighted</h4>
                <div className="space-y-3.5">
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-1" />
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Target Deadlines & Dates</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {doc.insights?.detected_entities?.dates?.map((date, i) => (
                          <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300">
                            {date}
                          </span>
                        ))}
                        {(!doc.insights?.detected_entities?.dates || doc.insights.detected_entities.dates.length === 0) && (
                          <span className="text-xs italic text-slate-500">None</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <DollarSign className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-1" />
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Financial Obligations</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {doc.insights?.detected_entities?.monetary_values?.map((val, i) => (
                          <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300">
                            {val}
                          </span>
                        ))}
                        {(!doc.insights?.detected_entities?.monetary_values || doc.insights.detected_entities.monetary_values.length === 0) && (
                          <span className="text-xs italic text-slate-500">None</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Building2 className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-1" />
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Organizations</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {doc.insights?.detected_entities?.organizations?.map((org, i) => (
                          <span key={i} className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-300">
                            {org}
                          </span>
                        ))}
                        {(!doc.insights?.detected_entities?.organizations || doc.insights.detected_entities.organizations.length === 0) && (
                          <span className="text-xs italic text-slate-500">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RESUME INTEL */}
          {rightTab === 'resume' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Job Description Matcher</h4>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste target job description requirements here..."
                  className="w-full h-32 p-3 text-sm rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                ></textarea>
                <button
                  onClick={handleAtsMatch}
                  disabled={resumeLoading || !jdText.trim()}
                  className="w-full mt-2.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition cursor-pointer"
                >
                  {resumeLoading ? "Running Recruiter ATS Check..." : "Calculate ATS Match Score"}
                </button>
              </div>

              {resumeError && (
                <div className="p-3 text-rose-500 text-xs bg-rose-500/10 rounded-lg border border-rose-500/20">
                  {resumeError}
                </div>
              )}

              {atsScore !== null && (
                <div className="space-y-6 animate-fadeIn">
                  {/* ATS Score card */}
                  <div className="p-5 text-center rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80">
                    <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider block mb-1">ATS Profile score</span>
                    <span className={`text-4xl font-display font-extrabold tracking-tight ${atsScore >= 75 ? 'text-emerald-500' : atsScore >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {atsScore}%
                    </span>
                  </div>

                  {/* recommended Roles */}
                  {recRoles.length > 0 && (
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">Matching Career Roles</span>
                      <div className="flex flex-wrap gap-1.5">
                        {recRoles.map((role, idx) => (
                          <span key={idx} className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-medium">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching skills */}
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">Identified Keywords ({matchingSkills.length})</span>
                    <div className="flex flex-wrap gap-1">
                      {matchingSkills.map((skill, i) => (
                        <span key={i} className="text-xxs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                          {skill}
                        </span>
                      ))}
                      {matchingSkills.length === 0 && <span className="text-xs text-slate-500 italic">None found.</span>}
                    </div>
                  </div>

                  {/* Missing skills */}
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">Critical Keyword Gaps ({missingSkills.length})</span>
                    <div className="flex flex-wrap gap-1">
                      {missingSkills.map((skill, i) => (
                        <span key={i} className="text-xxs px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/10">
                          {skill}
                        </span>
                      ))}
                      {missingSkills.length === 0 && <span className="text-xs text-slate-500 italic">No matching keyword gaps found.</span>}
                    </div>
                  </div>

                  {/* Improvement suggestions */}
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-2">ATS Optimization Tips</span>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {improvements.map((tip, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-indigo-500 font-bold shrink-0">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
};

export default PreviewWorkspace;
