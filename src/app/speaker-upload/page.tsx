'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { uploadToOneDrive } from '@/utils/oneDriveUtils';

export default function SpeakerUploadPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .ilike('speaker_name', `%${search}%`);
    if (error) setMessage(error.message);
    else setResults(data || []);
  }

  async function handleUpload() {
    if (!file || !selected) return;
    setUploading(true);
    setMessage('');

    try {
      // Upload to OneDrive
      const fileId = await uploadToOneDrive(file);
      
      // Update presentation record with OneDrive file ID
      const { error: updateError } = await supabase
        .from('presentations')
        .update({ 
          file_url: fileId, // Store the OneDrive file ID instead of URL
          file_provider: 'onedrive' // Add a field to track the file provider
        })
        .eq('id', selected.id);

      if (updateError) {
        setMessage('Database update failed: ' + updateError.message);
      } else {
        setMessage('Upload successful!');
      }
    } catch (error) {
      setMessage('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
      setFile(null);
      setSelected(null);
      setResults([]);
      setSearch('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-10">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Speaker Upload</h1>
        
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by speaker name..."
              className="flex-1 border border-gray-300 rounded px-4 py-2 text-gray-900 bg-white"
            />
            <button
              type="submit"
              className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded font-semibold"
            >
              Search
            </button>
          </div>
        </form>

        {results.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Search Results</h2>
            <div className="space-y-4">
              {results.map(result => (
                <div
                  key={result.id}
                  className={`p-4 border rounded cursor-pointer transition ${
                    selected?.id === result.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                  onClick={() => setSelected(result)}
                >
                  <div className="font-semibold text-gray-900">{result.title}</div>
                  <div className="text-gray-600">By: {result.speaker_name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected && (
          <div className="mb-4 bg-gray-50 rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2 text-gray-900">Upload for: {selected.title}</h2>
            <label className="flex items-center cursor-pointer bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded w-fit">
              <span>Select PPTX File</span>
              <input
                type="file"
                accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            {file && (
              <div className="mt-2 text-gray-900 font-medium">
                Selected: {file.name}
              </div>
            )}
            <button
              className="mt-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded"
              onClick={handleUpload}
              disabled={uploading || !file}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        )}
        {message && <div className="mt-4 text-gray-900">{message}</div>}
      </div>
    </div>
  );
}
