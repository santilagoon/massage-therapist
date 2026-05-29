import { AppointmentStatus, Locale } from "@/lib/booking";

export type EmailAppointmentPayload = {
  appointmentUrl?: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  language: Locale;
  serviceTitle: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
};

export type AppointmentStatusEmailPayload = EmailAppointmentPayload & {
  status: Extract<AppointmentStatus, "confirmed" | "declined">;
};

export type GroupedAppointmentEmailPayload = {
  appointments: EmailAppointmentPayload[];
  unavailableStartsAt: string[];
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  language: Locale;
};
