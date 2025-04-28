'use client';

import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer, Event, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { supabase } from '@/utils/supabaseClient';

const DnDCalendar = withDragAndDrop(Calendar);

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

type Presentation = {
  id: string;
  title: string;
  scheduled_time: string;
  length_minutes: number;
  room: string;
  speaker_name: string;
  session_id: string;
  speaker_image?: string;
  file_url?: string;
};

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: any;
  color?: string;
  borderColor?: string;
}

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [minDate, setMinDate] = useState<Date | undefined>();
  const [maxDate, setMaxDate] = useState<Date | undefined>();
  const [currentDate, setCurrentDate] = useState<Date | undefined>();
  const [editForm, setEditForm] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [presentationTypes, setPresentationTypes] = useState<string[]>([]);
  const [typeColorMap, setTypeColorMap] = useState<Record<string, { bg: string; border: string }>>({});
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const colorPalette = [
    { bg: 'rgba(251, 191, 36, 0.2)', border: '#fbbf24' },   // yellow
    { bg: 'rgba(96, 165, 250, 0.2)', border: '#60a5fa' },   // blue
    { bg: 'rgba(52, 211, 153, 0.2)', border: '#34d399' },   // green
    { bg: 'rgba(244, 114, 182, 0.2)', border: '#f472b6' },  // pink
    { bg: 'rgba(251, 113, 133, 0.2)', border: '#fb7185' },  // red
    { bg: 'rgba(129, 140, 248, 0.2)', border: '#818cf8' },  // indigo
    { bg: 'rgba(167, 139, 250, 0.2)', border: '#a78bfa' },  // purple
    { bg: 'rgba(236, 72, 153, 0.2)', border: '#ec4899' },   // fuchsia
  ];

  useEffect(() => {
    async function fetchPresentations() {
      const { data } = await supabase
        .from('presentations')
        .select('id, title, scheduled_time, length_minutes, room, speaker_name, session_id, presentation_type, file_url');
      if (data) {
        // Extract unique presentation types and create color mapping
        const uniqueTypes = Array.from(new Set(data.map((p: any) => p.presentation_type).filter(Boolean)));
        setPresentationTypes(uniqueTypes);

        // Create dynamic color mapping
        const newTypeColorMap: Record<string, { bg: string; border: string }> = {};
        uniqueTypes.forEach((type, index) => {
          // Cycle through the color palette if we have more types than colors
          const colorIndex = index % colorPalette.length;
          newTypeColorMap[type] = colorPalette[colorIndex];
        });
        setTypeColorMap(newTypeColorMap);

        const eventList = data.map((p: any) => ({
          id: p.id,
          title: `${p.title} (${p.speaker_name}) [${p.room}]`,
          start: new Date(p.scheduled_time),
          end: new Date(new Date(p.scheduled_time).getTime() + p.length_minutes * 60000),
          allDay: false,
          resource: p,
          color: p.presentation_type ? newTypeColorMap[p.presentation_type]?.bg : 'rgba(163,163,163,0.2)',
          borderColor: p.presentation_type ? newTypeColorMap[p.presentation_type]?.border : '#a3a3a3',
        }));
        setEvents(eventList);

        // Extract unique rooms
        const uniqueRooms = Array.from(new Set(data.map((p: any) => p.room).filter(Boolean)));
        setRooms(uniqueRooms);

        if (eventList.length > 0) {
          const starts = eventList.map(e => e.start.getTime());
          const ends = eventList.map(e => e.end.getTime());
          const min = new Date(Math.min(...starts));
          const max = new Date(Math.max(...ends));
          setMinDate(min);
          setMaxDate(max);
          setCurrentDate(min); // Set the default date to the first session day
        }
      }
    }
    fetchPresentations();
  }, []);

  // Filter events by selected room
  const filteredEvents = selectedRoom
    ? events.filter(event => event.resource.room === selectedRoom)
    : events;

  // Prevent navigation outside the conference range
  function handleNavigate(date: Date, view: View) {
    if (minDate && maxDate) {
      if (date < minDate) return setCurrentDate(minDate);
      if (date > maxDate) return setCurrentDate(maxDate);
    }
    setCurrentDate(date);
  }

  // Handler for moving events
  const moveEvent = async ({ event, start, end }: any) => {
    setEvents(prevEvents =>
      prevEvents.map(ev =>
        ev.id === event.id ? { ...ev, start, end } : ev
      )
    );
    // Update Supabase
    const { error } = await supabase
      .from('presentations')
      .update({
        scheduled_time: start.toISOString(),
        length_minutes: Math.round((end.getTime() - start.getTime()) / 60000),
      })
      .eq('id', event.id);
    if (error) {
      alert('Failed to update presentation time: ' + error.message);
    }

    await supabase
      .from('audit_log')
      .insert([{
        action: 'move_time',
        presentation_id: event.id,
        user_name: 'Admin',
        details: { oldTime: event.start, newTime: start }
      }]);
  };

  // Handle event click
  function handleSelectEvent(event: any) {
    setSelectedEvent(event);
    setEditForm({
      title: event.resource.title,
      speaker_name: event.resource.speaker_name,
      room: event.resource.room,
      file_url: event.resource.file_url,
      // Add more fields as needed
    });
  }

  // Handle modal form change
  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setEditForm((prev: any) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  function handleRoomChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "__add_new_room__") {
      setAddingRoom(true);
      setNewRoomName("");
    } else {
      setEditForm((prev: any) => ({
        ...prev,
        room: e.target.value,
      }));
      setAddingRoom(false);
    }
  }

  function handleNewRoomInput(e: React.ChangeEvent<HTMLInputElement>) {
    setNewRoomName(e.target.value);
  }

  function handleAddRoomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newRoomName.trim() && !rooms.includes(newRoomName.trim())) {
      setRooms(prev => [...prev, newRoomName.trim()]);
    }
    setEditForm((prev: any) => ({
      ...prev,
      room: newRoomName.trim(),
    }));
    setAddingRoom(false);
    setNewRoomName("");
  }

  // Save changes
  async function handleEditSave() {
    if (!selectedEvent) return;
    setSaving(true);
    await supabase
      .from('presentations')
      .update({
        title: editForm.title,
        speaker_name: editForm.speaker_name,
        room: editForm.room,
      })
      .eq('id', selectedEvent.id);

    await supabase
      .from('audit_log')
      .insert([{
        action: 'update_title',
        presentation_id: selectedEvent.id,
        user_name: 'Admin', // or get from auth/session
        details: { oldTitle: selectedEvent.resource.title, newTitle: editForm.title }
      }]);

    // Update event in UI
    setEvents(prevEvents =>
      prevEvents.map(ev =>
        ev.id === selectedEvent.id
          ? {
              ...ev,
              title: `${editForm.title} (${editForm.speaker_name}) [${editForm.room}]`,
              resource: {
                ...ev.resource,
                ...editForm,
              },
            }
          : ev
      )
    );
    setSaving(false);
    setSelectedEvent(null);
    setEditForm(null);
  }

  // Add this custom event component inside CalendarPage
  function MyCustomEvent({ event }: { event: any }) {
    const start = event.start;
    const end = event.end;
    const timeRange = `${format(start, 'HH:mm')}-${format(end, 'HH:mm')}`;
    const hasPresentation = !!event.resource.file_url;
    return (
      <div className="flex flex-col h-full justify-between relative">
        <div>
          <div className="text-xs font-bold leading-tight mb-1">{timeRange}</div>
          <div className="text-xs font-semibold mb-1">{event.title.split(' (')[0]}</div>
          <div className="flex items-center gap-1 text-xs text-gray-700 mb-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {event.resource.speaker_name}
          </div>
        </div>
        <div className="flex justify-end mt-2">
          <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-semibold">{event.resource.room}</span>
        </div>
        {/* Presentation upload status icon */}
        <div className="absolute bottom-1 left-1">
          {hasPresentation ? (
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10V6a5 5 0 0110 0v4M12 16v-4m0 0l-2 2m2-2l2 2" /></svg>
          ) : (
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          )}
        </div>
      </div>
    );
  }

  function NoTime() {
    return null;
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen flex flex-col items-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-7xl">
        <h1 className="text-3xl font-extrabold mb-6 text-gray-900">Conference Calendar</h1>
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-full font-semibold border ${
              selectedRoom === null
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
            onClick={() => setSelectedRoom(null)}
          >
            All Rooms
          </button>
          {rooms.map(room => (
            <button
              key={room}
              className={`px-4 py-2 rounded-full font-semibold border ${
                selectedRoom === room
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              onClick={() => setSelectedRoom(room)}
            >
              {room}
            </button>
          ))}
        </div>
        <DnDCalendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700, backgroundColor: 'white' }}
          className="!bg-white"
          popup
          views={['month', 'week', 'day', 'agenda']}
          defaultView="week"
          tooltipAccessor={event => event.title}
          date={currentDate}
          onNavigate={handleNavigate}
          onEventDrop={moveEvent}
          resizable
          onEventResize={moveEvent}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={(event: CalendarEvent) => ({
            className: 'custom-event-style',
            style: {
              backgroundColor: event.color || 'rgba(163,163,163,0.2)',
              color: '#1a202c',
              borderRadius: '0.5rem',
              border: `2px solid ${event.borderColor || '#a3a3a3'}`,
              fontWeight: 'bold',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              padding: '0.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
            },
          })}
          components={{
            event: MyCustomEvent,
            time: NoTime,
          }}
        />
      </div>
      {/* Modal for editing event */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            {/* Presentation upload status traffic light */}
            {editForm.file_url ? (
              <div className="flex items-center mb-4">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                <a href={editForm.file_url} target="_blank" rel="noopener noreferrer" className="text-green-700 font-semibold underline">Presentation uploaded</a>
              </div>
            ) : (
              <div className="flex items-center mb-4">
                <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
                <span className="text-yellow-700 font-semibold">No presentation uploaded</span>
              </div>
            )}
            <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Presentation</h2>
            <label className="block mb-2">
              <span className="text-gray-900 font-semibold">Title</span>
              <input
                name="title"
                className="block w-full border border-gray-300 rounded px-3 py-2 mt-1 text-gray-900"
                value={editForm.title}
                onChange={handleEditChange}
              />
            </label>
            <label className="block mb-2">
              <span className="text-gray-900 font-semibold">Speaker Name</span>
              <input
                name="speaker_name"
                className="block w-full border border-gray-300 rounded px-3 py-2 mt-1 text-gray-900"
                value={editForm.speaker_name}
                onChange={handleEditChange}
              />
            </label>
            <label className="block mb-4">
              <span className="text-gray-900 font-semibold">Room</span>
              <div className="relative">
                <select
                  name="room"
                  className="block w-full bg-white border border-gray-300 rounded-full px-4 py-2 mt-1 text-gray-900 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10"
                  value={editForm.room}
                  onChange={handleRoomChange}
                >
                  <option value="">Select a room</option>
                  {rooms.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                  <option value="__add_new_room__">Add new room…</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {addingRoom && (
                <form onSubmit={handleAddRoomSubmit} className="mt-2 flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-gray-900 font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new room name"
                    value={newRoomName}
                    onChange={handleNewRoomInput}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-full font-semibold shadow"
                  >
                    Add
                  </button>
                </form>
              )}
            </label>
            <div className="flex gap-2">
              <button
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded font-semibold"
                onClick={handleEditSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded font-semibold"
                onClick={() => setSelectedEvent(null)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
