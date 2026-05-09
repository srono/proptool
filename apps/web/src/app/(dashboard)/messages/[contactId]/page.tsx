import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ChatThread } from '@/components/messages/chat-thread';
import type { Message, Contact } from '@propagent/shared';

interface PageProps {
  params: Promise<{ contactId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { contactId } = await params;
  const supabase = await createClient();

  // Fetch contact info
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (!contact) {
    notFound();
  }

  // Fetch all messages for this contact, ordered chronologically
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('sent_at', { ascending: true });

  // Get current user's tenant_id
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single();

  return (
    <ChatThread
      contact={contact as Contact}
      messages={(messages ?? []) as Message[]}
      tenantId={profile?.tenant_id ?? ''}
    />
  );
}
