'use client';

import { useSearchParams } from 'next/navigation';
import PowerPointOfficeJS from '@/components/PowerPointOfficeJS';

export default function PowerPointOfficePage() {
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');

  return (
    <div>
      <PowerPointOfficeJS fileId={fileId || undefined} />
    </div>
  );
} 