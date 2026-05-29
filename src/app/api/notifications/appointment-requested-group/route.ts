import { NextResponse } from "next/server";
import { getEmailConfig, sendEmail } from "@/lib/email/resend";
import {
  patientGroupedRequestReceivedEmail,
  therapistGroupedRequestReceivedEmail,
} from "@/lib/email/templates";
import {
  readGroupNotificationInput,
  verifyGroupedAppointmentRequest,
} from "@/lib/notifications/server";

/**
 * Por que existe: envia un unico resumen verificado para una solicitud de
 * multiples turnos, sin confiar en datos personales enviados por navegador.
 * @returns Respuesta JSON con el resultado del envio.
 * Efectos secundarios: verifica el grupo en Supabase y envia emails por Resend.
 */
export async function POST(request: Request) {
  const input = await readGroupNotificationInput(request);
  if (!input) {
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

  const verified = await verifyGroupedAppointmentRequest(request, input);
  if ("response" in verified) {
    return verified.response;
  }

  const patientEmail = patientGroupedRequestReceivedEmail(verified.payload);
  const therapistEmail = therapistGroupedRequestReceivedEmail(verified.payload);
  const [patientResult, therapistResult] = await Promise.allSettled([
    sendEmail({
      to: verified.payload.patientEmail,
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
    console.error("Patient grouped request email failed", patientResult.reason);
  }
  if (therapistResult.status === "rejected") {
    console.error("Therapist grouped request email failed", therapistResult.reason);
  }
  if (patientResult.status === "rejected") {
    return NextResponse.json(
      { ok: false, error: "Email notification could not be sent." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, skipped: false });
}
