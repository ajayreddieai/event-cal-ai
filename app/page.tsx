"use client";

import React from 'react';

type EventCategory = 'concert' | 'professional';

type Event = {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  category: EventCategory;
  url?: string;
};

const categoryFromPayload = (value: unknown): EventCategory => {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('professional') || raw.includes('business') || raw.includes('tech')) {
    return 'professional';
  }
  return 'concert';
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
});

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDateKey(key: string) {
  const [yearString, monthString, dayString] = key.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

function timeToMinutes(time: string) {
  if (!time) return 24 * 60;
  const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)?$/i);
  if (!match) return 24 * 60;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 24 * 60;
  }
  return hours * 60 + minutes;
}

const tabOptions: { id: EventCategory; label: string; icon: string }[] = [
  { id: 'concert', label: 'Concerts', icon: '🎵' },
  { id: 'professional', label: 'Professional', icon: '💼' }
];

export default function Page() {
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [events, setEvents] = React.useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedTab, setSelectedTab] = React.useState<EventCategory>('concert');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        setLoading(true);
        setError(null);

        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const apiPath = `${basePath}/api/events`;
        const staticPath = `${basePath}/data/events.json`;

        const mergedEvents: Event[] = [];

        const mapPayloadToEvents = (payload: any) => (
          (payload?.events ?? []).map((event: any, index: number) => ({
            id: Number(event?.id) || Number(event?.eventId) || index,
            title: String(event?.title ?? 'Untitled event'),
            date: String(event?.date ?? ''),
            time: String(event?.time ?? ''),
            location: String(event?.location ?? ''),
            description: String(event?.description ?? ''),
            category: categoryFromPayload(event?.category),
            url: event?.url ? String(event.url) : undefined,
          }))
        );

        const dedupe = (list: Event[]) => {
          const seen = new Map<string, Event>();
          for (const item of list) {
            if (!item.date || !item.title) continue;
            const key = `${item.title.toLowerCase()}|${item.date}|${item.category}`;
            if (!seen.has(key)) {
              seen.set(key, item);
            }
          }
          return Array.from(seen.values());
        };

        let apiFailed = false;
        try {
          const apiResponse = await fetch(apiPath, { cache: 'no-store' });
          if (apiResponse.ok) {
            mergedEvents.push(...mapPayloadToEvents(await apiResponse.json()));
          } else {
            apiFailed = true;
          }
        } catch {
          apiFailed = true;
        }

        if (apiFailed) {
          const staticResponse = await fetch(staticPath, { cache: 'no-store' });
          if (!staticResponse.ok) {
            throw new Error('Unable to load events right now.');
          }
          mergedEvents.push(...mapPayloadToEvents(await staticResponse.json()));
        } else {
          try {
            const staticResponse = await fetch(staticPath, { cache: 'no-store' });
            if (staticResponse.ok) {
              mergedEvents.push(...mapPayloadToEvents(await staticResponse.json()));
            }
          } catch {
            // ignore static errors when API succeeded
          }
        }

        const incoming = dedupe(mergedEvents);

        if (!cancelled) {
          setEvents(incoming);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load events right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvents = React.useMemo(() => events.filter((event) => event.category === selectedTab), [events, selectedTab]);

  const eventsByDate = React.useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const event of filteredEvents) {
      if (!event.date) continue;
      if (!map[event.date]) {
        map[event.date] = [];
      }
      map[event.date].push(event);
    }
    return map;
  }, [filteredEvents]);

  const tabHasNoEvents = filteredEvents.length === 0;

  const selectDate = React.useCallback((date: Date, alignMonth = false) => {
    if (Number.isNaN(date.getTime())) return;
    if (alignMonth) {
      setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setSelectedDate(dateKey(date.getFullYear(), date.getMonth(), date.getDate()));
  }, []);

  React.useEffect(() => {
    const preset = new Date(2025, 8, 1);
    selectDate(preset, true);
  }, [selectDate]);

  const now = new Date();
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const monthLabel = monthYearFormatter.format(currentDate);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const shiftMonth = React.useCallback(
    (offset: number) => {
      const target = new Date(currentYear, currentMonth + offset, 1);
      selectDate(target, true);
    },
    [currentYear, currentMonth, selectDate],
  );

  const goToToday = React.useCallback(() => {
    selectDate(new Date(), true);
  }, [selectDate]);

  const selectedEvents = React.useMemo(() => {
    if (!selectedDate) return [];
    const dayEvents = eventsByDate[selectedDate];
    if (!dayEvents) return [];
    return [...dayEvents].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [selectedDate, eventsByDate]);

  const eventCount = selectedEvents.length;
  const selectedDateLabel = selectedDate ? fullDateFormatter.format(parseDateKey(selectedDate)) : null;

  const renderDayCell = (date: Date, isAdjacent: boolean) => {
    const cellKey = dateKey(date.getFullYear(), date.getMonth(), date.getDate());
    const isSelected = selectedDate === cellKey;
    const isToday = cellKey === todayKey;
    const dayEvents = eventsByDate[cellKey] ?? [];
    const hasEvents = dayEvents.length > 0;

    const classNames = ['calendar-day'];
    if (isAdjacent) classNames.push('calendar-day--adjacent');
    if (isSelected) classNames.push('is-selected');
    if (isToday) classNames.push('is-today');
    if (hasEvents) classNames.push('has-events');

    const truncatedEvents = dayEvents.slice(0, 3);
    const ariaParts = [fullDateFormatter.format(date)];
    if (hasEvents) {
      ariaParts.push(`${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`);
    }

    return (
      <div
        key={`${isAdjacent ? 'adjacent-' : ''}${cellKey}`}
        className={classNames.filter(Boolean).join(' ')}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={ariaParts.join(', ')}
        onClick={() => {
          selectDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()), isAdjacent);
        }}
        onKeyDown={(evt) => {
          if (evt.key === 'Enter' || evt.key === ' ') {
            evt.preventDefault();
            selectDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()), isAdjacent);
          }
        }}
      >
        <span className="calendar-day__label">{date.getDate()}</span>
        <div className="calendar-day__events">
          {truncatedEvents.map((event) => (
            <span key={event.id} className="calendar-event-pill" title={event.title}>
              <span className="calendar-event-pill__title">
                {event.title.length > 22 ? `${event.title.slice(0, 22)}...` : event.title}
              </span>
              {event.time && <span className="calendar-event-pill__time">{event.time}</span>}
            </span>
          ))}
          {dayEvents.length > truncatedEvents.length && (
            <span className="calendar-day__more">
              +{dayEvents.length - truncatedEvents.length} more
            </span>
          )}
        </div>
      </div>
    );
  };

  const gridCells: React.ReactNode[] = [];

  for (let i = startingDayOfWeek; i > 0; i -= 1) {
    const prevDate = new Date(currentYear, currentMonth, 1 - i);
    gridCells.push(renderDayCell(prevDate, true));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(currentYear, currentMonth, day);
    gridCells.push(renderDayCell(date, false));
  }

  const totalCells = gridCells.length;
  const targetCells = totalCells <= 35 ? 35 : 42;

  for (let i = 1; i <= targetCells - totalCells; i += 1) {
    const nextDate = new Date(currentYear, currentMonth + 1, i);
    gridCells.push(renderDayCell(nextDate, true));
  }

  return (
    <div className="calendar-page">
      <div className="calendar-page__container">
        <header className="calendar-page__header">
          <h1 className="calendar-page__title">Event Calendar</h1>
          <p className="calendar-page__subtitle">
            Minimal monochrome agenda inspired by Apple Calendar.
          </p>
        </header>

        <div className="calendar-page__layout">
          <section className="calendar-card" aria-label="Monthly calendar">
            <div className="calendar-card__top">
              <div className="calendar-tabs" role="tablist" aria-label="Event category">
                {tabOptions.map((tab) => {
                  const isActive = selectedTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`calendar-tab${isActive ? ' is-active' : ''}`}
                      onClick={() => setSelectedTab(tab.id)}
                    >
                      <span className="calendar-tab__icon" aria-hidden="true">{tab.icon}</span>
                      <span className="calendar-tab__label">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="calendar-card__controls">
                <button type="button" className="nav-button nav-button--text" onClick={goToToday}>
                  Today
                </button>
                <div className="calendar-card__current">
                  <button
                    type="button"
                    className="nav-button"
                    onClick={() => shiftMonth(-1)}
                    aria-label="Go to previous month"
                  >
                    <span aria-hidden="true">&#8249;</span>
                  </button>
                  <h2 className="calendar-card__month">{monthLabel}</h2>
                  <button
                    type="button"
                    className="nav-button"
                    onClick={() => shiftMonth(1)}
                    aria-label="Go to next month"
                  >
                    <span aria-hidden="true">&#8250;</span>
                  </button>
                </div>
              </div>

              {(loading || error) && (
                <div className="calendar-card__status">
                  {error ? (
                    <div className="banner banner--error" role="alert">
                      {error}
                    </div>
                  ) : (
                    <div className="banner" role="status">
                      Refreshing events...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="calendar-card__weekdays">
                {weekdays.map((day) => (
                  <span key={day} className="calendar-card__weekday">
                    {day}
                  </span>
                ))}
              </div>
              <div className="calendar-grid">{gridCells}</div>
            </div>
          </section>

          <section className="event-panel" aria-live="polite">
            <header className="event-panel__header">
              <span className="event-panel__title">Schedule</span>
              <h2 className="event-panel__date">{selectedDateLabel ?? 'Select a day'}</h2>
              {selectedDate && (
                <span className="event-panel__count">
                  {eventCount} {eventCount === 1 ? 'event' : 'events'} • {selectedTab === 'concert' ? 'Concerts' : 'Professional'}
                </span>
              )}
            </header>

            <div className="event-panel__body">
              {!selectedDate && (
                <p className="event-panel__empty">Choose a day to view its agenda.</p>
              )}
              {selectedDate && eventCount === 0 && (
                <p className="event-panel__empty">
                  {tabHasNoEvents
                    ? `No ${selectedTab === 'concert' ? 'concert' : 'professional'} events found.`
                    : 'No events scheduled.'}
                </p>
              )}
              {eventCount > 0 && (
                <ul className="event-list">
                  {selectedEvents.map((event) => (
                    <li key={event.id} className="event-card">
                      <span className="event-card__time">{event.time || 'All day'}</span>
                      {event.url ? (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="event-card__title"
                        >
                          {event.title}
                        </a>
                      ) : (
                        <span className="event-card__title">{event.title}</span>
                      )}
                      {event.location && (
                        <span className="event-card__meta">Location · {event.location}</span>
                      )}
                      {event.description && (
                        <p className="event-card__description">{event.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}



