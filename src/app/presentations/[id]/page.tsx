'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PresentationController from '@/components/PresentationController';

export default function PresentationViewPage() {
  const params = useParams();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <PresentationController 
          fileId={params.id as string} 
          onError={setError}
        />
      </div>
    </div>
  );
} 