import { Appointment, AppointmentStatus, Locale, Service } from "@/lib/booking";

export async function notifyAppointmentRequested(
  appointment: Appointment,
  service: Service,
  locale: Locale,
) {
  await postNotification("/api/notifications/appointment-requested", {
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
