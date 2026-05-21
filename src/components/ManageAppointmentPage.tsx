"use client";

import { useEffect, useMemo, useState } from "react";
import { timeZone } from "@/lib/booking";
import {
  PublicAppointment,
  cancelPublicAppointment,
  loadPublicAppointment,
} from "@/lib/supabase/bookings";
import { notifyAppointmentCancelled } from "@/lib/notifications/appointments";

const statusLabels: Record<string, string> = {
  cancelled: "Cancelada",
  completed: "Realizada",
  confirmed: "Confirmada",
  declined: "Rechazada",
  pending_approval: "Pendiente de aprobación",
};

export function ManageAppointmentPage({ token }: { token: string }) {
  const [appointment, setAppointment] = useState<PublicAppointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAppointment() {
      setIsLoading(true);
      try {
        const loadedAppointment = await loadPublicAppointment(token);
        if (!cancelled) {
          setAppointment(loadedAppointment);
          setNotice(loadedAppointment ? "" : "No encontramos esta reserva.");
        }
      } catch {
        if (!cancelled) {
          setNotice("No pudimos cargar la reserva. Intentá nuevamente.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAppointment();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const canCancel = useMemo(() => {
    if (!appointment) {
      return false;
    }

    return (
      ["pending_approval", "confirmed"].includes(appointment.status) &&
      new Date(appointment.startsAt) > new Date()
    );
  }, [appointment]);

  async function handleCancel() {
    if (!appointment || !canCancel || isCancelling) {
      return;
    }

    const confirmed = window.confirm(
      "¿Querés cancelar esta solicitud/reserva? Esta acción avisará a Maria.",
    );

    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    try {
      const cancelledAppointment = await cancelPublicAppointment(token);
      if (!cancelledAppointment) {
        setNotice("No pudimos cancelar esta reserva.");
        return;
      }

      setAppointment(cancelledAppointment);
      setNotice("Reserva cancelada correctamente.");
      void notifyAppointmentCancelled(cancelledAppointment).catch(() => {
        setNotice("Reserva cancelada. No pudimos enviar el email de aviso.");
      });
    } catch {
      setNotice("No pudimos cancelar esta reserva. Intentá nuevamente.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#111111]">
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <a href="/" className="text-sm font-semibold tracking-[0.12em]">
            MM
          </a>
          <a
            href="/"
            className="rounded-full border border-[#d4d4d4] px-4 py-2 text-sm font-semibold transition hover:bg-[#fafafa]"
          >
            Ir al inicio
          </a>
        </div>
      </header>

      <section className="mx-auto grid max-w-3xl gap-5 px-4 py-8 sm:py-12">
        {isLoading ? (
          <StatusCard title="Cargando reserva" copy="Estamos buscando los datos del turno." />
        ) : null}

        {!isLoading && appointment ? (
          <>
            <div
              className={[
                "rounded-3xl px-5 py-8 text-center text-white sm:px-8",
                appointment.status === "cancelled" ? "bg-[#c5362f]" : "bg-[#111111]",
              ].join(" ")}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                Reserva
              </p>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
                {statusLabels[appointment.status] ?? appointment.status}
              </h1>
              <p className="mt-2 text-sm font-medium text-white/75">
                Código {appointment.publicToken?.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <section className="grid gap-5 rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-7">
              <div className="grid gap-2 text-center">
                <h2 className="text-2xl font-semibold">{appointment.serviceTitle}</h2>
                <p className="text-sm leading-6 text-[#6b7280]">
                  {appointment.serviceDescription}
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl bg-[#f5f5f5] p-4 sm:grid-cols-2">
                <Detail label="Fecha" value={formatDate(appointment.startsAt)} />
                <Detail label="Horario" value={formatTimeRange(appointment)} />
                <Detail label="Duración" value={`${appointment.serviceDurationMinutes} min`} />
                <Detail label="Valor" value={formatPrice(appointment.servicePriceCents)} />
              </div>

              <div className="grid gap-3 rounded-2xl border border-[#e5e5e5] p-4">
                <Detail label="Nombre" value={appointment.patientName} />
                <Detail label="Teléfono" value={appointment.patientPhone || "-"} />
                <Detail label="Email" value={appointment.patientEmail} />
                {appointment.notes ? <Detail label="Notas" value={appointment.notes} /> : null}
              </div>

              {notice ? (
                <p className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-sm font-medium text-[#404040]">
                  {notice}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handleCancel}
                disabled={!canCancel || isCancelling}
                className="h-12 rounded-full bg-[#c5362f] px-5 text-sm font-semibold text-white transition hover:bg-[#a92d27] disabled:cursor-not-allowed disabled:bg-[#c9c9c9]"
              >
                {isCancelling ? "Cancelando..." : "Cancelar reserva"}
              </button>

              {!canCancel ? (
                <p className="text-center text-sm text-[#737373]">
                  Esta reserva ya no puede cancelarse desde este enlace.
                </p>
              ) : null}
            </section>
          </>
        ) : null}

        {!isLoading && !appointment ? (
          <StatusCard
            title="Reserva no encontrada"
            copy={notice || "El enlace puede ser incorrecto o haber expirado."}
          />
        ) : null}
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#737373]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-[#111111]">{value}</p>
    </div>
  );
}

function StatusCard({ copy, title }: { copy: string; title: string }) {
  return (
    <div className="rounded-3xl border border-[#e5e5e5] bg-white p-6 text-center shadow-sm">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-[#737373]">{copy}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeZone,
  }).format(new Date(value));
}

function formatTimeRange(appointment: PublicAppointment) {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });

  return `${formatter.format(new Date(appointment.startsAt))} - ${formatter.format(
    new Date(appointment.endsAt),
  )}`;
}

function formatPrice(priceCents: number | null) {
  if (!priceCents) {
    return "Precio a consultar";
  }

  return new Intl.NumberFormat("es-AR", {
    currency: "ARS",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(priceCents / 100);
}
