import { Appointment, AppointmentStatus, Locale, Service } from "@/lib/booking";
import type { PublicAppointment } from "@/lib/supabase/bookings";

export async function notifyAppointmentRequested(
  appointment: Appointment,
  service: Service,
  locale: Locale,
) {
  await postNotification("/api/notifications/appointment-requested", {
    appointmentUrl: appointment.publicToken
      ? `${window.location.origin}/reserva/${appointment.publicToken}`
      : undefined,
    patientName: appointment.patientName,
    patientEmail: appointment.patientEmail,
    patientPhone: appointment.patientPhone,
    language: locale,
    serviceTitle: service.title[locale],
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    notes: appointment.notes,
  });
}

export async function notifyAppointmentStatus(
  appointment: Appointment,
  service: Service,
  locale: Locale,
  status: Extract<AppointmentStatus, "confirmed" | "declined">,
) {
  await postNotification("/api/notifications/appointment-status", {
    appointmentUrl: appointment.publicToken
      ? `${window.location.origin}/reserva/${appointment.publicToken}`
      : undefined,
    patientName: appointment.patientName,
    patientEmail: appointment.patientEmail,
    patientPhone: appointment.patientPhone,
    language: appointment.language,
    serviceTitle: service.title[appointment.language] ?? service.title[locale],
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    notes: appointment.notes,
    status,
  });
}

export async function notifyAppointmentCancelled(appointment: PublicAppointment) {
  await postNotification("/api/notifications/appointment-cancelled", {
    appointmentUrl: appointment.publicToken
      ? `${window.location.origin}/reserva/${appointment.publicToken}`
      : undefined,
    patientName: appointment.patientName,
    patientEmail: appointment.patientEmail,
    patientPhone: appointment.patientPhone,
    language: appointment.language,
    serviceTitle: appointment.serviceTitle,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    notes: appointment.notes,
  });
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
