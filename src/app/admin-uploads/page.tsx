'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { uploadToOneDrive, getFileWebUrl } from '@/utils/oneDriveUtils';
import PowerPointViewer from '@/components/PowerPointViewer';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '@/config/auth';

type Presentation = {
  id: string;
  title: string;
  speaker_name: string;
  scheduled_time: string;
  room: string;
  file_url: string | null;
  file_provider: string | null;
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
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();
        
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) {
          setAuthError('Please sign in first. Visit the test page to authenticate.');
          return;
        }

        // Try to get a token silently
        await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        });
      } catch (error) {
        setAuthError('Authentication error. Please sign in again.');
        console.error('Auth error:', error);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    async function fetchPresentations() {
      setLoading(true);
      const { data, error } = await supabase
        .from('presentations')
        .select('id, title, speaker_name, scheduled_time, room, file_url, file_provider');
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

  const handleFileUpload = async (file: File, presentation: Presentation) => {
    setUploading(true);
    setUploadMessage('');
    try {
      const fileId = await uploadToOneDrive(file);
      
      const { error: updateError } = await supabase
        .from('presentations')
        .update({ 
          file_url: fileId,
          file_provider: 'onedrive'
        })
        .eq('id', presentation.id);

      if (updateError) {
        setUploadMessage('Database update failed: ' + updateError.message);
      } else {
        setUploadMessage('Upload successful!');
        // Refresh presentations
        const { data } = await supabase
          .from('presentations')
          .select('id, title, speaker_name, scheduled_time, room, file_url, file_provider');
        if (data) setPresentations(data);
      }
    } catch (error) {
      setUploadMessage('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const uploaded = presentations.filter(p => !!p.file_url);
  const notUploaded = presentations.filter(p => !p.file_url);

  if (authError) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Authentication Required</p>
          <p>{authError}</p>
          <a 
            href="/test" 
            className="mt-2 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Test Page
          </a>
        </div>
      </div>
    );
  }

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
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-gray-900">{p.title}</span> by {p.speaker_name}
                        <br />
                        <span className="text-sm text-gray-600">
                          {new Date(p.scheduled_time).toLocaleString()} in {p.room}
                        </span>
                        {p.file_url && (
                          <div className="text-sm text-blue-600 mt-1">
                            <a href={`/powerpoint-office?fileId=${p.file_url}`} className="hover:underline">
                              View Presentation
                            </a>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedPresentation(p)}
                        className="text-blue-700 underline"
                      >
                        View
                      </button>
                    </div>
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
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-gray-900">{p.title}</span> by {p.speaker_name}
                        <br />
                        <span className="text-sm text-gray-600">
                          {new Date(p.scheduled_time).toLocaleString()} in {p.room}
                        </span>
                      </div>
                      <label className="flex items-center cursor-pointer bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded w-fit">
                        <span>Upload</span>
                        <input
                          type="file"
                          accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, p);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {selectedPresentation && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedPresentation.title}</h2>
              <button
                onClick={() => setSelectedPresentation(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {selectedPresentation.file_provider === 'onedrive' ? (
              <PowerPointViewer fileId={selectedPresentation.file_url!} />
            ) : (
              <div className="text-gray-600">This presentation is not stored in OneDrive.</div>
            )}
          </div>
        </div>
      )}

      {uploading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4">
            <div className="text-center">
              <div className="text-gray-900 mb-2">Uploading...</div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700 mx-auto"></div>
            </div>
          </div>
        </div>
      )}

      {uploadMessage && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4">
          {uploadMessage}
        </div>
      )}
    </div>
  );
}
