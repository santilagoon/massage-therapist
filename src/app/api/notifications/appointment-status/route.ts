import { NextResponse } from "next/server";
import { getEmailConfig, sendEmail } from "@/lib/email/resend";
import { patientStatusEmail } from "@/lib/email/templates";
import {
  readNotificationInput,
  verifyNotificationAppointment,
} from "@/lib/notifications/server";

export async function POST(request: Request) {
  const input = await readNotificationInput(request);
  if (!input?.status) {
    return NextResponse.json(
      { ok: false, error: "Invalid notification request." },
      { status: 400 },
    );
  }

  const config = getEmailConfig();
  if (!config.isConfigured) {
    return NextResponse.json(
      { ok: false, error: "Email notifications are unavailable." },
      { status: 503 },
    );
  }

  const verified = await verifyNotificationAppointment(
    request,
    input,
    input.status,
    `status:${input.status}`,
  );
  if ("response" in verified) {
    return verified.response;
  }

  const payload = { ...verified.payload, status: input.status };

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
