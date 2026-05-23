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
  public_token?: string | null;
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

export type PublicAppointment = Appointment & {
  serviceDescription: string;
  serviceDurationMinutes: number;
  servicePriceCents: number | null;
  serviceTitle: string;
};

export type ClientAppointment = PublicAppointment;

type PublicAppointmentRow = {
  id: string;
  public_token: string;
  service_id: string;
  service_title: string;
  service_description: string;
  service_duration_minutes: number;
  service_price_cents: number | null;
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

export type AvailabilityBlock = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdAt: string;
};

type AvailabilityBlockRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
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

  const { data, error } = await withTimeout(
    supabase.rpc("request_public_appointment", {
      appointment_ends_at: appointment.endsAt,
      appointment_notes: appointment.notes || "",
      appointment_patient_email: appointment.patientEmail.trim().toLowerCase(),
      appointment_patient_language: appointment.language,
      appointment_patient_name: appointment.patientName,
      appointment_patient_phone: appointment.patientPhone || "",
      appointment_service_id: input.service.id,
      appointment_starts_at: appointment.startsAt,
    }),
    "Supabase did not respond while creating the appointment.",
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = ((data ?? []) as AppointmentRow[])[0];
  return row ? mapAppointmentRow(row) : appointment;
}

export async function loadPublicAppointment(token: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await withTimeout(
    supabase.rpc("get_public_appointment", { appointment_token: token }),
    "Supabase did not respond while loading the appointment.",
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = ((data ?? []) as PublicAppointmentRow[])[0];
  if (!row) {
    return null;
  }

  return mapPublicAppointmentRow(row);
}

export async function cancelPublicAppointment(token: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await withTimeout(
    supabase.rpc("cancel_public_appointment", { appointment_token: token }),
    "Supabase did not respond while cancelling the appointment.",
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = ((data ?? []) as PublicAppointmentRow[])[0];
  if (!row) {
    return null;
  }

  return mapPublicAppointmentRow(row);
}

export async function loadClientAppointments() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await withTimeout(
    supabase.rpc("get_my_appointments"),
    "Supabase did not respond while loading client appointments.",
  );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PublicAppointmentRow[]).map(mapPublicAppointmentRow);
}

export async function cancelClientAppointment(id: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await withTimeout(
    supabase.rpc("cancel_my_appointment", { appointment_id: id }),
    "Supabase did not respond while cancelling the appointment.",
  );

  if (error) {
    throw new Error(error.message);
  }

  const row = ((data ?? []) as PublicAppointmentRow[])[0];
  if (!row) {
    return null;
  }

  return mapPublicAppointmentRow(row);
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
        "id, public_token, service_id, starts_at, ends_at, patient_name, patient_email, patient_phone, patient_language, notes, status, created_at",
      )
      .order("created_at", { ascending: false }),
    "Supabase did not respond while loading admin appointments.",
  );

  if (error && error.message.toLowerCase().includes("public_token")) {
    const { data: fallbackData, error: fallbackError } = await withTimeout(
      supabase
        .from("appointments")
        .select(
          "id, service_id, starts_at, ends_at, patient_name, patient_email, patient_phone, patient_language, notes, status, created_at",
        )
        .order("created_at", { ascending: false }),
      "Supabase did not respond while loading admin appointments.",
    );

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    return ((fallbackData ?? []) as AppointmentRow[]).map(mapAppointmentRow);
  }

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AppointmentRow[]).map(mapAppointmentRow);
}

export async function loadAdminBlocks() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await withTimeout(
    supabase
      .from("availability_exceptions")
      .select("id, starts_at, ends_at, reason, created_at")
      .eq("is_available", false)
      .order("starts_at", { ascending: true }),
    "Supabase did not respond while loading blocked times.",
  );

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AvailabilityBlockRow[]).map(mapAvailabilityBlockRow);
}

export async function createAdminBlock(input: {
  startsAt: string;
  endsAt: string;
  reason: string;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await withTimeout(
    supabase
      .from("availability_exceptions")
      .insert({
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        reason: input.reason,
        is_available: false,
      })
      .select("id, starts_at, ends_at, reason, created_at")
      .single(),
    "Supabase did not respond while blocking the time.",
  );

  if (error) {
    throw new Error(error.message);
  }

  return mapAvailabilityBlockRow(data as AvailabilityBlockRow);
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
        "id, public_token, service_id, starts_at, ends_at, patient_name, patient_email, patient_phone, patient_language, notes, status, created_at",
      )
      .single(),
    "Supabase did not respond while updating the appointment.",
  );

  if (error && error.message.toLowerCase().includes("public_token")) {
    const { data: fallbackData, error: fallbackError } = await withTimeout(
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

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    return mapAppointmentRow(fallbackData as AppointmentRow);
  }

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
  const localFallback = localServices.find((service) => service.slug === row.slug);

  return {
    id: row.id,
    slug: row.slug,
    durationMinutes: row.duration_minutes,
    priceLabel: row.currency,
    priceCents: row.price_cents,
    priceUsdCents: localFallback?.priceUsdCents ?? null,
    title: localFallback?.title ?? row.title,
    description: localFallback?.description ?? row.description,
  };
}

function mapAvailabilityBlockRow(row: AvailabilityBlockRow): AvailabilityBlock {
  return {
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    reason: row.reason ?? "",
    createdAt: row.created_at,
  };
}

function mapAppointmentRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    publicToken: row.public_token ?? undefined,
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

function mapPublicAppointmentRow(row: PublicAppointmentRow): PublicAppointment {
  return {
    id: row.id,
    publicToken: row.public_token,
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
    serviceDescription: row.service_description,
    serviceDurationMinutes: row.service_duration_minutes,
    servicePriceCents: row.service_price_cents,
    serviceTitle: row.service_title,
  };
}
