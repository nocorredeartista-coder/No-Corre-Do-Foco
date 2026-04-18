import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Play, 
  Trash2, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Smile, 
  Zap, 
  Coffee,
  ChevronRight,
  Target,
  Home,
  Menu,
  X,
  AlertCircle,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getArtistDevelopmentTask, type SuggestedTask } from './services/geminiService';

// --- Types ---

type Recurring = 'none' | 'daily' | 'weekly';
type Mood = 'tired' | 'neutral' | 'focused';
type View = 'dashboard' | 'tasks' | 'progress' | 'focus';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  recurring: Recurring;
  createdAt: number;
  reminderTime?: string; // HH:mm
}

interface DailyCheckItem {
  id: string;
  text: string;
  completed: boolean;
}

interface DailyLog {
  date: string; // YYYY-MM-DD
  completedTasks: number;
  dailyChecks: number;
}

// --- Constants ---

const SYSTEM_ALERTS = [
  "Hora de fazer algo pelo seu corre",
  "10 minutos já resolvem hoje",
  "Você não pode parar agora",
  "Organizar é fácil. Executar é o que muda.",
  "Sua música não vai se fazer sozinha.",
  "O mundo já tem ouvintes demais, seja o artista."
];

const INITIAL_DAILY_CHECKS: DailyCheckItem[] = [
  { id: '1', text: 'Fiz algo pela minha música', completed: false },
  { id: '2', text: 'Divulguei meu som', completed: false },
  { id: '3', text: 'Organizei minhas ideias', completed: false },
  { id: '4', text: 'Cuidei de mim', completed: false },
];

// --- Components ---

interface TaskItemProps {
  task: Task;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  startFocus: (task: Task, duration: number) => void;
  shareTask: (task: Task) => void;
  key?: string;
}

const TaskItem = ({ task, toggleTask, deleteTask, startFocus, shareTask }: TaskItemProps) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className={`task-item-bg mb-3 group ${!task.completed ? 'hover:bg-white/5' : ''}`}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={() => toggleTask(task.id)}
          className="text-white hover:scale-110 transition-transform"
        >
          <div className={`check-box ${task.completed ? 'check-box-done bg-success border-success' : 'border-text-dim'}`}>
            {task.completed && <CheckCircle2 className="w-3 h-3 text-black" />}
          </div>
        </button>
        <div className="flex-1">
          <h3 className={`font-bold text-sm ${task.completed ? 'line-through text-text-dim' : 'text-white'}`}>
            {task.text}
          </h3>
          <div className="flex gap-2 items-center mt-1">
            {task.recurring !== 'none' && (
              <span className="text-[9px] uppercase font-bold tracking-wider text-text-dim">
                {task.recurring === 'daily' ? 'Diário' : 'Semanal'}
              </span>
            )}
            {task.reminderTime && (
              <span className="text-[9px] uppercase font-bold tracking-wider text-accent flex items-center gap-1">
                <Clock className="w-2 h-2" />
                {task.reminderTime}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {task.completed && (
          <button 
            onClick={() => shareTask(task)}
            className="p-1.5 text-accent hover:scale-110 transition-transform"
            title="Compartilhar"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
        {!task.completed && (
          <button 
            onClick={() => startFocus(task, 25)}
            className="immersive-btn bg-accent text-black p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Começar Foco"
          >
            <Play className="w-3 h-3 fill-current" />
          </button>
        )}
        <button 
          onClick={() => deleteTask(task.id)}
          className="p-1.5 text-text-dim hover:text-white transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  </motion.div>
);

export default function App() {
  // --- State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyChecks, setDailyChecks] = useState<DailyCheckItem[]>(INITIAL_DAILY_CHECKS);
  const [mood, setMood] = useState<Mood>('neutral');
  const [view, setView] = useState<View>('dashboard');
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [timer, setTimer] = useState<number>(0); // in seconds
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [randomAlert, setRandomAlert] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<SuggestedTask | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- Effects ---

  useEffect(() => {
    setRandomAlert(SYSTEM_ALERTS[Math.floor(Math.random() * SYSTEM_ALERTS.length)]);
  }, [view]);

  // Load from localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem('tasks');
    const savedChecks = localStorage.getItem('dailyChecks');
    const savedMood = localStorage.getItem('mood');
    const savedHistory = localStorage.getItem('history');
    const lastAccess = localStorage.getItem('lastAccess');

    const today = new Date().toISOString().split('T')[0];

    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedMood) setMood(savedMood as Mood);
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    // Reset daily checks if it's a new day
    if (lastAccess !== today) {
      setDailyChecks(INITIAL_DAILY_CHECKS);
      localStorage.setItem('dailyChecks', JSON.stringify(INITIAL_DAILY_CHECKS));
      
      // Handle recurring tasks (simple logic for now)
      setTasks(prev => prev.map(t => {
        if (t.recurring === 'daily') return { ...t, completed: false };
        return t;
      }));
    } else if (savedChecks) {
      setDailyChecks(JSON.parse(savedChecks));
    }

    localStorage.setItem('lastAccess', today);
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('dailyChecks', JSON.stringify(dailyChecks));
  }, [dailyChecks]);

  useEffect(() => {
    localStorage.setItem('mood', mood);
  }, [mood]);

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else if (timer === 0 && isTimerActive) {
      setIsTimerActive(false);
      // Play sound or notification if supported
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  // --- Actions ---

  const addTask = (text: string, recurring: Recurring = 'none') => {
    if (!text.trim()) return;
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      completed: false,
      recurring,
      createdAt: Date.now(),
    };
    setTasks([newTask, ...tasks]);
  };

  const toggleTask = (id: string) => {
    let wasCompleted = false;
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        wasCompleted = !t.completed;
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
    
    // Update history
    const today = new Date().toISOString().split('T')[0];
    setHistory(prev => {
      const existing = prev.find(h => h.date === today);
      const delta = wasCompleted ? 1 : -1;
      if (existing) {
        return prev.map(h => h.date === today ? { ...h, completedTasks: Math.max(0, h.completedTasks + delta) } : h);
      }
      return [...prev, { date: today, completedTasks: Math.max(0, delta), dailyChecks: 0 }];
    });
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleCheck = (id: string) => {
    let wasCompleted = false;
    setDailyChecks(prev => prev.map(c => {
      if (c.id === id) {
        wasCompleted = !c.completed;
        return { ...c, completed: !c.completed };
      }
      return c;
    }));

    // Update history for daily checks
    const today = new Date().toISOString().split('T')[0];
    setHistory(prev => {
      const existing = prev.find(h => h.date === today);
      const delta = wasCompleted ? 1 : -1;
      if (existing) {
        return prev.map(h => h.date === today ? { ...h, dailyChecks: Math.max(0, h.dailyChecks + delta) } : h);
      }
      return [...prev, { date: today, completedTasks: 0, dailyChecks: Math.max(0, delta) }];
    });
  };

  const startFocus = (task: Task, duration: number) => {
    setFocusTask(task);
    setTimer(duration * 60);
    setIsTimerActive(true);
    setView('focus');
  };

  const shareTask = async (task: Task) => {
    const shareText = task.completed !== undefined 
      ? `🚀 Concluí mais um corre: "${task.text}"! \n\nFoco total no meu desenvolvimento artístico. #NoCorreDoFoco #ArtistaIndependente`
      : task.text;

    const shareData = {
      title: 'No Corre do Foco',
      text: shareText,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        alert('Texto copiado para a área de transferência! Cole nas suas redes sociais.');
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    }
  };

  // --- Sub-components (Sections) ---

  const MoodSelector = () => (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {(['tired', 'neutral', 'focused'] as Mood[]).map((m) => (
        <button
          key={m}
          onClick={() => setMood(m)}
          className={`immersive-btn border ${mood === m ? 'bg-accent text-black border-accent' : 'bg-white/5 border-white/5 text-text-dim hover:bg-white/10'}`}
        >
          <div className="flex flex-col items-center gap-1">
            {m === 'tired' && <Coffee className="w-5 h-5" />}
            {m === 'neutral' && <Smile className="w-5 h-5" />}
            {m === 'focused' && <Zap className="w-5 h-5" />}
            <span className="text-[10px] uppercase font-bold tracking-tight">{m === 'tired' ? 'Cansado' : m === 'neutral' ? 'Normal' : 'Focado'}</span>
          </div>
        </button>
      ))}
    </div>
  );

  const DashboardSection = () => {
    const suggestedTasks = tasks.filter(t => !t.completed).slice(0, 3);
    const emotionalAdvice = {
      tired: "Sugerimos uma tarefa leve hoje. 10 minutos já resolvem.",
      neutral: "Mantenha o ritmo. Escolha uma tarefa e execute.",
      focused: "Hora do corre pesado! Manda bala nas tarefas maiores."
    }[mood];

    const handleGenerateAiTask = async () => {
      setIsAiLoading(true);
      const task = await getArtistDevelopmentTask(mood);
      setAiSuggestion(task);
      setIsAiLoading(false);
    };

    const acceptAiTask = () => {
      if (aiSuggestion) {
        addTask(aiSuggestion.text);
        setAiSuggestion(null);
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="space-y-6"
      >
        <section className="immersive-card">
          <span className="section-title">Resumo do Dia</span>
          <div className="flex bg-accent/10 text-accent p-3 border border-dashed border-accent/30 rounded-xl mb-6 items-center gap-3">
            <Zap className="w-4 h-4 fill-current animate-pulse" />
            <span className="text-xs font-bold tracking-tight">{randomAlert}</span>
          </div>
          
          <MoodSelector />
          
          <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-accent" />
            <p className="text-sm font-medium leading-tight">{emotionalAdvice}</p>
          </div>

          <div className="mood-box mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                <span className="text-[12px] font-bold uppercase tracking-wider">Corre do Artista</span>
              </div>
              <button 
                onClick={handleGenerateAiTask}
                disabled={isAiLoading}
                className={`text-[10px] font-bold uppercase py-1 px-3 rounded-full transition-all ${isAiLoading ? 'bg-white/5 text-text-dim' : 'bg-accent text-black hover:scale-105'}`}
              >
                {isAiLoading ? 'Gerando...' : 'Sugestão Rápida'}
              </button>
            </div>
            
            {aiSuggestion ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-accent/5 p-3 rounded-xl border border-accent/20"
              >
                <p className="text-[13px] font-bold text-white mb-2 leading-tight">
                  {aiSuggestion.text}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-accent font-bold uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {aiSuggestion.duration} MIN
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setAiSuggestion(null)} className="text-[10px] font-bold text-text-dim hover:text-white uppercase transition-colors">Ignorar</button>
                    <button onClick={acceptAiTask} className="text-[10px] font-bold text-success hover:text-success/80 uppercase transition-colors">Aceitar</button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <p className="text-[11px] text-text-dim leading-relaxed">
                Precisa de uma ideia rápida para evoluir hoje? Peça uma sugestão personalizada de curta duração (10-25 min).
              </p>
            )}
          </div>
        </section>

        <section className="immersive-card">
          <div className="flex items-center justify-between mb-4">
            <span className="section-title !mb-0">Checklist do Dia</span>
            <div className="text-[10px] font-bold text-accent px-2 py-0.5 bg-accent/10 rounded-full">
              {dailyChecks.filter(c => c.completed).length}/4 CONCLUÍDOS
            </div>
          </div>
          <div className="space-y-3">
            {dailyChecks.map((check) => (
              <button
                key={check.id}
                onClick={() => toggleCheck(check.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                  check.completed ? 'bg-success/10 border-success/30' : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`check-box ${check.completed ? 'check-box-done' : ''}`}>
                    {check.completed && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                  <span className={`text-sm font-bold ${check.completed ? 'line-through text-text-dim' : 'text-white'}`}>
                    {check.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="immersive-card">
          <div className="flex items-center justify-between mb-4">
            <span className="section-title !mb-0">Próximos Passos</span>
            <button onClick={() => setView('tasks')} className="text-[10px] uppercase font-bold text-accent hover:underline">Ver todos</button>
          </div>
          {suggestedTasks.length > 0 ? (
            suggestedTasks.map(t => (
              <TaskItem 
                key={t.id} 
                task={t} 
                toggleTask={toggleTask} 
                deleteTask={deleteTask} 
                startFocus={startFocus} 
                shareTask={shareTask}
              />
            ))
          ) : (
            <div className="border border-dashed border-white/10 rounded-2xl text-center py-8 opacity-50">
              <p className="text-xs font-bold mb-3 uppercase tracking-wider">Nada para o corre agora?</p>
              <button 
                onClick={() => setView('tasks')}
                className="immersive-btn immersive-btn-primary text-xs"
              >
                Adicionar Tarefa
              </button>
            </div>
          )}
        </section>
      </motion.div>
    );
  };

  const TaskSection = () => {
    const [inputValue, setInputValue] = useState('');
    const [recurringType, setRecurringType] = useState<Recurring>('none');
    const [reminder, setReminder] = useState('');

    const handleAdd = () => {
      if (!inputValue.trim()) return;
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        text: inputValue,
        completed: false,
        recurring: recurringType,
        createdAt: Date.now(),
        reminderTime: reminder || undefined,
      };
      setTasks([newTask, ...tasks]);
      setInputValue('');
      setRecurringType('none');
      setReminder('');
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
        <h2 className="font-display text-4xl mb-6 uppercase tracking-tight">Seu corre de hoje é?</h2>
        
        <div className="immersive-card mb-8">
          <div className="space-y-6">
            <input 
              type="text" 
              placeholder="O que precisa ser feito?"
              className="w-full text-xl font-bold bg-transparent border-b border-white/10 focus:border-accent focus:outline-none placeholder:text-text-dim/30 py-2 transition-colors"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex bg-white/5 rounded-lg p-1">
                {(['none', 'daily', 'weekly'] as Recurring[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setRecurringType(r)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${
                      recurringType === r ? 'bg-accent text-black' : 'text-text-dim hover:text-white'
                    }`}
                  >
                    {r === 'none' ? 'Única' : r === 'daily' ? 'Diária' : 'Semanal'}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/5">
                <Clock className="w-4 h-4 text-text-dim" />
                <input 
                  type="time" 
                  className="text-xs font-bold uppercase focus:outline-none bg-transparent text-white"
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                />
              </div>

              <button 
                onClick={handleAdd}
                className="immersive-btn immersive-btn-primary flex items-center gap-2 ml-auto"
              >
                <Plus className="w-5 h-5" />
                Criar
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <span className="section-title">Tarefas Ativas</span>
          <AnimatePresence mode="popLayout">
            {tasks.filter(t => !t.completed).map(t => (
              <TaskItem 
                key={t.id} 
                task={t} 
                toggleTask={toggleTask} 
                deleteTask={deleteTask} 
                startFocus={startFocus} 
                shareTask={shareTask}
              />
            ))}
          </AnimatePresence>
          
          <span className="section-title mt-10">Concluídas recentemente</span>
          <div className="opacity-40 grayscale">
            {tasks.filter(t => t.completed).slice(0, 5).map(t => (
              <TaskItem 
                key={t.id} 
                task={t} 
                toggleTask={toggleTask} 
                deleteTask={deleteTask} 
                startFocus={startFocus} 
                shareTask={shareTask}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  const FocusSection = () => {
    const formatTime = (time: number) => {
      const mins = Math.floor(time / 60);
      const secs = time % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-bg text-white z-50 flex flex-col p-8 overflow-hidden"
      >
        <div className="absolute inset-0 bg-radial from-accent/20 to-transparent opacity-50 pointer-events-none" />

        <button 
          onClick={() => { setView('dashboard'); setIsTimerActive(false); }}
          className="self-end p-4 text-text-dim hover:text-white transition-colors z-10"
        >
          <X className="w-10 h-10" />
        </button>

        <div className="flex-1 flex flex-col justify-center items-center text-center z-10">
          <span className="section-title mb-8 tracking-[4px]">Modo Execução</span>
          
          <div className="timer-circle mb-10">
            <div className="timer-val tabular-nums font-black text-6xl leading-none">{formatTime(timer)}</div>
            <div className="timer-label mt-2">Só foca nisso agora</div>
          </div>

          {focusTask && (
            <div className="mb-10">
              <h2 className="font-display text-4xl mb-2 uppercase tracking-tight">{focusTask.text}</h2>
              <p className="text-text-dim text-sm uppercase font-bold tracking-widest">Status: Em execução</p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {!isTimerActive ? (
              <>
                <button onClick={() => { setTimer(10 * 60); setIsTimerActive(true); }} className="immersive-btn bg-white/5 border border-white/10 px-6">10M</button>
                <button onClick={() => { setTimer(15 * 60); setIsTimerActive(true); }} className="immersive-btn bg-white/5 border border-white/10 px-6">15M</button>
                <button onClick={() => { setTimer(25 * 60); setIsTimerActive(true); }} className="immersive-btn bg-accent text-black border border-accent px-6">25M</button>
              </>
            ) : (
              <button 
                onClick={() => setIsTimerActive(false)}
                className="immersive-btn bg-danger text-white px-8"
              >
                Pausar
              </button>
            )}
          </div>

          <button 
            onClick={() => {
              if (focusTask) {
                toggleTask(focusTask.id);
                shareTask({ ...focusTask, completed: true });
              }
              setView('dashboard');
              setIsTimerActive(false);
            }}
            className="immersive-btn-main !w-auto !px-12"
          >
            Concluir e Compartilhar
          </button>
        </div>
      </motion.div>
    );
  };

  const ProgressSection = () => {
    const today = new Date().toISOString().split('T')[0];
    const weeklyData = history.slice(-7);
    const completedToday = tasks.filter(t => t.completed).length;

    const shareProgress = () => {
      const text = `🔥 Meu progresso de hoje no NO CORRE DO FOCO: \n✅ ${completedToday} tarefas concluídas! \n🎯 Foco total na minha música. \n\n#NoCorreDoFoco #Independente`;
      shareTask({ text } as Task);
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-24">
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-display text-4xl uppercase tracking-tight">Sua Evolução</h2>
          <button 
            onClick={shareProgress}
            className="flex items-center gap-2 text-[10px] font-bold uppercase py-2 px-4 bg-accent text-black rounded-full hover:scale-105 transition-transform"
          >
            <Share2 className="w-4 h-4" /> Compartilhar Progresso
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="immersive-card flex flex-col">
            <span className="section-title">Consistência</span>
            <p className="text-[10px] uppercase font-bold text-text-dim mb-6">Últimos 7 dias de corre</p>
            <div className="flex items-end justify-between gap-1 flex-1 min-h-[120px]">
              {[...Array(7)].map((_, i) => {
                const day = new Date();
                day.setDate(day.getDate() - (6 - i));
                const dateStr = day.toISOString().split('T')[0];
                const data = history.find(h => h.date === dateStr);
                const isActive = data && data.completedTasks > 0;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className={`dot-stat ${isActive ? 'dot-stat-active shadow-[0_0_10px_rgba(224,255,0,0.4)]' : ''}`}>
                      {day.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 1).toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="immersive-card">
            <span className="section-title">Progresso Diário</span>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                  <span className="text-text-dim">Música / Corre</span>
                  <span className="text-accent">{completedToday} Tarefas</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${Math.min((completedToday / Math.max(tasks.length, 1)) * 100, 100)}%` }} 
                  />
                </div>
              </div>
              
              <div className="text-center mt-6 pt-6 border-t border-white/5">
                <p className="text-lg font-bold italic mb-4 text-accent">“Você tá fazendo acontecer.”</p>
                <div className="flex justify-center gap-8">
                  <div className="text-center">
                    <div className="text-3xl font-display text-white">{history.length}</div>
                    <div className="text-[9px] font-bold uppercase text-text-dim tracking-widest">Dias Ativos</div>
                  </div>
                  <div className="text-center border-l border-white/10 pl-8">
                    <div className="text-3xl font-display text-white">
                      {history.reduce((acc, curr) => acc + curr.completedTasks, 0)}
                    </div>
                    <div className="text-[9px] font-bold uppercase text-text-dim tracking-widest">Total Feitas</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="immersive-card">
          <span className="section-title">Visão Semanal</span>
          <div className="space-y-1">
            {tasks.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 opacity-80">
                <div className={`w-1.5 h-1.5 rounded-full ${t.completed ? 'bg-success' : 'bg-white/20'}`} />
                <span className={`text-xs ${t.completed ? 'line-through text-text-dim' : 'font-medium'}`}>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-bg text-white selection:bg-accent selection:text-black">
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center border-b border-white/5">
        <div className="logo font-black text-2xl tracking-tighter uppercase">
          NO CORRE<span className="text-accent"> DO FOCO</span>
        </div>
        <div className="hidden md:block text-[11px] font-bold uppercase tracking-[2px] text-accent">
          “Organizar é fácil. Executar é o que muda o jogo.”
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 hover:text-accent transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-bg/95 backdrop-blur-xl z-[60] p-8 flex flex-col"
          >
            <button onClick={() => setIsMenuOpen(false)} className="self-end p-4 text-text-dim hover:text-white transition-colors">
              <X className="w-10 h-10" />
            </button>
            <nav className="flex-1 flex flex-col justify-center items-center gap-12">
              <button 
                onClick={() => { setView('dashboard'); setIsMenuOpen(false); }}
                className="font-display text-6xl uppercase text-white hover:text-accent transition-colors"
              >
                Dashboard
              </button>
              <button 
                onClick={() => { setView('tasks'); setIsMenuOpen(false); }}
                className="font-display text-6xl uppercase text-white hover:text-accent transition-colors"
              >
                Lista de Tarefas
              </button>
              <button 
                onClick={() => { setView('progress'); setIsMenuOpen(false); }}
                className="font-display text-6xl uppercase text-white hover:text-accent transition-colors"
              >
                Evolução
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-8">
          
          {/* Sidebar Left: Actions & Task Quick View */}
          <aside className="space-y-8 hidden lg:block">
            <button 
              onClick={() => setView('tasks')}
              className="immersive-btn-main"
            >
              + Adicionar Tarefa
            </button>
            
            <div className="immersive-card flex-1 min-h-[400px]">
              <span className="section-title">O que precisa ser feito?</span>
              <div className="space-y-1">
                {tasks.filter(t => !t.completed).slice(0, 6).map(t => (
                  <TaskItem 
                    key={t.id} 
                    task={t} 
                    toggleTask={toggleTask} 
                    deleteTask={deleteTask} 
                    startFocus={startFocus} 
                    shareTask={shareTask}
                  />
                ))}
              </div>
            </div>

            <div className="mood-box">
              <div className="text-[13px] font-bold mb-1 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Sugestão Foco
              </div>
              <p className="text-[12px] text-text-dim leading-relaxed italic">
                {mood === 'tired' ? "Que tal uma tarefa rápida para aquecer?" : 
                 mood === 'neutral' ? "Ritmo constante. Escolha um corre e vai." : 
                 "Energia no topo! Hora de destruir as metas."}
              </p>
            </div>
          </aside>

          {/* Center Column: Primary View / Focus */}
          <section className="min-h-[600px]">
            {view === 'dashboard' && <DashboardSection />}
            {view === 'tasks' && <TaskSection />}
            {view === 'progress' && <ProgressSection />}
            {view === 'focus' && <FocusSection />}
          </section>

          {/* Sidebar Right: Utils & Progress */}
          <aside className="space-y-8 hidden lg:block">
            <div className="immersive-card">
              <span className="section-title">Checklist do Dia</span>
              <div className="space-y-4">
                {dailyChecks.map(check => (
                  <div key={check.id} className="flex items-center gap-3">
                    <div className={`check-box ${check.completed ? 'check-box-done' : ''}`}>
                      {check.completed && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    <span className={`text-[13px] font-medium ${check.completed ? 'text-text-dim line-through' : 'text-white'}`}>
                      {check.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="immersive-card">
              <span className="section-title">Progresso</span>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                    <span className="text-text-dim tracking-wider">Consistência</span>
                    <span className="text-accent">85%</span>
                  </div>
                  <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: '85%' }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                    <span className="text-text-dim tracking-wider">Metas</span>
                    <span className="text-accent">{tasks.filter(t => t.completed).length}/{tasks.length}</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${(tasks.filter(t => t.completed).length / Math.max(tasks.length, 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="immersive-card p-4">
              <span className="section-title">Lembrete Próximo</span>
              <div className="text-[13px] font-bold text-white mb-1">
                {tasks.find(t => t.reminderTime)?.reminderTime} — {tasks.find(t => t.reminderTime)?.text || "Nenhum alerta"}
              </div>
              <p className="text-[10px] text-text-dim uppercase font-bold tracking-widest">🔔 Alerta: Hora do corre</p>
            </div>
          </aside>

        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      {view !== 'focus' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40 lg:hidden">
          <div className="max-w-md mx-auto flex justify-around items-center bg-card/80 backdrop-blur-xl border border-white/5 py-4 px-6 rounded-[32px] shadow-2xl">
            <button 
              onClick={() => setView('dashboard')}
              className={`p-2 transition-colors ${view === 'dashboard' ? 'text-accent' : 'text-text-dim'}`}
            >
              <Home className="w-10 h-10" />
            </button>
            <button 
              onClick={() => setView('tasks')}
              className={`p-2 transition-colors ${view === 'tasks' ? 'text-accent' : 'text-text-dim'}`}
            >
              <Target className="w-10 h-10" />
            </button>
            <button 
              onClick={() => setView('progress')}
              className={`p-2 transition-colors ${view === 'progress' ? 'text-accent' : 'text-text-dim'}`}
            >
              <TrendingUp className="w-10 h-10" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
