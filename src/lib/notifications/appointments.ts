import { Appointment, AppointmentStatus } from "@/lib/booking";
import type { PublicAppointment } from "@/lib/supabase/bookings";

export async function notifyAppointmentRequested(appointment: Appointment) {
  await postNotification("/api/notifications/appointment-requested", {
    appointmentToken: requireAppointmentToken(appointment.publicToken),
  });
}

/**
 * Por que existe: envia un unico resumen para una solicitud con varios turnos,
 * evitando un correo por cada horario reservado.
 * @returns Una promesa que finaliza cuando el endpoint acepta el envio.
 * Efectos secundarios: realiza un POST al endpoint de notificaciones agrupadas.
 */
export async function notifyGroupedAppointmentsRequested(requestPublicToken: string) {
  await postNotification("/api/notifications/appointment-requested-group", {
    requestToken: requireAppointmentToken(requestPublicToken),
  });
}

export async function notifyAppointmentStatus(
  appointment: Appointment,
  status: Extract<AppointmentStatus, "confirmed" | "declined">,
) {
  await postNotification("/api/notifications/appointment-status", {
    appointmentToken: requireAppointmentToken(appointment.publicToken),
    status,
  });
}

export async function notifyAppointmentCancelled(appointment: PublicAppointment) {
  await postNotification("/api/notifications/appointment-cancelled", {
    appointmentToken: requireAppointmentToken(appointment.publicToken),
  });
}

function requireAppointmentToken(token: string | undefined) {
  if (!token) {
    throw new Error("A verified appointment token is required for email notifications.");
  }

  return token;
}

async function postNotification(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Email notification could not be sent.");
  }
}
