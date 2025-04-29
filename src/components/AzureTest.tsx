'use client';

import { useEffect, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/auth';

export default function AzureTest() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);

  useEffect(() => {
    const initializeAndTest = async () => {
      // Initialize instance at the start
      const instance = new PublicClientApplication(msalConfig);
      
      try {
        console.log('Initializing MSAL...');
        console.log('MSAL Config:', {
          ...msalConfig,
          auth: {
            ...msalConfig.auth,
            clientId: msalConfig.auth.clientId ? '***' : 'undefined',
            authority: msalConfig.auth.authority
          }
        });
        
        // Initialize instance
        await instance.initialize();
        setMsalInstance(instance);
        
        console.log('MSAL initialized successfully');
        
        // Clear any existing tokens
        sessionStorage.clear();
        
        // Handle redirect
        await instance.handleRedirectPromise();
        
        // Check if user is already signed in
        const accounts = instance.getAllAccounts();
        console.log('Accounts:', accounts);

        if (accounts.length > 0) {
          console.log('Found existing account, attempting silent token acquisition...');
          try {
            const response = await instance.acquireTokenSilent({
              ...loginRequest,
              account: accounts[0]
            });
            console.log('Token acquired silently');
            
            const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
              headers: {
                Authorization: `Bearer ${response.accessToken}`
              }
            });
            
            if (!userResponse.ok) {
              throw new Error(`Graph API error: ${userResponse.statusText}`);
            }
            
            const userData = await userResponse.json();
            console.log('User data:', userData);
            setUserInfo(userData);
          } catch (silentError) {
            console.log('Silent token acquisition failed, trying popup...', silentError);
            throw silentError; // This will trigger the popup login
          }
        } else {
          console.log('No accounts found, initiating popup login...');
          throw new Error('No accounts found'); // This will trigger the popup login
        }
      } catch (error) {
        console.log('Error in main try block:', error);
        try {
          console.log('Initiating popup login...');
          const response = await instance.loginPopup({
            ...loginRequest,
            prompt: 'select_account', // Force account selection
            redirectUri: window.location.origin
          });
          console.log('Popup login successful');
          
          const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              Authorization: `Bearer ${response.accessToken}`
            }
          });
          
          if (!userResponse.ok) {
            throw new Error(`Graph API error: ${userResponse.statusText}`);
          }
          
          const userData = await userResponse.json();
          console.log('User data from popup:', userData);
          setUserInfo(userData);
        } catch (loginError) {
          console.error('Login error:', loginError);
          setError('Failed to authenticate: ' + (loginError as Error).message);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAndTest();
  }, []);

  const handleLogout = async () => {
    if (msalInstance) {
      try {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          await msalInstance.logoutPopup({
            account: accounts[0],
            postLogoutRedirectUri: window.location.origin
          });
        }
        sessionStorage.clear();
        setUserInfo(null);
        setError(null);
        window.location.reload(); // Refresh the page to clear any cached state
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
  };

  const handleRetry = () => {
    sessionStorage.clear();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          Initializing authentication...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Azure AD Connection Test</h2>
      <div className="mb-4">
        <button
          onClick={handleRetry}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Clear Session & Retry
        </button>
        <button
          onClick={handleLogout}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
          <p className="mt-2 text-sm">Check the browser console for more details.</p>
        </div>
      )}
      {userInfo && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-bold">Successfully connected to Azure AD!</p>
          <p>User: {userInfo.displayName}</p>
          <p>Email: {userInfo.userPrincipalName}</p>
        </div>
      )}
    </div>
  );
} 