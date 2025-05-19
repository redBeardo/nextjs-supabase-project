'use client';

import { useEffect } from 'react';

export default function TestLayout() {
  // Add effect to hide sidebar
  useEffect(() => {
    // Find the sidebar element and hide it
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      sidebar.style.display = 'none';
    }

    // Adjust the main content to take full width
    const main = document.querySelector('main');
    if (main) {
      main.style.padding = '0';
      main.style.width = '100%';
    }

    // Cleanup function
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

  return (
    <div className="h-full w-full bg-white p-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Test Layout</h1>
      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Test Section 1</h2>
          <p className="text-gray-800">This is a test page to experiment with layouts</p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Test Section 2</h2>
          <p className="text-gray-800">Testing different background colors and text styles</p>
        </div>

        <div className="p-4 bg-blue-50 rounded">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Test Section 3</h2>
          <p className="text-blue-800">Testing different color schemes</p>
        </div>
      </div>
    </div>
  );
} 