import { exportProfileData, ExportFormat } from '@/lib/profile-export';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const { searchParams } = new URL(request.url);
  const formatParam = searchParams.get('format');
  const format: ExportFormat = formatParam === 'csv' ? 'csv' : 'json';

  if (!username) {
    return new Response('Username is required', { status: 400 });
  }

  try {
    const { content, mimeType, filename } = await exportProfileData(
      username,
      format,
    );

    return new Response(content, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (err) {
    console.error('Failed to export profile data:', err);
    return new Response('Failed to export profile data', { status: 500 });
  }
}
