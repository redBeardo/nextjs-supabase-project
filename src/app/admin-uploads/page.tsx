'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

type Presentation = {
  id: string;
  title: string;
  speaker_name: string;
  scheduled_time: string;
  room: string;
  file_url: string | null;
};

type LogEntry = {
  id: string;
  action: string;
  presentation_id: string;
  user_name: string;
  details: any;
  created_at: string;
};

export default function AdminUploadsPage() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    async function fetchPresentations() {
      setLoading(true);
      const { data, error } = await supabase
        .from('presentations')
        .select('id, title, speaker_name, scheduled_time, room, file_url');
      if (data) setPresentations(data);
      setLoading(false);
    }
    fetchPresentations();
  }, []);

  useEffect(() => {
    async function fetchLog() {
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setLogEntries(data || []);
    }
    fetchLog();
  }, []);

  const uploaded = presentations.filter(p => !!p.file_url);
  const notUploaded = presentations.filter(p => !p.file_url);

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-lg shadow p-4 mb-8">
        <h2 className="text-xl font-bold mb-2 text-gray-900">Recent Changes</h2>
        {logEntries.length === 0 ? (
          <div className="text-gray-700">No recent changes.</div>
        ) : (
          <ul>
            {logEntries.map(log => (
              <li key={log.id} className="mb-2 text-gray-900">
                <span className="font-semibold">{log.user_name || 'Unknown user'}</span> 
                {' '}performed <span className="font-semibold">{log.action}</span> 
                {' '}on presentation <span className="font-mono">{log.presentation_id}</span>
                {' '}at {new Date(log.created_at).toLocaleString()}
                {log.details && (
                  <div className="text-xs text-gray-600">
                    Details: {JSON.stringify(log.details)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Presentation Upload Status</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-2 text-green-700">Uploaded ({uploaded.length})</h2>
            {uploaded.length === 0 ? (
              <div className="text-gray-700">No presentations uploaded yet.</div>
            ) : (
              <ul>
                {uploaded.map(p => (
                  <li key={p.id} className="mb-2">
                    <span className="font-semibold text-gray-900">{p.title}</span> by {p.speaker_name}
                    <br />
                    <span className="text-sm text-gray-600">
                      {new Date(p.scheduled_time).toLocaleString()} in {p.room}
                    </span>
                    <br />
                    <a
                      href={p.file_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline"
                    >
                      View File
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-2 text-red-700">Not Uploaded ({notUploaded.length})</h2>
            {notUploaded.length === 0 ? (
              <div className="text-gray-700">All presentations have files uploaded!</div>
            ) : (
              <ul>
                {notUploaded.map(p => (
                  <li key={p.id} className="mb-2">
                    <span className="font-semibold text-gray-900">{p.title}</span> by {p.speaker_name}
                    <br />
                    <span className="text-sm text-gray-600">
                      {new Date(p.scheduled_time).toLocaleString()} in {p.room}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
