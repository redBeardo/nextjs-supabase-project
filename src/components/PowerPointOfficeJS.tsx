'use client';

import { useState, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/auth';

interface PowerPointOfficeJSProps {
  fileId?: string;
}

interface Slide {
  id: string;
  title: string;
  notes: string;
  thumbnailUrl: string;
}

export default function PowerPointOfficeJS({ fileId }: PowerPointOfficeJSProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const loadPresentation = async () => {
      if (!fileId) return;

      try {
        const msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();

        // Get the current account
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) {
          throw new Error('No account found. Please sign in first.');
        }

        // Get access token
        const response = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        });

        // Get presentation content
        const presentationResponse = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets`,
          {
            headers: {
              Authorization: `Bearer ${response.accessToken}`
            }
          }
        );

        if (!presentationResponse.ok) {
          throw new Error(`Failed to fetch presentation: ${presentationResponse.statusText}`);
        }

        // TODO: Parse presentation content and extract slides
        // This will require additional API calls to get slide content, notes, and thumbnails
        // For now, we'll use placeholder data
        setSlides([
          {
            id: '1',
            title: 'Slide 1',
            notes: 'Speaker notes for slide 1',
            thumbnailUrl: 'placeholder-url'
          }
        ]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadPresentation();
  }, [fileId]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading presentation...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-4">
          {/* Slide Thumbnails */}
          <div className="col-span-2 bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-4">Slides</h2>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`cursor-pointer p-2 rounded ${
                    currentSlide === index ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setCurrentSlide(index)}
                >
                  <div className="text-sm font-medium">{slide.title}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-7 bg-white rounded-lg shadow p-4">
            <div className="aspect-video bg-gray-200 rounded mb-4">
              {/* Current Slide Content */}
              <div className="w-full h-full flex items-center justify-center">
                Slide {currentSlide + 1}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Previous
              </button>
              <button
                onClick={() => setIsFullScreen(true)}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Full Screen
              </button>
              <button
                onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Next
              </button>
            </div>
          </div>

          {/* Notes and Timer */}
          <div className="col-span-3 bg-white rounded-lg shadow p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Timer</h2>
              <div className="text-2xl font-mono">00:00</div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Notes</h2>
              <div className="text-sm text-gray-700">
                {slides[currentSlide]?.notes || 'No notes for this slide'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 bg-black z-50">
          <div className="w-full h-full flex items-center justify-center">
            <div className="aspect-video w-full max-w-7xl">
              {/* Full Screen Slide Content */}
              <div className="w-full h-full flex items-center justify-center text-white">
                Slide {currentSlide + 1} (Full Screen)
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsFullScreen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            Exit Full Screen
          </button>
        </div>
      )}
    </div>
  );
} 