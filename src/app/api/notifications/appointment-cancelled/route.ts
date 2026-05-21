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
    return NextResponse.json(
      { ok: false, error: "Email notifications are unavailable." },
      { status: 503 },
    );
  }

  const patientEmail = patientCancellationEmail(payload);
  const therapistEmail = therapistCancellationEmail(payload);

  try {
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
  } catch (error) {
    console.error("Appointment cancellation email failed", error);
    return NextResponse.json(
      { ok: false, error: "Email notification could not be sent." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, skipped: false });
}
