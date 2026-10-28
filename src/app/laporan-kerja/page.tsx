import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/session'
import { WorkReportFeed } from './_components/WorkReportFeed'
import { WorkReport } from '@/types/database'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Laporan Kerja - Barakah Fauna',
}

export default async function WorkReportPage() {
  const [supabase, session] = await Promise.all([
    createClient(),
    getSession(),
  ])
  const { data: reportsData } = await supabase
    .from('work_reports')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <WorkReportFeed
      initialReports={(reportsData as WorkReport[]) || []}
      currentUserId={session?.id || ''}
      currentUserName={session?.name || 'Staff'}
      isAdmin={session?.role?.toLowerCase() === 'admin'}
    />
  )
}
