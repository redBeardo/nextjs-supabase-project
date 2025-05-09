'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/auth';

interface PresentationControllerProps {
  fileId: string;
  onError?: (error: string) => void;
}

interface OneDriveFileResponse {
  webUrl: string;
  cTag: string;
  id: string;
  '@microsoft.graph.downloadUrl': string;
  parentReference?: {
    driveId: string;
  };
}

export default function PresentationController({ fileId, onError }: PresentationControllerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(10); // Default to 10 slides
  const [isAudienceViewOpen, setIsAudienceViewOpen] = useState(false);
  const [baseViewUrl, setBaseViewUrl] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audienceWindowRef = useRef<Window | null>(null);
  const router = useRouter();

  // Function to add debug information
  const addDebugInfo = (info: string) => {
    console.log(info);
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${info}`]);
  };

  // Function to send keyboard event to iframe
  const sendKeyToIframe = (key: string) => {
    const iframe = iframeRef.current;
    if (!iframe) {
      addDebugInfo('Cannot send key: iframe not found');
      return;
    }

    try {
      // Focus the iframe first
      iframe.focus();
      iframe.contentWindow?.focus();
      
      // Create and dispatch keyboard events
      const events = [
        new KeyboardEvent('keydown', { key, bubbles: true }),
        new KeyboardEvent('keyup', { key, bubbles: true })
      ];

      events.forEach(event => {
        iframe.contentWindow?.document.dispatchEvent(event);
      });
      addDebugInfo(`Sent key event: ${key}`);
    } catch (err) {
      addDebugInfo(`Error sending key event: ${err}`);
    }
  };

  useEffect(() => {
    const fetchPowerPoint = async () => {
      try {
        addDebugInfo('Starting PowerPoint fetch...');
        const msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();
        addDebugInfo('MSAL initialized');

        // Get the current account
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) {
          throw new Error('No account found. Please sign in.');
        }
        addDebugInfo(`Found ${accounts.length} accounts`);

        // Get access token
        const response = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        });
        addDebugInfo('Access token acquired');

        setAccessToken(response.accessToken);

        // Get the file's web URL
        addDebugInfo(`Fetching file data for ID: ${fileId}`);
        const fileResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}?select=id,webUrl,cTag,@microsoft.graph.downloadUrl`, {
          headers: {
            Authorization: `Bearer ${response.accessToken}`
          }
        });

        if (!fileResponse.ok) {
          const errorText = await fileResponse.text();
          addDebugInfo(`File fetch failed: ${errorText}`);
          throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
        }

        const fileData: OneDriveFileResponse = await fileResponse.json();
        addDebugInfo('File data received: ' + JSON.stringify(fileData, null, 2));
        
        // Use the direct download URL from the Graph API
        const downloadUrl = fileData['@microsoft.graph.downloadUrl'];
        if (!downloadUrl) {
          throw new Error('Could not get download URL for the file');
        }

        // Create the base viewer URL with presentation mode enabled
        const baseUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(downloadUrl)}&wdStartOn=1&wdSlide=1&wdPresentationMode=1`;
        addDebugInfo('Created base URL: ' + baseUrl);
        setBaseViewUrl(baseUrl);
        setViewUrl(baseUrl);

        // Get presentation metadata to determine total slides
        addDebugInfo('Fetching presentation metadata...');
        const metadataResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets`, {
          headers: {
            Authorization: `Bearer ${response.accessToken}`
          }
        });

        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          addDebugInfo('Metadata received: ' + JSON.stringify(metadata, null, 2));
          setTotalSlides(metadata.value.length || 10);
        } else {
          const errorText = await metadataResponse.text();
          addDebugInfo(`Metadata fetch failed: ${errorText}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        addDebugInfo(`Error occurred: ${errorMessage}`);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPowerPoint();
  }, [fileId, onError]);

  // Handle slide navigation
  const goToSlide = async (direction: 'next' | 'prev') => {
    addDebugInfo(`goToSlide called with direction: ${direction}`);
    
    try {
      const newSlide = direction === 'next' ? currentSlide + 1 : currentSlide - 1;
      addDebugInfo(`Attempting to navigate to slide ${newSlide}`);
      
      // Send keyboard event to iframe
      sendKeyToIframe(direction === 'next' ? 'ArrowRight' : 'ArrowLeft');
      
      // Update our slide counter
      setCurrentSlide(newSlide);
      
      // Send to audience view
      sendToAudienceView({ 
        type: 'GOTO_SLIDE', 
        slideNumber: newSlide,
        direction: direction
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      addDebugInfo(`Error changing slide: ${errorMessage}`);
      console.error('Error changing slide:', err);
    }
  };

  // Function to open audience view in a new window
  const openAudienceView = () => {
    if (!viewUrl) {
      addDebugInfo('Cannot open audience view: no viewUrl available');
      return;
    }
    
    addDebugInfo('Opening audience view...');
    const audienceWindow = window.open(
      `/presentations/${fileId}/audience?viewUrl=${encodeURIComponent(viewUrl)}`,
      'Audience View',
      'width=1920,height=1080'
    );
    
    if (audienceWindow) {
      audienceWindowRef.current = audienceWindow;
      setIsAudienceViewOpen(true);

      // Handle window close
      const checkWindow = setInterval(() => {
        if (audienceWindow.closed) {
          addDebugInfo('Audience view window closed');
          setIsAudienceViewOpen(false);
          audienceWindowRef.current = null;
          clearInterval(checkWindow);
        }
      }, 1000);
    }
  };

  // Function to send message to audience view
  const sendToAudienceView = (message: any) => {
    addDebugInfo(`Sending message to audience view: ${JSON.stringify(message)}`);
    
    if (audienceWindowRef.current && !audienceWindowRef.current.closed) {
      audienceWindowRef.current.postMessage(message, window.location.origin);
    } else {
      addDebugInfo('Cannot send message: audience view window is not open');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading presentation...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">Error: {error}</div>;
  }

  if (!viewUrl) {
    return <div className="text-gray-600 p-4">No presentation available</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main presentation view */}
            <div className="lg:col-span-2">
              <div className="relative">
                <iframe
                  ref={iframeRef}
                  src={viewUrl}
                  className="w-full h-[600px]"
                  frameBorder="0"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
                
                {/* Controls overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg flex items-center space-x-4">
                  <button
                    onClick={() => {
                      addDebugInfo('Previous slide button clicked');
                      goToSlide('prev');
                    }}
                    disabled={currentSlide <= 1}
                    className="p-2 hover:bg-white/20 rounded disabled:opacity-50"
                  >
                    ←
                  </button>
                  <span className="min-w-[60px] text-center">
                    Slide {currentSlide}
                  </span>
                  <button
                    onClick={() => {
                      addDebugInfo('Next slide button clicked');
                      goToSlide('next');
                    }}
                    disabled={currentSlide >= totalSlides}
                    className="p-2 hover:bg-white/20 rounded disabled:opacity-50"
                  >
                    →
                  </button>
                  <button
                    onClick={openAudienceView}
                    className="p-2 hover:bg-white/20 rounded"
                  >
                    {isAudienceViewOpen ? 'Audience View Open' : 'Open Audience View'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Presenter notes panel */}
            <div className="lg:col-span-1 bg-gray-50 p-4">
              <h2 className="text-xl font-semibold mb-4">Presenter Notes</h2>
              <div className="prose max-w-none">
                <p className="text-gray-500">Presenter notes will appear here...</p>
              </div>
            </div>
          </div>

          {/* Debug Information Panel */}
          <div className="mt-4 p-4 bg-gray-800 border-t">
            <h3 className="text-lg font-semibold mb-2 text-white">Debug Information</h3>
            <div className="max-h-40 overflow-y-auto bg-gray-900 p-2 rounded border border-gray-600">
              {debugInfo.map((info, index) => (
                <div key={index} className="text-sm font-mono whitespace-pre-wrap text-green-400">
                  {info}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 