import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/auth';

export async function uploadToOneDrive(file: File, folderPath: string = 'Presentations'): Promise<string> {
  const msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();

  // Get the current account
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No account found. Please sign in.');
  }

  const account = accounts[0];
  console.log('Using account:', account.username);

  // Get access token
  const response = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account: account
  });

  try {
    // First, try to get the drive info
    console.log('Getting drive info...');
    const driveResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/drive',
      {
        headers: {
          Authorization: `Bearer ${response.accessToken}`
        }
      }
    );

    if (!driveResponse.ok) {
      const errorData = await driveResponse.json();
      console.error('Drive info error:', errorData);
      throw new Error(`Failed to get drive info: ${driveResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const driveData = await driveResponse.json();
    console.log('Drive info:', driveData);

    // Then, check if our target folder exists
    console.log('Checking target folder...');
    const folderResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/root:/${folderPath}`,
      {
        headers: {
          Authorization: `Bearer ${response.accessToken}`
        }
      }
    );

    // If folder doesn't exist, create it
    if (folderResponse.status === 404) {
      console.log('Creating folder...');
      const createFolderResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/root/children`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${response.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: folderPath,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename'
          })
        }
      );

      if (!createFolderResponse.ok) {
        const errorData = await createFolderResponse.json();
        console.error('Create folder error:', errorData);
        throw new Error(`Failed to create folder: ${createFolderResponse.status} - ${JSON.stringify(errorData)}`);
      }
    } else if (!folderResponse.ok) {
      const errorData = await folderResponse.json();
      console.error('Folder check error:', errorData);
      throw new Error(`Failed to check folder: ${folderResponse.status} - ${JSON.stringify(errorData)}`);
    }

    // Upload the file
    console.log('Uploading file...');
    const uploadResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/root:/${folderPath}/${file.name}:/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${response.accessToken}`,
          'Content-Type': 'application/octet-stream'
        },
        body: file
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('Upload error:', errorData);
      throw new Error(`Failed to upload file: ${uploadResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const fileData = await uploadResponse.json();
    console.log('File uploaded successfully:', fileData);
    return fileData.id;
  } catch (error) {
    console.error('OneDrive operation failed:', error);
    throw error;
  }
}

export async function getFileWebUrl(fileId: string): Promise<string> {
  const msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error('No account found. Please sign in.');
  }

  const response = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account: accounts[0]
  });

  try {
    const fileResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
      {
        headers: {
          Authorization: `Bearer ${response.accessToken}`
        }
      }
    );

    if (!fileResponse.ok) {
      const errorData = await fileResponse.json();
      console.error('Get file URL error:', errorData);
      throw new Error(`Failed to get file: ${fileResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const fileData = await fileResponse.json();
    return fileData.webUrl;
  } catch (error) {
    console.error('Get file URL operation failed:', error);
    throw error;
  }
} 