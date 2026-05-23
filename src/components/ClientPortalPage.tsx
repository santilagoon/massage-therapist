"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { AuthPanel } from "@/components/BookingApp";
import { Locale, timeZone, translations } from "@/lib/booking";
import { notifyAppointmentCancelled } from "@/lib/notifications/appointments";
import {
  ClientAppointment,
  cancelClientAppointment,
  loadClientAppointments,
} from "@/lib/supabase/bookings";
import {
  AdminAuthError,
  getCurrentUser,
  resendSignupCode,
  sendPasswordRecovery,
  signInAccount,
  signInWithGoogle,
  signOutAccount,
  signUpAccount,
  updateAccountPassword,
  verifyRecoveryCode,
  verifySignupCode,
} from "@/lib/supabase/auth";

const statusLabels: Record<string, string> = {
  cancelled: "Cancelado",
  completed: "Realizado",
  confirmed: "Confirmado",
  declined: "Rechazado",
  pending_approval: "Pendiente de confirmación",
};

export function ClientPortalPage() {
  const locale: Locale = "es";
  const t = translations[locale];
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<ClientAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [isCancellingId, setIsCancellingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) {
          return;
        }

        setUser(currentUser);
        if (currentUser) {
          await refreshAppointments();
        }

        if (window.location.hash.includes("access_token")) {
          window.history.replaceState({}, document.title, "/cuenta");
        }
      } catch (error) {
        logPortalError(error);
        if (!cancelled) {
          setNotice("No pudimos cargar tu sesión. Intentá ingresar nuevamente.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAppointments() {
    const remoteAppointments = await loadClientAppointments();
    setAppointments(remoteAppointments);
  }

  async function handleLogin(email: string, password: string) {
    setIsAuthLoading(true);
    setNotice("");
    try {
      const signedInUser = await signInAccount(email.trim(), password);
      setUser(signedInUser);
      await refreshAppointments();
    } catch (error) {
      logPortalError(error);
      setNotice(getPortalSignInNotice(error));
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleRegister(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    setIsAuthLoading(true);
    setNotice("");
    try {
      await signUpAccount({
        ...input,
        email: input.email.trim().toLowerCase(),
      });
      setNotice(t.registerSuccess);
      return true;
    } catch (error) {
      logPortalError(error);
      setNotice(t.registerError);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleVerifySignup(email: string, code: string) {
    setIsAuthLoading(true);
    setNotice("");
    try {
      await verifySignupCode(email, code);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        await refreshAppointments();
      }
      setNotice(t.emailVerified);
      return true;
    } catch (error) {
      logPortalError(error);
      setNotice(t.codeVerificationError);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleResendSignup(email: string) {
    setIsAuthLoading(true);
    setNotice("");
    try {
      await resendSignupCode(email);
      setNotice(t.codeResent);
      return true;
    } catch (error) {
      logPortalError(error);
      setNotice(t.codeResendError);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleSendRecovery(email: string) {
    setIsAuthLoading(true);
    setNotice("");
    try {
      await sendPasswordRecovery(email.trim().toLowerCase());
      setNotice(t.recoveryCodeSent);
      return true;
    } catch (error) {
      logPortalError(error);
      setNotice(t.recoveryError);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleVerifyRecovery(email: string, code: string) {
    setIsAuthLoading(true);
    setNotice("");
    try {
      await verifyRecoveryCode(email, code);
      setNotice(t.recoveryCodeVerified);
      return true;
    } catch (error) {
      logPortalError(error);
      setNotice(t.codeVerificationError);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleUpdatePassword(password: string) {
    setIsAuthLoading(true);
    setNotice("");
    try {
      await updateAccountPassword(password);
      await signOutAccount();
      setUser(null);
      setAppointments([]);
      setNotice(t.passwordUpdated);
      return true;
    } catch (error) {
      logPortalError(error);
      setNotice(t.passwordUpdateError);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setIsAuthLoading(true);
    setNotice("");
    try {
      await signInWithGoogle("/cuenta");
      return true;
    } catch (error) {
      logPortalError(error);
      setNotice(t.googleLoginError);
      setIsAuthLoading(false);
      return false;
    }
  }

  async function handleLogout() {
    await signOutAccount();
    setUser(null);
    setAppointments([]);
    setNotice("");
    window.location.href = "/";
  }

  async function handleCancel(appointment: ClientAppointment) {
    if (!canCancelAppointment(appointment) || isCancellingId) {
      return;
    }

    const confirmed = window.confirm("¿Querés cancelar esta reserva?");
    if (!confirmed) {
      return;
    }

    setIsCancellingId(appointment.id);
    setNotice("");
    try {
      const cancelledAppointment = await cancelClientAppointment(appointment.id);
      if (!cancelledAppointment) {
        setNotice("No pudimos cancelar esta reserva.");
        return;
      }

      setAppointments((current) =>
        current.map((item) =>
          item.id === cancelledAppointment.id ? cancelledAppointment : item,
        ),
      );
      setNotice("Reserva cancelada correctamente.");
      void notifyAppointmentCancelled(cancelledAppointment).catch(() => {
        setNotice("Reserva cancelada. No pudimos enviar el email de aviso.");
      });
    } catch (error) {
      logPortalError(error);
      setNotice("No pudimos cancelar esta reserva. Intentá nuevamente.");
    } finally {
      setIsCancellingId(null);
    }
  }

  const activeAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => canCancelAppointment(appointment))
        .sort((first, second) => first.startsAt.localeCompare(second.startsAt)),
    [appointments],
  );

  const historyAppointments = useMemo(() => {
    const activeIds = new Set(activeAppointments.map((appointment) => appointment.id));
    return appointments
      .filter((appointment) => !activeIds.has(appointment.id))
      .sort((first, second) => second.startsAt.localeCompare(first.startsAt));
  }, [activeAppointments, appointments]);

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-[#111111]">
      <header className="border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/" className="text-sm font-semibold tracking-[0.12em]">
            MM
          </a>
          <div className="flex items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="h-10 cursor-pointer rounded-full border border-[#d4d4d4] px-4 text-sm font-semibold transition hover:bg-white"
              >
                Salir
              </button>
            ) : null}
            <a
              href="/"
              className="rounded-full border border-[#d4d4d4] px-4 py-2 text-sm font-semibold transition hover:bg-white"
            >
              Inicio
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {isLoading ? (
          <div className="mx-auto max-w-md rounded-2xl border border-[#e5e5e5] bg-white p-5 text-center text-sm font-medium text-[#525252]">
            Cargando cuenta...
          </div>
        ) : null}

        {!isLoading && !user ? (
          <AuthPanel
            isLoading={isAuthLoading}
            notice={notice}
            t={t}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onResendSignup={handleResendSignup}
            onSendRecovery={handleSendRecovery}
            onUpdatePassword={handleUpdatePassword}
            onVerifyRecovery={handleVerifyRecovery}
            onVerifySignup={handleVerifySignup}
            onGoogleLogin={handleGoogleLogin}
          />
        ) : null}

        {!isLoading && user ? (
          <div className="grid gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#747c67]">
                  Portal de paciente
                </p>
                <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                  Tus reservas
                </h1>
                <p className="mt-2 text-sm text-[#6b6b6b]">
                  Sesión iniciada como {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshAppointments()}
                className="h-11 cursor-pointer rounded-full border border-[#d4d4d4] px-5 text-sm font-semibold transition hover:bg-white"
              >
                Actualizar
              </button>
            </div>

            {notice ? (
              <p className="rounded-2xl border border-[#e5e5e5] bg-white p-4 text-sm font-medium text-[#404040]">
                {notice}
              </p>
            ) : null}

            <section className="grid gap-4 rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-2xl font-semibold">Pendientes y confirmadas</h2>
                <p className="mt-1 text-sm text-[#6b6b6b]">
                  Acá podés ver y cancelar reservas futuras que todavía estén activas.
                </p>
              </div>

              {activeAppointments.length ? (
                <div className="grid gap-3">
                  {activeAppointments.map((appointment) => (
                    <ClientAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      isCancelling={isCancellingId === appointment.id}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="No tenés reservas activas." />
              )}
            </section>

            <section className="grid gap-4 rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="text-2xl font-semibold">Historial</h2>
                <p className="mt-1 text-sm text-[#6b6b6b]">
                  Reservas realizadas, canceladas, rechazadas o pasadas.
                </p>
              </div>

              {historyAppointments.length ? (
                <div className="grid gap-3">
                  {historyAppointments.map((appointment) => (
                    <ClientAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      isCancelling={false}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="Todavía no hay historial para mostrar." />
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ClientAppointmentCard({
  appointment,
  isCancelling,
  onCancel,
}: {
  appointment: ClientAppointment;
  isCancelling: boolean;
  onCancel: (appointment: ClientAppointment) => void;
}) {
  const canCancel = canCancelAppointment(appointment);

  return (
    <article className="grid gap-4 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{appointment.serviceTitle}</h3>
          <span className={clientStatusClass(appointment.status)}>
            {statusLabels[appointment.status] ?? appointment.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-[#5f5f5f]">
          {formatPortalDate(appointment.startsAt)} · {formatPortalTime(appointment.startsAt)} -{" "}
          {formatPortalTime(appointment.endsAt)}
        </p>
        <p className="mt-1 text-sm text-[#5f5f5f]">
          {appointment.patientName} · {appointment.patientPhone || "Sin teléfono"}
        </p>
        {appointment.notes ? (
          <p className="mt-3 rounded-xl bg-white p-3 text-sm text-[#525252]">
            {appointment.notes}
          </p>
        ) : null}
      </div>

      {canCancel ? (
        <button
          type="button"
          onClick={() => onCancel(appointment)}
          disabled={isCancelling}
          className="h-11 cursor-pointer rounded-full bg-[#c5362f] px-5 text-sm font-semibold text-white transition hover:bg-[#a92d27] disabled:cursor-not-allowed disabled:bg-[#c9c9c9]"
        >
          {isCancelling ? "Cancelando..." : "Cancelar"}
        </button>
      ) : null}
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d4d4d4] p-6 text-center text-sm font-medium text-[#737373]">
      {text}
    </div>
  );
}

function canCancelAppointment(appointment: ClientAppointment) {
  return (
    ["pending_approval", "confirmed"].includes(appointment.status) &&
    new Date(appointment.startsAt) > new Date()
  );
}

function clientStatusClass(status: string) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold";
  if (status === "confirmed") {
    return `${base} bg-[#e6f3ec] text-[#315f4d]`;
  }
  if (status === "pending_approval") {
    return `${base} bg-[#fff3d8] text-[#8a5a00]`;
  }
  if (status === "cancelled" || status === "declined") {
    return `${base} bg-[#f4e7e5] text-[#9b332d]`;
  }
  return `${base} bg-[#eeeeee] text-[#525252]`;
}

function formatPortalDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    weekday: "long",
    timeZone,
  }).format(new Date(value));
}

function formatPortalTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function getPortalSignInNotice(error: unknown) {
  if (error instanceof AdminAuthError) {
    if (error.code === "account_not_confirmed") {
      return "Tenés que verificar tu email antes de ingresar.";
    }
    if (error.code === "invalid_credentials") {
      return "No se pudo iniciar sesión. Revisá el email y la contraseña.";
    }
  }

  return "No pudimos iniciar sesión. Intentá nuevamente.";
}

function logPortalError(error: unknown) {
  console.error(error);
}
