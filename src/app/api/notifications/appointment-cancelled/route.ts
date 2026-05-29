import { NextResponse } from "next/server";
import { getEmailConfig, sendEmail } from "@/lib/email/resend";
import {
  patientCancellationEmail,
  therapistCancellationEmail,
} from "@/lib/email/templates";
import {
  readNotificationInput,
  verifyNotificationAppointment,
} from "@/lib/notifications/server";

export async function POST(request: Request) {
  const input = await readNotificationInput(request);
  if (!input || input.status !== undefined) {
    return NextResponse.json(
      { ok: false, error: "Invalid notification request." },
      { status: 400 },
    );
  }

  const config = getEmailConfig();
  if (!config.isConfigured || !config.therapistEmail) {
    return NextResponse.json(
      { ok: false, error: "Email notifications are unavailable." },
      { status: 503 },
    );
  }

  const verified = await verifyNotificationAppointment(
    request,
    input,
    "cancelled",
    "cancelled",
  );
  if ("response" in verified) {
    return verified.response;
  }

  const payload = verified.payload;

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
