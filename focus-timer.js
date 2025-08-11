import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Clock, ChevronDown, ChevronRight, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StopwatchTimer() {
  // Stopwatch state
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const stopwatchIntervalRef = useRef(null);

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTime, setTimerTime] = useState(0);
  const [originalTimerTime, setOriginalTimerTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerFinished, setIsTimerFinished] = useState(false);
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Islam');
  const timerIntervalRef = useRef(null);

  // Focus tracking state
  const [focusHistory, setFocusHistory] = useState([]);
  const [currentTask, setCurrentTask] = useState('');
  const [currentCategory, setCurrentCategory] = useState('');

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('focusHistory');
    if (savedHistory) {
      try {
        setFocusHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading focus history:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever focusHistory changes
  useEffect(() => {
    localStorage.setItem('focusHistory', JSON.stringify(focusHistory));
  }, [focusHistory]);

  // Countdown timers
  const [countdownTime, setCountdownTime] = useState('');
  const [nextMonthCountdown, setNextMonthCountdown] = useState('');
  const countdownIntervalRef = useRef(null);
  const nextMonthIntervalRef = useRef(null);

  // History display state
  const [expandedDays, setExpandedDays] = useState({});
  const [expandedPrayerTimes, setExpandedPrayerTimes] = useState({});

  // View state
  const [currentView, setCurrentView] = useState('timer'); // 'timer' or 'timebox'

  const categories = ['Islam', 'Career', 'Physical', 'Personal Assets', 'Interests'];

  // Prayer time periods
  const getPrayerTimePeriod = (hour) => {
    if (hour >= 4 && hour < 7) return 'Fajr';
    if (hour >= 7 && hour < 11) return 'Post Fajr';
    if (hour >= 11 && hour < 15) return 'Dhuhr';
    if (hour >= 15 && hour < 18) return 'Asr';
    if (hour >= 18 && hour < 20) return 'Maghrib';
    if (hour >= 20 && hour < 24) return 'Isha';
    return 'Other';
  };

  // Calculate totals for prayer times
  const calculatePrayerTimeTotals = (entries) => {
    const totals = entries.reduce((acc, entry) => {
      acc.focusTime += entry.focusTime;
      acc.unfocusTime += entry.stopwatchTime;
      return acc;
    }, { focusTime: 0, unfocusTime: 0 });
    
    return totals;
  };

  // Export to Excel function
  const exportToExcel = () => {
    try {
      const exportData = focusHistory.map(entry => ({
        Date: new Date(entry.timestamp).toLocaleDateString(),
        Time: new Date(entry.timestamp).toLocaleTimeString(),
        'Prayer Time': entry.prayerTime,
        Category: entry.category,
        Task: entry.task,
        'Timer Set (seconds)': entry.timerTime,
        'Unfocused Time (centiseconds)': entry.stopwatchTime,
        'Focus Time (centiseconds)': entry.focusTime,
        'Focus Time (minutes)': Math.floor(entry.focusTime / 100 / 60),
        'Unfocused Time (minutes)': Math.floor(entry.stopwatchTime / 100 / 60)
      }));

      // Try to read existing workbook
      let workbook;
      let existingData = [];
      
      try {
        // Check if there's existing data in localStorage (simulating file persistence)
        const existingExportData = localStorage.getItem('focusHistoryExport');
        if (existingExportData) {
          existingData = JSON.parse(existingExportData);
        }
      } catch (error) {
        console.log('No existing data found');
      }

      // Combine existing data with new data
      const combinedData = [...existingData, ...exportData];
      
      // Save combined data to localStorage
      localStorage.setItem('focusHistoryExport', JSON.stringify(combinedData));

      // Create workbook and worksheet
      workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(combinedData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Focus History');

      // Write file
      XLSX.writeFile(workbook, 'focus-history.xlsx');
      
      alert('Focus history exported successfully! Data has been appended to the existing file.');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  // JSON Export function
  const exportToJSON = () => {
    try {
      const dataStr = JSON.stringify(focusHistory, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `focus-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Focus history exported as JSON successfully!');
    } catch (error) {
      console.error('JSON export failed:', error);
      alert('JSON export failed. Please try again.');
    }
  };

  // JSON Import function
  const importFromJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Validate data structure
        if (Array.isArray(importedData) && importedData.every(entry => 
          entry.task && entry.category && entry.timestamp
        )) {
          // Merge with existing data, avoiding duplicates
          const existingTimestamps = new Set(focusHistory.map(entry => entry.timestamp));
          const newEntries = importedData.filter(entry => !existingTimestamps.has(entry.timestamp));
          
          const mergedData = [...focusHistory, ...newEntries].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );
          
          setFocusHistory(mergedData);
          alert(`Successfully imported ${newEntries.length} new focus sessions!`);
        } else {
          alert('Invalid JSON file format. Please select a valid focus history export file.');
        }
      } catch (error) {
        console.error('JSON import failed:', error);
        alert('Failed to import JSON file. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  // Clear all data function
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to delete all focus history? This cannot be undone!')) {
      setFocusHistory([]);
      localStorage.removeItem('focusHistory');
      localStorage.removeItem('focusHistoryExport');
      alert('All data has been cleared.');
    }
  };

  // Generate time slots for timebox view
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const time12 = hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
      const nextHour12 = (hour + 1) === 0 ? '12:00 AM' : (hour + 1) < 12 ? `${hour + 1}:00 AM` : (hour + 1) === 12 ? '12:00 PM' : `${(hour + 1) - 12}:00 PM`;
      
      slots.push({
        start: time12,
        end: nextHour12,
        hour,
        prayerTime: getPrayerTimePeriod(hour)
      });
    }
    return slots;
  };

  // Get sessions for a specific time slot
  const getSessionsForTimeSlot = (slot) => {
    const today = new Date().toDateString();
    return focusHistory.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      const entryTime = entryDate.toDateString() === today;
      const entryHour = entryDate.getHours();
      
      // Check if session falls within this hour
      return entryTime && entryHour === slot.hour;
    });
  };

  // Calculate countdown to April 3rd, 2026
  useEffect(() => {
    const updateCountdowns = () => {
      // April 3rd, 2026 countdown
      const targetDate = new Date('2026-04-03T00:00:00');
      const now = new Date();
      const timeDiff = targetDate - now;

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        setCountdownTime(`${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setCountdownTime('April 3rd, 2026');
      }

      // Next month 3rd countdown
      const currentDate = new Date();
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 3);
      const nextMonthDiff = nextMonth - now;

      if (nextMonthDiff > 0) {
        const nextDays = Math.floor(nextMonthDiff / (1000 * 60 * 60 * 24));
        const nextHours = Math.floor((nextMonthDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const nextMinutes = Math.floor((nextMonthDiff % (1000 * 60 * 60)) / (1000 * 60));
        const nextSeconds = Math.floor((nextMonthDiff % (1000 * 60)) / 1000);
        
        setNextMonthCountdown(`${nextDays}d ${nextHours.toString().padStart(2, '0')}:${nextMinutes.toString().padStart(2, '0')}:${nextSeconds.toString().padStart(2, '0')}`);
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format time display
  const formatTime = (centiseconds) => {
    const totalSeconds = Math.floor(centiseconds / 100);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const cs = centiseconds % 100;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  const formatTimerTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFocusTime = (centiseconds) => {
    const totalSeconds = Math.floor(centiseconds / 100);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Play completion sound
  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime);
      oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime);
      
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 1);
      oscillator2.stop(audioContext.currentTime + 1);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  // Stopwatch functions
  const startStopwatch = () => {
    setIsStopwatchRunning(true);
  };

  const pauseStopwatch = () => {
    setIsStopwatchRunning(false);
  };

  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
  };

  // Timer functions
  const startTimer = () => {
    if (timerTime === 0 && taskDescription.trim()) {
      const totalSeconds = timerMinutes * 60 + timerSeconds;
      setTimerTime(totalSeconds);
      setOriginalTimerTime(totalSeconds);
      setCurrentTask(taskDescription);
      setCurrentCategory(selectedCategory);
    }
    setIsTimerRunning(true);
    setIsTimerFinished(false);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerTime(0);
    setOriginalTimerTime(0);
    setIsTimerFinished(false);
    setCurrentTask('');
    setCurrentCategory('');
  };

  // Group focus history by day and prayer time
  const groupFocusHistory = () => {
    const grouped = {};
    
    focusHistory.forEach(entry => {
      const date = new Date(entry.timestamp);
      const dayKey = date.toDateString();
      const prayerTime = getPrayerTimePeriod(date.getHours());
      
      if (!grouped[dayKey]) {
        grouped[dayKey] = {};
      }
      if (!grouped[dayKey][prayerTime]) {
        grouped[dayKey][prayerTime] = [];
      }
      
      grouped[dayKey][prayerTime].push(entry);
    });
    
    return grouped;
  };

  const toggleDayExpansion = (day) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const togglePrayerTimeExpansion = (day, prayerTime) => {
    const key = `${day}-${prayerTime}`;
    setExpandedPrayerTimes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Effects for intervals
  useEffect(() => {
    if (isStopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime(prev => prev + 1);
      }, 10);
    } else {
      clearInterval(stopwatchIntervalRef.current);
    }

    return () => clearInterval(stopwatchIntervalRef.current);
  }, [isStopwatchRunning]);

useEffect(() => {
  if (isTimerRunning && timerTime > 0) {
    timerIntervalRef.current = setInterval(() => {
      setTimerTime(prev => {
        if (prev <= 1) {  // Change back to 1
          setIsTimerRunning(false);
          setIsTimerFinished(true);
                     
          const focusTimeCs = originalTimerTime * 100 - stopwatchTime;
          const now = new Date();
          const newEntry = {
            task: currentTask,
            category: currentCategory,
            timerTime: originalTimerTime,
            stopwatchTime: stopwatchTime,
            focusTime: Math.max(0, focusTimeCs),
            timestamp: now.toISOString(),
            prayerTime: getPrayerTimePeriod(now.getHours())
          };
          setFocusHistory(prev => [...prev, newEntry]);
                     
          playCompletionSound();
                     
          return 0;
        }
        return prev - 1;  // Change back to 1
      });
    }, 1000);  // Change back to 1000
    } else {
      clearInterval(timerIntervalRef.current);
    }
     
    return () => clearInterval(timerIntervalRef.current);
  }, [isTimerRunning, timerTime, originalTimerTime, stopwatchTime, currentTask, currentCategory]);

  const groupedHistory = groupFocusHistory();
  const sortedDays = Object.keys(groupedHistory).sort((a, b) => new Date(b) - new Date(a));

  const getCategoryColor = (category) => {
    const colors = {
      'Islam': 'bg-green-100 text-green-800 border-green-200',
      'Career': 'bg-blue-100 text-blue-800 border-blue-200',
      'Physical': 'bg-red-100 text-red-800 border-red-200',
      'Personal Assets': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Interests': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const timeSlots = generateTimeSlots();

  if (currentView === 'timebox') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Navigation */}
          <div className="flex justify-between items-center mb-8">
            <button
              onClick={() => setCurrentView('timer')}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-md transition-colors"
            >
              <Clock size={20} />
              Back to Timer
            </button>
            <h1 className="text-4xl font-bold text-gray-800">Today's Time Box</h1>
            <div></div>
          </div>

          {/* Time Box Grid */}
          {/* Time Box Grid */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="grid grid-cols-1 gap-2">
                    {timeSlots.map((slot, index) => {
                      const sessions = getSessionsForTimeSlot(slot);
                      const hasSession = sessions.length > 0;
                      
                      return (
                        <div
                          key={index}
                          className={`p-4 border border-gray-200 min-h-16 text-sm ${
                            hasSession ? 'bg-green-50' : 'bg-gray-50'
                          }`}
                        >
                    <div className="font-semibold text-gray-700 mb-2">
                      {slot.start} - {slot.end}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{slot.prayerTime}</div>
                    
                    {sessions.map((session, sessionIndex) => (
                      <div key={sessionIndex} className="mb-2">
                        <div className={`inline-block px-1 py-0.5 rounded text-xs mb-1 ${getCategoryColor(session.category)}`}>
                          {session.category}
                        </div>
                        <div className="text-xs text-gray-600 truncate" title={session.task}>
                          {session.task}
                        </div>
                        <div className="text-xs text-green-600 font-semibold">
                          Focus: {formatFocusTime(session.focusTime)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Countdown Timers */}
        <div className="absolute top-4 left-4 space-y-3">
          <div className="bg-white rounded-lg shadow-md p-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-purple-600" />
              <div className="text-sm font-semibold text-gray-700">April 3rd, 2026</div>
            </div>
            <div className="font-mono text-lg font-bold text-purple-600">{countdownTime}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-orange-600" />
              <div className="text-sm font-semibold text-gray-700">3rd Next Month</div>
            </div>
            <div className="font-mono text-lg font-bold text-orange-600">{nextMonthCountdown}</div>
          </div>
        </div>

        {/* Export and View Controls */}
        <div className="absolute top-4 right-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg shadow-md transition-colors text-sm"
            >
              <Download size={14} />
              Excel
            </button>
            <button
              onClick={exportToJSON}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-md transition-colors text-sm"
            >
              <Download size={14} />
              JSON
            </button>
          </div>
          
          <div className="flex gap-2">
            <label className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg shadow-md transition-colors cursor-pointer text-sm">
              <input
                type="file"
                accept=".json"
                onChange={importFromJSON}
                className="hidden"
              />
              Import
            </label>
            <button
              onClick={() => setCurrentView('timebox')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg shadow-md transition-colors text-sm"
            >
              <Calendar size={14} />
              TimeBox
            </button>
          </div>
          
          <button
            onClick={clearAllData}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg shadow-md transition-colors text-sm"
          >
            Clear All
          </button>
        </div>

        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8 mt-12">Stopwatch & Timer</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Stopwatch */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">Stopwatch</h2>
            
            <div className="text-center mb-8">
              <div className="text-5xl font-mono font-bold text-blue-600 mb-4">
                {formatTime(stopwatchTime)}
              </div>
              <div className="text-sm text-gray-500">MM:SS.CS</div>
              <div className="text-xs text-gray-400 mt-2">Unfocused Time</div>
            </div>

            <div className="flex justify-center gap-3">
              {!isStopwatchRunning ? (
                <button
                  onClick={startStopwatch}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  <Play size={16} />
                  Start
                </button>
              ) : (
                <button
                  onClick={pauseStopwatch}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  <Pause size={16} />
                  Pause
                </button>
              )}
              
              <button
                onClick={resetStopwatch}
                className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
              >
                <RotateCcw size={16} />
                Reset
              </button>

            <button
              onClick={() => {
                if (isTimerRunning || timerTime > 0) {
                  const focusTimeCs = (originalTimerTime - timerTime) * 100 - stopwatchTime;
                  const now = new Date();
                  const newEntry = {
                    task: currentTask,
                    category: currentCategory,
                    timerTime: originalTimerTime,
                    stopwatchTime: stopwatchTime,
                    focusTime: Math.max(0, focusTimeCs),
                    timestamp: now.toISOString(),
                    prayerTime: getPrayerTimePeriod(now.getHours()),
                    completed: true
                  };
                  setFocusHistory(prev => [...prev, newEntry]);
                  resetTimer();
                  playCompletionSound();
                }
              }}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
              disabled={!isTimerRunning && timerTime === 0}
            >
              <Square size={16} />
              Done
            </button>
       </div>
   </div>

          {/* Timer */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">Focus Timer</h2>
            
            {/* Category Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isTimerRunning}
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Task Description Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are you working on?
              </label>
              <input
                type="text"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Enter your task description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isTimerRunning}
              />
            </div>
            
            <div className="text-center mb-6">
              <div className={`text-5xl font-mono font-bold mb-4 ${isTimerFinished ? 'text-red-600 animate-pulse' : 'text-purple-600'}`}>
                {formatTimerTime(timerTime)}
              </div>
              <div className="text-sm text-gray-500">MM:SS</div>
              {currentTask && (
                <div className="text-xs text-gray-600 mt-2 bg-purple-50 rounded p-2">
                  <div className={`inline-block px-2 py-1 rounded text-xs mb-1 ${getCategoryColor(currentCategory)}`}>
                    {currentCategory}
                  </div>
                  <div>Working on: {currentTask}</div>
                </div>
              )}
              {isTimerFinished && (
                <div className="text-red-600 font-semibold mt-2">Time's Up! 🎉</div>
              )}
            </div>

            {/* Timer Input */}
            <div className="mb-6">
              <div className="flex justify-center items-center gap-4 mb-4">
                <div className="flex flex-col items-center">
                  <label className="text-sm text-gray-600 mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerMinutes}
                    onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono"
                    disabled={isTimerRunning}
                  />
                </div>
                <div className="text-2xl font-bold text-gray-400 mt-6">:</div>
                <div className="flex flex-col items-center">
                  <label className="text-sm text-gray-600 mb-1">Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-mono"
                    disabled={isTimerRunning}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              {!isTimerRunning ? (
                <button
                  onClick={startTimer}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={!taskDescription.trim() || (timerMinutes === 0 && timerSeconds === 0)}
                >
                  <Play size={16} />
                  Start
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
                >
                  <Pause size={16} />
                  Pause
                </button>
              )}
              
              <button
                onClick={resetTimer}
                className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm"
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </div>

          {/* Focus History */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-6 text-center">Focus History</h2>
            
            {focusHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-4">📊</div>
                <p>Complete a focus session to see your stats here!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sortedDays.map(day => (
                  <div key={day} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleDayExpansion(day)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-t-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium text-gray-800">{day}</span>
                      {expandedDays[day] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </button>
                    
                    {expandedDays[day] && (
                      <div className="p-3 space-y-2">
                        {Object.entries(groupedHistory[day]).map(([prayerTime, entries]) => {
                          const totals = calculatePrayerTimeTotals(entries);
                          return (
                            <div key={prayerTime}>
                              <button
                                onClick={() => togglePrayerTimeExpansion(day, prayerTime)}
                                className="w-full flex items-center justify-between p-2 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-medium text-blue-800">{prayerTime} ({entries.length})</span>
                                  <div className="text-xs text-blue-600">
                                    Focus: {formatFocusTime(totals.focusTime)} | Unfocus: {formatFocusTime(totals.unfocusTime)}
                                  </div>
                                </div>
                                {expandedPrayerTimes[`${day}-${prayerTime}`] ? 
                                  <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </button>
                              
                              {expandedPrayerTimes[`${day}-${prayerTime}`] && (
                                <div className="mt-2 space-y-2">
                                  {entries.map((entry, index) => (
                                    <div key={index} className="bg-gray-50 rounded-lg p-3 border-l-4 border-purple-500 ml-4">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(entry.category)}`}>
                                          {entry.category}
                                        </span>
                                        <span className="font-medium text-gray-800 text-sm">{entry.task}</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                          <div className="text-gray-600">Timer:</div>
                                          <div className="font-mono">{formatTimerTime(entry.timerTime)}</div>
                                        </div>
                                        <div>
                                          <div className="text-gray-600">Unfocused:</div>
                                          <div className="font-mono text-blue-600">{formatFocusTime(entry.stopwatchTime)}</div>
                                        </div>
                                        <div>
                                          <div className="text-gray-600">Focus:</div>
                                          <div className="font-mono text-green-600 font-bold">
                                            {formatFocusTime(entry.focusTime)}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {new Date(entry.timestamp).toLocaleTimeString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}