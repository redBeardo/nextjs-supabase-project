'use client';

import { useState, useEffect } from 'react';
import OfficeJSInitializer from '@/components/OfficeJSInitializer';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '@/config/auth';
import { supabase } from '@/utils/supabaseClient';

interface TestMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface PresentationData {
  id: string;
  name: string;
  onedrive_file_id?: string;
  onedrive_web_url?: string;
}

export default function PowerPointTest() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [currentSlide, setCurrentSlide] = useState<number | null>(null);
  const [totalSlides, setTotalSlides] = useState<number | null>(null);
  const [isAzureAuthenticated, setIsAzureAuthenticated] = useState(false);
  const [presentationData, setPresentationData] = useState<PresentationData | null>(null);
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);

  const addMessage = (message: string, type: TestMessage['type'] = 'info') => {
    console.log(`[PowerPointTest] ${message}`);
    setMessages(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  const debugOfficeContext = () => {
    const debugInfo = {
      hasWindow: typeof window !== 'undefined',
      hasOffice: typeof window.Office !== 'undefined',
      hasContext: window.Office?.context ? true : false,
      hasDocument: window.Office?.context?.document ? true : false,
      platform: window.Office?.platform,
      host: window.Office?.host,
      version: window.Office?.version,
    };
    
    addMessage(`Debug Info: ${JSON.stringify(debugInfo, null, 2)}`, 'info');
    return debugInfo;
  };

  const testSupabaseConnection = async () => {
    try {
      addMessage('Testing Supabase connection...', 'info');
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', '852b9e10-5a16-414b-91a0-4ca75ed70ed5')
        .single();

      if (error) throw error;
      
      addMessage('Successfully retrieved presentation data from Supabase', 'success');
      addMessage(`Presentation data: ${JSON.stringify(data, null, 2)}`, 'info');
      setPresentationData(data);
      return data;
    } catch (err) {
      addMessage(`Supabase connection error: ${err}`, 'error');
      throw err;
    }
  };

  // Initialize MSAL instance
  useEffect(() => {
    const initializeMsal = async () => {
      try {
        const msal = new PublicClientApplication(msalConfig);
        await msal.initialize();
        setMsalInstance(msal);
        addMessage('MSAL instance initialized', 'success');
      } catch (err) {
        addMessage(`Failed to initialize MSAL: ${err}`, 'error');
      }
    };

    initializeMsal();
  }, []);

  const handleAzureAuth = async () => {
    if (!msalInstance) {
      throw new Error('MSAL instance not initialized');
    }

    try {
      addMessage('Starting Azure AD authentication...', 'info');
      const account = msalInstance.getAllAccounts()[0];
      
      if (account) {
        addMessage('Found existing account, getting token silently...', 'info');
        await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: account
        });
        addMessage('Azure AD token acquired successfully', 'success');
        setIsAzureAuthenticated(true);
      } else {
        addMessage('No existing account, starting popup login...', 'info');
        const result = await msalInstance.loginPopup(loginRequest);
        addMessage('Azure AD login successful', 'success');
        addMessage(`Login result: ${JSON.stringify(result)}`, 'info');
        setIsAzureAuthenticated(true);
      }
    } catch (err) {
      addMessage(`Azure AD authentication error: ${err}`, 'error');
      setIsAzureAuthenticated(false);
      throw err;
    }
  };

  const testOneDriveConnection = async () => {
    if (!msalInstance) {
      throw new Error('MSAL instance not initialized');
    }

    try {
      addMessage(`Checking Azure AD authentication state: ${isAzureAuthenticated}`, 'info');
      
      if (!isAzureAuthenticated) {
        addMessage('Not authenticated with Azure AD, attempting to authenticate...', 'info');
        await handleAzureAuth();
      }

      addMessage('Testing OneDrive connection...', 'info');
      const account = msalInstance.getAllAccounts()[0];
      
      if (!account) {
        throw new Error('No Azure AD account found');
      }

      addMessage('Getting access token...', 'info');
      const token = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account
      });
      addMessage('Access token acquired successfully', 'success');

      // Test OneDrive API access
      addMessage('Testing OneDrive API access...', 'info');
      const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children', {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`OneDrive API error: ${response.statusText}`);
      }

      const data = await response.json();
      addMessage('Successfully connected to OneDrive', 'success');
      addMessage(`Found ${data.value.length} items in OneDrive root:`, 'info');
      
      // List each file/folder with details
      data.value.forEach((item: any) => {
        const type = item.folder ? '📁 Folder' : '📄 File';
        const size = item.size ? `(${(item.size / 1024).toFixed(1)} KB)` : '';
        addMessage(`${type}: ${item.name} ${size}`, 'info');
        if (item.webUrl) {
          addMessage(`   URL: ${item.webUrl}`, 'info');
        }
      });
      
      // If we have a presentation with OneDrive file ID, try to access it
      if (presentationData?.onedrive_file_id) {
        addMessage(`Attempting to access file: ${presentationData.onedrive_file_id}`, 'info');
        const fileResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${presentationData.onedrive_file_id}`, {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          addMessage('Successfully accessed presentation file in OneDrive', 'success');
          addMessage(`File details: ${JSON.stringify(fileData, null, 2)}`, 'info');
        } else {
          addMessage(`Failed to access file: ${fileResponse.statusText}`, 'error');
        }
      }

      return data;
    } catch (err) {
      addMessage(`OneDrive connection error: ${err}`, 'error');
      throw err;
    }
  };

  const handleInitialized = async () => {
    addMessage('Office.js initialized, starting initialization...', 'info');
    try {
      // Debug initial state
      addMessage('Initial Office.js state:', 'info');
      debugOfficeContext();

      // Wait for Office.js to be ready
      addMessage('Waiting for Office.js to be ready...', 'info');
      await new Promise<void>((resolve) => {
        if (window.Office && window.Office.context) {
          addMessage('Office.js already ready', 'success');
          resolve();
        } else {
          addMessage('Setting up Office.onReady handler', 'info');
          window.Office.onReady(() => {
            addMessage('Office.js ready', 'success');
            resolve();
          });
        }
      });

      // Debug state after Office.js is ready
      addMessage('Office.js context state after ready:', 'info');
      const debugInfo = debugOfficeContext();

      if (!debugInfo.hasOffice || !debugInfo.hasContext || !debugInfo.hasDocument) {
        throw new Error(`Office.js context not properly initialized. Debug info: ${JSON.stringify(debugInfo)}`);
      }

      // Now that Office.js is ready, get presentation info
      addMessage('Getting presentation info...', 'info');
      
      // Get the presentation object and ensure it's ready
      const presentation = window.Office.context.document;
      
      // Debug presentation object
      addMessage(`Presentation object type: ${typeof presentation}`, 'info');
      addMessage(`Presentation object keys: ${Object.keys(presentation || {}).join(', ')}`, 'info');
      
      // Check if we can access the presentation
      if (!presentation) {
        throw new Error('Could not access presentation');
      }

      // Wait for the presentation to be ready
      addMessage('Attempting to get slide data...', 'info');
      await new Promise<void>((resolve, reject) => {
        try {
          presentation.getSelectedDataAsync(window.Office.CoercionType.SlideRange, (result: Office.AsyncResult<any>) => {
            addMessage(`getSelectedDataAsync result status: ${result.status}`, 'info');
            if (result.status === window.Office.AsyncResultStatus.Succeeded) {
              addMessage('Successfully got presentation info', 'success');
              addMessage(`Slide data: ${JSON.stringify(result.value)}`, 'info');
              setTotalSlides(result.value.slides.length);
              setCurrentSlide(1);
              setIsInitialized(true);
              resolve();
            } else {
              const error = new Error(`Failed to get presentation info: ${result.error?.message || 'Unknown error'}`);
              addMessage(`Failed to get presentation info: ${error.message}`, 'error');
              reject(error);
            }
          });
        } catch (err) {
          addMessage(`Exception during getSelectedDataAsync: ${err}`, 'error');
          reject(err);
        }
      });
    } catch (err) {
      addMessage(`Error during initialization: ${err}`, 'error');
      setError(err instanceof Error ? err : new Error('Unknown error during initialization'));
    }
  };

  const handleError = (err: Error) => {
    addMessage(`Office.js initialization error: ${err.message}`, 'error');
    setError(err);
  };

  const testConnection = async () => {
    addMessage('Testing all connections...', 'info');
    try {
      // Test Supabase connection first
      await testSupabaseConnection();

      // Then test OneDrive connection
      await testOneDriveConnection();

      addMessage('All connection tests completed successfully', 'success');
    } catch (err) {
      addMessage(`Connection test failed: ${err}`, 'error');
    }
  };

  // Add effect to hide sidebar
  useEffect(() => {
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      sidebar.style.display = 'none';
    }

    const main = document.querySelector('main');
    if (main) {
      main.style.padding = '0';
      main.style.width = '100%';
    }

    return () => {
      if (sidebar) {
        sidebar.style.display = '';
      }
      if (main) {
        main.style.padding = '';
        main.style.width = '';
      }
    };
  }, []);

  if (error) {
    return (
      <div className="h-full w-full p-2 text-red-600 overflow-auto bg-white">
        <h2 className="text-sm font-bold mb-1">Error</h2>
        <p className="text-xs">{error.message}</p>
        <div className="mt-2">
          <h3 className="text-xs font-semibold">Debug Info:</h3>
          <pre className="bg-gray-100 p-1 rounded mt-1 text-xs overflow-auto">
            {JSON.stringify(debugOfficeContext(), null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return <OfficeJSInitializer onInitialized={handleInitialized} onError={handleError} />;
  }

  return (
    <div className="h-full w-full flex flex-col p-2 bg-white">
      {/* Header Section */}
      <div className="mb-2">
        <h1 className="text-sm font-bold text-gray-900">PowerPoint Add-in Test</h1>
        <div className="text-xs text-gray-600">
          Slide: {currentSlide} of {totalSlides}
        </div>
      </div>

      {/* Connection Button */}
      <button
        onClick={testConnection}
        className="w-full bg-blue-500 text-white text-xs px-2 py-1 rounded mb-2 hover:bg-blue-600 transition-colors"
      >
        {isAzureAuthenticated ? 'Test All Connections' : 'Connect to Web App'}
      </button>

      {/* Presentation Data */}
      {presentationData && (
        <div className="mb-2 p-2 bg-gray-50 rounded text-xs">
          <h2 className="font-semibold mb-1 text-gray-900">Presentation Data</h2>
          <p className="text-gray-800"><strong>Name:</strong> {presentationData.name}</p>
          {presentationData.onedrive_web_url && (
            <p className="truncate text-gray-800">
              <strong>OneDrive:</strong>{' '}
              <a 
                href={presentationData.onedrive_web_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 hover:underline truncate"
              >
                Open in OneDrive
              </a>
            </p>
          )}
        </div>
      )}

      {/* Connection Log */}
      <div className="flex-1 min-h-0">
        <h2 className="text-xs font-semibold mb-1 text-gray-900">Connection Log</h2>
        <div className="border rounded p-1 h-full overflow-y-auto bg-gray-50 text-xs">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-0.5 ${
                msg.type === 'error' ? 'text-red-600' :
                msg.type === 'success' ? 'text-green-600' :
                'text-gray-800'
              }`}
            >
              <span className="text-gray-400 text-[10px]">{msg.timestamp}</span>
              <span className="ml-1">{msg.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 