'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/utils/supabaseClient';

type Row = {
  session_name: string;
  session_description: string;
  session_start_time: string;
  session_length_minutes: string;
  session_room: string;
  title: string;
  description: string;
  speaker_name: string;
  speaker_email: string;
  co_speakers: string;
  presentation_type: string;
  audience_level: string;
  tags: string;
  scheduled_time: string;
  length_minutes: string;
  room: string;
};

export default function ImportSchedulePage() {
  const [csvRows, setCsvRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvRows(results.data);
      },
    });
  }

  async function handleImport() {
    setImporting(true);
    setMessage('');

    // 1. Deduplicate sessions
    const sessionMap = new Map<string, any>();
    csvRows.forEach(row => {
      const key = `${row.session_name}|${row.session_start_time}|${row.session_room}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          name: row.session_name,
          description: row.session_description,
          start_time: row.session_start_time,
          length_minutes: Number(row.session_length_minutes),
          room: row.session_room,
        });
      }
    });

    // 2. Insert sessions and get their IDs
    const sessions = Array.from(sessionMap.values());
    const { data: insertedSessions, error: sessionError } = await supabase
      .from('sessions')
      .upsert(sessions, { onConflict: ['name', 'start_time', 'room'] })
      .select();

    if (sessionError) {
      setMessage('Error importing sessions: ' + sessionError.message);
      setImporting(false);
      return;
    }

    // 3. Map session keys to IDs
    const sessionIdMap: Record<string, string> = {};
    insertedSessions.forEach((session: any) => {
      const key = `${session.name}|${session.start_time}|${session.room}`;
      sessionIdMap[key] = session.id;
    });

    // 4. Prepare presentations with session_id
    const presentations = csvRows.map(row => {
      const sessionKey = `${row.session_name}|${row.session_start_time}|${row.session_room}`;
      return {
        title: row.title,
        description: row.description,
        speaker_name: row.speaker_name,
        speaker_email: row.speaker_email,
        co_speakers: row.co_speakers,
        presentation_type: row.presentation_type,
        audience_level: row.audience_level,
        tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
        scheduled_time: row.scheduled_time,
        length_minutes: Number(row.length_minutes),
        room: row.room,
        session_id: sessionIdMap[sessionKey],
      };
    });

    // 5. Insert presentations
    const { error: presError } = await supabase
      .from('presentations')
      .insert(presentations);

    if (presError) {
      setMessage('Error importing presentations: ' + presError.message);
    } else {
      setMessage('Import successful!');
      setCsvRows([]);
    }
    setImporting(false);
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Import Conference Schedule (CSV)</h1>
        <a
          href="/sample-schedule.csv"
          download
          className="mb-4 inline-block bg-blue-700 text-white px-4 py-2 rounded"
        >
          Download CSV Template
        </a>
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">Upload CSV</label>
          <label className="flex items-center cursor-pointer bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded w-fit">
            <span>Select CSV File</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {csvRows.length > 0 && (
            <div className="mt-2 text-gray-900 font-medium">
              Selected: {csvRows.length} row(s) loaded
            </div>
          )}
        </div>
        {csvRows.length > 0 && (
          <div className="mb-4">
            <h2 className="font-semibold mb-2 text-gray-900">Preview:</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border text-sm text-gray-900">
                <thead>
                  <tr>
                    {Object.keys(csvRows[0]).map(col => (
                      <th key={col} className="border px-2 py-1 text-gray-900 bg-gray-100">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="even:bg-gray-50 hover:bg-gray-100">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="border px-2 py-1 text-gray-900">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvRows.length > 5 && (
                <div className="text-gray-500">Showing first 5 rows of {csvRows.length}</div>
              )}
            </div>
          </div>
        )}
        <button
          className="bg-green-700 text-white px-4 py-2 rounded"
          onClick={handleImport}
          disabled={importing || csvRows.length === 0}
        >
          {importing ? 'Importing...' : 'Import Schedule'}
        </button>
        {message && <div className="mt-4 text-gray-900">{message}</div>}
      </div>
    </div>
  );
} 