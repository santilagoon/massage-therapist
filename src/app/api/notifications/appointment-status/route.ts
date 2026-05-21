import { NextResponse } from "next/server";
import { getEmailConfig, sendEmail } from "@/lib/email/resend";
import { patientStatusEmail } from "@/lib/email/templates";
import { AppointmentStatusEmailPayload } from "@/lib/email/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as AppointmentStatusEmailPayload;
  const config = getEmailConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      { ok: false, error: "Email notifications are unavailable." },
      { status: 503 },
    );
  }

  const email = patientStatusEmail(payload);

  try {
    await sendEmail({
      to: payload.patientEmail,
      subject: email.subject,
      html: email.html,
    });
  } catch (error) {
    console.error("Appointment status email failed", error);
    return NextResponse.json(
      { ok: false, error: "Email notification could not be sent." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, skipped: false });
}
