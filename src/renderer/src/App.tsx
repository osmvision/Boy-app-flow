import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'moment/locale/fr'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import './App.css'

// Configuration du Calendrier
moment.locale('fr');
const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

// --- TYPES ---
interface Task {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  timeSpent: number;
  tags: string[];
  subtasks?: Task[];
  notes?: string;
  created: number;
  start?: Date;
  end?: Date;
  allDay?: boolean;
}

// Icônes simples (SVG)
const Icons = {
  Dashboard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  Board: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM9 3v18M15 3v18"/></svg>,
  Schedule: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Timer: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
}

function App() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'BOARD' | 'SCHEDULE'>('DASHBOARD');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  // Timer States
  const [sessionDuration] = useState(25 * 60); 
  const [timeLeft, setTimeLeft] = useState(sessionDuration);
  const [isActive, setIsActive] = useState(false);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);
  
  // Garde-fou sauvegarde
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Modal & IA States
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // CHARGEMENT
  useEffect(() => {
    const init = async () => {
      try {
        // @ts-ignore
        if (window.api?.loadTasks) {
          // @ts-ignore
          const savedData = await window.api.loadTasks();
          
          if (savedData === null) {
            setTasks([]);
          } else if (Array.isArray(savedData)) {
            // Conversion des dates string en objet Date pour le calendrier
            const parsedTasks = savedData.map((t: Task) => ({
              ...t,
              tags: t.tags || [],
              start: t.start ? new Date(t.start) : new Date(),
              end: t.end ? new Date(t.end) : new Date(new Date().getTime() + 60*60*1000)
            }));
            setTasks(parsedTasks);
          } else if (savedData && Array.isArray(savedData.tasks)) {
            const parsedTasks = savedData.tasks.map((t: Task) => ({
              ...t,
              tags: t.tags || [],
              start: t.start ? new Date(t.start) : new Date(),
              end: t.end ? new Date(t.end) : new Date(new Date().getTime() + 60*60*1000)
            }));
            setTasks(parsedTasks);
            if (savedData.totalFocusMinutes) {
              setTotalFocusMinutes(savedData.totalFocusMinutes);
            }
          }
        }
      } catch (e) { 
        console.error("Erreur chargement", e); 
        setTasks([]); 
      } finally {
        setIsDataLoaded(true);
      }
    };
    init();
  }, []);

  // SAUVEGARDE
  useEffect(() => {
    // @ts-ignore
    if (isDataLoaded && window.api?.saveTasks) {
      // @ts-ignore
      window.api.saveTasks({
        tasks: tasks,
        totalFocusMinutes: totalFocusMinutes,
        lastSaved: new Date().toISOString()
      }).catch(console.error);
    }
  }, [tasks, totalFocusMinutes, isDataLoaded]);

  // LOGIQUE TIMER
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setTotalFocusMinutes(prev => prev + Math.floor(sessionDuration / 60));
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification("Boy", { body: "Session terminée. Prenez une pause." });
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // --- ACTIONS ---
  const addTask = () => {
    if (!inputValue.trim()) return;
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const newTask: Task = { 
      id: Date.now().toString(), 
      title: inputValue, 
      status: 'TODO', 
      timeSpent: 0, 
      tags: ['Work'], 
      created: Date.now(), 
      subtasks: [],
      notes: '',
      start: now,
      end: oneHourLater
    };
    setTasks([newTask, ...tasks]);
    setInputValue('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'DONE' ? 'TODO' : 'DONE' } : t));
  };

  const moveTask = (id: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const deleteTask = (id: string) => {
    if (confirm('Supprimer cette tâche ?')) {
      setTasks(tasks.filter(t => t.id !== id));
      setSelectedTask(null);
    }
  };

  const updateTaskNotes = (notes: string) => {
    if (!selectedTask) return;
    const updated = { ...selectedTask, notes };
    setSelectedTask(updated);
    setTasks(tasks.map(t => t.id === selectedTask.id ? updated : t));
  };

  // --- FONCTIONS IA ---
  const decomposeTask = async (e: React.MouseEvent, taskId: string, taskTitle: string) => {
    e.stopPropagation();
    setLoadingId(taskId);
    // @ts-ignore
    if (!window.api?.askGemini) {
      alert("API Gemini non disponible");
      setLoadingId(null);
      return;
    }
    const prompt = `Découpe la tâche "${taskTitle}" en 3 sous-étapes courtes. Réponds UNIQUEMENT un tableau JSON: ["step1", "step2", "step3"]`;
    try {
      // @ts-ignore
      const raw = await window.api.askGemini(prompt);
      const cleanJson = raw.replace(/```json|```/g, '').trim();
      const steps = JSON.parse(cleanJson);
      const newSubtasks = steps.map((s: string, i: number) => ({ 
        id: `${taskId}-${i}`, 
        title: s, 
        status: 'TODO' as const, 
        timeSpent: 0, 
        tags: [], 
        created: Date.now() 
      }));
      setTasks(current => current.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t));
    } catch (e) { 
      console.error(e);
      alert("Erreur IA - réessayez"); 
    } finally { 
      setLoadingId(null); 
    }
  };

  const brainstormTask = async () => {
    if (!selectedTask) return;
    setIsAiThinking(true);
    const prompt = `Agis comme un expert. Pour la tâche "${selectedTask.title}", rédige :
    1. Une brève description de l'objectif.
    2. Une liste de points clés techniques ou stratégiques à ne pas oublier.
    3. Un conseil pour éviter les erreurs courantes.
    Rédige le tout proprement en texte simple (pas de markdown complexe).`;

    try {
      // @ts-ignore
      const response = await window.api.askGemini(prompt);
      const currentNotes = selectedTask.notes ? selectedTask.notes + "\n\n--- ✨ Suggestion IA ---\n" : "";
      updateTaskNotes(currentNotes + response);
    } catch (e) { 
      alert("Erreur IA"); 
    } finally { 
      setIsAiThinking(false); 
    }
  };

  const helpMeUnstuck = async () => {
    if (!selectedTask) return;
    setIsAiThinking(true);
    const prompt = `Agis comme un coach en TCC (Thérapie Cognitive et Comportementale) et expert en productivité. 
    L'utilisateur bloque sur la tâche : "${selectedTask.title}".
    1. Identifie pourquoi c'est difficile (Peur ? Ennui ? Complexité ?).
    2. Propose une "Micro-step" ridiculement petite pour commencer maintenant (règle des 2 minutes).
    3. Donne une phrase motivante courte.`;

    try {
      // @ts-ignore
      const response = await window.api.askGemini(prompt);
      const currentNotes = selectedTask.notes ? selectedTask.notes + "\n\n--- 🆘 SOS Procrastination ---\n" : "";
      updateTaskNotes(currentNotes + response);
    } catch (e) { 
      alert("Erreur IA"); 
    } finally { 
      setIsAiThinking(false); 
    }
  };

  // --- DRAG & DROP HANDLERS ---
  const onEventDrop = useCallback(({ event, start, end, isAllDay }: any) => {
    setTasks((prevTasks) => {
      return prevTasks.map((t) => 
        t.id === event.id 
          ? { ...t, start: new Date(start), end: new Date(end), allDay: isAllDay }
          : t
      );
    });
  }, []);

  const onEventResize = useCallback(({ event, start, end }: any) => {
    setTasks((prevTasks) => {
      return prevTasks.map((t) => 
        t.id === event.id 
          ? { ...t, start: new Date(start), end: new Date(end) }
          : t
      );
    });
  }, []);

  // --- RENDERERS ---
  return (
    <div className="main-layout">
      
      {/* === MODAL (FOCUS HUB) === */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{selectedTask.title}</h2>
              <button onClick={() => setSelectedTask(null)} style={{background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:'1.5rem'}}>×</button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap'}}>
                 <button className="ai-pill" onClick={brainstormTask} disabled={isAiThinking}>
                   {isAiThinking ? 'Réflexion...' : '✨ Brainstorm (IA)'}
                 </button>
                 <button className="unstuck-btn" onClick={helpMeUnstuck} disabled={isAiThinking}>
                   {isAiThinking ? 'Analyse...' : '🆘 Je bloque'}
                 </button>
                 <button 
                   onClick={() => deleteTask(selectedTask.id)} 
                   style={{background: 'rgba(243, 139, 168, 0.2)', color: '#f38ba8', border: '1px solid #f38ba8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}}
                 >
                   🗑️ Supprimer
                 </button>
                 <select 
                   value={selectedTask.status} 
                   onChange={(e) => { moveTask(selectedTask.id, e.target.value as 'TODO' | 'IN_PROGRESS' | 'DONE'); setSelectedTask({...selectedTask, status: e.target.value as 'TODO' | 'IN_PROGRESS' | 'DONE'}); }}
                   style={{background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid #444', borderRadius: '8px', padding: '5px 10px'}}
                 >
                   <option value="TODO">À Faire</option>
                   <option value="IN_PROGRESS">En Cours</option>
                   <option value="DONE">Terminé</option>
                 </select>
              </div>
              <textarea 
                className="notes-area" 
                placeholder="Notes, idées, liens... L'IA peut aussi remplir ici."
                value={selectedTask.notes || ''}
                onChange={(e) => updateTaskNotes(e.target.value)}
              />
              <div style={{marginTop: '10px', fontSize: '0.8rem', color: '#666'}}>
                Créé le: {new Date(selectedTask.created).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar">
        <div style={{fontWeight:'bold', color:'var(--accent)', marginBottom:'40px', fontSize:'1.5rem'}}>B.</div>
        
        <div className={`nav-icon ${activeTab === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setActiveTab('DASHBOARD')} title="Dashboard">
          <Icons.Dashboard />
        </div>
        <div className={`nav-icon ${activeTab === 'BOARD' ? 'active' : ''}`} onClick={() => setActiveTab('BOARD')} title="Kanban">
          <Icons.Board />
        </div>
        <div className={`nav-icon ${activeTab === 'SCHEDULE' ? 'active' : ''}`} onClick={() => setActiveTab('SCHEDULE')} title="Planning">
          <Icons.Schedule />
        </div>
        
        <div style={{marginTop:'auto', marginBottom:'20px'}}>
           <div style={{width:'30px', height:'30px', borderRadius:'50%', background:'var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color:'var(--accent)'}}>
             👤
           </div>
        </div>
      </div>

      {/* ZONE PRINCIPALE */}
      <div className="content-area">
        
        {/* HEADER COMMUN */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px', flexWrap:'wrap', gap:'15px'}}>
           <div>
             <h1 style={{fontSize:'1.8rem', margin:0}}>
               {activeTab === 'DASHBOARD' && "Mon Espace"}
               {activeTab === 'BOARD' && "Tableau de Bord"}
               {activeTab === 'SCHEDULE' && "Planning Semaine"}
             </h1>
             <p style={{margin:0, opacity:0.6, fontSize:'0.9rem'}}>Let's get deep work done.</p>
           </div>
           
           {/* TIMER FLOTTANT */}
           <div style={{background:'var(--bg-card)', padding:'8px 16px', borderRadius:'20px', display:'flex', alignItems:'center', gap:'10px', border:'1px solid rgba(255,255,255,0.1)'}}>
              <span style={{fontFamily:'monospace', fontSize:'1.1rem'}}>{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
              <button onClick={() => setIsActive(!isActive)} style={{background:'var(--accent)', border:'none', borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--bg-deep)'}}>
                {isActive ? '⏸' : '▶'}
              </button>
           </div>
        </div>

        {/* --- VUE DASHBOARD (LISTE) --- */}
        {activeTab === 'DASHBOARD' && (
          <div>
            <div className="mini-task-list" style={{width: '100%', maxWidth: '600px', margin:'0 auto'}}>
               <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                 <input className="task-input" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="Nouvelle tâche..." />
                 <button onClick={addTask} style={{background:'var(--accent)', border:'none', color:'#1e2a38', borderRadius:'8px', padding:'0 20px', fontWeight:'bold', cursor:'pointer'}}>+</button>
               </div>
               
               {tasks.length === 0 && <p style={{textAlign:'center', opacity:0.5}}>Aucune tâche. Profitez du calme.</p>}
               
               {tasks.map(t => (
                 <div 
                   key={t.id} 
                   style={{background:'var(--bg-card)', padding:'15px', borderRadius:'10px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', border:'1px solid transparent', transition:'0.2s'}}
                   onClick={() => setSelectedTask(t)}
                   onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(110, 231, 214, 0.3)'}
                   onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                 >
                   <input type="checkbox" checked={t.status === 'DONE'} onClick={(e) => e.stopPropagation()} onChange={() => toggleTask(t.id)} style={{accentColor:'var(--accent)', cursor:'pointer'}} />
                   <span style={{textDecoration: t.status === 'DONE' ? 'line-through' : 'none', flex:1, color: t.status === 'DONE' ? 'var(--text-muted)' : 'white'}}>{t.title}</span>
                   <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
                     {(t.tags || []).map(tag => <span key={tag} className={`tag ${tag.toLowerCase()}`}>{tag}</span>)}
                     {(!t.subtasks || t.subtasks.length === 0) && t.status !== 'DONE' && (
                       <button 
                         onClick={(e) => decomposeTask(e, t.id, t.title)} 
                         disabled={loadingId === t.id} 
                         style={{background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:'1.1rem'}}
                         title="Décomposer avec l'IA"
                       >
                         {loadingId === t.id ? '...' : '⚡'}
                       </button>
                     )}
                   </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* --- VUE KANBAN --- */}
        {activeTab === 'BOARD' && (
          <div className="kanban-board">
             <div className="kanban-column">
               <div className="kanban-header">À Faire ({tasks.filter(t => t.status === 'TODO').length})</div>
               {tasks.filter(t => t.status === 'TODO').map(t => (
                 <div 
                   key={t.id} 
                   className="rbc-event" 
                   style={{marginBottom:'10px', cursor:'pointer'}}
                   onClick={() => setSelectedTask(t)}
                 >
                   <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                     <span>{t.title}</span>
                     {(!t.subtasks || t.subtasks.length === 0) && (
                       <button 
                         onClick={(e) => decomposeTask(e, t.id, t.title)} 
                         disabled={loadingId === t.id} 
                         style={{background:'none', border:'none', color:'var(--accent)', cursor:'pointer'}}
                       >
                         {loadingId === t.id ? '...' : '⚡'}
                       </button>
                     )}
                   </div>
                   <div style={{fontSize:'0.7rem', opacity:0.6, marginTop:'5px'}}>Cliquer pour détails</div>
                 </div>
               ))}
             </div>
             <div className="kanban-column">
               <div className="kanban-header" style={{color: '#89b4fa'}}>En Cours 🚧</div>
               {tasks.filter(t => t.status === 'IN_PROGRESS').map(t => (
                 <div 
                   key={t.id} 
                   className="rbc-event" 
                   style={{marginBottom:'10px', borderColor:'#89b4fa', cursor:'pointer'}}
                   onClick={() => setSelectedTask(t)}
                 >
                   {t.title}
                   <div style={{fontSize:'0.7rem', opacity:0.6, marginTop:'5px'}}>Cliquer pour détails</div>
                 </div>
               ))}
             </div>
             <div className="kanban-column">
               <div className="kanban-header" style={{color: '#a6e3a1'}}>Terminé ✅</div>
               {tasks.filter(t => t.status === 'DONE').map(t => (
                 <div 
                   key={t.id} 
                   className="rbc-event" 
                   style={{marginBottom:'10px', borderColor:'#a6e3a1', opacity:0.6, cursor:'pointer'}}
                   onClick={() => setSelectedTask(t)}
                 >
                   {t.title}
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* --- VUE PLANNING (SCHEDULE) avec DRAG & DROP --- */}
        {activeTab === 'SCHEDULE' && (
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div style={{flex: 1, background: '#1e2836', borderRadius: '16px', padding: '10px', boxShadow:'0 10px 30px rgba(0,0,0,0.2)', overflow: 'hidden'}}>
              <DnDCalendar
                localizer={localizer}
                events={tasks.map(t => ({
                  ...t,
                  start: t.start || new Date(),
                  end: t.end || new Date()
                }))}
                startAccessor={(event: any) => event.start}
                endAccessor={(event: any) => event.end}
                titleAccessor={(event: any) => event.title}
                style={{ height: '100%' }}
                defaultView="week"
                views={['week', 'day']}
                step={30}
                timeslots={2}
                min={new Date(0, 0, 0, 6, 0, 0)}
                max={new Date(0, 0, 0, 23, 59, 0)}
                
                // DRAG AND DROP HANDLERS
                onEventDrop={onEventDrop}
                onEventResize={onEventResize}
                resizable
                draggableAccessor={() => true}
                
                formats={{
                  dayFormat: 'dddd D',
                  timeGutterFormat: 'HH:mm'
                }}
                messages={{
                  next: "Suivant",
                  previous: "Précédent",
                  today: "Aujourd'hui",
                  week: "Semaine",
                  day: "Jour"
                }}
              />
            </div>
            <p style={{textAlign:'center', fontSize:'0.8rem', opacity:0.4, marginTop:'10px', flexShrink: 0}}>
              💡 Astuce : Glissez-déposez les blocs pour organiser votre journée. Tirez le bas d'un bloc pour changer sa durée.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

export default App
