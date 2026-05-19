import {
  Appointment,
  AppointmentStatus,
  Locale,
  Service,
  createAppointment,
  services as localServices,
} from "@/lib/booking";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ServiceRow = {
  id: string;
  slug: string;
  duration_minutes: number;
  price_cents: number | null;
  currency: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
};

type BusyWindowRow = {
  starts_at: string;
  ends_at: string;
};

type AppointmentRow = {
  id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  patient_language: Locale;
  notes: string | null;
  status: AppointmentStatus;
  created_at: string;
};

export async function loadRemoteServices() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return localServices;
  }

  const { data, error } = await withTimeout(
    supabase
      .from("services")
      .select("id, slug, duration_minutes, price_cents, currency, title, description")
      .eq("is_active", true)
      .order("duration_minutes", { ascending: true }),
    "Supabase did not respond while loading services.",
  );

  if (error || !data?.length) {
    throw new Error(error?.message ?? "No active services found in Supabase.");
  }

  return (data as ServiceRow[]).map(mapServiceRow);
}

export async function loadBusyAppointments(dateValue: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

  const startsAt = new Date(`${dateValue}T00:00:00`);
  const endsAt = new Date(`${dateValue}T23:59:59`);

  const { data, error } = await withTimeout(
    supabase.rpc("get_public_busy_appointments", {
      range_start: startsAt.toISOString(),
      range_end: endsAt.toISOString(),
    }),
    "Supabase did not respond while loading busy appointments.",
  );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as BusyWindowRow[]).map((row, index): Appointment => {
    return {
      id: `busy-${dateValue}-${index}`,
      serviceId: "busy",
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      patientName: "Reserved",
      patientEmail: "",
      patientPhone: "",
      language: "es",
      notes: "",
      status: "confirmed",
      createdAt: row.starts_at,
    };
  });
}

export async function requestRemoteAppointment(input: {
  service: Service;
  startsAt: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  language: Locale;
  notes: string;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const appointment = createAppointment(input);

  const { error } = await withTimeout(
    supabase.from("appointments").insert({
      service_id: input.service.id,
      starts_at: appointment.startsAt,
      ends_at: appointment.endsAt,
      patient_name: appointment.patientName,
      patient_email: appointment.patientEmail.trim().toLowerCase(),
      patient_phone: appointment.patientPhone || null,
      patient_language: appointment.language,
      notes: appointment.notes || null,
      status: "pending_approval",
    }),
    "Supabase did not respond while creating the appointment.",
  );

  if (error) {
    throw new Error(error.message);
  }

  return appointment;
}

export async function loadAdminAppointments() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await withTimeout(
    supabase
      .from("appointments")
      .select(
        "id, service_id, starts_at, ends_at, patient_name, patient_email, patient_phone, patient_language, notes, status, created_at",
      )
      .order("created_at", { ascending: false }),
    "Supabase did not respond while loading admin appointments.",
  );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AppointmentRow[]).map(mapAppointmentRow);
}

export async function updateRemoteAppointmentStatus(
  id: string,
  status: AppointmentStatus,
) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await withTimeout(
    supabase
      .from("appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(
        "id, service_id, starts_at, ends_at, patient_name, patient_email, patient_phone, patient_language, notes, status, created_at",
      )
      .single(),
    "Supabase did not respond while updating the appointment.",
  );

  if (error) {
    throw new Error(error.message);
  }

  return mapAppointmentRow(data as AppointmentRow);
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  message: string,
  timeoutMs = 12_000,
) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function mapServiceRow(row: ServiceRow): Service {
  return {
    id: row.id,
    slug: row.slug,
    durationMinutes: row.duration_minutes,
    priceLabel: row.currency,
    priceCents: row.price_cents,
    title: row.title,
    description: row.description,
  };
}

function mapAppointmentRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    serviceId: row.service_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    patientName: row.patient_name,
    patientEmail: row.patient_email,
    patientPhone: row.patient_phone ?? "",
    language: row.patient_language,
    notes: row.notes ?? "",
    status: row.status,
    createdAt: row.created_at,
  };
}
