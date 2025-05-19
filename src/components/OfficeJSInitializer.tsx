'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Office: any;
    OfficeAddin: any;
  }
}

interface OfficeJSInitializerProps {
  onInitialized: () => void;
  onError: (error: Error) => void;
}

export default function OfficeJSInitializer({ onInitialized, onError }: OfficeJSInitializerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('Initializing...');

  useEffect(() => {
    const initializeOfficeJS = async () => {
      try {
        setStatus('Loading Office.js script...');
        
        // Load Office.js script
        const script = document.createElement('script');
        script.src = 'https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js';
        script.async = true;
        
        script.onload = () => {
          setStatus('Office.js script loaded, checking environment...');
          
          // Check if Office.js is ready
          if (window.Office) {
            setStatus('Office.js is ready, initializing...');
            
            // Initialize Office.js
            window.Office.onReady(() => {
              setStatus('Office.js initialized successfully');
              setIsLoading(false);
              onInitialized();
            });
          } else {
            setStatus('Office.js runtime failed to load');
            const error = new Error('Office.js runtime failed to load');
            onError(error);
          }
        };
        
        script.onerror = (error) => {
          setStatus('Failed to load Office.js script');
          onError(new Error('Failed to load Office.js script'));
        };
        
        document.head.appendChild(script);
      } catch (error) {
        setStatus('Error during initialization');
        onError(error instanceof Error ? error : new Error('Unknown error during initialization'));
      }
    };

    initializeOfficeJS();
  }, [onInitialized, onError]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <div className="text-lg text-gray-700">{status}</div>
      </div>
    );
  }

  return null;
} 