import { NextResponse } from "next/server";
import { getEmailConfig, sendEmail } from "@/lib/email/resend";
import {
  patientRequestReceivedEmail,
  therapistRequestReceivedEmail,
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

  const patientEmail = patientRequestReceivedEmail(payload);
  const therapistEmail = therapistRequestReceivedEmail(payload);

  const [patientResult, therapistResult] = await Promise.allSettled([
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

  if (patientResult.status === "rejected") {
    console.error("Patient appointment request email failed", patientResult.reason);
  }

  if (therapistResult.status === "rejected") {
    console.error("Therapist appointment request email failed", therapistResult.reason);
  }

  if (patientResult.status === "rejected") {
    return NextResponse.json(
      { ok: false, error: "Email notification could not be sent." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, skipped: false });
}
