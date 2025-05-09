'use client';

import { useEffect, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/auth';

interface PowerPointViewerProps {
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

export default function PowerPointViewer({ fileId, onError }: PowerPointViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPowerPoint = async () => {
      try {
        const msalInstance = new PublicClientApplication(msalConfig);
        await msalInstance.initialize();

        // Get the current account
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) {
          throw new Error('No account found. Please sign in.');
        }

        // Get access token
        const response = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        });

        // Get the file's web URL
        const fileResponse = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}?select=id,webUrl,cTag,@microsoft.graph.downloadUrl`, {
          headers: {
            Authorization: `Bearer ${response.accessToken}`
          }
        });

        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
        }

        const fileData: OneDriveFileResponse = await fileResponse.json();
        console.log('File data from Graph API:', fileData);
        
        // Use the direct download URL from the Graph API
        const downloadUrl = fileData['@microsoft.graph.downloadUrl'];
        if (!downloadUrl) {
          throw new Error('Could not get download URL for the file');
        }

        // Use the Office Online viewer URL format with the download URL
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(downloadUrl)}`;
        console.log('Generated viewer URL:', viewerUrl);
        setViewUrl(viewerUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPowerPoint();
  }, [fileId, onError]);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading PowerPoint...</div>;
  }

  if (error) {
    return <div className="text-red-600 p-4">Error: {error}</div>;
  }

  if (!viewUrl) {
    return <div className="text-gray-600 p-4">No PowerPoint file available</div>;
  }

  return (
    <div className="w-full h-full">
      <iframe
        src={viewUrl}
        className="w-full h-full min-h-[500px]"
        frameBorder="0"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
} 