import { createClient } from '@/lib/supabase/server'
import { WorkReportFeed } from './_components/WorkReportFeed'
import { WorkReport } from '@/types/database'

export const metadata = {
  title: 'Laporan Kerja - Barakah Fauna',
}

export default async function WorkReportPage() {
  const supabase = await createClient()

  const { data: reportsData } = await supabase
    .from('work_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return <WorkReportFeed initialReports={(reportsData as WorkReport[]) || []} />
}
