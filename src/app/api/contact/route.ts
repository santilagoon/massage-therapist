import { NextResponse } from "next/server";
import { getEmailConfig, sendEmail } from "@/lib/email/resend";

type ContactPayload = {
  name?: string;
  email?: string;
  message?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ContactPayload;
  const name = payload.name?.trim() ?? "";
  const email = payload.email?.trim().toLowerCase() ?? "";
  const message = payload.message?.trim() ?? "";
  const config = getEmailConfig();

  if (!name || !email || !message) {
    return NextResponse.json(
      { ok: false, error: "Missing contact fields." },
      { status: 400 },
    );
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email." },
      { status: 400 },
    );
  }

  if (!config.isConfigured || !config.therapistEmail) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await sendEmail({
    to: config.therapistEmail,
    subject: `Nueva consulta web: ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111111; line-height: 1.5;">
        <h1 style="font-size: 22px; margin-bottom: 12px;">Nueva consulta web</h1>
        <div style="margin-top: 20px; padding: 16px; border: 1px solid #e5e5e5; border-radius: 12px; background: #fafafa;">
          <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Consulta:</strong></p>
          <p>${escapeHtml(message).replaceAll("\n", "<br />")}</p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ ok: true, skipped: false });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
