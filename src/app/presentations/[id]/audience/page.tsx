'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

export default function AudienceViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [currentSlide, setCurrentSlide] = useState(1);
  const [viewUrl, setViewUrl] = useState(searchParams.get('viewUrl'));

  useEffect(() => {
    // Listen for messages from the presenter view
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOTO_SLIDE') {
        setCurrentSlide(event.data.slideNumber);
        if (event.data.url) {
          setViewUrl(event.data.url);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Request fullscreen when the page loads
  useEffect(() => {
    const requestFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
      }
    };

    requestFullscreen();
  }, []);

  if (!viewUrl) {
    return <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
      No presentation URL provided
    </div>;
  }

  return (
    <div className="fixed inset-0 bg-black">
      <iframe
        src={viewUrl}
        className="w-full h-full"
        frameBorder="0"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
} 