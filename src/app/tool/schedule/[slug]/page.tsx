import ScheduleViewClient from './ScheduleViewClient';

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  return [];
}

export default async function ScheduleViewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ScheduleViewClient slug={slug} />;
}

