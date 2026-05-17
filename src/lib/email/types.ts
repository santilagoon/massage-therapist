import { AppointmentStatus, Locale } from "@/lib/booking";

export type EmailAppointmentPayload = {
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
