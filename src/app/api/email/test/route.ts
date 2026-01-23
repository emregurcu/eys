import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const to = body.to || session.user.email;

    if (!to) {
      return NextResponse.json({ error: 'Alıcı e-posta bulunamadı' }, { status: 400 });
    }

    const ok = await sendEmail({
      to,
      subject: 'Etsy Manager - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email</h2>
          <p>SMTP ayarları başarılı şekilde çalışıyor.</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Bu email otomatik olarak gönderilmiştir.
          </p>
        </div>
      `,
    });

    if (!ok) {
      return NextResponse.json({ error: 'Email gönderilemedi' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: `Email test başarısız: ${error.message}` }, { status: 500 });
  }
}
