import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ChatThread } from '@/components/messages/chat-thread';
import type { Message, Contact } from '@agentos/shared';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ contactId: string }>;
  searchParams: Promise<{ lead?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { contactId } = await params;
  const supabase = await createClient();
  const { data: contact } = await supabase
    .from('contacts')
    .select('full_name')
    .eq('id', contactId)
    .single();
  return { title: contact?.full_name ? `${contact.full_name} – Chat` : 'Chat' };
}

export default async function ChatPage({ params, searchParams }: PageProps) {
  const { contactId } = await params;
  const { lead: leadId } = await searchParams;
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
  // Exclude internal notes (channel='note') which belong only in the lead timeline
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('contact_id', contactId)
    .neq('channel', 'note')
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
      leadId={leadId ?? null}
    />
  );
}
