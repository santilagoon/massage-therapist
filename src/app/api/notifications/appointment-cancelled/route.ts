import { NextResponse } from "next/server";
import { getEmailConfig, sendEmail } from "@/lib/email/resend";
import {
  patientCancellationEmail,
  therapistCancellationEmail,
} from "@/lib/email/templates";
import { EmailAppointmentPayload } from "@/lib/email/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as EmailAppointmentPayload;
  const config = getEmailConfig();

  if (!config.isConfigured || !config.therapistEmail) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const patientEmail = patientCancellationEmail(payload);
  const therapistEmail = therapistCancellationEmail(payload);

  await Promise.all([
    sendEmail({
      to: payload.patientEmail,
      subject: patientEmail.subject,
      html: patientEmail.html,
    }),
    sendEmail({
      to: config.therapistEmail,
      subject: therapistEmail.subject,
      html: therapistEmail.html,
    }),
  ]);

  return NextResponse.json({ ok: true, skipped: false });
}
