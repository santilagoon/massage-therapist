import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { AppointmentStatus, Locale } from "@/lib/booking";
import type { EmailAppointmentPayload, GroupedAppointmentEmailPayload } from "@/lib/email/types";

type NotifiableStatus = Extract<
  AppointmentStatus,
  "pending_approval" | "confirmed" | "declined" | "cancelled"
>;

type PublicAppointmentRow = {
  id: string;
  public_token: string;
  service_title: string;
  starts_at: string;
  ends_at: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  patient_language: string;
  notes: string | null;
  status: AppointmentStatus;
};

type PublicAppointmentRequestRow = PublicAppointmentRow & {
  request_id: string;
  request_public_token: string;
  unavailable_starts_at: string[];
};

export type NotificationInput = {
  appointmentToken: string;
  status?: Extract<AppointmentStatus, "confirmed" | "declined">;
};

export type GroupNotificationInput = {
  requestToken: string;
};

type VerificationResult =
  | { payload: EmailAppointmentPayload }
  | { response: NextResponse };

type GroupVerificationResult =
  | { payload: GroupedAppointmentEmailPayload }
  | { response: NextResponse };

type RateLimitWindow = {
  count: number;
  expiresAt: number;
};

const appointmentTokenPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const rateLimitWindowMs = 10 * 60 * 1000;
const rateLimitByKey = new Map<string, RateLimitWindow>();
let supabaseClient: SupabaseClient | null = null;

/**
 * Por que existe: reduce la superficie del endpoint a un token de reserva y,
 * para cambios de estado, a uno de los estados que tienen email asociado.
 * @returns Un pedido minimo validado o `null` si el JSON no es aceptable.
 * Efectos secundarios: consume el body del request.
 * Errores esperados: JSON invalido o token/estado fuera del contrato.
 */
export async function readNotificationInput(
  request: Request,
): Promise<NotificationInput | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!body || typeof body !== "object") {
    return null;
  }

  const appointmentToken = (body as Record<string, unknown>).appointmentToken;
  const status = (body as Record<string, unknown>).status;

  if (
    typeof appointmentToken !== "string" ||
    !appointmentTokenPattern.test(appointmentToken)
  ) {
    return null;
  }

  if (status !== undefined && status !== "confirmed" && status !== "declined") {
    return null;
  }

  return {
    appointmentToken,
    status: status as NotificationInput["status"],
  };
}

/**
 * Por que existe: limita las notificaciones de solicitudes multiples a un
 * token de grupo generado por la base, sin aceptar emails enviados por cliente.
 * @returns Un token de solicitud validado o `null`.
 * Efectos secundarios: consume el body del request.
 * Errores esperados: JSON invalido o token fuera del contrato.
 */
export async function readGroupNotificationInput(
  request: Request,
): Promise<GroupNotificationInput | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  const requestToken =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).requestToken
      : undefined;

  if (typeof requestToken !== "string" || !appointmentTokenPattern.test(requestToken)) {
    return null;
  }

  return { requestToken };
}

/**
 * Por que existe: obtiene destinatario y contenido desde Supabase usando el
 * token no adivinable, en vez de confiar en datos enviados por el navegador.
 * @returns El payload canonico para la plantilla o una respuesta HTTP segura.
 * Efectos secundarios: consulta Supabase y reserva cupo del limite de envios.
 * Errores esperados: configuracion ausente, token/estado no verificable o abuso.
 */
export async function verifyNotificationAppointment(
  request: Request,
  input: NotificationInput,
  expectedStatus: NotifiableStatus,
  event: string,
): Promise<VerificationResult> {
  const client = getSupabaseClient();

  if (!client) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Appointment verification is unavailable." },
        { status: 503 },
      ),
    };
  }

  const { data, error } = await client.rpc("get_public_appointment", {
    appointment_token: input.appointmentToken,
  });

  if (error) {
    console.error("Appointment notification verification failed", error);
    return {
      response: NextResponse.json(
        { ok: false, error: "Appointment verification is unavailable." },
        { status: 503 },
      ),
    };
  }

  const appointment = ((data ?? []) as PublicAppointmentRow[])[0];
  if (!appointment || appointment.status !== expectedStatus) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Appointment notification could not be verified." },
        { status: 404 },
      ),
    };
  }

  if (!claimSendAllowance(request, event, appointment.id)) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Too many notification requests." },
        { status: 429, headers: { "Retry-After": "600" } },
      ),
    };
  }

  return {
    payload: {
      appointmentUrl: new URL(
        `/reserva/${encodeURIComponent(appointment.public_token)}`,
        request.url,
      ).toString(),
      patientName: appointment.patient_name,
      patientEmail: appointment.patient_email,
      patientPhone: appointment.patient_phone ?? "",
      language: asLocale(appointment.patient_language),
      serviceTitle: appointment.service_title,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      notes: appointment.notes ?? "",
    },
  };
}

/**
 * Por que existe: resuelve el resumen mensual en servidor desde el token no
 * adivinable del grupo, evitando que el navegador pueda falsificar destinatarios.
 * @returns El payload canonico del resumen o una respuesta HTTP segura.
 * Efectos secundarios: consulta Supabase y reserva cupo del limite de envios.
 * Errores esperados: token inexistente, grupo sin turnos guardados o abuso.
 */
export async function verifyGroupedAppointmentRequest(
  request: Request,
  input: GroupNotificationInput,
): Promise<GroupVerificationResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Appointment verification is unavailable." },
        { status: 503 },
      ),
    };
  }

  const { data, error } = await client.rpc("get_public_appointment_request", {
    request_token: input.requestToken,
  });
  if (error) {
    console.error("Grouped appointment notification verification failed", error);
    return {
      response: NextResponse.json(
        { ok: false, error: "Appointment verification is unavailable." },
        { status: 503 },
      ),
    };
  }

  const rows = (data ?? []) as PublicAppointmentRequestRow[];
  if (!rows.length || rows.some((row) => row.status !== "pending_approval")) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Appointment notification could not be verified." },
        { status: 404 },
      ),
    };
  }

  const first = rows[0];
  if (!claimSendAllowance(request, "requested-group", first.request_id)) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Too many notification requests." },
        { status: 429, headers: { "Retry-After": "600" } },
      ),
    };
  }

  return {
    payload: {
      appointments: rows.map((row) => ({
        appointmentUrl: new URL(
          `/reserva/${encodeURIComponent(row.public_token)}`,
          request.url,
        ).toString(),
        patientName: row.patient_name,
        patientEmail: row.patient_email,
        patientPhone: row.patient_phone ?? "",
        language: asLocale(row.patient_language),
        serviceTitle: row.service_title,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        notes: row.notes ?? "",
      })),
      unavailableStartsAt: first.unavailable_starts_at ?? [],
      patientName: first.patient_name,
      patientEmail: first.patient_email,
      patientPhone: first.patient_phone ?? "",
      language: asLocale(first.patient_language),
    },
  };
}

/**
 * Por que existe: crea un cliente anonimo solo para la funcion publica
 * protegida por token, sin introducir credenciales privilegiadas en la ruta.
 * @returns Cliente Supabase reutilizable o `null` si falta configuracion.
 * Efectos secundarios: instancia el cliente la primera vez que se usa.
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  supabaseClient ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseClient;
}

/**
 * Por que existe: limita reenvios triviales de emails por token y por origen
 * sin sumar infraestructura nueva al MVP.
 * @returns `true` cuando el envio queda dentro del limite permitido.
 * Efectos secundarios: actualiza contadores en memoria de esta instancia.
 */
function claimSendAllowance(request: Request, event: string, appointmentId: string) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();
  const keys: Array<[string, number]> = [[`appointment:${event}:${appointmentId}`, 2]];

  if (clientIp) {
    keys.push([`source:${event}:${clientIp}`, 10]);
  }

  const now = Date.now();
  for (const [key, window] of rateLimitByKey) {
    if (window.expiresAt <= now) {
      rateLimitByKey.delete(key);
    }
  }

  for (const [key, limit] of keys) {
    const window = rateLimitByKey.get(key);
    if (window && window.expiresAt > now && window.count >= limit) {
      return false;
    }
  }

  for (const [key] of keys) {
    const window = rateLimitByKey.get(key);
    if (!window || window.expiresAt <= now) {
      rateLimitByKey.set(key, { count: 1, expiresAt: now + rateLimitWindowMs });
    } else {
      window.count += 1;
    }
  }

  return true;
}

/**
 * Por que existe: restringe el idioma persistido a locales soportados por las
 * plantillas de email.
 * @returns Locale valido; `es` para valores historicos o inesperados.
 * Efectos secundarios: ninguno.
 */
function asLocale(value: string): Locale {
  return value === "en" || value === "ru" ? value : "es";
}
