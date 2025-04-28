'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

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
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('presentations')
      .upload(`pptx/${selected.id}_${file.name}`, file, { upsert: true });
    if (error) {
      setMessage('Upload failed: ' + error.message);
      setUploading(false);
      return;
    }
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('presentations')
      .getPublicUrl(data.path);
    // Update presentation record
    const { error: updateError } = await supabase
      .from('presentations')
      .update({ file_url: publicUrlData.publicUrl })
      .eq('id', selected.id);
    if (updateError) setMessage('Database update failed: ' + updateError.message);
    else setMessage('Upload successful!');
    setUploading(false);
    setFile(null);
    setSelected(null);
    setResults([]);
    setSearch('');
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">Speaker File Upload</h1>
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          className="border border-gray-300 rounded px-3 py-2 w-64 text-gray-900"
          placeholder="Enter your name"
          value={search}
          onChange={e => setSearch(e.target.value)}
          required
        />
        <button className="bg-blue-700 text-white px-4 py-2 rounded" type="submit">
          Search
        </button>
      </form>
      {results.length > 0 && (
        <div className="mb-4 bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-2 text-gray-900">Select Your Talk</h2>
          <ul>
            {results.map(r => (
              <li key={r.id} className="mb-2">
                <button
                  className="text-blue-700 underline"
                  onClick={() => setSelected(r)}
                >
                  {r.title} ({r.scheduled_time}) in {r.room}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {selected && (
        <div className="mb-4 bg-white rounded-lg shadow p-4">
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
            className="mt-2 bg-green-700 text-white px-4 py-2 rounded"
            onClick={handleUpload}
            disabled={uploading || !file}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      )}
      {message && <div className="mt-4 text-gray-900">{message}</div>}
    </div>
  );
}
