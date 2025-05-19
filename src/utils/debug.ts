declare global {
  interface Window {
    Office: any;
    OfficeAddin: any;
  }
}

export const debug = {
  log: (message: string, data?: any) => {
    console.log(message, data);
    // Try to log to Office Add-in debugger
    if (window.OfficeAddin?.Debugging?.log) {
      window.OfficeAddin.Debugging.log(message, data);
    }
    // Also try to log to Office.js debugger
    if (window.Office?.context?.document?.settings) {
      window.Office.context.document.settings.set('debug', JSON.stringify({ message, data }));
      window.Office.context.document.settings.saveAsync();
    }
  },
  error: (message: string, error?: any) => {
    console.error(message, error);
    // Try to log to Office Add-in debugger
    if (window.OfficeAddin?.Debugging?.log) {
      window.OfficeAddin.Debugging.log(`ERROR: ${message}`, error);
    }
    // Also try to log to Office.js debugger
    if (window.Office?.context?.document?.settings) {
      window.Office.context.document.settings.set('debug_error', JSON.stringify({ message, error }));
      window.Office.context.document.settings.saveAsync();
    }
  }
}; 