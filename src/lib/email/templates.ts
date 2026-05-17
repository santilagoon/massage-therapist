import { AppointmentStatusEmailPayload, EmailAppointmentPayload } from "./types";

const argentinaFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function patientRequestReceivedEmail(payload: EmailAppointmentPayload) {
  const intro = {
    es: "Recibimos tu solicitud de turno. La masajista la revisara y te avisaremos cuando sea confirmada.",
    en: "We received your appointment request. The therapist will review it and we will notify you once it is confirmed.",
    ru: "Мы получили ваш запрос на запись. Специалист рассмотрит его, и мы сообщим вам после подтверждения.",
  }[payload.language];

  return {
    subject: "Solicitud de turno recibida",
    html: baseEmailHtml({
      title: "Solicitud de turno recibida",
      intro,
      payload,
    }),
  };
}

export function therapistRequestReceivedEmail(payload: EmailAppointmentPayload) {
  return {
    subject: `Nueva solicitud de turno: ${payload.patientName}`,
    html: baseEmailHtml({
      title: "Nueva solicitud de turno",
      intro: "Hay una nueva solicitud pendiente de aprobacion en el panel.",
      payload,
      includePatientContact: true,
    }),
  };
}

export function patientStatusEmail(payload: AppointmentStatusEmailPayload) {
  const isConfirmed = payload.status === "confirmed";
  const title = isConfirmed ? "Turno confirmado" : "Solicitud de turno rechazada";
  const intro = isConfirmed
    ? "Tu turno fue confirmado por la masajista."
    : "La masajista no pudo confirmar este turno. Te sugerimos solicitar otro horario disponible.";

  return {
    subject: title,
    html: baseEmailHtml({
      title,
      intro,
      payload,
    }),
  };
}

function baseEmailHtml({
  title,
  intro,
  payload,
  includePatientContact = false,
}: {
  title: string;
  intro: string;
  payload: EmailAppointmentPayload;
  includePatientContact?: boolean;
}) {
  const startsAt = argentinaFormatter.format(new Date(payload.startsAt));
  const endsAt = argentinaFormatter.format(new Date(payload.endsAt));

  return `
    <div style="font-family: Arial, sans-serif; color: #24211d; line-height: 1.5;">
      <h1 style="font-size: 22px; margin-bottom: 12px;">${escapeHtml(title)}</h1>
      <p>${escapeHtml(intro)}</p>
      <div style="margin-top: 20px; padding: 16px; border: 1px solid #d9d0c3; border-radius: 8px; background: #f6f3ee;">
        <p><strong>Servicio:</strong> ${escapeHtml(payload.serviceTitle)}</p>
        <p><strong>Inicio:</strong> ${escapeHtml(startsAt)}</p>
        <p><strong>Fin:</strong> ${escapeHtml(endsAt)}</p>
        ${payload.notes ? `<p><strong>Notas:</strong> ${escapeHtml(payload.notes)}</p>` : ""}
        ${
          includePatientContact
            ? `<p><strong>Paciente:</strong> ${escapeHtml(payload.patientName)}</p>
               <p><strong>Email:</strong> ${escapeHtml(payload.patientEmail)}</p>
               <p><strong>Telefono:</strong> ${escapeHtml(payload.patientPhone || "-")}</p>`
            : ""
        }
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
