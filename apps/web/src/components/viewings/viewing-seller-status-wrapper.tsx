'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { markViewingSellerUpdated } from '@/lib/services/seller-service';
import { ViewingSellerStatus } from './viewing-seller-status';

interface ViewingSellerStatusWrapperProps {
  viewingId: string;
  sellerUpdated: boolean;
  sellerUpdatedAt: string | null;
}

export function ViewingSellerStatusWrapper({
  viewingId,
  sellerUpdated,
  sellerUpdatedAt,
}: ViewingSellerStatusWrapperProps) {
  const router = useRouter();

  async function handleToggle(id: string, value: boolean) {
    if (!value) return;
    const supabase = createClient();
    try {
      await markViewingSellerUpdated(supabase, id);
      router.refresh();
    } catch (error) {
      console.error('[ViewingSellerStatusWrapper] Failed to mark seller updated:', error);
    }
  }

  return (
    <ViewingSellerStatus
      viewingId={viewingId}
      sellerUpdated={sellerUpdated}
      sellerUpdatedAt={sellerUpdatedAt}
      onToggle={handleToggle}
    />
  );
}
