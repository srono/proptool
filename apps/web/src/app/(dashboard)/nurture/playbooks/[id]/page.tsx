import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { EditPlaybookClient } from './edit-playbook-client';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: playbook } = await supabase
    .from('playbooks')
    .select('name')
    .eq('id', id)
    .single();
  return { title: playbook?.name ? `${playbook.name} – Edit Playbook` : 'Edit Playbook' };
}

export default async function EditPlaybookPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: playbook, error } = await supabase
    .from('playbooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !playbook) {
    notFound();
  }

  // Fetch templates for the step editor
  const { data: templates } = await supabase
    .from('message_templates')
    .select('id, name, channel')
    .order('name', { ascending: true });

  return (
    <EditPlaybookClient
      playbook={playbook}
      templates={templates ?? []}
    />
  );
}
