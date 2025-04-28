'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

type Presentation = {
  id: number;
  title: string;
  description: string;
  speaker_name: string;
  scheduled_time: string;
};

export default function SchedulePage() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    speaker_name: '',
    scheduled_time: '',
    file: undefined as File | undefined,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPresentations();
  }, []);

  async function fetchPresentations() {
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .order('scheduled_time', { ascending: true });
    if (!error) setPresentations(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let fileUrl = '';
    if (form.file) {
      const { data, error } = await supabase.storage
        .from('presentations')
        .upload(`pptx/${Date.now()}_${form.file.name}`, form.file);

      if (error) {
        setLoading(false);
        alert('File upload failed: ' + error.message);
        return;
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('presentations')
        .getPublicUrl(data.path);
      fileUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from('presentations').insert([{
      title: form.title,
      description: form.description,
      speaker_name: form.speaker_name,
      scheduled_time: form.scheduled_time,
      file_url: fileUrl,
    }]);
    setLoading(false);
    if (!error) {
      setForm({ title: '', description: '', speaker_name: '', scheduled_time: '', file: undefined });
      fetchPresentations();
    }
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Conference Schedule</h1>
      <form onSubmit={handleSubmit} className="mb-8 bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">Presentation Title</label>
          <input
            className="border border-gray-300 p-2 w-full rounded text-gray-900"
            placeholder="Presentation Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">Speaker Name</label>
          <input
            className="border border-gray-300 p-2 w-full rounded text-gray-900"
            placeholder="Speaker Name"
            value={form.speaker_name}
            onChange={e => setForm(f => ({ ...f, speaker_name: e.target.value }))}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">Description</label>
          <textarea
            className="border border-gray-300 p-2 w-full rounded text-gray-900"
            placeholder="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">Scheduled Time</label>
          <input
            className="border border-gray-300 p-2 w-full rounded text-gray-900"
            type="datetime-local"
            value={form.scheduled_time}
            onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">Upload PPTX</label>
          <label className="flex items-center cursor-pointer bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded w-fit">
            <span>Select PPTX File</span>
            <input
              type="file"
              accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] }))}
              className="hidden"
              required
            />
          </label>
          {form.file && (
            <div className="mt-2 text-gray-900 font-medium">
              Selected: {form.file.name}
            </div>
          )}
        </div>
        <button
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded font-semibold"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Uploading...' : 'Upload Presentation'}
        </button>
      </form>

      <h2 className="text-2xl font-semibold mb-4 text-gray-900">Scheduled Presentations</h2>
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        {presentations.length === 0 && <p className="text-gray-700">No presentations scheduled yet.</p>}
        <ul>
          {presentations.map(p => (
            <li key={p.id} className="mb-6 pb-4 border-b border-gray-100 last:border-b-0">
              <div className="font-bold text-lg text-gray-900">{p.title}</div>
              <div className="text-gray-800">By: {p.speaker_name}</div>
              <div className="text-gray-700 mb-1">{p.description}</div>
              <div className="text-sm text-gray-500">
                Scheduled: {new Date(p.scheduled_time).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
