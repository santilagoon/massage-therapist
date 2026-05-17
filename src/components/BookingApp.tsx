"use client";

import { useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import {
  Appointment,
  AppointmentStatus,
  Locale,
  createAppointment,
  findServiceInList,
  formatDateTime,
  getAvailableSlots,
  getInitialDate,
  initialAppointments,
  locales,
  services as fallbackServices,
  timeZone,
  translations,
} from "@/lib/booking";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  loadAdminAppointments,
  loadBusyAppointments,
  loadRemoteServices,
  requestRemoteAppointment,
  updateRemoteAppointmentStatus,
} from "@/lib/supabase/bookings";
import {
  getCurrentAdminUser,
  signInAdmin,
  signOutAdmin,
} from "@/lib/supabase/auth";
import {
  notifyAppointmentRequested,
  notifyAppointmentStatus,
} from "@/lib/notifications/appointments";

const storageKey = "massage-therapist-mvp-appointments";
type AdminFilter = "all" | "pending_approval" | "confirmed" | "future_confirmed";
type BookingFormField = "patientName" | "patientEmail" | "patientPhone" | "notes" | "slot";
type BookingFormErrors = Partial<Record<BookingFormField, string>>;

const phoneCountries = [
  { code: "+54", label: "Argentina", minLength: 10, maxLength: 11 },
  { code: "+598", label: "Uruguay", minLength: 8, maxLength: 9 },
  { code: "+55", label: "Brasil", minLength: 10, maxLength: 11 },
  { code: "+56", label: "Chile", minLength: 9, maxLength: 9 },
  { code: "+1", label: "Estados Unidos", minLength: 10, maxLength: 10 },
  { code: "+44", label: "Reino Unido", minLength: 10, maxLength: 10 },
  { code: "+34", label: "España", minLength: 9, maxLength: 9 },
  { code: "+7", label: "Rusia", minLength: 10, maxLength: 10 },
];

export function BookingApp() {
  const [locale, setLocale] = useState<Locale>("es");
  const [activeTab, setActiveTab] = useState<"book" | "admin">("book");
  const [availableServices, setAvailableServices] = useState(fallbackServices);
  const [serviceId, setServiceId] = useState(fallbackServices[0].id);
  const [date, setDate] = useState(getInitialDate);
  const [slot, setSlot] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (isSupabaseConfigured()) {
      return [];
    }

    if (typeof window === "undefined") {
      return initialAppointments;
    }

    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as Appointment[]) : initialAppointments;
  });
  const [busyAppointments, setBusyAppointments] = useState<Appointment[]>([]);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(isSupabaseConfigured);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [remoteMode, setRemoteMode] = useState(isSupabaseConfigured);
  const [form, setForm] = useState({
    patientName: "",
    patientEmail: "",
    phoneCountryCode: "+54",
    patientPhone: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<BookingFormErrors>({});
  const [notice, setNotice] = useState("");

  const t = translations[locale];
  const selectedService = findServiceInList(serviceId, availableServices);
  const selectedPhoneCountry =
    phoneCountries.find((country) => country.code === form.phoneCountryCode) ??
    phoneCountries[0];
  const blockingAppointments = useMemo(
    () => (remoteMode ? [...busyAppointments, ...appointments] : appointments),
    [appointments, busyAppointments, remoteMode],
  );

  useEffect(() => {
    if (remoteMode) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(appointments));
  }, [appointments, remoteMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      if (!isSupabaseConfigured()) {
        setIsLoadingRemote(false);
        setRemoteMode(false);
        return;
      }

      try {
        const remoteServices = await loadRemoteServices();
        if (cancelled) {
          return;
        }

        setAvailableServices(remoteServices);
        setServiceId(remoteServices[0].id);
        setRemoteMode(true);
        setNotice(t.remoteReady);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAvailableServices(fallbackServices);
        setServiceId(fallbackServices[0].id);
        setRemoteMode(false);
        setNotice(`${t.localMode} ${getErrorMessage(error)}`);
      } finally {
        if (!cancelled) {
          setIsLoadingRemote(false);
        }
      }
    }

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, [t.localMode, t.remoteReady]);

  useEffect(() => {
    let cancelled = false;

    async function loadBusySlots() {
      if (!remoteMode) {
        setBusyAppointments([]);
        return;
      }

      try {
        const remoteBusyAppointments = await loadBusyAppointments(date);
        if (!cancelled) {
          setBusyAppointments(remoteBusyAppointments);
        }
      } catch (error) {
        if (!cancelled) {
          setBusyAppointments([]);
          setNotice(`${t.localMode} ${getErrorMessage(error)}`);
        }
      }
    }

    void loadBusySlots();

    return () => {
      cancelled = true;
    };
  }, [date, remoteMode, t.localMode]);

  const availableSlots = useMemo(
    () => getAvailableSlots(date, selectedService, blockingAppointments),
    [blockingAppointments, date, selectedService],
  );

  const selectedSlot = availableSlots.includes(slot) ? slot : availableSlots[0] ?? "";

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      if (!isSupabaseConfigured()) {
        return;
      }

      const user = await getCurrentAdminUser();
      if (!cancelled) {
        setAdminUser(user);
      }
    }

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshBusySlots(targetDate = date) {
    if (!remoteMode) {
      setBusyAppointments([]);
      return;
    }

    try {
      const remoteBusyAppointments = await loadBusyAppointments(targetDate);
      setBusyAppointments(remoteBusyAppointments);
    } catch (error) {
      setNotice(`${t.localMode} ${getErrorMessage(error)}`);
    }
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = normalizePersonName(form.patientName);
    const normalizedEmail = form.patientEmail.trim().toLowerCase();
    const normalizedPhone = form.patientPhone
      ? `${form.phoneCountryCode} ${form.patientPhone}`
      : "";
    const validationErrors = validateBookingForm({
      name: normalizedName,
      email: normalizedEmail,
      phone: form.patientPhone,
      notes: form.notes,
      selectedSlot,
      phoneCountry: selectedPhoneCountry,
      t,
    });

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setNotice(t.formHasErrors);
      return;
    }

    if (isSaving) {
      return;
    }

    setFormErrors({});
    setIsSaving(true);

    try {
      const appointmentInput = {
        service: selectedService,
        startsAt: selectedSlot,
        patientName: normalizedName,
        patientEmail: normalizedEmail,
        patientPhone: normalizedPhone,
        language: locale,
        notes: form.notes.trim(),
      };

      const appointment =
        remoteMode && isSupabaseConfigured()
          ? await requestRemoteAppointment(appointmentInput)
          : createAppointment(appointmentInput);

      setAppointments((current) => [appointment, ...current]);
      setForm({
        patientName: "",
        patientEmail: "",
        phoneCountryCode: form.phoneCountryCode,
        patientPhone: "",
        notes: "",
      });
      setFormErrors({});
      setNotice(remoteMode ? t.remoteRequestSuccess : t.success);

      if (remoteMode) {
        void notifyAppointmentRequested(appointment, selectedService, locale).catch(() => {
          setNotice(t.emailSkipped);
        });
        void refreshBusySlots(date);
      }
    } catch (error) {
      const appointment = createAppointment({
        service: selectedService,
        startsAt: selectedSlot,
        patientName: normalizedName,
        patientEmail: normalizedEmail,
        patientPhone: normalizedPhone,
        language: locale,
        notes: form.notes.trim(),
      });

      setRemoteMode(false);
      setAppointments((current) => [appointment, ...current]);
      setNotice(`${t.localMode} ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function loadAdminData() {
    if (!remoteMode || !adminUser) {
      return;
    }

    setIsLoadingAdmin(true);
    try {
      const remoteAppointments = await loadAdminAppointments();
      setAppointments(remoteAppointments);
      setNotice(t.adminLoaded);
    } catch (error) {
      setNotice(`${t.localMode} ${getErrorMessage(error)}`);
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleAdminLogin(email: string, password: string) {
    setIsLoadingAdmin(true);
    try {
      const user = await signInAdmin(email, password);
      setAdminUser(user);
      const remoteAppointments = await loadAdminAppointments();
      setAppointments(remoteAppointments);
      setNotice(t.adminLoaded);
    } catch (error) {
      setNotice(getErrorMessage(error));
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleAdminLogout() {
    await signOutAdmin();
    setAdminUser(null);
    setAppointments([]);
    setNotice(t.adminLoginRequired);
  }

  useEffect(() => {
    if (activeTab === "admin" && adminUser && remoteMode && appointments.length === 0) {
      void loadAdminData();
    }
  }, [activeTab, adminUser, appointments.length, remoteMode]);

  async function updateStatus(id: string, status: AppointmentStatus) {
    if (remoteMode && adminUser) {
      setIsUpdatingStatus(true);
      try {
        const updatedAppointment = await updateRemoteAppointmentStatus(id, status);
        setAppointments((current) =>
          current.map((appointment) =>
            appointment.id === id ? updatedAppointment : appointment,
          ),
        );
        setNotice(t.adminUpdated);
        if (status === "confirmed" || status === "declined") {
          const service = findServiceInList(updatedAppointment.serviceId, availableServices);
          void notifyAppointmentStatus(updatedAppointment, service, locale, status).catch(() => {
            setNotice(t.emailSkipped);
          });
        }
        void refreshBusySlots(date);
      } catch (error) {
        setNotice(getErrorMessage(error));
      } finally {
        setIsUpdatingStatus(false);
      }
      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-[#24211d]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[#d9d0c3] py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#6f7b60]">
              {t.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#24211d] sm:text-4xl">
              {t.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="language">
              {t.language}
            </label>
            <select
              id="language"
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="h-10 rounded-md border border-[#bdb3a5] bg-white px-3 text-sm font-medium"
            >
              {locales.map((item) => (
                <option key={item} value={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)]">
          <section className="flex flex-col gap-6">
            <div className="grid gap-4 rounded-lg bg-[#e4d8c8] p-5 sm:grid-cols-[1fr_180px]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7f4e3b]">
                  {t.appName}
                </p>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-[#4a443d]">
                  {t.subtitle}
                </p>
              </div>
              <div className="flex min-h-36 items-end rounded-md bg-[linear-gradient(140deg,#5f7a68,#b16c4a_55%,#e8d7b7)] p-4 text-white">
                <div>
                  <p className="text-sm font-semibold">{t.schedule}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] opacity-85">
                    {t.timezone}
                  </p>
                </div>
              </div>
            </div>

            {notice || isLoadingRemote ? (
              <p className="rounded-md border border-[#d9d0c3] bg-white p-3 text-sm font-medium text-[#4a443d]">
                {isLoadingRemote ? t.loading : notice}
              </p>
            ) : null}

            <div className="flex w-full gap-2 border-b border-[#d9d0c3]">
              <button
                type="button"
                onClick={() => setActiveTab("book")}
                className={tabClass(activeTab === "book")}
              >
                {t.bookTab}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("admin")}
                className={tabClass(activeTab === "admin")}
              >
                {t.adminTab}
              </button>
            </div>

            {activeTab === "book" ? (
              <form
                onSubmit={submitRequest}
                noValidate
                className="grid gap-5 rounded-lg border border-[#d9d0c3] bg-white p-5"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label={t.service}>
                    <select
                      value={serviceId}
                      onChange={(event) => setServiceId(event.target.value)}
                      className={inputClass}
                    >
                      {availableServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.title[locale]} - {service.durationMinutes} min
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t.date}>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className={inputClass}
                    />
                  </Field>

                    <Field label={t.time}>
                      <select
                      value={selectedSlot}
                      onChange={(event) => setSlot(event.target.value)}
                      className={inputClass}
                      disabled={availableSlots.length === 0}
                    >
                      {availableSlots.map((availableSlot) => (
                        <option key={availableSlot} value={availableSlot}>
                          {new Intl.DateTimeFormat(locale === "es" ? "es-AR" : locale, {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone,
                          }).format(new Date(availableSlot))}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="rounded-md bg-[#f6f3ee] p-4">
                  <h2 className="text-base font-semibold">{selectedService.title[locale]}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#5b554e]">
                    {selectedService.description[locale]}
                  </p>
                  <p className="mt-3 text-sm font-medium text-[#7f4e3b]">
                    {t.pendingCopy}
                  </p>
                </div>

                {availableSlots.length === 0 ? (
                  <p className="rounded-md border border-[#ead0c3] bg-[#fff7f2] p-3 text-sm text-[#8a4329]">
                    {t.noSlots}
                  </p>
                ) : null}

                <div>
                  <h2 className="text-lg font-semibold">{t.patient}</h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label={t.fullName} error={formErrors.patientName}>
                      <input
                        required
                        minLength={3}
                        maxLength={80}
                        pattern="^[A-Za-zÀ-ÿА-Яа-яЁё]+(?:[ '-][A-Za-zÀ-ÿА-Яа-яЁё]+){1,5}$"
                        title="Ingresá nombre y apellido usando solo letras, espacios, apostrofes o guiones."
                        value={form.patientName}
                        aria-invalid={Boolean(formErrors.patientName)}
                        onChange={(event) =>
                          updateFormField("patientName", sanitizePersonName(event.target.value))
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label={t.email} error={formErrors.patientEmail}>
                      <input
                        required
                        type="text"
                        inputMode="email"
                        pattern="^[^@\s]+@[^@\s]+\.[^@\s]+$"
                        maxLength={120}
                        title="Ingresá un email válido, por ejemplo nombre@email.com."
                        value={form.patientEmail}
                        aria-invalid={Boolean(formErrors.patientEmail)}
                        onChange={(event) =>
                          updateFormField("patientEmail", event.target.value.trim())
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label={t.phone} error={formErrors.patientPhone}>
                      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                        <label className="sr-only" htmlFor="phone-country">
                          {t.phoneCountry}
                        </label>
                        <select
                          id="phone-country"
                          value={form.phoneCountryCode}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              phoneCountryCode: event.target.value,
                              patientPhone: "",
                            }))
                          }
                          className={inputClass}
                        >
                          {phoneCountries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.code} {country.label}
                            </option>
                          ))}
                        </select>
                        <label className="sr-only" htmlFor="phone-number">
                          {t.phoneNumber}
                        </label>
                        <input
                          id="phone-number"
                          value={form.patientPhone}
                          inputMode="numeric"
                          pattern={`\\d{${selectedPhoneCountry.minLength},${selectedPhoneCountry.maxLength}}`}
                          minLength={selectedPhoneCountry.minLength}
                          maxLength={selectedPhoneCountry.maxLength}
                          title={`Ingresá solo números, entre ${selectedPhoneCountry.minLength} y ${selectedPhoneCountry.maxLength} dígitos.`}
                          aria-invalid={Boolean(formErrors.patientPhone)}
                          onChange={(event) =>
                            updateFormField(
                              "patientPhone",
                              onlyDigits(event.target.value).slice(
                                0,
                                selectedPhoneCountry.maxLength,
                              ),
                            )
                          }
                          className={inputClass}
                        />
                      </div>
                    </Field>
                    <Field label={t.notes} error={formErrors.notes}>
                      <textarea
                        minLength={3}
                        maxLength={600}
                        value={form.notes}
                        aria-invalid={Boolean(formErrors.notes)}
                        onChange={(event) =>
                          updateFormField("notes", event.target.value.slice(0, 600))
                        }
                        className={`${inputClass} min-h-24 resize-none`}
                      />
                    </Field>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedSlot}
                  aria-busy={isSaving}
                  className="h-12 rounded-md bg-[#36594a] px-5 text-sm font-semibold text-white transition hover:bg-[#294438] disabled:cursor-not-allowed disabled:bg-[#9aa79f]"
                >
                  {isSaving ? t.loading : t.request}
                </button>

                {notice ? (
                  <p className="rounded-md border border-[#c9d8bd] bg-[#f1f8ed] p-3 text-sm font-medium text-[#36594a]">
                    {notice}
                  </p>
                ) : null}
              </form>
            ) : (
              <AdminPanel
                appointments={appointments}
                services={availableServices}
                adminUser={adminUser}
                isLoading={isLoadingAdmin || isUpdatingStatus}
                locale={locale}
                t={t}
                onLogin={handleAdminLogin}
                onLogout={handleAdminLogout}
                onRefresh={loadAdminData}
                onStatusChange={updateStatus}
              />
            )}
          </section>

          <aside className="rounded-lg border border-[#d9d0c3] bg-white p-5">
            <h2 className="text-lg font-semibold">{t.adminTitle}</h2>
            <div className="mt-4 space-y-3">
              {appointments.slice(0, 5).map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  services={availableServices}
                  locale={locale}
                  t={t}
                  compact
                  onStatusChange={updateStatus}
                />
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );

  function updateFormField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    const errorField = field === "phoneCountryCode" ? "patientPhone" : field;
    setFormErrors((current) => ({
      ...current,
      [errorField]: undefined,
    }));
  }
}

function AdminPanel({
  appointments,
  services,
  adminUser,
  isLoading,
  locale,
  t,
  onLogin,
  onLogout,
  onRefresh,
  onStatusChange,
}: {
  appointments: Appointment[];
  services: typeof fallbackServices;
  adminUser: User | null;
  isLoading: boolean;
  locale: Locale;
  t: Record<string, string>;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const [filter, setFilter] = useState<AdminFilter>("all");
  const stats = getAdminStats(appointments);
  const visibleAppointments = appointments.filter((appointment) => {
    if (filter === "future_confirmed") {
      return appointment.status === "confirmed" && new Date(appointment.startsAt) >= new Date();
    }

    if (filter === "all") {
      return true;
    }

    return appointment.status === filter;
  });

  if (!adminUser && isSupabaseConfigured()) {
    return <AdminLogin isLoading={isLoading} t={t} onLogin={onLogin} />;
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-lg border border-[#d9d0c3] bg-white p-5">
        <AdminHeader
          adminUser={adminUser}
          isLoading={isLoading}
          t={t}
          onLogout={onLogout}
          onRefresh={onRefresh}
        />
        <p className="mt-4 text-sm text-[#5b554e]">{t.emptyAdmin}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <AdminHeader
        adminUser={adminUser}
        isLoading={isLoading}
        t={t}
        onLogout={onLogout}
        onRefresh={onRefresh}
      />
      <AdminStats stats={stats} t={t} />
      <div className="flex flex-wrap gap-2">
        {([
          ["all", t.allAppointments, stats.total],
          ["pending_approval", t.pendingAppointments, stats.pending],
          ["confirmed", t.confirmedAppointments, stats.confirmed],
          ["future_confirmed", t.futureAppointments, stats.futureConfirmed],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={filterButtonClass(filter === value)}
          >
            {label} · {count}
          </button>
        ))}
      </div>
      {visibleAppointments.length === 0 ? (
        <p className="rounded-lg border border-[#d9d0c3] bg-white p-4 text-sm text-[#5b554e]">
          {t.noFilteredAppointments}
        </p>
      ) : null}
      {visibleAppointments.map((appointment) => (
        <AppointmentRow
          key={appointment.id}
          appointment={appointment}
          services={services}
          locale={locale}
          t={t}
          isUpdating={isLoading}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}

function AdminStats({
  stats,
  t,
}: {
  stats: ReturnType<typeof getAdminStats>;
  t: Record<string, string>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <AdminStat label={t.totalAppointments} value={stats.total} />
      <AdminStat label={t.pendingAppointments} value={stats.pending} />
      <AdminStat label={t.confirmedAppointments} value={stats.confirmed} />
      <AdminStat label={t.futureAppointments} value={stats.futureConfirmed} />
    </div>
  );
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#d9d0c3] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f7b60]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[#24211d]">{value}</p>
    </div>
  );
}

function AdminLogin({
  isLoading,
  t,
  onLogin,
}: {
  isLoading: boolean;
  t: Record<string, string>;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [credentials, setCredentials] = useState({ email: "", password: "" });

  function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onLogin(credentials.email, credentials.password);
  }

  return (
    <form
      onSubmit={submitLogin}
      className="grid gap-4 rounded-lg border border-[#d9d0c3] bg-white p-5"
    >
      <div>
        <h2 className="text-lg font-semibold">{t.adminLoginTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-[#5b554e]">
          {t.adminLoginHint}
        </p>
      </div>

      <Field label={t.email}>
        <input
          required
          type="email"
          value={credentials.email}
          onChange={(event) =>
            setCredentials((current) => ({
              ...current,
              email: event.target.value,
            }))
          }
          className={inputClass}
        />
      </Field>

      <Field label={t.password}>
        <input
          required
          type="password"
          value={credentials.password}
          onChange={(event) =>
            setCredentials((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          className={inputClass}
        />
      </Field>

      <button
        type="submit"
        disabled={isLoading}
        className="h-11 rounded-md bg-[#36594a] px-4 text-sm font-semibold text-white hover:bg-[#294438] disabled:cursor-not-allowed disabled:bg-[#9aa79f]"
      >
        {isLoading ? t.loading : t.login}
      </button>
    </form>
  );
}

function AdminHeader({
  adminUser,
  isLoading,
  t,
  onLogout,
  onRefresh,
}: {
  adminUser: User | null;
  isLoading: boolean;
  t: Record<string, string>;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#d9d0c3] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{t.adminTitle}</h2>
        {adminUser ? (
          <p className="mt-1 text-sm text-[#5b554e]">
            {t.loggedInAs} {adminUser.email}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isLoading}
          className="h-10 rounded-md border border-[#bdb3a5] px-4 text-sm font-semibold text-[#413c36] hover:bg-[#f6f3ee] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t.loading : t.refresh}
        </button>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="h-10 rounded-md border border-[#b86b4e] px-4 text-sm font-semibold text-[#8a4329] hover:bg-[#fff7f2]"
        >
          {t.logout}
        </button>
      </div>
    </div>
  );
}

function AppointmentRow({
  appointment,
  services,
  locale,
  t,
  compact = false,
  isUpdating = false,
  onStatusChange,
}: {
  appointment: Appointment;
  services: typeof fallbackServices;
  locale: Locale;
  t: Record<string, string>;
  compact?: boolean;
  isUpdating?: boolean;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const service = findServiceInList(appointment.serviceId, services);

  return (
    <article className="rounded-lg border border-[#d9d0c3] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#24211d]">
            {appointment.patientName}
          </p>
          <p className="mt-1 text-sm text-[#5b554e]">
            {formatDateTime(appointment.startsAt, locale)} -{" "}
            {service.durationMinutes} min
          </p>
          {!compact ? (
            <p className="mt-2 text-sm text-[#5b554e]">
              {service.title[locale]} · {appointment.patientEmail}
            </p>
          ) : null}
        </div>
        <span className={statusClass(appointment.status)}>
          {t[appointment.status]}
        </span>
      </div>

      {!compact && appointment.notes ? (
        <p className="mt-3 rounded-md bg-[#f6f3ee] p-3 text-sm text-[#5b554e]">
          {appointment.notes}
        </p>
      ) : null}

      {appointment.status === "pending_approval" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void onStatusChange(appointment.id, "confirmed")}
            disabled={isUpdating}
            className="h-10 rounded-md bg-[#36594a] px-4 text-sm font-semibold text-white hover:bg-[#294438] disabled:cursor-not-allowed disabled:bg-[#9aa79f]"
          >
            {t.approve}
          </button>
          <button
            type="button"
            onClick={() => void onStatusChange(appointment.id, "declined")}
            disabled={isUpdating}
            className="h-10 rounded-md border border-[#b86b4e] px-4 text-sm font-semibold text-[#8a4329] hover:bg-[#fff7f2] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.decline}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#413c36]">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-[#8a4329]">{error}</span> : null}
    </label>
  );
}

const inputClass =
  "min-h-11 w-full rounded-md border border-[#bdb3a5] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#36594a] focus:ring-2 focus:ring-[#36594a]/20";

function tabClass(active: boolean) {
  return [
    "h-11 px-4 text-sm font-semibold transition",
    active
      ? "border-b-2 border-[#36594a] text-[#36594a]"
      : "text-[#6b6258] hover:text-[#24211d]",
  ].join(" ");
}

function filterButtonClass(active: boolean) {
  return [
    "h-10 rounded-md border px-3 text-sm font-semibold transition",
    active
      ? "border-[#36594a] bg-[#36594a] text-white"
      : "border-[#bdb3a5] bg-white text-[#413c36] hover:bg-[#f6f3ee]",
  ].join(" ");
}

function statusClass(status: AppointmentStatus) {
  const base = "w-fit rounded-full px-3 py-1 text-xs font-semibold";
  const colors: Record<AppointmentStatus, string> = {
    pending_approval: "bg-[#fff3d7] text-[#8a5a00]",
    confirmed: "bg-[#e8f2e2] text-[#36594a]",
    declined: "bg-[#fde8df] text-[#8a4329]",
    cancelled: "bg-[#eeeeee] text-[#5b554e]",
    completed: "bg-[#e7edf4] text-[#35536f]",
  };

  return `${base} ${colors[status]}`;
}

function getAdminStats(appointments: Appointment[]) {
  const now = new Date();

  return {
    total: appointments.length,
    pending: appointments.filter((appointment) => appointment.status === "pending_approval")
      .length,
    confirmed: appointments.filter((appointment) => appointment.status === "confirmed")
      .length,
    futureConfirmed: appointments.filter(
      (appointment) =>
        appointment.status === "confirmed" && new Date(appointment.startsAt) >= now,
    ).length,
  };
}

function sanitizePersonName(value: string) {
  return value.replace(/[^A-Za-zÀ-ÿА-Яа-яЁё '-]/g, "").replace(/\s{2,}/g, " ");
}

function normalizePersonName(value: string) {
  return sanitizePersonName(value).trim();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function validateBookingForm({
  name,
  email,
  phone,
  notes,
  selectedSlot,
  phoneCountry,
  t,
}: {
  name: string;
  email: string;
  phone: string;
  notes: string;
  selectedSlot: string;
  phoneCountry: (typeof phoneCountries)[number];
  t: Record<string, string>;
}) {
  const errors: BookingFormErrors = {};
  const namePattern = /^[A-Za-zÀ-ÿА-Яа-яЁё]+(?:[ '-][A-Za-zÀ-ÿА-Яа-яЁё]+){1,5}$/;
  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const trimmedNotes = notes.trim();

  if (!selectedSlot) {
    errors.slot = t.slotError;
  }

  if (!namePattern.test(name)) {
    errors.patientName = t.nameError;
  }

  if (!emailPattern.test(email)) {
    errors.patientEmail = t.emailError;
  }

  if (
    phone &&
    (phone.length < phoneCountry.minLength ||
      phone.length > phoneCountry.maxLength ||
      !/^\d+$/.test(phone))
  ) {
    errors.patientPhone = `${t.phoneError} (${phoneCountry.minLength}-${phoneCountry.maxLength})`;
  }

  if (trimmedNotes && (trimmedNotes.length < 3 || trimmedNotes.length > 600)) {
    errors.notes = t.notesError;
  }

  return errors;
}
