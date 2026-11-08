import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, Stethoscope, ArrowRight, CheckCircle, RefreshCw, MessageSquare,
  Clock, Thermometer, Heart, Wind, Droplet, Info, BookOpen, ChevronRight,
  ClipboardList, Search, FileText, CheckSquare, AlertCircle, Menu, X,
  Download, Sliders, BrainCircuit, Sparkles, Target, BookMarked
} from 'lucide-react';

// --- TypeScript Interfaces ---
interface StageDef {
  id: string;
  title: string;
  description: string;
}

interface Vital {
  id: string;
  label: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  status: 'normal' | 'elevated' | 'low';
}

interface PatientData {
  name: string;
  age: number;
  gender: string;
  complaint: string;
  timeline: string;
  vitals: Vital[];
}

interface HistoryQuestion {
  id: string;
  q: string;
  a: string;
  correct: boolean;
  feedback: string;
}

interface ExamStep {
  id: string;
  label: string;
  finding: string;
  isKey: boolean;
}

interface InvestigationOption {
  id: string;
  name: string;
  result: string;
  isEssential: boolean;
}

interface DiagnosisOption {
  id: string;
  label: string;
  isExpected: boolean;
  rationale: string;
}

interface ManagementOption {
  id: string;
  label: string;
  isAppropriate: boolean;
  dangerous?: boolean;
  explanation: string;
}

interface GlobalState {
  historyAnswers: string[];
  examFindings: string[];
  orderedInvestigations: string[];
  selectedDiagnosis: string | null;
  diagnosticConfidence: string | null;
  selectedManagement: string[];
  notes: string;
}

interface ScoreResult {
  historyScore: number;
  examScore: number;
  invScore: number;
  diagScore: number;
  mgmtScore: number;
  finalScore: number;
}

// --- Custom Hooks ---
function useStickyState<T>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (e) {
      console.warn(`Error reading localStorage key "${key}":`, e);
      return defaultValue;
    }
  });
  
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error setting localStorage key "${key}":`, e);
    }
  }, [key, value]);
  
  return [value, setValue];
}

// --- Data Models & Clinical Logic ---
const STAGES: StageDef[] = [
  { id: 'presentation', title: 'Presentation', description: 'Initial patient handover' },
  { id: 'history', title: 'History Taking', description: 'Gather subjective information' },
  { id: 'exam', title: 'Physical Exam', description: 'Objective clinical findings' },
  { id: 'investigations', title: 'Investigations', description: 'Labs and imaging' },
  { id: 'diagnosis', title: 'Diagnosis', description: 'Synthesize findings' },
  { id: 'management', title: 'Management', description: 'Initial treatment plan' },
  { id: 'assessment', title: 'Assessment', description: 'Performance review' }
];

const patientData: PatientData = {
  name: "Alex Morgan",
  age: 22,
  gender: "Male",
  complaint: "Abdominal pain for approximately 14 hours.",
  timeline: "14h duration",
  vitals: [
    { id: 'bp', label: "Blood Pressure", value: "118/74", unit: "mmHg", icon: Droplet, status: "normal" },
    { id: 'hr', label: "Heart Rate", value: "102", unit: "bpm", icon: Heart, status: "elevated" },
    { id: 'rr', label: "Resp Rate", value: "18", unit: "/min", icon: Wind, status: "normal" },
    { id: 'temp', label: "Temperature", value: "37.8", unit: "°C", icon: Thermometer, status: "elevated" },
    { id: 'spo2', label: "SpO2", value: "99", unit: "%", icon: Activity, status: "normal" },
  ]
};

const historyQuestions: HistoryQuestion[] = [
  { id: 'h1', q: "Has the pain moved since it started?", a: "Yes, it started around my belly button yesterday, but now it is sharp and entirely in my lower right side.", correct: true, feedback: "Crucial for identifying the classic visceral-to-somatic migration of appendiceal pain." },
  { id: 'h2', q: "Have you felt nauseous or vomited?", a: "I vomited once this morning and have zero appetite.", correct: true, feedback: "Anorexia and nausea are highly sensitive for acute appendicitis." },
  { id: 'h3', q: "Any pain when passing urine?", a: "No, completely normal.", correct: true, feedback: "Important negative finding to help rule out urinary tract infection or renal colic." },
  { id: 'h4', q: "Any recent travel history?", a: "No, haven't left the city in months.", correct: false, feedback: "Less relevant given the acute, localized presentation." },
  { id: 'h5', q: "Have you had this type of pain before?", a: "Never this bad.", correct: true, feedback: "Helps establish acuity and rule out chronic conditions like IBD." }
];

const examSteps: ExamStep[] = [
  { id: 'e1', label: "Inspect Abdomen", finding: "Abdomen is flat, no visible masses or scars. Patient lies still to avoid pain.", isKey: false },
  { id: 'e2', label: "Palpate Abdomen", finding: "Marked tenderness at McBurney's point (right lower quadrant). Positive rebound tenderness and localized guarding.", isKey: true },
  { id: 'e3', label: "Percuss Abdomen", finding: "Percussion over the right lower quadrant elicits sharp pain. Otherwise tympanic.", isKey: true },
  { id: 'e4', label: "Auscultate Bowel Sounds", finding: "Bowel sounds are somewhat sluggish but present.", isKey: false }
];

const investigationOptions: InvestigationOption[] = [
  { id: 'i1', name: "Complete Blood Count (CBC)", result: "WBC 14.2 x 10^9/L (Elevated neutrophils). Hb 14.5 g/dL.", isEssential: true },
  { id: 'i2', name: "C-Reactive Protein (CRP)", result: "45 mg/L (Elevated).", isEssential: true },
  { id: 'i3', name: "Urinalysis", result: "Clear, negative for nitrites and leukocytes. Trace ketones.", isEssential: true },
  { id: 'i4', name: "Abdominal Ultrasound", result: "Aperistaltic, non-compressible blind-ended tubular structure in RLQ measuring 8mm in diameter with surrounding fluid.", isEssential: true },
  { id: 'i5', name: "Liver Function Tests (LFT)", result: "Bilirubin, ALT, AST all within normal limits.", isEssential: false }
];

const diagnosisOptions: DiagnosisOption[] = [
  { id: 'd1', label: "Acute Gastroenteritis", isExpected: false, rationale: "Incorrect. While nausea is present, gastroenteritis typically causes diffuse crampy pain and profuse diarrhea, not localized peritonism at McBurney's point." },
  { id: 'd2', label: "Acute Appendicitis", isExpected: true, rationale: "Correct. The classic migration of pain to the RLQ, localized peritonism, elevated inflammatory markers, and supportive ultrasound findings strongly suggest acute appendicitis." },
  { id: 'd3', label: "Renal Colic", isExpected: false, rationale: "Incorrect. Renal colic presents with severe colicky flank pain radiating to the groin. The negative urinalysis and different pain character make this unlikely." },
  { id: 'd4', label: "Mesenteric Adenitis", isExpected: false, rationale: "Incorrect. While a differential, this is more common in children post-viral infection. The severe localized guarding and ultrasound make appendicitis the most likely definitive diagnosis." }
];

const managementOptions: ManagementOption[] = [
  { id: 'm1', label: "Make patient Nil By Mouth (NBM)", isAppropriate: true, explanation: "Essential preparation for likely emergency surgery under general anesthesia." },
  { id: 'm2', label: "Commence IV Fluids", isAppropriate: true, explanation: "Necessary for hydration due to vomiting and NBM status." },
  { id: 'm3', label: "Administer IV Analgesia", isAppropriate: true, explanation: "Appropriate pain management; evidence shows it does not mask peritoneal signs or delay diagnosis." },
  { id: 'm4', label: "Request Urgent Surgical Consult", isAppropriate: true, explanation: "Definitive management requires surgical assessment for potential appendicectomy." },
  { id: 'm5', label: "Discharge with Oral Antibiotics", isAppropriate: false, dangerous: true, explanation: "Highly unsafe. Patient has an acute surgical abdomen and requires admission and definitive surgical evaluation." },
  { id: 'm6', label: "Administer Laxatives", isAppropriate: false, dangerous: true, explanation: "Contraindicated in suspected appendicitis due to the risk of bowel perforation." }
];

const educationalReferences = [
  "NICE Clinical Knowledge Summaries (CKS) - Appendicitis (Revised 2023)",
  "BMJ Best Practice - Acute Appendicitis (2024)",
  "American College of Emergency Physicians (ACEP) Clinical Policies on Acute Abdominal Pain"
];

// --- Scoring Engine ---
function calculateScores(state: GlobalState): ScoreResult {
  let score = 0;
  
  // 1. History (20 pts)
  const correctHist = historyQuestions.filter(q => q.correct);
  const correctHistAsked = state.historyAnswers.filter(id => correctHist.find(q => q.id === id)).length;
  const historyScore = Math.round((correctHistAsked / correctHist.length) * 20);
  score += historyScore;

  // 2. Exam (20 pts)
  const keyExams = examSteps.filter(e => e.isKey);
  const keyExamsDone = state.examFindings.filter(id => keyExams.find(e => e.id === id)).length;
  const examScore = Math.round((keyExamsDone / keyExams.length) * 20);
  score += examScore;

  // 3. Investigations (20 pts)
  const essentialInvs = investigationOptions.filter(i => i.isEssential);
  const orderedEss = state.orderedInvestigations.filter(id => essentialInvs.find(i => i.id === id)).length;
  const orderedUnnecessary = state.orderedInvestigations.filter(id => !essentialInvs.find(i => i.id === id)).length;
  let invScore = Math.round((orderedEss / essentialInvs.length) * 20) - (orderedUnnecessary * 5);
  invScore = Math.max(0, invScore); 
  score += invScore;

  // 4. Diagnosis (30 pts)
  const diagObject = diagnosisOptions.find(d => d.id === state.selectedDiagnosis);
  const diagScore = diagObject?.isExpected ? 30 : 0;
  score += diagScore;

  // 5. Management (10 pts)
  const correctMgmt = managementOptions.filter(m => m.isAppropriate);
  const dangerousMgmt = managementOptions.filter(m => m.dangerous);
  const selectedCorrectMgmt = state.selectedManagement.filter(id => correctMgmt.find(m => m.id === id)).length;
  const selectedDangerousMgmt = state.selectedManagement.filter(id => dangerousMgmt.find(m => m.id === id)).length;
  
  let mgmtScore = Math.round((selectedCorrectMgmt / correctMgmt.length) * 10) - (selectedDangerousMgmt * 10);
  mgmtScore = Math.max(0, mgmtScore);
  score += mgmtScore;

  const finalScore = Math.min(100, Math.max(0, score));
  return { historyScore, examScore, invScore, diagScore, mgmtScore, finalScore };
}

// --- Main Application Component ---
export default function App() {
  const [appState, setAppState] = useStickyState<'landing' | 'workspace'>('landing', 'caselab_appState');
  const [stageIndex, setStageIndex] = useStickyState<number>(0, 'caselab_stageIndex');
  const [highestStage, setHighestStage] = useStickyState<number>(0, 'caselab_highestStage');
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCoachOpen, setMobileCoachOpen] = useState(false);

  const mainScrollRef = useRef<HTMLElement>(null);

  // Global Case State
  const [notes, setNotes] = useStickyState<string>("", 'caselab_notes');
  const [historyAnswers, setHistoryAnswers] = useStickyState<string[]>([], 'caselab_history');
  const [examFindings, setExamFindings] = useStickyState<string[]>([], 'caselab_exam');
  const [orderedInvestigations, setOrderedInvestigations] = useStickyState<string[]>([], 'caselab_investigations');
  const [selectedDiagnosis, setSelectedDiagnosis] = useStickyState<string | null>(null, 'caselab_diagnosis');
  const [diagnosticConfidence, setDiagnosticConfidence] = useStickyState<string | null>(null, 'caselab_confidence');
  const [selectedManagement, setSelectedManagement] = useStickyState<string[]>([], 'caselab_management');

  const globalState: GlobalState = {
    historyAnswers, examFindings, orderedInvestigations, 
    selectedDiagnosis, diagnosticConfidence, selectedManagement, notes
  };

  const handleReset = () => {
    setStageIndex(0);
    setHighestStage(0);
    setNotes("");
    setHistoryAnswers([]);
    setExamFindings([]);
    setOrderedInvestigations([]);
    setSelectedDiagnosis(null);
    setDiagnosticConfidence(null);
    setSelectedManagement([]);
    setAppState('landing');
  };

  const advanceStage = () => {
    if (stageIndex < STAGES.length - 1) {
      const nextIndex = stageIndex + 1;
      setStageIndex(nextIndex);
      if (nextIndex > highestStage) {
        setHighestStage(nextIndex);
      }
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigateToStage = (index: number) => {
    if (index <= highestStage) {
      setStageIndex(index);
      setMobileMenuOpen(false);
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (appState === 'landing') {
    return <LandingPage onStart={() => setAppState('workspace')} />;
  }

  // Calculate true completion percentage based on stage requirements
  const calcProgress = () => {
    let completedSteps = 0;
    const totalSteps = 6; // Excluding presentation
    if (historyAnswers.length >= 3) completedSteps++;
    if (examSteps.filter(e => e.isKey).every(e => examFindings.includes(e.id))) completedSteps++;
    if (orderedInvestigations.length >= 1) completedSteps++;
    if (selectedDiagnosis && diagnosticConfidence) completedSteps++;
    if (selectedManagement.length >= 1) completedSteps++;
    if (stageIndex === STAGES.length - 1) completedSteps = totalSteps;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(49, 92, 75, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(49, 92, 75, 0); } 100% { box-shadow: 0 0 0 0 rgba(49, 92, 75, 0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulseGlow 2s infinite; }
        .expand-grid { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease-out, opacity 0.3s ease-out; opacity: 0; }
        .expand-grid.expanded { grid-template-rows: 1fr; opacity: 1; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #E4E9E5; border-radius: 10px; }
        
        /* Print Styles */
        @media print {
          body { background: white !important; overflow: auto !important; height: auto !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>

      {/* Printable Report Overlay (Only visible during print) */}
      <div className="hidden print-only print:block text-black bg-white w-full h-full">
        <PrintableReport state={globalState} />
      </div>

      <div className="no-print flex h-screen w-full bg-[#F6F7F5] text-[#172321] font-sans overflow-hidden">
        
        {/* Left Sidebar */}
        <aside 
          className={`${mobileMenuOpen ? 'absolute z-50 h-full w-4/5 max-w-[300px]' : 'hidden'} md:flex flex-col md:w-72 bg-[#FFFFFF] border-r border-[#E4E9E5] shadow-2xl md:shadow-none transition-all`}
          role="dialog"
          aria-modal={mobileMenuOpen}
          aria-hidden={!mobileMenuOpen && window.innerWidth < 768}
        >
          <div className="p-5 flex items-center justify-between border-b border-[#E4E9E5]">
            <div className="flex items-center gap-2 text-[#315C4B] font-bold text-xl tracking-tight">
              <Activity className="w-6 h-6" strokeWidth={2.5} /> CaseLab
            </div>
            <button className="md:hidden p-2 text-[#6C7772] hover:bg-[#F6F7F5] rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation menu">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="p-5 border-b border-[#E4E9E5]">
              <div className="text-xs font-bold text-[#6C7772] uppercase tracking-wider mb-3">Patient Case</div>
              <div className="bg-[#F6F7F5] rounded-xl p-4 border border-[#E4E9E5]">
                <p className="font-bold text-[15px] leading-tight mb-1">The Right-Sided Pain</p>
                <p className="text-sm text-[#6C7772] mb-3">{patientData.name}, {patientData.age}y</p>
                <div className="w-full bg-[#E4E9E5] rounded-full h-1.5 mb-2">
                  <div className="bg-[#315C4B] h-1.5 rounded-full transition-all duration-700 ease-out" style={{ width: `${calcProgress()}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-[#6C7772] uppercase">
                  <span>Progress</span>
                  <span>{calcProgress()}%</span>
                </div>
              </div>
            </div>

            <nav className="p-3 flex-1" aria-label="Stages Navigation">
              <div className="text-xs font-bold text-[#6C7772] uppercase tracking-wider mb-2 px-2 mt-2">Stages</div>
              <ul className="space-y-1">
                {STAGES.map((stage, idx) => {
                  const isAccessible = idx <= highestStage;
                  const isActive = idx === stageIndex;
                  const isCompleted = idx < highestStage;
                  
                  return (
                    <li key={stage.id}>
                      <button
                        onClick={() => navigateToStage(idx)}
                        disabled={!isAccessible}
                        aria-current={isActive ? 'step' : undefined}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B] ${
                          isActive ? 'bg-[#315C4B] text-white shadow-md' : 
                          isAccessible ? 'text-[#172321] hover:bg-[#F6F7F5]' : 'text-[#6C7772]/50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isActive ? 'bg-white text-[#315C4B]' :
                            isCompleted ? 'bg-[#315C4B] text-white' : 'bg-[#E4E9E5] text-[#6C7772]'
                          }`}>
                            {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <span className={`text-sm font-semibold ${isActive ? 'text-white' : ''}`}>{stage.title}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="p-5 border-t border-[#E4E9E5] bg-[#FFFFFF]">
              <label htmlFor="notes-textarea" className="text-xs font-bold text-[#6C7772] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> My Notes
              </label>
              <textarea
                id="notes-textarea"
                className="w-full bg-[#F6F7F5] border border-[#E4E9E5] rounded-xl p-3 text-sm text-[#172321] resize-none h-32 focus:outline-none focus:border-[#315C4B] focus:ring-1 focus:ring-[#315C4B] transition-all custom-scrollbar placeholder:text-[#6C7772]/60"
                placeholder="Jot down differentials and thoughts..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Top Header */}
          <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-[#FFFFFF] border-b border-[#E4E9E5] shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 bg-[#F6F7F5] hover:bg-[#E4E9E5] rounded-lg text-[#172321] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B]" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-sm font-bold">
                <span className="text-[#6C7772] hidden sm:inline">Stage {stageIndex + 1}</span>
                <ChevronRight className="w-4 h-4 text-[#6C7772] hidden sm:inline" />
                <span className="text-[#315C4B]">{STAGES[stageIndex].title}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 text-xs text-[#172321] font-bold bg-[#F6F7F5] border border-[#E4E9E5] px-3 py-1.5 rounded-full">
                <Stethoscope className="w-3.5 h-3.5 text-[#315C4B]" /> Intermediate
              </div>
              <button 
                className="xl:hidden flex items-center gap-2 px-4 py-2 bg-[#F6F7F5] border border-[#E4E9E5] hover:border-[#315C4B] text-[#315C4B] font-bold text-xs rounded-full transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B]"
                onClick={() => setMobileCoachOpen(true)}
                aria-label="Open Clinical Coach"
              >
                <BrainCircuit className="w-4 h-4" /> Coach
              </button>
            </div>
          </header>

          {/* Central Workspace + Right Panel Container */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Dynamic Stage Content */}
            <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-12 relative custom-scrollbar bg-[#F6F7F5]" tabIndex={-1}>
              <div className="max-w-3xl mx-auto w-full pb-24">
                {stageIndex === 0 && <StagePresentation onNext={advanceStage} />}
                {stageIndex === 1 && <StageHistory historyAnswers={historyAnswers} setHistoryAnswers={setHistoryAnswers} onNext={advanceStage} />}
                {stageIndex === 2 && <StageExam examFindings={examFindings} setExamFindings={setExamFindings} onNext={advanceStage} />}
                {stageIndex === 3 && <StageInvestigations orderedInvestigations={orderedInvestigations} setOrderedInvestigations={setOrderedInvestigations} onNext={advanceStage} />}
                {stageIndex === 4 && <StageDiagnosis selectedDiagnosis={selectedDiagnosis} setSelectedDiagnosis={setSelectedDiagnosis} diagnosticConfidence={diagnosticConfidence} setDiagnosticConfidence={setDiagnosticConfidence} onNext={advanceStage} />}
                {stageIndex === 5 && <StageManagement selectedManagement={selectedManagement} setSelectedManagement={setSelectedManagement} onNext={advanceStage} />}
                {stageIndex === 6 && (
                  <StageAssessment state={globalState} onReset={handleReset} />
                )}
              </div>
            </main>

            {/* Right Panel (Clinical Coach) */}
            <div 
              className={`${mobileCoachOpen ? 'fixed inset-0 z-40 bg-[#172321]/30 backdrop-blur-sm' : 'hidden'} xl:hidden transition-opacity`} 
              onClick={() => setMobileCoachOpen(false)}
              aria-hidden="true"
            ></div>
            
            <aside 
              className={`fixed inset-y-0 right-0 z-50 w-80 bg-[#FFFFFF] border-l border-[#E4E9E5] p-6 shadow-2xl transform transition-transform duration-300 ease-in-out ${mobileCoachOpen ? 'translate-x-0' : 'translate-x-full'} xl:relative xl:translate-x-0 xl:flex xl:flex-col shrink-0 overflow-y-auto custom-scrollbar`}
              role="dialog"
              aria-modal={mobileCoachOpen}
              aria-hidden={!mobileCoachOpen && window.innerWidth < 1280}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-sm flex items-center gap-2 text-[#172321] uppercase tracking-wider">
                  <div className="w-2 h-2 rounded-full bg-[#315C4B] shadow-[0_0_8px_rgba(49,92,75,0.8)] animate-pulse"></div>
                  Clinical Coach
                </h3>
                <button className="xl:hidden p-2 text-[#6C7772] hover:bg-[#F6F7F5] rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B]" onClick={() => setMobileCoachOpen(false)} aria-label="Close Clinical Coach">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-5">
                <CoachHint 
                  title="Learning Objective" 
                  text={getObjective(stageIndex)}
                  type="primary"
                />
                
                {getDynamicHint(stageIndex, globalState) && (
                  <CoachHint 
                    title="Contextual Hint" 
                    text={getDynamicHint(stageIndex, globalState) as string}
                    type="secondary"
                  />
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

// --- Dynamic Coach Logic ---
function getObjective(stage: number): string {
  const objectives = [
    "Review patient vitals and identify any signs of clinical instability. Note the timeline of symptoms.",
    "Elicit a detailed pain history. Focus on migration, associated symptoms, and rule out other systems.",
    "Identify localized signs of peritonitis. Relate abdominal findings to the history.",
    "Select targeted investigations to confirm inflammation and rule out key differentials like renal stones.",
    "Synthesize the subjective and objective findings to select the definitive diagnosis.",
    "Construct a safe initial management plan prioritizing patient stability and definitive treatment pathways.",
    "Review your clinical reasoning, identify missed findings, and review feedback."
  ];
  return objectives[stage];
}

function getDynamicHint(stage: number, state: GlobalState): string | null {
  switch (stage) {
    case 0:
      return "Mild tachycardia and low-grade fever are visible. Consider whether the patient is septic or responding to localized inflammation/pain.";
    case 1:
      if (state.historyAnswers.length < 2) return "Start by asking about the pain's movement and associated gastrointestinal symptoms (like nausea).";
      if (!state.historyAnswers.includes('h3')) return "Don't forget to ask urinary questions to rule out renal colic or UTI.";
      return "You have gathered a good history. Consider how migrating pain limits your differential diagnosis.";
    case 2:
      if (state.examFindings.length === 0) return "Ensure you perform a full abdominal examination, starting with inspection and moving to palpation.";
      if (!state.examFindings.includes('e2')) return "You must palpate the right lower quadrant to assess for localized peritonism (rebound/guarding).";
      return "Localized peritonism at McBurney's point is a critical sign of a surgical abdomen.";
    case 3:
      if (state.orderedInvestigations.length === 0) return "Order inflammatory markers and consider definitive imaging. Don't blindly select every test.";
      if (!state.orderedInvestigations.includes('i4')) return "While blood tests show inflammation, what imaging modality is best for visualizing the appendix in a young, thin male?";
      if (state.orderedInvestigations.includes('i5')) return "Liver function tests are not typically indicated for isolated right lower quadrant pain without jaundice or RUQ pain.";
      return "Review the ultrasound results carefully. A thickened, blind-ended structure is highly suggestive.";
    case 4:
      if (!state.selectedDiagnosis) return "Synthesize: Migrating pain + localized peritonism + elevated inflammatory markers + thickened structure on US = ?";
      return "Ensure you select an appropriate diagnostic confidence level before proceeding.";
    case 5:
      if (state.selectedManagement.length === 0) return "This patient likely requires surgery. What must their oral intake status be? Do they need IV access?";
      if (state.selectedManagement.includes('m5') || state.selectedManagement.includes('m6')) return "Warning: Review your selections. Are laxatives or discharge appropriate for an acute surgical abdomen?";
      return "Ensure pain is managed and surgical teams are involved.";
    default:
      return null;
  }
}

function CoachHint({ title, text, type }: { title: string, text: string, type: 'primary' | 'secondary' }) {
  const isPrimary = type === 'primary';
  return (
    <div className={`rounded-xl p-5 border shadow-sm animate-fade-in-up ${isPrimary ? 'bg-[#FFFFFF] border-[#E4E9E5]' : 'bg-[#F6F7F5] border-[#315C4B]/20'}`}>
      <div className={`flex items-center gap-2 mb-3 ${isPrimary ? 'text-[#172321]' : 'text-[#315C4B]'}`}>
        {isPrimary ? <Target className="w-4 h-4" /> : <Info className="w-4 h-4" />}
        <p className="font-bold text-xs uppercase tracking-wider">{title}</p>
      </div>
      <p className="text-sm text-[#172321] leading-relaxed font-medium">{text}</p>
    </div>
  );
}

// --- Stages Components ---

function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="h-screen w-full bg-[#172321] flex flex-col items-center justify-center text-white relative overflow-hidden font-sans">
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-[#315C4B] rounded-full mix-blend-screen filter blur-[150px] opacity-50 animate-float"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-[#315C4B] rounded-full mix-blend-screen filter blur-[150px] opacity-40 animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')]"></div>

      <main className="z-10 text-center max-w-4xl px-6 flex flex-col items-center">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#315C4B] to-[#172321] rounded-3xl shadow-[0_0_60px_rgba(49,92,75,0.7)] mb-10 border border-[#315C4B]/60 animate-pulse-glow">
          <Activity className="w-12 h-12 text-[#DCEBE5]" strokeWidth={2} />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-[#DCEBE5] to-white animate-fade-in-up">
          Clinical reasoning,<br />made visible.
        </h1>
        
        <p className="text-lg md:text-xl text-[#6C7772] font-medium mb-12 leading-relaxed max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Immerse yourself in interactive patient cases. Practice gathering history, interpreting findings, and making evidence-based clinical decisions.
        </p>
        
        <button 
          onClick={onStart}
          className="group relative inline-flex items-center gap-3 bg-[#315C4B] text-white px-10 py-5 rounded-xl text-lg font-bold transition-all hover:bg-[#234235] shadow-xl hover:shadow-2xl animate-fade-in-up overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-[#315C4B]/50"
          style={{ animationDelay: '0.2s' }}
        >
          <span className="relative z-10 flex items-center gap-3">
            Start Clinical Simulation <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </main>
      
      <footer className="absolute bottom-8 text-[#6C7772] text-xs font-bold tracking-widest uppercase animate-fade-in flex items-center gap-2">
        <Info className="w-4 h-4" /> Educational purposes only
      </footer>
    </div>
  );
}

function StagePresentation({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-[#172321] mb-2 tracking-tight">Patient Presentation</h2>
        <p className="text-[#6C7772] text-base font-medium">Review the initial handover before proceeding to history taking.</p>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E4E9E5] rounded-2xl p-6 md:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E4E9E5] pb-6 mb-6 gap-4">
          <div>
            <h3 className="text-2xl font-black text-[#172321] mb-1">{patientData.name}</h3>
            <p className="text-[#6C7772] font-bold">{patientData.age} years old • {patientData.gender}</p>
          </div>
          <div className="inline-flex items-center gap-2 text-[#D97706] bg-[#FEF3C7] px-4 py-2 rounded-xl text-sm font-bold border border-[#FDE68A] shadow-sm">
            <Clock className="w-4 h-4" /> {patientData.timeline}
          </div>
        </div>

        <div className="mb-8">
          <h4 className="text-xs uppercase font-bold text-[#6C7772] tracking-widest mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#315C4B]" /> Presenting Complaint
          </h4>
          <p className="text-xl text-[#172321] font-medium leading-relaxed bg-[#F6F7F5] p-6 rounded-xl border border-[#E4E9E5]">
            "{patientData.complaint}"
          </p>
        </div>

        <div>
          <h4 className="text-xs uppercase font-bold text-[#6C7772] tracking-widest mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#315C4B]" /> Initial Vitals
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {patientData.vitals.map((vital) => (
              <div key={vital.id} className={`bg-[#FFFFFF] border rounded-xl p-4 flex flex-col shadow-sm transition-colors ${vital.status === 'elevated' ? 'border-[#D97706]/30 bg-[#FEF3C7]/30' : 'border-[#E4E9E5]'}`}>
                <vital.icon className={`w-5 h-5 mb-3 ${vital.status === 'elevated' ? 'text-[#D97706]' : 'text-[#315C4B]'}`} />
                <span className="text-2xl font-black text-[#172321] leading-none mb-1 tabular-nums">{vital.value}</span>
                <span className="text-[10px] uppercase font-bold text-[#6C7772] tracking-wider">{vital.label} <span className="lowercase">({vital.unit})</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <NextButton onClick={onNext} text="Start History Taking" />
      </div>
    </div>
  );
}

function StageHistory({ historyAnswers, setHistoryAnswers, onNext }: { historyAnswers: string[], setHistoryAnswers: React.Dispatch<React.SetStateAction<string[]>>, onNext: () => void }) {
  const handleAsk = (id: string) => {
    if (!historyAnswers.includes(id)) {
      setHistoryAnswers(prev => [...prev, id]);
    }
  };

  const hasMinimum = historyAnswers.length >= 3;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-[#172321] mb-2 tracking-tight">History Taking</h2>
        <p className="text-[#6C7772] text-base font-medium">Select relevant questions to gather clinical information. Avoid unnecessary interrogation.</p>
      </div>

      <div className="space-y-4 mb-8">
        {historyQuestions.map((q) => {
          const isAsked = historyAnswers.includes(q.id);
          return (
            <button 
              key={q.id}
              onClick={() => handleAsk(q.id)}
              disabled={isAsked}
              className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B] focus-visible:ring-offset-2 ${
                isAsked ? 'bg-[#F6F7F5] border-[#E4E9E5] cursor-default' : 'bg-[#FFFFFF] border-[#E4E9E5] hover:border-[#315C4B] cursor-pointer shadow-sm hover:shadow-md'
              }`}
            >
              {!isAsked && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent group-hover:bg-[#315C4B] transition-colors"></div>}
              
              <div className="flex gap-4">
                <div className={`mt-0.5 shrink-0 transition-colors ${isAsked ? 'text-[#315C4B]/40' : 'text-[#315C4B]'}`}>
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-[15px] leading-snug transition-colors ${isAsked ? 'text-[#6C7772]' : 'text-[#172321]'}`}>
                    "{q.q}"
                  </p>
                  
                  <div className={`expand-grid ${isAsked ? 'expanded mt-4' : ''}`}>
                    <div className="overflow-hidden">
                      <div className="p-4 bg-[#FFFFFF] text-[#172321] rounded-xl border border-[#E4E9E5] text-sm font-medium leading-relaxed relative shadow-sm">
                        <div className="absolute top-4 left-4 w-1.5 h-1.5 rounded-full bg-[#315C4B]"></div>
                        <span className="pl-5 block">"{q.a}"</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center bg-[#FFFFFF] p-5 rounded-2xl border border-[#E4E9E5] shadow-sm">
        <div className="text-sm font-bold text-[#6C7772]">
          Questions asked: <span className="text-[#315C4B]">{historyAnswers.length}</span> / {historyQuestions.length}
        </div>
        <div className="flex items-center gap-4">
          {!hasMinimum && <span className="text-xs font-bold text-[#D97706] hidden sm:block">Ask at least 3 questions</span>}
          <NextButton onClick={onNext} text="Proceed to Exam" disabled={!hasMinimum} />
        </div>
      </div>
    </div>
  );
}

function StageExam({ examFindings, setExamFindings, onNext }: { examFindings: string[], setExamFindings: React.Dispatch<React.SetStateAction<string[]>>, onNext: () => void }) {
  const handleExamine = (id: string) => {
    if (!examFindings.includes(id)) {
      setExamFindings(prev => [...prev, id]);
    }
  };

  const keyExams = examSteps.filter(e => e.isKey);
  const hasMinimum = keyExams.every(ke => examFindings.includes(ke.id));

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-[#172321] mb-2 tracking-tight">Physical Examination</h2>
        <p className="text-[#6C7772] text-base font-medium">Perform targeted physical examinations to gather objective signs.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {examSteps.map((step) => {
          const isExamined = examFindings.includes(step.id);
          return (
            <button 
              key={step.id}
              onClick={() => handleExamine(step.id)}
              disabled={isExamined}
              className={`text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col h-full outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B] focus-visible:ring-offset-2 ${
                isExamined ? 'bg-[#FFFFFF] border-[#315C4B] shadow-sm' : 'bg-[#FFFFFF] border-[#E4E9E5] hover:border-[#315C4B] cursor-pointer hover:shadow-md'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg transition-colors ${isExamined ? 'bg-[#315C4B] text-white' : 'bg-[#F6F7F5] text-[#315C4B]'}`}>
                  <Search className="w-5 h-5" />
                </div>
                <p className={`font-bold transition-colors ${isExamined ? 'text-[#172321]' : 'text-[#6C7772]'}`}>{step.label}</p>
              </div>
              
              <div className="flex-1 flex flex-col justify-end">
                {isExamined ? (
                  <div className="animate-fade-in text-sm text-[#172321] bg-[#F6F7F5] p-4 rounded-xl border border-[#E4E9E5] leading-relaxed font-medium">
                    {step.finding}
                  </div>
                ) : (
                  <div className="text-sm text-[#6C7772] font-bold text-center py-4 bg-[#F6F7F5]/50 rounded-xl border border-dashed border-[#E4E9E5]">
                    Click to examine
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center bg-[#FFFFFF] p-5 rounded-2xl border border-[#E4E9E5] shadow-sm">
        <div className="text-sm font-bold text-[#6C7772]">
           Exams performed: <span className="text-[#315C4B]">{examFindings.length}</span> / {examSteps.length}
        </div>
        <div className="flex items-center gap-4">
          {!hasMinimum && <span className="text-xs font-bold text-[#D97706] hidden sm:block">Perform all key diagnostic exams</span>}
          <NextButton onClick={onNext} text="Order Investigations" disabled={!hasMinimum} />
        </div>
      </div>
    </div>
  );
}

function StageInvestigations({ orderedInvestigations, setOrderedInvestigations, onNext }: { orderedInvestigations: string[], setOrderedInvestigations: React.Dispatch<React.SetStateAction<string[]>>, onNext: () => void }) {
  const handleOrder = (id: string) => {
    if (!orderedInvestigations.includes(id)) {
      setOrderedInvestigations(prev => [...prev, id]);
    }
  };

  const hasMinimum = orderedInvestigations.length >= 1;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-[#172321] mb-2 tracking-tight">Investigations</h2>
        <p className="text-[#6C7772] text-base font-medium">Order appropriate labs and imaging. Avoid shotgun testing.</p>
      </div>

      <div className="space-y-4 mb-8">
        {investigationOptions.map((inv) => {
          const isOrdered = orderedInvestigations.includes(inv.id);
          
          return (
            <div key={inv.id} className={`bg-[#FFFFFF] border rounded-2xl p-5 shadow-sm transition-colors ${isOrdered ? 'border-[#E4E9E5]' : 'border-[#E4E9E5] hover:border-[#315C4B]/50'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ClipboardList className={`w-5 h-5 ${isOrdered ? 'text-[#315C4B]/50' : 'text-[#315C4B]'}`} />
                  <p className="font-bold text-[15px] text-[#172321]">{inv.name}</p>
                </div>
                
                {!isOrdered && (
                  <button 
                    onClick={() => handleOrder(inv.id)}
                    className="px-4 py-2 bg-[#F6F7F5] hover:bg-[#DCEBE5] text-[#315C4B] font-bold text-sm rounded-xl transition-colors border border-[#E4E9E5] outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B]"
                  >
                    Order Test
                  </button>
                )}
                {isOrdered && (
                  <div className="px-4 py-2 flex items-center justify-center gap-2 text-[#315C4B] font-bold text-sm bg-[#DCEBE5]/30 rounded-xl border border-[#DCEBE5]">
                    <CheckCircle className="w-4 h-4" /> Available
                  </div>
                )}
              </div>
              
              <div className={`expand-grid ${isOrdered ? 'expanded mt-4' : ''}`}>
                <div className="overflow-hidden">
                  <div className="p-4 bg-[#F6F7F5] rounded-xl border border-[#E4E9E5] text-sm text-[#172321] font-medium leading-relaxed">
                    <span className="text-[10px] uppercase text-[#6C7772] tracking-widest font-bold block mb-1">Result</span>
                    {inv.result}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center bg-[#FFFFFF] p-5 rounded-2xl border border-[#E4E9E5] shadow-sm">
        <div className="text-sm font-bold text-[#6C7772]">
           Tests ordered: <span className="text-[#315C4B]">{orderedInvestigations.length}</span>
        </div>
        <div className="flex items-center gap-4">
          {!hasMinimum && <span className="text-xs font-bold text-[#D97706] hidden sm:block">Order at least 1 test</span>}
          <NextButton onClick={onNext} text="Determine Diagnosis" disabled={!hasMinimum} />
        </div>
      </div>
    </div>
  );
}

function StageDiagnosis({ selectedDiagnosis, setSelectedDiagnosis, diagnosticConfidence, setDiagnosticConfidence, onNext }: { selectedDiagnosis: string | null, setSelectedDiagnosis: React.Dispatch<React.SetStateAction<string | null>>, diagnosticConfidence: string | null, setDiagnosticConfidence: React.Dispatch<React.SetStateAction<string | null>>, onNext: () => void }) {
  const isComplete = selectedDiagnosis !== null && diagnosticConfidence !== null;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-[#172321] mb-2 tracking-tight">Differential Diagnosis</h2>
        <p className="text-[#6C7772] text-base font-medium">Synthesize the clinical data and select the definitive diagnosis.</p>
      </div>

      <div className="grid gap-3 mb-8">
        {diagnosisOptions.map((diag) => {
          const isSelected = selectedDiagnosis === diag.id;
          return (
            <button 
              key={diag.id}
              onClick={() => setSelectedDiagnosis(diag.id)}
              className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B] focus-visible:ring-offset-2 ${
                isSelected ? 'bg-[#315C4B] border-[#315C4B] text-white shadow-md transform scale-[1.01]' : 'bg-[#FFFFFF] border-[#E4E9E5] text-[#172321] hover:border-[#315C4B]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-white' : 'border-[#E4E9E5]'}`}>
                {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
              </div>
              <p className="font-bold text-base">{diag.label}</p>
            </button>
          );
        })}
      </div>

      {selectedDiagnosis && (
        <div className="bg-[#FFFFFF] border border-[#E4E9E5] rounded-2xl p-6 mb-8 animate-fade-in shadow-sm">
          <h3 className="text-sm font-bold text-[#172321] mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-[#315C4B]" /> Diagnostic Confidence
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            {['Low', 'Moderate', 'High'].map(level => (
              <button
                key={level}
                onClick={() => setDiagnosticConfidence(level)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B] ${
                  diagnosticConfidence === level 
                    ? 'bg-[#DCEBE5] border-[#315C4B] text-[#315C4B] shadow-inner' 
                    : 'bg-[#F6F7F5] border-[#E4E9E5] text-[#6C7772] hover:bg-[#FFFFFF]'
                }`}
              >
                {level} Confidence
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <NextButton onClick={onNext} text="Plan Management" disabled={!isComplete} />
      </div>
    </div>
  );
}

function StageManagement({ selectedManagement, setSelectedManagement, onNext }: { selectedManagement: string[], setSelectedManagement: React.Dispatch<React.SetStateAction<string[]>>, onNext: () => void }) {
  const toggleManagement = (id: string) => {
    setSelectedManagement(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const hasMinimum = selectedManagement.length >= 1;

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-[#172321] mb-2 tracking-tight">Management Plan</h2>
        <p className="text-[#6C7772] text-base font-medium">Select all appropriate immediate management steps for your diagnosis.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {managementOptions.map((opt) => {
          const isSelected = selectedManagement.includes(opt.id);
          return (
            <button 
              key={opt.id}
              onClick={() => toggleManagement(opt.id)}
              className={`text-left p-5 rounded-2xl border transition-all duration-200 flex items-start gap-4 outline-none focus-visible:ring-2 focus-visible:ring-[#315C4B] focus-visible:ring-offset-2 ${
                isSelected ? 'bg-[#DCEBE5]/30 border-[#315C4B] shadow-sm' : 'bg-[#FFFFFF] border-[#E4E9E5] hover:border-[#315C4B] shadow-sm'
              }`}
            >
              <div className={`mt-0.5 shrink-0 transition-colors ${isSelected ? 'text-[#315C4B]' : 'text-[#E4E9E5]'}`}>
                <CheckSquare className="w-5 h-5" />
              </div>
              <p className={`font-bold text-[15px] leading-snug ${isSelected ? 'text-[#315C4B]' : 'text-[#172321]'}`}>{opt.label}</p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center bg-[#FFFFFF] p-5 rounded-2xl border border-[#E4E9E5] shadow-sm">
        <div className="text-sm font-bold text-[#6C7772]">
           Actions selected: <span className="text-[#315C4B]">{selectedManagement.length}</span>
        </div>
        <div className="flex items-center gap-4">
          {!hasMinimum && <span className="text-xs font-bold text-[#D97706] hidden sm:block">Select at least 1 action</span>}
          <button 
            onClick={onNext}
            disabled={!hasMinimum}
            className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#172321]/30 ${
              hasMinimum 
                ? 'bg-[#172321] text-white hover:bg-[#315C4B] shadow-md hover:shadow-lg hover:-translate-y-0.5' 
                : 'bg-[#E4E9E5] text-[#6C7772] opacity-50 cursor-not-allowed'
            }`}
          >
            Submit Assessment <CheckCircle className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StageAssessment({ state, onReset }: { state: GlobalState, onReset: () => void }) {
  const scores = calculateScores(state);
  const diagObject = diagnosisOptions.find(d => d.id === state.selectedDiagnosis);
  
  const keyExams = examSteps.filter(e => e.isKey);
  const keyExamsDone = state.examFindings.filter(id => keyExams.find(e => e.id === id)).length;
  
  const dangerousMgmt = managementOptions.filter(m => m.dangerous);
  const selectedDangerousMgmt = state.selectedManagement.filter(id => dangerousMgmt.find(m => m.id === id)).length;

  return (
    <div className="animate-fade-in-up">
      <div className="bg-[#FFFFFF] border border-[#E4E9E5] rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F6F7F5] rounded-full blur-3xl opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black tracking-tight text-[#172321] mb-2">Final Assessment</h2>
          <p className="text-[#6C7772] font-bold">Case simulation complete for {patientData.name}</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 mb-10 relative z-10">
          {/* Score Card */}
          <div className="md:col-span-1 bg-[#F6F7F5] rounded-2xl p-6 border border-[#E4E9E5] flex flex-col items-center justify-center shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#6C7772] mb-3">Overall Score</h3>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-6xl font-black text-[#172321] tracking-tighter leading-none">{scores.finalScore}</span>
              <span className="text-xl font-bold text-[#6C7772]">/100</span>
            </div>
            {scores.finalScore >= 80 ? (
               <p className="text-sm text-[#315C4B] font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4"/> Excellent</p>
            ) : scores.finalScore >= 60 ? (
               <p className="text-sm text-[#D97706] font-bold">Good, but review gaps</p>
            ) : (
               <p className="text-sm text-[#DC2626] font-bold">Significant review needed</p>
            )}
          </div>

          {/* Breakdown */}
          <div className="md:col-span-2 bg-[#FFFFFF] rounded-2xl p-6 border border-[#E4E9E5] shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#6C7772] mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              <ScoreBar label="History Taking" current={scores.historyScore} max={20} />
              <ScoreBar label="Physical Exam" current={scores.examScore} max={20} />
              <ScoreBar label="Investigations" current={scores.invScore} max={20} />
              <ScoreBar label="Diagnosis" current={scores.diagScore} max={30} />
              <ScoreBar label="Clinical Safety" current={scores.mgmtScore} max={10} />
            </div>
          </div>
        </div>

        {/* Dynamic Diagnosis Feedback */}
        <div className={`p-6 rounded-2xl border mb-8 shadow-sm ${diagObject?.isExpected ? 'bg-[#F6F7F5] border-[#E4E9E5]' : 'bg-[#FEF3C7]/30 border-[#FDE68A]'}`}>
          <div className="flex items-start gap-4">
            <div className={`mt-1 shrink-0 ${diagObject?.isExpected ? 'text-[#315C4B]' : 'text-[#D97706]'}`}>
              {diagObject?.isExpected ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div>
              <h4 className="font-bold text-lg text-[#172321] mb-1">
                Your Diagnosis: {diagObject?.label || 'None selected'}
              </h4>
              <p className="text-sm font-bold text-[#6C7772] mb-3">Confidence Level: {state.diagnosticConfidence}</p>
              <p className="text-sm text-[#172321] font-medium leading-relaxed bg-white/60 p-4 rounded-xl">
                {diagObject?.rationale || 'No rationale available.'}
              </p>
            </div>
          </div>
        </div>

        {/* Management Feedback Review */}
        {state.selectedManagement.length > 0 && (
          <div className="mb-8 bg-[#FFFFFF] border border-[#E4E9E5] rounded-2xl p-6 shadow-sm">
             <h4 className="text-xs font-bold uppercase tracking-widest text-[#6C7772] mb-4">Management Decisions Feedback</h4>
             <div className="space-y-3">
                {state.selectedManagement.map(id => {
                  const opt = managementOptions.find(m => m.id === id);
                  if (!opt) return null;
                  return (
                    <div key={id} className={`p-4 rounded-xl border flex items-start gap-3 ${opt.isAppropriate ? 'bg-[#F6F7F5] border-[#E4E9E5]' : 'bg-[#FEF3C7]/30 border-[#D97706]/30'}`}>
                      <div className={`mt-0.5 shrink-0 ${opt.isAppropriate ? 'text-[#315C4B]' : 'text-[#D97706]'}`}>
                         {opt.isAppropriate ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className={`font-bold text-sm mb-1 ${opt.isAppropriate ? 'text-[#172321]' : 'text-[#D97706]'}`}>{opt.label}</p>
                        <p className="text-sm text-[#6C7772] font-medium">{opt.explanation}</p>
                      </div>
                    </div>
                  )
                })}
             </div>
          </div>
        )}

        {/* Key Missed Findings (if any) */}
        {(keyExamsDone < keyExams.length || selectedDangerousMgmt > 0) && (
          <div className="mb-8 p-5 bg-[#FFFFFF] rounded-2xl border border-[#E4E9E5] shadow-sm">
            <h4 className="font-bold text-[15px] text-[#172321] mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#D97706]" /> Priority Areas for Improvement
            </h4>
            <ul className="space-y-2 text-sm text-[#6C7772] font-medium list-disc pl-5">
              {keyExamsDone < keyExams.length && <li>Ensure a complete physical exam is performed, specifically palpation and percussion for localized peritonism.</li>}
              {selectedDangerousMgmt > 0 && <li>Review safe management protocols. Discharging or administering laxatives to an acute surgical abdomen is unsafe.</li>}
            </ul>
          </div>
        )}

        {/* Educational References */}
        <div className="mb-8 p-5 bg-[#F6F7F5] rounded-2xl border border-[#E4E9E5]">
          <h4 className="font-bold text-xs uppercase tracking-widest text-[#6C7772] mb-3 flex items-center gap-2">
            <BookMarked className="w-3.5 h-3.5" /> Educational References
          </h4>
          <ul className="space-y-2 text-sm text-[#172321] font-medium list-disc pl-5">
            {educationalReferences.map((ref, idx) => (
               <li key={idx}>{ref}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-[#E4E9E5] pt-8">
          <button 
            onClick={() => window.print()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FFFFFF] border border-[#E4E9E5] text-[#172321] px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#F6F7F5] transition-colors shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#172321]"
          >
            <Download className="w-4 h-4" /> Export Summary
          </button>
          <button 
            onClick={onReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#172321] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#315C4B] transition-all shadow-md hover:shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-[#315C4B]/50"
          >
            <RefreshCw className="w-4 h-4" /> Start New Case
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function NextButton({ onClick, disabled, text }: { onClick: () => void, disabled?: boolean, text: string }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all outline-none focus-visible:ring-4 focus-visible:ring-[#315C4B]/50 ${
        disabled 
          ? 'bg-[#E4E9E5] text-[#6C7772] opacity-50 cursor-not-allowed' 
          : 'bg-[#315C4B] text-white hover:bg-[#234235] shadow-md hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {text} <ArrowRight className="w-4 h-4" />
    </button>
  );
}

function ScoreBar({ label, current, max }: { label: string, current: number, max: number }) {
  const percentage = (current / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-[#172321] mb-1.5">
        <span>{label}</span>
        <span className="text-[#6C7772]">{current} / {max}</span>
      </div>
      <div className="w-full bg-[#F6F7F5] rounded-full h-2 border border-[#E4E9E5]">
        <div className="bg-[#315C4B] h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

// --- Printable Report Component ---
function PrintableReport({ state }: { state: GlobalState }) {
  const scores = calculateScores(state);
  const diagObject = diagnosisOptions.find(d => d.id === state.selectedDiagnosis);
  
  return (
    <div className="font-sans text-black max-w-4xl mx-auto p-8">
      <header className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">CaseLab Summary</h1>
          <p className="text-sm font-bold text-gray-600 mt-1">Clinical Reasoning Assessment Report</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold">Date: {new Date().toLocaleDateString()}</p>
          <p>Simulation ID: CL-001</p>
        </div>
      </header>

      <section className="mb-6 flex gap-8 border border-gray-300 p-4 bg-gray-50 rounded-lg">
        <div>
           <p className="text-xs uppercase font-bold text-gray-500 mb-1">Final Score</p>
           <p className="text-4xl font-black text-black">{scores.finalScore} / 100</p>
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
           <div><p className="font-bold text-gray-500">History</p><p className="font-bold text-sm">{scores.historyScore}/20</p></div>
           <div><p className="font-bold text-gray-500">Exam</p><p className="font-bold text-sm">{scores.examScore}/20</p></div>
           <div><p className="font-bold text-gray-500">Tests</p><p className="font-bold text-sm">{scores.invScore}/20</p></div>
           <div><p className="font-bold text-gray-500">Diagnosis</p><p className="font-bold text-sm">{scores.diagScore}/30</p></div>
           <div><p className="font-bold text-gray-500">Safety</p><p className="font-bold text-sm">{scores.mgmtScore}/10</p></div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-black bg-gray-100 px-3 py-1 mb-3">Patient Demographics</h2>
        <div className="grid grid-cols-2 gap-4 px-3 text-sm">
          <div><span className="font-bold">Name:</span> {patientData.name}</div>
          <div><span className="font-bold">Age/Sex:</span> {patientData.age} / {patientData.gender}</div>
          <div className="col-span-2"><span className="font-bold">Complaint:</span> {patientData.complaint}</div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-6 mb-6">
         <section>
           <h2 className="text-lg font-black bg-gray-100 px-3 py-1 mb-3">Clinical History Gathered</h2>
           <ul className="list-disc pl-8 text-sm space-y-2">
             {state.historyAnswers.map(id => {
               const q = historyQuestions.find(h => h.id === id);
               return <li key={id}><span className="font-bold">{q?.q}</span><br/>"{q?.a}"</li>;
             })}
           </ul>
         </section>
         <section>
           <h2 className="text-lg font-black bg-gray-100 px-3 py-1 mb-3">Physical Exam Findings</h2>
           <ul className="list-disc pl-8 text-sm space-y-2">
             {state.examFindings.map(id => {
               const e = examSteps.find(ex => ex.id === id);
               return <li key={id}><span className="font-bold">{e?.label}:</span> {e?.finding}</li>;
             })}
           </ul>
         </section>
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-black bg-gray-100 px-3 py-1 mb-3">Investigations Ordered</h2>
        <ul className="list-disc pl-8 text-sm space-y-2">
          {state.orderedInvestigations.map(id => {
            const i = investigationOptions.find(inv => inv.id === id);
            return <li key={id}><span className="font-bold">{i?.name}:</span> {i?.result}</li>;
          })}
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-black bg-gray-100 px-3 py-1 mb-3">Diagnostic Conclusion</h2>
        <div className="px-3 text-sm">
          <p><span className="font-bold">Selected Diagnosis:</span> {diagObject?.label || 'None'}</p>
          <p><span className="font-bold">Confidence:</span> {state.diagnosticConfidence || 'N/A'}</p>
          <p className="mt-2"><span className="font-bold">Assessment Rationale:</span> {diagObject?.rationale}</p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-black bg-gray-100 px-3 py-1 mb-3">Management Plan Selected</h2>
        <ul className="list-disc pl-8 text-sm space-y-1">
          {state.selectedManagement.map(id => {
            const m = managementOptions.find(opt => opt.id === id);
            return <li key={id}>{m?.label} {m?.dangerous && <span className="font-bold text-red-600">(Unsafe choice)</span>}</li>;
          })}
        </ul>
      </section>

      {state.notes && (
         <section className="mb-6 border-t pt-4">
           <h2 className="text-sm font-black uppercase text-gray-500 mb-2">Student Notes:</h2>
           <p className="text-sm whitespace-pre-wrap px-3">{state.notes}</p>
         </section>
      )}

      <footer className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
        <strong>Educational References:</strong> {educationalReferences.join(" • ")}
        <br/><br/>
        For educational purposes only. This simulated case is not a substitute for clinical supervision, professional medical judgment, or local clinical protocols.
      </footer>
    </div>
  );
}