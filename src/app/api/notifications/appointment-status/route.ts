import { NextResponse } from "next/server";
import { getEmailConfig, sendEmail } from "@/lib/email/resend";
import { patientStatusEmail } from "@/lib/email/templates";
import { AppointmentStatusEmailPayload } from "@/lib/email/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as AppointmentStatusEmailPayload;
  const config = getEmailConfig();

  if (!config.isConfigured) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const email = patientStatusEmail(payload);

  await sendEmail({
    to: payload.patientEmail,
    subject: email.subject,
    html: email.html,
  });

  return NextResponse.json({ ok: true, skipped: false });
}
