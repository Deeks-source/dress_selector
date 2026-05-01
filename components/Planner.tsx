import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent, ClothingItem, View } from '../types';
import { Calendar, Clock, MapPin, Plus, X, Tag, User, Briefcase, Zap, Sparkles, AlertCircle, ChevronLeft, ChevronRight, Check, MessageSquare, Send, LayoutGrid, CheckCircle } from 'lucide-react';
import { getOutfitRecommendationForEvent, tweakEventOutfit } from '../services/geminiService';

interface PlannerProps {
  events: CalendarEvent[];
  wardrobe: ClothingItem[];
  memory?: string[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onAskGeminiForOutfit: (eventId: string, eventDetails: string) => void;
  onNavigate: (view: View) => void;
  onMarkAsWorn?: (itemIds: string[], messageId?: string) => void;
}

const getDaysRange = (currentDate: Date) => {
  const dates = [];
  const start = new Date(currentDate);
  start.setDate(start.getDate() - 30); // 30 days back

  for (let i = 0; i < 90; i++) { // 30 days back, 60 days ahead
    const nextDate = new Date(start);
    nextDate.setDate(start.getDate() + i);
    dates.push(nextDate);
  }
  return dates;
};

const formatDateObj = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const Planner: React.FC<PlannerProps> = ({ 
  events, 
  wardrobe, 
  memory = [],
  onAddEvent, 
  onDeleteEvent, 
  onUpdateEvent,
  onAskGeminiForOutfit,
  onNavigate,
  onMarkAsWorn
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // New event form state
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<CalendarEvent['type']>('casual');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  
  // Assign outfit modal
  const [assigningEvent, setAssigningEvent] = useState<CalendarEvent | null>(null);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<string[]>([]);
  const [generatingEventId, setGeneratingEventId] = useState<string | null>(null);
  const [plannerViewMode, setPlannerViewMode] = useState<'calendar' | 'list'>('list');
  
  const [viewingEventOutfit, setViewingEventOutfit] = useState<CalendarEvent | null>(null);
  const [tweakMessage, setTweakMessage] = useState('');
  const [isTweaking, setIsTweaking] = useState(false);

  const [errorToast, setErrorToast] = useState<string | null>(null);

  const dates = useMemo(() => getDaysRange(new Date()), []);
  const calendarStripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the selected date initially
    setTimeout(() => {
      if (calendarStripRef.current) {
        const selectedBtn = calendarStripRef.current.querySelector('#selected-date-btn');
        if (selectedBtn) {
          selectedBtn.scrollIntoView({ inline: 'center', behavior: 'smooth' });
        }
      }
    }, 100);
  }, []);

  const selectedDateStr = formatDateObj(selectedDate);
  const eventsForSelectedDate = events.filter(e => e.date === selectedDateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const handleSaveEvent = () => {
    if (!title) return;
    
    if (editingEventId) {
      const existing = events.find(e => e.id === editingEventId);
      if (existing) {
        onUpdateEvent({
          ...existing,
          title,
          time,
          type,
          location,
          description,
          date: selectedDateStr
        });
      }
    } else {
      onAddEvent({
        id: Math.random().toString(36).substring(2, 9),
        title,
        date: selectedDateStr,
        time,
        type,
        location,
        description,
        outfitItemIds: [],
        createdAt: new Date().toISOString()
      });
    }
    closeForm();
  };
  
  const closeForm = () => {
    setIsAddingEvent(false);
    setEditingEventId(null);
    setTitle('');
    setTime('');
    setType('casual');
    setLocation('');
    setDescription('');
  };
  
  const openEdit = (e: CalendarEvent) => {
    setEditingEventId(e.id);
    setTitle(e.title);
    setTime(e.time || '');
    setType(e.type);
    setLocation(e.location || '');
    setDescription(e.description || '');
    const [y, m, d] = e.date.split('-');
    setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
    setIsAddingEvent(true);
  };
  
  const openAssignModal = (e: CalendarEvent) => {
    setAssigningEvent(e);
    setSelectedOutfitIds(e.outfitItemIds || []);
  };
  
  const toggleOutfitSelection = (id: string) => {
    setSelectedOutfitIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const saveOutfitAssignment = () => {
    if (assigningEvent) {
      onUpdateEvent({
        ...assigningEvent,
        outfitItemIds: selectedOutfitIds
      });
      setAssigningEvent(null);
    }
  };

  const handleAutoRecommend = async (event: CalendarEvent) => {
    setGeneratingEventId(event.id);
    try {
      const recommendation = await getOutfitRecommendationForEvent(
        wardrobe,
        event.title,
        event.type,
        event.location || null,
        event.description || null,
        memory
      );
      
      if (recommendation && recommendation.items.length > 0) {
        onUpdateEvent({
          ...event,
          outfitItemIds: recommendation.items,
          aiReasoning: recommendation.reasoning,
          thread: event.thread || [] // ensure it array
        });
      } else {
        setErrorToast("Sorry, I couldn't find a good combination from your wardrobe for this event.");
        setTimeout(() => setErrorToast(null), 3000);
      }
    } catch (e) {
      console.error(e);
      setErrorToast("Failed to get recommendation.");
      setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setGeneratingEventId(null);
    }
  };

  const handleTweakOutfit = async () => {
    if (!tweakMessage.trim() || !viewingEventOutfit) return;
    
    setIsTweaking(true);
    const userMsg = tweakMessage;
    setTweakMessage('');

    // Pre-emptively update UI thread
    const currentThread = viewingEventOutfit.thread || [];
    const newThread = [...currentThread, { role: 'user' as const, text: userMsg }];
    
    setViewingEventOutfit({
      ...viewingEventOutfit,
      thread: newThread
    });

    try {
      const aiResponse = await tweakEventOutfit(
        wardrobe,
        viewingEventOutfit.title,
        viewingEventOutfit.description || null,
        viewingEventOutfit.outfitItemIds,
        newThread,
        userMsg,
        memory
      );

      const updatedEvent = {
        ...viewingEventOutfit,
        thread: [...newThread, { role: 'model' as const, text: aiResponse.text, itemIds: aiResponse.itemIds }],
        outfitItemIds: aiResponse.itemIds && aiResponse.itemIds.length > 0 
          ? aiResponse.itemIds 
          : viewingEventOutfit.outfitItemIds
      };

      setViewingEventOutfit(updatedEvent);
      onUpdateEvent(updatedEvent);

    } catch (e) {
      console.error(e);
      setErrorToast("Failed to get AI response.");
      setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setIsTweaking(false);
    }
  };

  const getEventIcon = (t: string) => {
    switch (t) {
      case 'meeting': return <Briefcase className="w-5 h-5" />;
      case 'party': return <Zap className="w-5 h-5" />;
      case 'casual': return <User className="w-5 h-5" />;
      case 'formal': return <Tag className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* Header */}
      <div className="bg-[#CCFF00] p-4 border-b-4 border-black flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Planner</h1>
          <p className="text-sm font-bold opacity-80">Schedule & Outfits</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setPlannerViewMode(plannerViewMode === 'calendar' ? 'list' : 'calendar')}
            className="w-12 h-12 bg-white text-black border-2 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0_0_#000] transition-transform active:translate-y-1 active:shadow-none"
            title="Toggle View Mode"
          >
            {plannerViewMode === 'calendar' ? <LayoutGrid className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setIsAddingEvent(true)}
            className="w-12 h-12 bg-black text-[#CCFF00] rounded-full flex items-center justify-center shadow-[4px_4px_0_0_#A388EE] transition-transform active:translate-y-1 active:shadow-none"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {plannerViewMode === 'calendar' ? (
          <>
            {/* Horizontal Calendar Strip */}
            <div className="w-full bg-white border-b-4 border-black p-4 shrink-0 overflow-x-auto no-scrollbar" ref={calendarStripRef}>
              <div className="flex w-max gap-3 py-2 px-1">
                {dates.map((d, i) => {
                  const isSelected = formatDateObj(d) === selectedDateStr;
                  const hasEvents = events.some(e => e.date === formatDateObj(d));
                  
                  return (
                    <button
                      key={i}
                      id={isSelected ? 'selected-date-btn' : undefined}
                      onClick={() => setSelectedDate(d)}
                      className={`flex flex-col items-center justify-center w-14 h-20 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? 'border-black bg-[#A388EE] text-white shadow-[2px_2px_0_0_#000] translate-y-[-2px]' 
                          : 'border-gray-200 bg-white text-gray-500 hover:border-black'
                      }`}
                    >
                      <span className="text-xs font-bold uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <span className={`text-xl font-black ${isSelected ? 'text-white' : 'text-black'}`}>{d.getDate()}</span>
                      {hasEvents && (
                        <div className={`w-2 h-2 rounded-full mt-1 ${isSelected ? 'bg-[#CCFF00]' : 'bg-[#A388EE]'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Events List for Selected Date */}
            <div className="p-4 space-y-4">
              <h2 className="text-lg font-black uppercase flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#A388EE]" /> 
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>

          {eventsForSelectedDate.length === 0 ? (
            <div className="bg-white border-[3px] border-black border-dashed p-8 flex flex-col items-center justify-center text-center rounded-xl">
              <Calendar className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold text-gray-400">No events today</p>
              <button 
                onClick={() => setIsAddingEvent(true)}
                className="mt-4 px-4 py-2 bg-black text-white font-bold uppercase text-xs rounded-full"
              >
                Schedule Event
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {eventsForSelectedDate.map(event => (
                <div key={event.id} className="bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0_0_#000] relative group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#CCFF00] border-2 border-black flex items-center justify-center shrink-0">
                        {getEventIcon(event.type)}
                      </div>
                      <div>
                        <h3 className="font-black text-lg leading-tight">{event.title}</h3>
                        <div className="flex flex-wrap gap-2 mt-1 text-xs font-bold text-gray-600">
                          {event.time && (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {event.time}</span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {event.location}</span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-sm font-medium text-gray-500 mt-2">{event.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(event)} className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-md hover:bg-gray-100">
                        <EditIcon />
                      </button>
                      <button onClick={() => onDeleteEvent(event.id)} className="w-8 h-8 flex items-center justify-center border-2 border-black rounded-md bg-red-100 text-red-600 hover:bg-red-200">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Outfits Section */}
                  <div className="mt-4 pt-4 border-t-2 border-black border-dashed">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-black uppercase">Outfit Allocation</h4>
                      <button 
                        onClick={() => openAssignModal(event)}
                        className="text-xs font-bold underline text-[#A388EE]"
                      >
                         Assign items
                      </button>
                    </div>
                    
                    {(!event.outfitItemIds || event.outfitItemIds.length === 0) ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAutoRecommend(event)}
                          disabled={generatingEventId === event.id}
                          className="flex-1 bg-[#A388EE] text-white border-2 border-black py-2 px-3 rounded-lg font-bold text-sm uppercase shadow-[2px_2px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <Sparkles className={`w-4 h-4 ${generatingEventId === event.id ? 'animate-pulse' : ''}`} />
                          {generatingEventId === event.id ? 'Thinking...' : 'Auto Recommend'}
                        </button>
                        <button 
                          onClick={() => openAssignModal(event)}
                          className="flex-1 bg-white border-2 border-black py-2 px-3 rounded-lg font-bold text-sm uppercase shadow-[2px_2px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
                        >
                          Pick Manually
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
                          {event.outfitItemIds.map(id => {
                            const item = wardrobe.find(w => w.id === id);
                            if (!item) return null;
                            return (
                              <div key={item.id} className="w-16 h-16 border-2 border-black rounded-lg overflow-hidden shrink-0 relative">
                                <img src={item.image} alt="outfit item" className="w-full h-full object-cover" />
                              </div>
                            );
                          })}
                          <button 
                            onClick={(e) => { e.stopPropagation(); openAssignModal(event); }}
                            className="w-16 h-16 border-2 border-black border-dashed rounded-lg flex items-center justify-center shrink-0 hover:bg-gray-100 text-gray-400"
                          >
                            <Plus className="w-6 h-6" />
                          </button>
                        </div>
                        <button 
                          onClick={() => setViewingEventOutfit(event)}
                          className="w-full mt-1 py-1.5 bg-[#A388EE] text-white border-2 border-black rounded-lg flex items-center justify-center gap-2 font-bold text-sm shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none"
                        >
                          <MessageSquare className="w-4 h-4" /> Discuss Outfit
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
            </div>
          </>
        ) : (
          <div className="p-4 space-y-6">
            <h2 className="text-lg font-black uppercase flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-[#A388EE]" /> All Events
            </h2>
            
            {events.length === 0 ? (
              <div className="bg-white border-[3px] border-black border-dashed p-8 flex flex-col items-center justify-center text-center rounded-xl">
                <Calendar className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-bold text-gray-400">No events found</p>
                <button 
                  onClick={() => setIsAddingEvent(true)}
                  className="mt-4 px-4 py-2 bg-black text-white font-bold uppercase text-xs rounded-full"
                >
                  Schedule Event
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {[...events].sort((a,b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || '')).map(event => (
                  <div key={event.id} className="bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0_0_#000] relative group cursor-pointer" onClick={() => { 
                    const [y, m, d] = event.date.split('-');
                    setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                    setPlannerViewMode('calendar'); 
                  }}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#CCFF00] border-2 border-black flex items-center justify-center shrink-0">
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <h3 className="font-black text-lg leading-tight">{event.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs font-bold text-gray-600">
                            {event.date && (() => {
                              const [y, m, d] = event.date.split('-');
                              const localDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                              return (
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                                  <Calendar className="w-3 h-3" />
                                  {localDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              );
                            })()}
                            {event.time && (
                              <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                                <Clock className="w-3 h-3" />
                                {event.time}
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Event Modal */}
      <AnimatePresence>
        {errorToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 bg-red-500 text-white p-4 rounded-xl shadow-lg z-50 flex items-center gap-2 font-bold"
          >
            <AlertCircle className="w-5 h-5" />
            {errorToast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingEvent && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-[100] flex flex-col h-[100dvh]"
          >
            <div className="bg-[#A388EE] p-4 pt-6 border-b-4 border-black flex justify-between items-center text-white shrink-0">
              <h2 className="text-xl font-black uppercase">{editingEventId ? 'Edit Event' : 'New Event'}</h2>
              <button onClick={closeForm} className="w-10 h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
              <div className="space-y-1">
                <label className="font-black uppercase text-xs">Event Title *</label>
                <input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Standup, Birthday Party"
                  className="w-full border-2 border-black rounded-lg p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-black uppercase text-xs">Date</label>
                  <input 
                    type="date"
                    value={selectedDateStr}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const [y, m, d] = e.target.value.split('-');
                      setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
                    }}
                    className="w-full border-2 border-black rounded-lg p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-black uppercase text-xs">Time (Optional)</label>
                  <input 
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border-2 border-black rounded-lg p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-black uppercase text-xs">Location (Optional)</label>
                <input 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Office, Central Park"
                  className="w-full border-2 border-black rounded-lg p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#CCFF00]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-black uppercase text-xs">Insights / Requirements</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Must wear red, needs to be warm, formal but comfortable..."
                  className="w-full border-2 border-black rounded-lg p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#CCFF00] resize-none h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="font-black uppercase text-xs">Event Type</label>
                <div className="flex flex-wrap gap-2">
                  {['meeting', 'party', 'casual', 'formal', 'other'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t as any)}
                      className={`px-4 py-2 border-2 border-black rounded-full font-bold text-sm uppercase transition-all ${
                        type === t ? 'bg-[#CCFF00] shadow-[2px_2px_0_0_#000]' : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 pb-8 border-t-4 border-black shrink-0 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
              <button 
                onClick={handleSaveEvent}
                disabled={!title}
                className="w-full bg-black text-[#CCFF00] py-4 rounded-xl font-black text-lg uppercase shadow-[4px_4px_0_0_#A388EE] disabled:opacity-50 disabled:shadow-none"
              >
                {editingEventId ? 'Save Changes' : 'Schedule Event'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Wardrobe Items Modal */}
      <AnimatePresence>
        {assigningEvent && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black/50 z-[100] flex flex-col justify-end sm:justify-center sm:p-4 p-0 backdrop-blur-sm"
          >
            <div className="bg-white w-full sm:max-w-md mx-auto sm:rounded-2xl rounded-t-2xl border-t-4 sm:border-4 border-black flex flex-col h-[80vh] sm:h-[600px] overflow-hidden shadow-[8px_8px_0_0_#A388EE]">
              <div className="p-4 border-b-2 border-black flex justify-between items-center bg-[#CCFF00] shrink-0">
                <div>
                  <h3 className="font-black uppercase">Assign Outfit</h3>
                  <p className="text-xs font-bold">{assigningEvent.title}</p>
                </div>
                <button onClick={() => setAssigningEvent(null)} className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {wardrobe.length === 0 ? (
                  <div className="text-center p-8 text-gray-500 font-bold">
                    Wardrobe is empty. Add items first.
                    <button 
                      onClick={() => { setAssigningEvent(null); onNavigate('wardrobe'); }}
                      className="block mx-auto mt-4 underline text-black uppercase text-xs"
                    >
                      Go to Wardrobe
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {wardrobe.map(item => {
                      const isSelected = selectedOutfitIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => toggleOutfitSelection(item.id)}
                          className={`relative aspect-square border-2 rounded-xl overflow-hidden group transition-all ${
                            isSelected ? 'border-black shadow-[4px_4px_0_0_#000]' : 'border-gray-200'
                          }`}
                        >
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          <div className={`absolute inset-0 bg-black/20 flex flex-col justify-between p-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            <div className="flex justify-end">
                              <div className={`w-6 h-6 rounded-full border-2 border-black flex items-center justify-center ${isSelected ? 'bg-[#CCFF00]' : 'bg-white'}`}>
                                {isSelected && <Check className="w-4 h-4 text-black" />}
                              </div>
                            </div>
                            <div className="bg-black/80 text-white text-[10px] font-bold p-1 px-2 rounded-md truncate">
                              {item.name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t-2 border-black bg-white shrink-0">
                <button 
                  onClick={saveOutfitAssignment}
                  className="w-full bg-[#A388EE] text-white py-3 rounded-lg font-black uppercase border-2 border-black shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none"
                >
                  Save Selection ({selectedOutfitIds.length})
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outfit Thread Modal */}
      <AnimatePresence>
        {viewingEventOutfit && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-[#f8f9fa] z-[110] flex flex-col h-[100dvh]"
          >
            <div className="bg-[#A388EE] p-4 pt-6 border-b-4 border-black flex justify-between items-center text-white shrink-0 shadow-[0_4px_0_0_#000]">
              <div>
                <h2 className="text-xl font-black uppercase leading-tight">Outfit Details</h2>
                <p className="text-xs font-bold leading-tight mt-1">{viewingEventOutfit.title}</p>
              </div>
              <button onClick={() => setViewingEventOutfit(null)} className="w-10 h-10 rounded-full border-2 border-black bg-white text-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0_0_#000]">
                <h3 className="font-black uppercase mb-3">Wear for Event</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {viewingEventOutfit.outfitItemIds.map(id => {
                    const item = wardrobe.find(w => w.id === id);
                    if (!item) return null;
                    return (
                      <div key={item.id} className="flex flex-col gap-1 w-24 shrink-0">
                        <div className="w-24 h-24 border-2 border-black rounded-lg overflow-hidden shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-bold uppercase truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {viewingEventOutfit.aiReasoning && (
                <div className="bg-[#CCFF00] border-2 border-black p-4 rounded-xl shadow-[4px_4px_0_0_#000]">
                  <div className="flex items-center gap-2 font-black uppercase mb-2">
                    <Sparkles className="w-5 h-5" />
                    <span>Stylist Notes</span>
                  </div>
                  <p className="text-sm font-bold leading-relaxed">{viewingEventOutfit.aiReasoning}</p>
                </div>
              )}

              {/* Chat Thread */}
              {(viewingEventOutfit.thread || []).length > 0 && (
                <div className="space-y-4 pt-4">
                  {(viewingEventOutfit.thread || []).map((msg, i) => (
                    <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] sm:max-w-[80%] flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} min-w-0`}>
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 border-2 border-black rounded-xl sm:rounded-2xl flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-[#06D6A0] text-black' : 'bg-[#A388EE] text-black shadow-[2px_2px_0_0_#000]'}`}>
                          {msg.role === 'user' ? <User size={16} strokeWidth={2.5}/> : <MessageSquare size={18} strokeWidth={2.5}/>}
                        </div>
                        <div className="space-y-3 sm:space-y-4 flex-1 min-w-0">
                          <div className={`p-4 sm:p-5 rounded-2xl text-sm sm:text-[15px] font-black leading-relaxed break-words whitespace-pre-wrap border-[3px] border-black shadow-[4px_4px_0_0_#000] ${msg.role === 'user' ? 'bg-[#E3FBCC] text-black' : 'bg-white text-black'}`}>
                            {msg.text}
                          </div>
                          
                          {msg.itemIds && msg.itemIds.length > 0 && (
                            <div className="bg-white p-4 sm:p-6 rounded-[2rem] border-[3px] border-black shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4 sm:space-y-6 w-full overflow-hidden mt-4">
                              <div className="flex items-center justify-between border-b-[3px] border-black pb-4">
                                <div className="flex flex-col">
                                  <span className="text-[10px] sm:text-xs font-black text-black uppercase tracking-widest bg-[#CCFF00] px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000] w-max">Outfit Update</span>
                                  <span className="text-[10px] sm:text-xs text-black/60 font-black mt-2">{msg.itemIds.length} pieces synchronized</span>
                                </div>
                                <button 
                                  onClick={() => onMarkAsWorn?.(msg.itemIds!)}
                                  className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-black rounded-xl shadow-[3px_3px_0_0_#000] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none transition-all bg-[#A388EE] text-black border-[3px] border-black hover:bg-[#CCFF00]"
                                >
                                  <CheckCircle size={16} /> Log Wear
                                </button>
                              </div>
                              <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 no-scrollbar">
                                {msg.itemIds.map((id, idx) => {
                                  const item = wardrobe.find(w => w.id === id);
                                  if (!item) return null;
                                  return (
                                    <div key={`${id}-${idx}`} className="flex-shrink-0 w-28 space-y-3">
                                      <div className="aspect-[3/4] bg-[#F4F1FD] rounded-2xl relative flex items-center justify-center overflow-hidden border-[3px] border-black p-2 transition-all shadow-[4px_4px_0_0_#EAEAEA]">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black text-white text-[8px] font-black uppercase tracking-tighter rounded-md border border-white/50">
                                          {item.category}
                                        </div>
                                      </div>
                                      <p className="text-[11px] font-black text-center text-black leading-tight uppercase truncate">{item.name}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTweaking && (
                    <div className="flex justify-start">
                      <div className="p-3 bg-[#CCFF00] rounded-2xl rounded-bl-none border-2 border-black font-bold shadow-[2px_2px_0_0_#000]">
                        <span className="flex space-x-1">
                          <span className="animate-bounce">.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t-4 border-black shrink-0 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.1)] pb-8">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={tweakMessage}
                  onChange={e => setTweakMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTweakOutfit()}
                  placeholder="Ask to change an item..."
                  className="flex-1 border-2 border-black rounded-lg p-3 font-bold focus:outline-none focus:ring-2 focus:ring-[#A388EE]"
                  disabled={isTweaking}
                />
                <button 
                  onClick={handleTweakOutfit}
                  disabled={isTweaking || !tweakMessage.trim()}
                  className="w-14 h-14 bg-black text-[#A388EE] rounded-lg flex items-center justify-center border-2 border-black shadow-[4px_4px_0_0_#A388EE] disabled:opacity-50 disabled:shadow-none transition-all active:translate-y-1 active:shadow-none"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
  </svg>
);
