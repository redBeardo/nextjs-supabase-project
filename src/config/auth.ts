// Validate environment variables
if (!process.env.NEXT_PUBLIC_AZURE_CLIENT_ID) {
  console.error('NEXT_PUBLIC_AZURE_CLIENT_ID is not set');
}

const getRedirectUri = () => {
  if (typeof window !== 'undefined') {
    // If we're on the test page, use that specific URL
    if (window.location.pathname === '/test') {
      return `${window.location.origin}/test`;
    }
    return window.location.origin;
  }
  return 'https://localhost:3000';
};

export const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
    authority: 'https://login.microsoftonline.com/consumers',
    redirectUri: getRedirectUri(),
    postLogoutRedirectUri: getRedirectUri(),
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: [
    "User.Read",
    "Files.ReadWrite",
    "Files.ReadWrite.All"
  ]
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphCalendarEndpoint: "https://graph.microsoft.com/v1.0/me/calendar",
  graphEventsEndpoint: "https://graph.microsoft.com/v1.0/me/events",
}; 