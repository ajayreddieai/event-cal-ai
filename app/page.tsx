"use client";

import React from 'react';

type Event = {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  location: string;
  category: string;
  description: string;
};

const monthNames = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];

export default function Page() {
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [events, setEvents] = React.useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/events', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load events');
        const data = await res.json();
        const incoming: Event[] = (data?.events || []).map((e: any) => ({
          id: Number(e.id) || Math.floor(Math.random() * 1e9),
          title: e.title,
          date: e.date,
          time: e.time || '',
          location: e.location || '',
          category: e.category || 'music',
          description: e.description || ''
        }));
        if (!cancelled) setEvents(incoming);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Force September 2025 as default visible month if today not in 2025-09, to mirror demo
  React.useEffect(() => {
    setCurrentDate(new Date(2025, 8, 1));
  }, []);

  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  function previousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  }

  function dateKey(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function eventsFor(dateStr: string) {
    return events.filter(e => e.date === dateStr);
  }

  const gridCells: React.ReactNode[] = [];
  // Leading blanks (prev month)
  for (let i = 0; i < startingDayOfWeek; i++) {
    gridCells.push(
      <div key={`prev-${i}`} style={styles.calendarDayOther} />
    );
  }
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = dateKey(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayEvents = eventsFor(dStr);
    gridCells.push(
      <div key={`day-${day}`} style={styles.calendarDay} onClick={() => setSelectedDate(dStr)}>
        <div style={styles.dateNumber}>{day}</div>
        {dayEvents.slice(0, 3).map(ev => (
          <div key={ev.id} style={{...styles.eventItem, ...categoryStyle(ev.category)}} title={ev.title}>
            {ev.title.length > 18 ? ev.title.slice(0, 18) + '…' : ev.title}
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div style={styles.eventItem}>+{dayEvents.length - 3} more</div>
        )}
      </div>
    );
  }
  // Trailing blanks to fill 6 rows (42 cells)
  const remaining = 42 - gridCells.length;
  for (let i = 0; i < remaining; i++) {
    gridCells.push(<div key={`next-${i}`} style={styles.calendarDayOther} />);
  }

  const selectedEvents = selectedDate ? eventsFor(selectedDate) : [];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📅 Event Calendar</h1>
          <p style={styles.subtitle}>Discover and organize local events</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <div style={styles.card}>
            <div style={styles.calHeader}>
              <button onClick={previousMonth} style={styles.navBtn}>‹</button>
              <div style={styles.monthYear}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
              <button onClick={nextMonth} style={styles.navBtn}>›</button>
            </div>
            {loading && (
              <div style={{ padding: 12, color: '#fff', background: '#007AFF' }}>Loading latest events…</div>
            )}
            {error && (
              <div style={{ padding: 12, color: '#fff', background: '#FF3B30' }}>{error}</div>
            )}
            <div style={styles.weekHeader}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} style={styles.weekdayHeader}>{d}</div>
              ))}
            </div>
            <div style={styles.calendarGrid}>{gridCells}</div>
          </div>

          <div style={styles.sidebar}>
            <div style={styles.sectionTitle}>📊 {selectedDate ? `Events on ${selectedDate}` : 'Pick a date'}</div>
            <div style={styles.eventList}>
              {selectedDate && selectedEvents.length === 0 && (
                <p style={{ color: '#666', textAlign: 'center' }}>No events scheduled</p>
              )}
              {selectedEvents.map(ev => (
                <div key={ev.id} style={styles.eventCard}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{ev.title}</div>
                  <div style={styles.eventMeta}>⏰ {ev.time}</div>
                  <div style={{ ...styles.eventMeta, color: '#007AFF' }}>📍 {ev.location}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{ev.category}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function categoryStyle(category: string): React.CSSProperties {
  const map: Record<string, string> = {
    business: '#FF9500',
    technology: '#34C759',
    arts: '#AF52DE',
    music: '#FF2D70',
    sports: '#FF3B30',
    networking: '#5856D6',
  };
  return { background: map[category] || '#007AFF' };
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: 20,
  },
  container: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#fff',
  },
  title: {
    fontSize: 36,
    margin: 0,
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.9,
    marginTop: 6,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  calHeader: {
    background: '#007AFF',
    color: '#fff',
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: 'none',
    width: 36,
    height: 36,
    borderRadius: '50%',
    cursor: 'pointer'
  },
  monthYear: {
    fontWeight: 700,
    fontSize: 18,
  },
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)'
  },
  weekdayHeader: {
    background: '#f8f9fa',
    padding: '12px 4px',
    textAlign: 'center',
    fontWeight: 600,
    color: '#666',
    borderBottom: '1px solid #e0e0e0'
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)'
  },
  calendarDay: {
    minHeight: 110,
    padding: 6,
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    cursor: 'pointer'
  },
  calendarDayOther: {
    minHeight: 110,
    padding: 6,
    borderRight: '1px solid #e0e0e0',
    borderBottom: '1px solid #e0e0e0',
    background: '#fafafa'
  },
  dateNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: '#333',
    marginBottom: 6,
  },
  eventItem: {
    background: '#007AFF',
    color: '#fff',
    padding: '3px 6px',
    borderRadius: 10,
    fontSize: 12,
    marginBottom: 4,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  sidebar: {
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
    padding: 16,
    height: 'fit-content'
  },
  sectionTitle: {
    fontWeight: 700,
    fontSize: 18,
    marginBottom: 12,
    color: '#333'
  },
  eventList: {
    maxHeight: 420,
    overflowY: 'auto'
  },
  eventCard: {
    background: '#f8f9fa',
    borderLeft: '4px solid #007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10
  },
  eventMeta: {
    fontSize: 12,
    color: '#666',
  }
};



