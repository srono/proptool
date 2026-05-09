import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ToastProvider } from '@/components/ui/toast';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-onyx">
        {/* Desktop sidebar */}
        <Sidebar className="hidden lg:flex" />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <MobileNav className="lg:hidden" />
        </div>
      </div>
    </ToastProvider>
  );
}
