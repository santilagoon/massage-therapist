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
  AvailabilityBlock,
  createAdminBlock,
  loadAdminBlocks,
  loadAdminAppointments,
  loadBusyAppointments,
  loadRemoteServices,
  requestRemoteAppointment,
  updateRemoteAppointmentStatus,
} from "@/lib/supabase/bookings";
import {
  AdminAuthError,
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
type AdminView =
  | "panel"
  | "services"
  | "agenda"
  | "requests"
  | "blocks"
  | "team"
  | "clients"
  | "income"
  | "profile";
type DisplayCurrency = "ARS" | "USD";
type AppointmentPlace = "home" | "zapiola" | "other_studio";
type BookingFormField =
  | "appointmentStreet"
  | "appointmentNumber"
  | "appointmentApartment"
  | "appointmentNeighborhood"
  | "patientName"
  | "patientEmail"
  | "patientPhone"
  | "notes"
  | "slot";
type BookingFormErrors = Partial<Record<BookingFormField, string>>;
type SubmittedRequestDetails = {
  address: string;
  appointment: Appointment;
  placeLabel: string;
  priceLabel: string;
  serviceTitle: string;
};

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

export function BookingApp({ mode = "public" }: { mode?: "public" | "admin" }) {
  const isAdminPage = mode === "admin";
  const [locale, setLocale] = useState<Locale>("es");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("ARS");
  const [adminView, setAdminView] = useState<AdminView>("panel");
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
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [busyAppointments, setBusyAppointments] = useState<Appointment[]>([]);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminUserMenuOpen, setIsAdminUserMenuOpen] = useState(false);
  const [isLoadingRemote, setIsLoadingRemote] = useState(isSupabaseConfigured);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [remoteMode, setRemoteMode] = useState(isSupabaseConfigured);
  const [form, setForm] = useState({
    appointmentPlace: "home" as AppointmentPlace,
    appointmentStreet: "",
    appointmentNumber: "",
    appointmentApartment: "",
    appointmentNeighborhood: "",
    patientName: "",
    patientEmail: "",
    phoneCountryCode: "+54",
    patientPhone: "",
    notes: "",
  });
  const [formErrors, setFormErrors] = useState<BookingFormErrors>({});
  const [notice, setNotice] = useState("");
  const [submittedRequest, setSubmittedRequest] =
    useState<SubmittedRequestDetails | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactNotice, setContactNotice] = useState("");

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
        setNotice("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        logTechnicalError(error);
        setAvailableServices(fallbackServices);
        setServiceId(fallbackServices[0].id);
        setRemoteMode(false);
        setNotice(t.localMode);
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
  }, [t.localMode]);

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
          logTechnicalError(error);
          setNotice(t.localMode);
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

  const selectedSlot = availableSlots.includes(slot) ? slot : "";
  const dateOptions = useMemo(() => getDateOptions(12), []);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "1") {
      window.location.href = "/admin";
    }
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
      logTechnicalError(error);
      setNotice(t.localMode);
    }
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = normalizePersonName(form.patientName);
    const normalizedEmail = form.patientEmail.trim().toLowerCase();
    const normalizedPhone = form.patientPhone
      ? `${form.phoneCountryCode} ${form.patientPhone}`
      : "";
    const appointmentAddress = formatHomeAddress({
      apartment: form.appointmentApartment,
      neighborhood: form.appointmentNeighborhood,
      number: form.appointmentNumber,
      street: form.appointmentStreet,
      t,
    });
    const validationErrors = validateBookingForm({
      name: normalizedName,
      email: normalizedEmail,
      phone: form.patientPhone,
      notes: form.notes,
      selectedSlot,
      phoneCountry: selectedPhoneCountry,
      t,
      appointmentNumber: form.appointmentNumber,
      appointmentStreet: form.appointmentStreet,
      appointmentPlace: form.appointmentPlace,
    });

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      setNotice(t.formHasErrors);
      return;
    }

    if (isSaving) {
      return;
    }

    const notesWithPlace = buildAppointmentNotes({
      address: appointmentAddress,
      notes: form.notes,
      placeLabel: getAppointmentPlaceLabel(form.appointmentPlace, t),
    });

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
        notes: notesWithPlace,
      };

      const appointment =
        remoteMode && isSupabaseConfigured()
          ? await requestRemoteAppointment(appointmentInput)
          : createAppointment(appointmentInput);

      setAppointments((current) => [appointment, ...current]);
      setSubmittedRequest({
        address: appointmentAddress,
        appointment,
        placeLabel: getAppointmentPlaceLabel(form.appointmentPlace, t),
        priceLabel: formatServicePrice(selectedService, locale, t, displayCurrency),
        serviceTitle: selectedService.title[locale],
      });
      setForm({
        patientName: "",
        patientEmail: "",
        appointmentPlace: form.appointmentPlace,
        appointmentStreet: "",
        appointmentNumber: "",
        appointmentApartment: "",
        appointmentNeighborhood: "",
        phoneCountryCode: form.phoneCountryCode,
        patientPhone: "",
        notes: "",
      });
      setFormErrors({});
      setNotice("");
      setSlot("");

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
        notes: notesWithPlace,
      });

      setRemoteMode(false);
      setAppointments((current) => [appointment, ...current]);
      logTechnicalError(error);
      setNotice(t.systemError);
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
      await refreshAdminData();
      setNotice("");
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.systemError);
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleAdminLogin(email: string, password: string) {
    setIsLoadingAdmin(true);
    try {
      const user = await signInAdmin(email.trim(), password);
      setAdminUser(user);
      setNotice("");
      void refreshAdminData().catch((error) => {
        logTechnicalError(error);
        setNotice("");
      });
    } catch (error) {
      logTechnicalError(error);
      setNotice(getSignInNotice(error, t));
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleAdminLogout() {
    await signOutAdmin();
    setAdminUser(null);
    setAppointments([]);
    setAvailabilityBlocks([]);
    setNotice("");
    if (isAdminPage) {
      window.location.href = "/";
    }
  }

  async function refreshAdminData() {
    const remoteAppointments = await loadAdminAppointments();
    setAppointments(remoteAppointments);

    try {
      const remoteBlocks = await loadAdminBlocks();
      setAvailabilityBlocks(remoteBlocks);
    } catch (error) {
      setAvailabilityBlocks([]);
      logTechnicalError(error);
      setNotice("");
    }
  }

  function openAdminAccess() {
    if (isAdminPage && adminUser) {
      setIsAdminUserMenuOpen((current) => !current);
      return;
    }

    window.location.href = "/admin";
  }

  async function logoutFromUserMenu() {
    setIsAdminUserMenuOpen(false);
    await handleAdminLogout();
  }

  async function handleCreateBlock(input: {
    date: string;
    startsAt: string;
    endsAt: string;
    reason: string;
  }) {
    if (!remoteMode || !adminUser) {
      setNotice(t.adminLoginRequired);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const block = await createAdminBlock({
        startsAt: new Date(`${input.date}T${input.startsAt}:00`).toISOString(),
        endsAt: new Date(`${input.date}T${input.endsAt}:00`).toISOString(),
        reason: input.reason,
      });
      setAvailabilityBlocks((current) => [...current, block]);
      setNotice(t.blockCreated);
      void refreshBusySlots(date);
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.systemError);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  useEffect(() => {
    if (isAdminPage && adminUser && remoteMode && appointments.length === 0) {
      void loadAdminData();
    }
  }, [adminUser, appointments.length, isAdminPage, remoteMode]);

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
        logTechnicalError(error);
        setNotice(t.systemError);
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

  async function submitContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSendingContact) {
      return;
    }

    setIsSendingContact(true);
    setContactNotice("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactForm),
      });

      if (!response.ok) {
        throw new Error("Contact email could not be sent.");
      }

      setContactForm({ name: "", email: "", message: "" });
      setContactNotice(t.contactSuccess);
    } catch {
      setContactNotice(t.contactError);
    } finally {
      setIsSendingContact(false);
    }
  }

  if (isAdminPage) {
    const adminNotice =
      notice &&
      notice !== t.adminLoaded &&
      notice !== t.remoteReady &&
      notice !== t.adminLoginRequired
        ? notice
        : "";

    return (
      <main className="min-h-screen bg-white text-[#111111]">
        <section className="mx-auto flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-10 border-b border-[#e5e5e5] bg-white/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <a href="/" className="text-sm font-semibold tracking-[0.12em] text-[#111111]">
                MM
              </a>
              {adminUser ? (
                <AdminTopNav adminView={adminView} t={t} onViewChange={setAdminView} />
              ) : (
                <div className="flex-1" />
              )}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={openAdminAccess}
                    title={adminUser ? t.logout : t.loginAdmin}
                    aria-label={adminUser ? t.logout : t.loginAdmin}
                    aria-expanded={adminUser ? isAdminUserMenuOpen : undefined}
                    className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#d4d4d4] bg-white text-[#111111] transition hover:bg-[#fafafa]"
                  >
                    <UserIcon />
                    {!adminUser ? (
                      <span className="pointer-events-none absolute right-0 top-12 hidden rounded-lg bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white shadow-sm group-hover:block">
                        {t.loginAdmin}
                      </span>
                    ) : null}
                  </button>
                  {adminUser && isAdminUserMenuOpen ? (
                    <div className="absolute right-0 top-12 z-20 min-w-28 rounded-xl border border-[#e5e5e5] bg-white p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => void logoutFromUserMenu()}
                        className="h-9 w-full cursor-pointer rounded-lg px-3 text-left text-sm font-semibold text-[#8a4329] transition hover:bg-[#fff7f2]"
                      >
                        {t.logout}
                      </button>
                    </div>
                  ) : null}
                </div>
                <label className="sr-only" htmlFor="admin-language">
                  {t.language}
                </label>
                <select
                  id="admin-language"
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as Locale)}
                  className="h-10 cursor-pointer rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm font-medium"
                >
                  {locales.map((item) => (
                    <option key={item} value={item}>
                      {item.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:py-10">
            {adminNotice ? (
              <p className="mx-auto w-full max-w-sm rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3 text-sm font-medium text-[#404040]">
                {adminNotice}
              </p>
            ) : null}
            <AdminPanel
              adminView={adminView}
              appointments={appointments}
              availabilityBlocks={availabilityBlocks}
              services={availableServices}
              adminUser={adminUser}
              isLoading={isLoadingAdmin || isUpdatingStatus}
              locale={locale}
              t={t}
              onLogin={handleAdminLogin}
              onLogout={handleAdminLogout}
              onRefresh={loadAdminData}
              onCreateBlock={handleCreateBlock}
              onStatusChange={updateStatus}
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
    <main className="min-h-screen bg-white text-[#111111]">
      <section className="mx-auto flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-10 border-b border-[#e5e5e5] bg-white/95 backdrop-blur">
          <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <a href={isAdminPage ? "/" : "#home"} className="text-sm font-semibold tracking-[0.12em] text-[#111111]">
              MM
            </a>

            {!isAdminPage ? (
            <nav className="hidden items-center gap-1 rounded-full border border-[#e5e5e5] bg-[#fafafa] p-1 lg:absolute lg:left-1/2 lg:flex lg:-translate-x-1/2">
              {[
                ["#home", t.navHome],
                ["#services", t.navServices],
                ["#benefits", t.navBenefits],
                ["#about", t.navAbout],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-[#525252] transition hover:bg-white hover:text-[#111111]"
                >
                  {label}
                </a>
              ))}
            </nav>
            ) : (
              <div className="hidden rounded-full border border-[#e5e5e5] bg-[#fafafa] px-4 py-2 text-sm font-semibold text-[#404040] sm:block">
                {t.adminAgenda}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openAdminAccess}
                title={adminUser ? t.adminProfile : t.loginAdmin}
                aria-label={adminUser ? t.adminProfile : t.loginAdmin}
                className="group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#d4d4d4] bg-white text-[#111111] transition hover:bg-[#fafafa]"
              >
                <UserIcon />
                <span className="pointer-events-none absolute right-0 top-12 hidden rounded-lg bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white shadow-sm group-hover:block">
                  {adminUser ? t.adminProfile : t.loginAdmin}
                </span>
              </button>
              {!isAdminPage ? (
              <>
              <label className="sr-only" htmlFor="currency">
                {t.currency}
              </label>
              <select
                id="currency"
                value={displayCurrency}
                onChange={(event) => setDisplayCurrency(event.target.value as DisplayCurrency)}
                className="h-10 cursor-pointer rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm font-medium"
              >
                <option value="ARS">{t.arsCurrency}</option>
                <option value="USD">{t.usdCurrency}</option>
              </select>
              </>
              ) : null}
              <label className="sr-only" htmlFor="language">
                {t.language}
              </label>
              <select
                id="language"
                value={locale}
                onChange={(event) => setLocale(event.target.value as Locale)}
                className="h-10 cursor-pointer rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm font-medium"
              >
                {locales.map((item) => (
                  <option key={item} value={item}>
                    {item.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="grid w-full flex-1 gap-8 py-8 lg:py-10">
          <section
            id="home"
            className="relative isolate -mx-0 overflow-hidden bg-[#111111] px-5 py-20 text-center text-white sm:px-8 sm:py-32"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-20 bg-[url('/images/maria-session.jpg')] bg-cover bg-[position:42%_center] sm:bg-center"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,0.72),rgba(0,0,0,0.38)_48%,rgba(0,0,0,0.62))]"
            />
            <div className="mx-auto max-w-3xl">
              <p className="mx-auto w-fit rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {t.professionalRole}
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-normal text-white sm:text-6xl">
                {t.professionalName}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">
                {t.subtitle}
              </p>
              <a
                href="#booking"
                className="mx-auto mt-8 inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-[#111111] transition hover:bg-[#f5f5f5]"
              >
                {t.bookTab}
              </a>
            </div>
          </section>

          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6">
            <HowItWorksSection t={t} />
            <MassageBenefitsSection t={t} />

            <section id="booking" className="mx-auto grid w-full max-w-3xl gap-6 scroll-mt-24">

            {notice || isLoadingRemote ? (
              <p className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3 text-sm font-medium text-[#404040]">
                {isLoadingRemote ? t.loading : notice}
              </p>
            ) : null}

              <form
                onSubmit={submitRequest}
                noValidate
                className="grid gap-6 rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-sm sm:p-6"
              >
                <div className="grid gap-3">
                  <StepHeading number={1} label={t.appointmentPlace} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    {(["home", "zapiola", "other_studio"] as const).map((place) => {
                      const isSelected = form.appointmentPlace === place;

                      return (
                        <button
                          key={place}
                          type="button"
                          onClick={() => {
                            setForm((current) => ({
                              ...current,
                              appointmentPlace: place,
                              appointmentStreet: place === "home" ? current.appointmentStreet : "",
                              appointmentNumber: place === "home" ? current.appointmentNumber : "",
                              appointmentApartment: place === "home" ? current.appointmentApartment : "",
                              appointmentNeighborhood: place === "home" ? current.appointmentNeighborhood : "",
                            }));
                            setFormErrors((current) => ({
                              ...current,
                              appointmentStreet: undefined,
                              appointmentNumber: undefined,
                              appointmentApartment: undefined,
                              appointmentNeighborhood: undefined,
                            }));
                          }}
                          aria-pressed={isSelected}
                          className={choiceCardClass(isSelected)}
                        >
                          {getAppointmentPlaceLabel(place, t)}
                        </button>
                      );
                    })}
                  </div>
                  {form.appointmentPlace === "home" ? (
                    <div className="grid gap-3 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
                      <p className="text-sm font-semibold text-[#413c36]">
                        {t.patientAddress}
                      </p>
                      <Field label={t.addressStreet} error={formErrors.appointmentStreet}>
                        <input
                          required
                          value={form.appointmentStreet}
                          autoComplete="address-line1"
                          placeholder={t.addressStreetPlaceholder}
                          onChange={(event) =>
                            updateFormField("appointmentStreet", sanitizeAddressText(event.target.value))
                          }
                          className={compactInputClass}
                        />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label={t.addressNumber} error={formErrors.appointmentNumber}>
                          <input
                            required
                            value={form.appointmentNumber}
                            inputMode="numeric"
                            maxLength={8}
                            onChange={(event) =>
                              updateFormField("appointmentNumber", onlyDigits(event.target.value).slice(0, 8))
                            }
                            className={compactInputClass}
                          />
                        </Field>
                        <Field label={t.addressApartment}>
                          <input
                            value={form.appointmentApartment}
                            autoComplete="address-line2"
                            maxLength={20}
                            onChange={(event) =>
                              updateFormField("appointmentApartment", sanitizeAddressText(event.target.value).slice(0, 20))
                            }
                            className={compactInputClass}
                          />
                        </Field>
                      </div>
                      <Field label={t.addressNeighborhood}>
                        <input
                          value={form.appointmentNeighborhood}
                          autoComplete="address-level3"
                          maxLength={40}
                          onChange={(event) =>
                            updateFormField("appointmentNeighborhood", sanitizeAddressText(event.target.value).slice(0, 40))
                          }
                          className={compactInputClass}
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <div id="services">
                    <StepHeading number={2} label={t.chooseService} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {availableServices.map((service) => {
                      const isSelected = service.id === serviceId;

                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            setServiceId(service.id);
                            setSlot("");
                          }}
                          aria-pressed={isSelected}
                          className={serviceCardClass(isSelected)}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <span>
                              <span className="block text-base font-semibold text-[#111111]">
                                {service.title[locale]}
                              </span>
                              <span className="mt-2 block text-sm leading-6 text-[#6b7280]">
                                {service.description[locale]}
                              </span>
                            </span>
                            <span
                              className={[
                                "mt-1 h-3 w-3 shrink-0 rounded-full transition",
                                isSelected ? "bg-[#111111]" : "bg-transparent",
                              ].join(" ")}
                            />
                          </span>
                          <span className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                            <span className="rounded-full bg-[#f5f5f5] px-3 py-1 text-[#374151]">
                              {service.durationMinutes} min
                            </span>
                            <span className="font-semibold text-[#111111]">
                              {formatServicePrice(service, locale, t, displayCurrency)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3">
                  <StepHeading number={3} label={t.chooseDay} />
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                    {dateOptions.map((option) => {
                      const isSelected = option.value === date;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setDate(option.value);
                            setSlot("");
                          }}
                          aria-pressed={isSelected}
                          className={datePillClass(isSelected)}
                        >
                          <span className="text-xs font-semibold uppercase">
                            {formatWeekday(option.date, locale)}
                          </span>
                          <span className="text-2xl font-semibold">
                            {option.date.getDate()}
                          </span>
                          <span className="text-xs lowercase">
                            {formatMonth(option.date, locale)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <Field label={t.openCalendar}>
                    <input
                      type="date"
                      value={date}
                      min={getTodayDateValue()}
                      onChange={(event) => {
                        setDate(event.target.value);
                        setSlot("");
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid gap-3">
                  <StepHeading number={4} label={t.chooseTime} />
                  {availableSlots.length === 0 ? (
                    <p className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-sm text-[#525252]">
                      {t.noSlots}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {availableSlots.map((availableSlot) => {
                        const isSelected = availableSlot === selectedSlot;

                        return (
                          <button
                            key={availableSlot}
                            type="button"
                            onClick={() => {
                              setSlot(availableSlot);
                              setFormErrors((current) => ({ ...current, slot: undefined }));
                            }}
                            aria-pressed={isSelected}
                            className={timeButtonClass(isSelected)}
                          >
                            {formatTimeOnly(availableSlot, locale)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {formErrors.slot ? (
                    <p className="text-xs font-medium text-[#8a4329]">{formErrors.slot}</p>
                  ) : null}
                </div>

                <BookingSummary
                  date={date}
                  locale={locale}
                  displayCurrency={displayCurrency}
                  selectedService={selectedService}
                  selectedSlot={selectedSlot}
                  t={t}
                />

                <div>
                  <StepHeading number={5} label={t.patient} />
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
                      <div className="grid grid-cols-[8.5rem_1fr] gap-2">
                        <label className="sr-only" htmlFor="phone-country">
                          {t.phoneCountry}
                        </label>
                        <select
                          id="phone-country"
                          value={form.phoneCountryCode}
                          onChange={(event) => {
                            setForm((current) => ({
                              ...current,
                              phoneCountryCode: event.target.value,
                              patientPhone: "",
                            }));
                            setFormErrors((current) => ({
                              ...current,
                              patientPhone: undefined,
                            }));
                          }}
                          className={`${compactInputClass} cursor-pointer`}
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
                          required
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
                          className={compactInputClass}
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
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className="h-12 rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:bg-[#b5b5b5]"
                >
                  {isSaving ? t.loading : t.request}
                </button>

                {notice ? (
                  <p className="rounded-xl border border-[#d4d4d4] bg-[#fafafa] p-3 text-sm font-medium text-[#111111]">
                    {notice}
                  </p>
                ) : null}
              </form>
          </section>

            <AboutMariaSection
              contactForm={contactForm}
              contactNotice={contactNotice}
              isSendingContact={isSendingContact}
              setContactForm={setContactForm}
              t={t}
              onSubmit={submitContact}
            />
          </div>
        </div>
      </section>
    </main>
    {submittedRequest ? (
      <PreApprovalModal
        details={submittedRequest}
        locale={locale}
        t={t}
        onClose={() => setSubmittedRequest(null)}
      />
    ) : null}
    </>
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

function PreApprovalModal({
  details,
  locale,
  onClose,
  t,
}: {
  details: SubmittedRequestDetails;
  locale: Locale;
  onClose: () => void;
  t: Record<string, string>;
}) {
  const reservationCode = `PR-${details.appointment.id.slice(0, 6).toUpperCase()}`;

  function closeAndReturnToBooking() {
    onClose();
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pre-approval-title"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="bg-[#111111] px-5 py-7 text-center text-white sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {t.preApprovalSent}
          </p>
          <h2 id="pre-approval-title" className="mt-3 text-3xl font-semibold sm:text-4xl">
            {reservationCode}
          </h2>
          <p className="mt-2 text-sm font-medium text-white/75">{t.requestCode}</p>
        </div>

        <div className="grid gap-5 px-5 py-6 sm:px-8">
          <p className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-sm leading-6 text-[#404040]">
            {t.preApprovalExplanation}
          </p>

          <dl className="grid gap-3 rounded-2xl border border-[#e5e5e5] p-4 text-sm">
            <SummaryRow label={t.patient} value={details.appointment.patientName} />
            <SummaryRow label={t.email} value={details.appointment.patientEmail} />
            <SummaryRow label={t.phone} value={details.appointment.patientPhone} />
            <SummaryRow label={t.appointmentPlace} value={details.placeLabel} />
            {details.address ? (
              <SummaryRow label={t.patientAddress} value={details.address} />
            ) : null}
            <SummaryRow label={t.service} value={details.serviceTitle} />
            <SummaryRow
              label={t.date}
              value={formatSummaryDate(details.appointment.startsAt, locale)}
            />
            <SummaryRow
              label={t.time}
              value={formatTimeOnly(details.appointment.startsAt, locale)}
            />
            <SummaryRow
              label={t.duration}
              value={`${Math.round(
                (new Date(details.appointment.endsAt).getTime() -
                  new Date(details.appointment.startsAt).getTime()) /
                  60000,
              )} min`}
            />
            <div className="border-t border-[#e5e5e5] pt-3">
              <SummaryRow label={t.total} value={details.priceLabel} strong />
            </div>
          </dl>

          <div className="grid gap-2 rounded-2xl bg-[#f5f5f5] p-4 text-sm leading-6 text-[#404040]">
            <p>{t.emailSentTo.replace("{email}", details.appointment.patientEmail)}</p>
            <p>{t.spamReminder}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={closeAndReturnToBooking}
              className="h-12 rounded-full border border-[#111111] px-5 text-sm font-semibold text-[#111111] transition hover:bg-[#f5f5f5]"
            >
              {t.newRequest}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-full bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-[#2b2b2b]"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHeading({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111111] text-xs font-semibold text-white">
        {number}
      </span>
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#525252]">
        {label}
      </h2>
    </div>
  );
}

function BookingSummary({
  date,
  displayCurrency,
  locale,
  selectedService,
  selectedSlot,
  t,
}: {
  date: string;
  displayCurrency: DisplayCurrency;
  locale: Locale;
  selectedService: (typeof fallbackServices)[number];
  selectedSlot: string;
  t: Record<string, string>;
}) {
  return (
    <section className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#737373]">
        {t.summary}
      </h2>
      <dl className="mt-4 grid gap-3 text-sm">
        <SummaryRow label={t.service} value={selectedService.title[locale]} />
        <SummaryRow
          label={t.date}
          value={formatSummaryDate(selectedSlot || date, locale)}
        />
        <SummaryRow
          label={t.time}
          value={selectedSlot ? formatTimeOnly(selectedSlot, locale) : "-"}
        />
        <SummaryRow
          label={t.duration}
          value={`${selectedService.durationMinutes} min`}
        />
        <div className="mt-1 border-t border-[#e5e5e5] pt-3">
          <SummaryRow
            label={t.total}
            value={formatServicePrice(selectedService, locale, t, displayCurrency)}
            strong
          />
        </div>
      </dl>
      <p className="mt-4 text-sm leading-6 text-[#525252]">{t.pendingCopy}</p>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#737373]">{label}</dt>
      <dd className={strong ? "font-semibold text-[#111111]" : "text-right font-medium text-[#262626]"}>
        {value}
      </dd>
    </div>
  );
}

function AdminPanel({
  adminView,
  appointments,
  availabilityBlocks,
  services,
  adminUser,
  isLoading,
  locale,
  t,
  onLogin,
  onLogout,
  onRefresh,
  onCreateBlock,
  onStatusChange,
}: {
  adminView: AdminView;
  appointments: Appointment[];
  availabilityBlocks: AvailabilityBlock[];
  services: typeof fallbackServices;
  adminUser: User | null;
  isLoading: boolean;
  locale: Locale;
  t: Record<string, string>;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onCreateBlock: (input: {
    date: string;
    startsAt: string;
    endsAt: string;
    reason: string;
  }) => Promise<void>;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const [filter, setFilter] = useState<AdminFilter>("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDateValue());
  const stats = getAdminStats(appointments);
  const dateOptions = useMemo(() => getDateOptions(10), []);
  const visibleAppointments = appointments.filter((appointment) => {
    if (filter === "future_confirmed") {
      return appointment.status === "confirmed" && new Date(appointment.startsAt) >= new Date();
    }

    if (filter === "all") {
      return true;
    }

    return appointment.status === filter;
  });
  const selectedDayAppointments = appointments
    .filter((appointment) => isSameDateValue(appointment.startsAt, selectedDate))
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  const selectedDayBlocks = availabilityBlocks
    .filter((block) => isSameDateValue(block.startsAt, selectedDate))
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
  const requestQuery = requestSearch.trim().toLowerCase();
  const requestAppointments = visibleAppointments
    .filter((appointment) => {
      if (!requestQuery) {
        return true;
      }

      const service = findServiceInList(appointment.serviceId, services);
      return [
        appointment.patientName,
        appointment.patientEmail,
        appointment.patientPhone,
        service.title[locale],
      ]
        .join(" ")
        .toLowerCase()
        .includes(requestQuery);
    })
    .sort((first, second) => {
      if (first.status === "pending_approval" && second.status !== "pending_approval") {
        return -1;
      }

      if (first.status !== "pending_approval" && second.status === "pending_approval") {
        return 1;
      }

      return first.startsAt.localeCompare(second.startsAt);
    });

  if (!adminUser) {
    return <AdminLogin isLoading={isLoading} t={t} onLogin={onLogin} />;
  }

  return (
    <div className="grid gap-5">
      {adminView === "panel" ? (
        <AdminDashboard
          appointments={appointments}
          availabilityBlocks={availabilityBlocks}
          dateOptions={dateOptions}
          isLoading={isLoading}
          locale={locale}
          selectedDate={selectedDate}
          services={services}
          stats={stats}
          t={t}
          onDateChange={setSelectedDate}
          onRefresh={onRefresh}
          onStatusChange={onStatusChange}
        />
      ) : null}

      {adminView === "services" ? (
        <AdminServices services={services} locale={locale} t={t} />
      ) : null}

      {adminView === "agenda" ? (
        <AdminAgenda
          appointments={selectedDayAppointments}
          blocks={selectedDayBlocks}
          dateOptions={dateOptions}
          locale={locale}
          selectedDate={selectedDate}
          services={services}
          t={t}
          isLoading={isLoading}
          onDateChange={setSelectedDate}
          onStatusChange={onStatusChange}
        />
      ) : null}

      {adminView === "requests" ? (
        <AdminRequests
          appointments={requestAppointments}
          filter={filter}
          isLoading={isLoading}
          locale={locale}
          requestSearch={requestSearch}
          services={services}
          stats={stats}
          t={t}
          onFilterChange={setFilter}
          onSearchChange={setRequestSearch}
          onStatusChange={onStatusChange}
        />
      ) : null}

      {adminView === "blocks" ? (
        <AdminBlocks
          blocks={availabilityBlocks}
          dateOptions={dateOptions}
          isLoading={isLoading}
          locale={locale}
          selectedDate={selectedDate}
          t={t}
          onCreateBlock={onCreateBlock}
          onDateChange={setSelectedDate}
        />
      ) : null}

      {adminView === "team" ? <AdminPlaceholder title={t.adminTeam} copy={t.teamPending} /> : null}

      {adminView === "clients" ? (
        <AdminClients appointments={appointments} locale={locale} t={t} />
      ) : null}

      {adminView === "income" ? <AdminIncome appointments={appointments} services={services} t={t} /> : null}

      {adminView === "profile" ? (
        <AdminProfile
          adminUser={adminUser}
          isLoading={isLoading}
          t={t}
          onLogout={onLogout}
          onRefresh={onRefresh}
        />
      ) : null}
    </div>
  );
}

function AdminTopNav({
  adminView,
  t,
  onViewChange,
}: {
  adminView: AdminView;
  t: Record<string, string>;
  onViewChange: (view: AdminView) => void;
}) {
  const items: Array<[AdminView, string]> = [
    ["panel", t.adminPanel],
    ["agenda", t.adminAgenda],
    ["requests", t.adminRequests],
    ["blocks", t.adminBlocks],
    ["services", t.adminServices],
    ["team", t.adminTeam],
    ["clients", t.adminClients],
    ["income", t.adminIncome],
    ["profile", t.adminProfile],
  ];

  return (
    <div className="min-w-0 flex-1">
      <label className="sr-only" htmlFor="admin-section">
        {t.adminPanel}
      </label>
      <select
        id="admin-section"
        value={adminView}
        onChange={(event) => onViewChange(event.target.value as AdminView)}
        className="h-10 w-full cursor-pointer rounded-xl border border-[#d4d4d4] bg-white px-3 text-sm font-semibold text-[#111111] outline-none transition focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/15 md:hidden"
      >
        {items.map(([view, label]) => (
          <option key={view} value={view}>
            {label}
          </option>
        ))}
      </select>

      <nav className="hidden min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-[#e5e5e5] bg-[#fafafa] p-1 md:flex lg:justify-center">
        {items.map(([view, label]) => (
          <button
            key={view}
            type="button"
            onClick={() => onViewChange(view)}
            className={[
              "h-9 shrink-0 cursor-pointer rounded-full px-2.5 text-xs font-semibold transition xl:px-3 xl:text-sm",
              adminView === view
                ? "bg-[#111111] text-white"
                : "text-[#737373] hover:bg-white hover:text-[#111111]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function AdminDashboard({
  appointments,
  availabilityBlocks,
  dateOptions,
  isLoading,
  locale,
  selectedDate,
  services,
  stats,
  t,
  onDateChange,
  onRefresh,
  onStatusChange,
}: {
  appointments: Appointment[];
  availabilityBlocks: AvailabilityBlock[];
  dateOptions: ReturnType<typeof getDateOptions>;
  isLoading: boolean;
  locale: Locale;
  selectedDate: string;
  services: typeof fallbackServices;
  stats: ReturnType<typeof getAdminStats>;
  t: Record<string, string>;
  onDateChange: (date: string) => void;
  onRefresh: () => Promise<void>;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const today = getTodayDateValue();
  const todayAppointments = appointments.filter((appointment) =>
    isSameDateValue(appointment.startsAt, today),
  );
  const todayConfirmed = todayAppointments.filter(
    (appointment) => appointment.status === "confirmed",
  );
  const todayPending = todayAppointments.filter(
    (appointment) => appointment.status === "pending_approval",
  );
  const todayPatients = new Set(
    todayAppointments.map((appointment) => appointment.patientEmail || appointment.patientName),
  ).size;
  const todayBlocks = availabilityBlocks.filter((block) => isSameDateValue(block.startsAt, today));
  const selectedDateAppointments = appointments.filter((appointment) =>
    isSameDateValue(appointment.startsAt, selectedDate),
  );
  const selectedDateBlocks = availabilityBlocks.filter((block) =>
    isSameDateValue(block.startsAt, selectedDate),
  );
  const availableToday = services[0]
    ? getAvailableSlots(today, services[0], [
        ...todayAppointments,
        ...todayBlocks.map((block) => ({
          id: block.id,
          serviceId: services[0].id,
          startsAt: block.startsAt,
          endsAt: block.endsAt,
          patientName: t.blockedTime,
          patientEmail: "",
          patientPhone: "",
          language: locale,
          notes: block.reason ?? "",
          status: "confirmed" as AppointmentStatus,
          createdAt: block.createdAt,
        })),
      ]).length
    : 0;

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#111111]">{t.adminGreeting}</h1>
          <p className="mt-2 text-sm text-[#737373]">
            {formatSummaryDate(`${today}T00:00:00`, locale)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isLoading}
          className="h-10 w-fit cursor-pointer rounded-xl border border-[#d4d4d4] px-4 text-sm font-semibold text-[#404040] transition hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t.loading : t.refresh}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStat label={t.todayPatients} value={todayPatients} />
        <AdminStat label={t.todayConfirmed} value={todayConfirmed.length} />
        <AdminStat label={t.todayPending} value={todayPending.length} />
        <AdminStat label={t.todayAvailable} value={availableToday} />
      </div>

      <AdminStats stats={stats} t={t} />

      <AdminAgenda
        appointments={selectedDateAppointments}
        blocks={selectedDateBlocks}
        dateOptions={dateOptions}
        isLoading={isLoading}
        locale={locale}
        selectedDate={selectedDate}
        services={services}
        t={t}
        onDateChange={onDateChange}
        onStatusChange={onStatusChange}
      />
    </section>
  );
}

function AdminRequests({
  appointments,
  filter,
  isLoading,
  locale,
  requestSearch,
  services,
  stats,
  t,
  onFilterChange,
  onSearchChange,
  onStatusChange,
}: {
  appointments: Appointment[];
  filter: AdminFilter;
  isLoading: boolean;
  locale: Locale;
  requestSearch: string;
  services: typeof fallbackServices;
  stats: ReturnType<typeof getAdminStats>;
  t: Record<string, string>;
  onFilterChange: (filter: AdminFilter) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-[#111111]">{t.adminRequests}</h1>
        <p className="mt-2 text-sm text-[#737373]">{t.requestsIntro}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={requestSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t.requestSearchPlaceholder}
          className="h-9 w-full max-w-[16rem] rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm outline-none transition placeholder:text-[#8a8a8a] focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/15"
        />
      </div>

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
            onClick={() => onFilterChange(value)}
            className={filterButtonClass(filter === value)}
          >
            {label} · {count}
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <p className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5 text-sm text-[#737373]">
          {t.noFilteredAppointments}
        </p>
      ) : null}

      <div className="grid gap-3">
        {appointments.map((appointment) => (
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
    </section>
  );
}

function AdminServices({
  services,
  locale,
  t,
}: {
  services: typeof fallbackServices;
  locale: Locale;
  t: Record<string, string>;
}) {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-[#111111]">{t.adminServices}</h1>
        <p className="mt-2 text-sm text-[#737373]">{t.servicesPending}</p>
      </div>
      {services.map((service) => (
        <article
          key={service.id}
          className="flex items-center justify-between gap-4 rounded-2xl border border-[#e5e5e5] bg-white p-4"
        >
          <div>
            <h2 className="font-semibold text-[#111111]">{service.title[locale]}</h2>
            <p className="mt-1 text-sm text-[#737373]">{service.durationMinutes} min</p>
          </div>
          <p className="text-sm font-semibold text-[#111111]">
            {service.priceUsdCents ? `$${service.priceUsdCents / 100} USD` : t.priceToConfirm}
          </p>
        </article>
      ))}
    </section>
  );
}

function AdminClients({
  appointments,
  locale,
  t,
}: {
  appointments: Appointment[];
  locale: Locale;
  t: Record<string, string>;
}) {
  const clients = getAdminClients(appointments);

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-[#111111]">{t.adminClients}</h1>
        <p className="mt-2 text-sm text-[#737373]">
          {clients.length} {t.clientsRegistered}
        </p>
      </div>

      {clients.length === 0 ? (
        <p className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 text-center text-sm text-[#737373]">
          {t.noClientsYet}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {clients.map((client) => (
            <article key={client.key} className="rounded-2xl border border-[#e5e5e5] bg-white p-4">
              <h2 className="font-semibold text-[#111111]">{client.name}</h2>
              <p className="mt-1 text-sm text-[#737373]">{client.email}</p>
              {client.phone ? <p className="mt-1 text-sm text-[#737373]">{client.phone}</p> : null}
              <p className="mt-3 text-sm font-semibold text-[#404040]">
                {client.count} {t.appointmentsLabel} · {formatDateTime(client.lastVisit, locale)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminIncome({
  appointments,
  services,
  t,
}: {
  appointments: Appointment[];
  services: typeof fallbackServices;
  t: Record<string, string>;
}) {
  const completed = appointments.filter((appointment) => appointment.status === "completed");
  const totalUsd = completed.reduce((sum, appointment) => {
    const service = findServiceInList(appointment.serviceId, services);
    return sum + (service.priceUsdCents ? service.priceUsdCents / 100 : 0);
  }, 0);

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-[#111111]">{t.adminIncome}</h1>
        <p className="mt-2 text-sm text-[#737373]">{t.incomePending}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <AdminStat label={t.dailyIncome} value={0} />
        <AdminStat label={t.monthlyIncome} value={totalUsd} />
        <AdminStat label={t.completedAppointments} value={completed.length} />
      </div>
      <p className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 text-center text-sm text-[#737373]">
        {t.incomeManualPending}
      </p>
    </section>
  );
}

function AdminProfile({
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
    <section className="mx-auto grid w-full max-w-xl gap-4 rounded-2xl border border-[#e5e5e5] bg-white p-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#111111]">{t.adminProfile}</h1>
        {adminUser ? (
          <p className="mt-2 text-sm text-[#737373]">
            {t.loggedInAs} {adminUser.email}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isLoading}
          className="h-10 cursor-pointer rounded-xl border border-[#d4d4d4] px-4 text-sm font-semibold text-[#404040] transition hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t.loading : t.refresh}
        </button>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="h-10 cursor-pointer rounded-xl border border-[#b86b4e] px-4 text-sm font-semibold text-[#8a4329] transition hover:bg-[#fff7f2]"
        >
          {t.logout}
        </button>
      </div>
    </section>
  );
}

function AdminPlaceholder({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-2 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 text-center">
      <h1 className="text-3xl font-semibold text-[#111111]">{title}</h1>
      <p className="text-sm leading-6 text-[#737373]">{copy}</p>
    </section>
  );
}

function AdminAgenda({
  appointments,
  blocks,
  dateOptions,
  isLoading,
  locale,
  selectedDate,
  services,
  t,
  onDateChange,
  onStatusChange,
}: {
  appointments: Appointment[];
  blocks: AvailabilityBlock[];
  dateOptions: ReturnType<typeof getDateOptions>;
  isLoading: boolean;
  locale: Locale;
  selectedDate: string;
  services: typeof fallbackServices;
  t: Record<string, string>;
  onDateChange: (date: string) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  return (
    <section className="grid gap-4 rounded-2xl border border-[#e5e5e5] bg-white p-4 sm:p-6">
      <div className="grid gap-4 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div aria-hidden="true" className="hidden sm:block" />
        <div>
          <h2 className="text-2xl font-semibold text-[#111111]">{t.adminAgenda}</h2>
          <p className="mt-1 text-sm text-[#737373]">
            {formatSummaryDate(`${selectedDate}T00:00:00`, locale)}
          </p>
        </div>
        <Field label={t.openCalendar}>
          <input
            type="date"
            value={selectedDate}
            min={getTodayDateValue()}
            onChange={(event) => onDateChange(event.target.value)}
            className={`${inputClass} cursor-pointer`}
          />
        </Field>
      </div>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {dateOptions.map((option) => {
          const isSelected = option.value === selectedDate;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onDateChange(option.value)}
              aria-pressed={isSelected}
              className={datePillClass(isSelected)}
            >
              <span className="text-xs font-semibold uppercase">
                {formatWeekday(option.date, locale)}
              </span>
              <span className="text-2xl font-semibold">{option.date.getDate()}</span>
              <span className="text-xs lowercase">{formatMonth(option.date, locale)}</span>
            </button>
          );
        })}
      </div>

      {blocks.length > 0 ? (
        <div className="grid gap-2">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="rounded-xl border border-[#f0c9b8] bg-[#fff7f2] p-3 text-sm text-[#8a4329]"
            >
              <strong>{t.blockedTime}</strong> {formatTimeOnly(block.startsAt, locale)} -{" "}
              {formatTimeOnly(block.endsAt, locale)}
              {block.reason ? ` · ${block.reason}` : ""}
            </div>
          ))}
        </div>
      ) : null}

      {appointments.length === 0 && blocks.length === 0 ? (
        <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-10 text-center">
          <p className="text-lg font-semibold text-[#404040]">{t.noAppointmentsThisDay}</p>
          <p className="mt-2 text-sm text-[#737373]">{t.shareBookingLink}</p>
        </div>
      ) : null}

      <div className="grid gap-3">
        {appointments.map((appointment) => (
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
    </section>
  );
}

function AdminBlocks({
  blocks,
  dateOptions,
  isLoading,
  locale,
  selectedDate,
  t,
  onCreateBlock,
  onDateChange,
}: {
  blocks: AvailabilityBlock[];
  dateOptions: ReturnType<typeof getDateOptions>;
  isLoading: boolean;
  locale: Locale;
  selectedDate: string;
  t: Record<string, string>;
  onCreateBlock: (input: {
    date: string;
    startsAt: string;
    endsAt: string;
    reason: string;
  }) => Promise<void>;
  onDateChange: (date: string) => void;
}) {
  const [blockForm, setBlockForm] = useState({
    startsAt: "09:00",
    endsAt: "19:00",
    reason: "",
  });

  function submitBlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onCreateBlock({
      date: selectedDate,
      startsAt: blockForm.startsAt,
      endsAt: blockForm.endsAt,
      reason: blockForm.reason.trim(),
    });
    setBlockForm((current) => ({ ...current, reason: "" }));
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-5 rounded-2xl border border-[#e5e5e5] bg-white p-4 sm:p-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#111111]">{t.blockDaysTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-[#737373]">{t.blockDaysCopy}</p>
      </div>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {dateOptions.map((option) => {
          const isSelected = option.value === selectedDate;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onDateChange(option.value)}
              aria-pressed={isSelected}
              className={datePillClass(isSelected)}
            >
              <span className="text-xs font-semibold uppercase">
                {formatWeekday(option.date, locale)}
              </span>
              <span className="text-2xl font-semibold">{option.date.getDate()}</span>
              <span className="text-xs lowercase">{formatMonth(option.date, locale)}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={submitBlock} className="grid gap-4 rounded-2xl bg-[#fafafa] p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.blockStart}>
            <input
              required
              type="time"
              value={blockForm.startsAt}
              onChange={(event) =>
                setBlockForm((current) => ({ ...current, startsAt: event.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label={t.blockEnd}>
            <input
              required
              type="time"
              value={blockForm.endsAt}
              onChange={(event) =>
                setBlockForm((current) => ({ ...current, endsAt: event.target.value }))
              }
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={t.blockReason}>
          <input
            value={blockForm.reason}
            onChange={(event) =>
              setBlockForm((current) => ({ ...current, reason: event.target.value }))
            }
            className={inputClass}
          />
        </Field>

        <button
          type="submit"
          disabled={isLoading}
          className="h-12 cursor-pointer rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:bg-[#b5b5b5]"
        >
          {isLoading ? t.loading : t.blockDay}
        </button>
      </form>

      {blocks.length > 0 ? (
        <div className="grid gap-2">
          {blocks.slice(0, 8).map((block) => (
            <div key={block.id} className="rounded-xl border border-[#e5e5e5] p-3 text-sm">
              {formatDateTime(block.startsAt, locale)} - {formatTimeOnly(block.endsAt, locale)}
              {block.reason ? ` · ${block.reason}` : ""}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function HowItWorksSection({ t }: { t: Record<string, string> }) {
  return (
    <section className="mx-auto w-full max-w-3xl border-t border-[#e5e5e5] pt-8">
      <div className="text-center">
        <h2 className="mt-3 text-2xl font-semibold text-[#111111]">
          {t.howItWorksTitle}
        </h2>
      </div>
      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {[t.stepChoose, t.stepPending, t.stepEmail].map((step, index) => (
          <li
            key={step}
            className="rounded-2xl border border-[#e5e5e5] bg-white p-4 text-center text-sm leading-6 text-[#525252]"
          >
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white">
              {index + 1}
            </span>
            <span className="mt-3 block">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function MassageBenefitsSection({ t }: { t: Record<string, string> }) {
  const benefits = [
    {
      title: t.benefitReleaseTitle,
      copy: t.benefitReleaseCopy,
    },
    {
      title: t.benefitSportTitle,
      copy: t.benefitSportCopy,
    },
    {
      title: t.benefitRecoveryTitle,
      copy: t.benefitRecoveryCopy,
    },
  ];

  return (
    <section id="benefits" className="mx-auto grid w-full max-w-5xl gap-6 scroll-mt-24 border-t border-[#e5e5e5] pt-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#737373]">
          {t.navBenefits}
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[#111111]">
          {t.benefitsTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#525252]">
          {t.benefitsIntro}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {benefits.map((benefit) => (
          <article
            key={benefit.title}
            className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5"
          >
            <h3 className="text-lg font-semibold text-[#111111]">{benefit.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#525252]">{benefit.copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AboutMariaSection({
  contactForm,
  contactNotice,
  isSendingContact,
  setContactForm,
  t,
  onSubmit,
}: {
  contactForm: { name: string; email: string; message: string };
  contactNotice: string;
  isSendingContact: boolean;
  setContactForm: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; message: string }>
  >;
  t: Record<string, string>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <section id="about" className="mx-auto grid w-full max-w-3xl gap-6 scroll-mt-24 border-t border-[#e5e5e5] pt-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#737373]">
          {t.navAbout}
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[#111111]">
          {t.professionalName}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#525252]">
          {t.aboutMariaCopy}
        </p>
      </div>

      <form
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-4 rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-sm sm:p-6"
      >
        <div>
          <h3 className="text-lg font-semibold text-[#111111]">{t.contactTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-[#525252]">{t.contactCopy}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.contactName}>
            <input
              required
              value={contactForm.name}
              onChange={(event) =>
                setContactForm((current) => ({ ...current, name: event.target.value }))
              }
              className={inputClass}
            />
          </Field>
          <Field label={t.email}>
            <input
              required
              type="email"
              value={contactForm.email}
              onChange={(event) =>
                setContactForm((current) => ({ ...current, email: event.target.value }))
              }
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={t.contactMessage}>
          <textarea
            required
            minLength={3}
            maxLength={1200}
            value={contactForm.message}
            onChange={(event) =>
              setContactForm((current) => ({
                ...current,
                message: event.target.value.slice(0, 1200),
              }))
            }
            className={`${inputClass} min-h-32 resize-none`}
          />
        </Field>

        <button
          type="submit"
          disabled={isSendingContact}
          className="h-12 rounded-xl bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:bg-[#b5b5b5]"
        >
          {isSendingContact ? t.loading : t.contactSend}
        </button>

        {contactNotice ? (
          <p className="rounded-xl border border-[#d4d4d4] bg-[#fafafa] p-3 text-sm font-medium text-[#111111]">
            {contactNotice}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 20a7.5 7.5 0 0 1 15 0"
      />
    </svg>
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
    <form onSubmit={submitLogin} className="mx-auto mt-8 grid w-full max-w-[23rem] gap-5 rounded-xl border border-[#262626] bg-[#111111] p-5 text-white shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
      <div className="grid grid-cols-2 rounded-lg bg-white/10 p-1">
        <span className="flex h-9 items-center justify-center rounded-md bg-white text-sm font-semibold text-[#111111]">
          {t.login}
        </span>
        <span className="flex h-9 items-center justify-center rounded-md text-sm font-semibold text-white/45">
          {t.register}
        </span>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-semibold text-white">{t.login}</h1>
      </div>
      <label className="grid gap-1 text-xs font-semibold text-white/70">
        <span>{t.email}</span>
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
          className={adminLoginInputClass}
        />
      </label>

      <label className="grid gap-1 text-xs font-semibold text-white/70">
        <span>{t.password}</span>
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
          className={adminLoginInputClass}
        />
      </label>

      <button
        type="submit"
        disabled={isLoading}
        className="h-11 cursor-pointer rounded-lg bg-white px-4 text-sm font-semibold text-[#111111] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/60"
      >
        {isLoading ? t.loading : t.login}
      </button>
    </form>
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

function logTechnicalError(error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }
}

function getSignInNotice(error: unknown, t: Record<string, string>) {
  if (error instanceof AdminAuthError) {
    const messages: Record<AdminAuthError["code"], string> = {
      account_not_confirmed: t.accountNotConfirmed,
      access_unavailable: t.accessUnavailable,
      invalid_credentials: t.signInError,
    };

    return messages[error.code];
  }

  return t.signInError;
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
  "min-h-12 w-full rounded-xl border border-[#d4d4d4] bg-white px-3 py-2 text-base outline-none transition focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/15 sm:text-sm";

const compactInputClass =
  "h-11 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 text-sm outline-none transition focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/15";

const adminLoginInputClass =
  "h-10 w-full border-0 border-b border-white/35 bg-transparent px-1 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white";

function filterButtonClass(active: boolean) {
  return [
    "h-10 cursor-pointer rounded-md border px-3 text-sm font-semibold transition",
    active
      ? "border-[#36594a] bg-[#36594a] text-white"
      : "border-[#bdb3a5] bg-white text-[#413c36] hover:bg-[#f6f3ee]",
  ].join(" ");
}

function serviceCardClass(active: boolean) {
  return [
    "cursor-pointer rounded-2xl border p-4 text-left transition",
    "focus:outline-none focus:ring-2 focus:ring-[#111111]/20",
    active
      ? "border-[#111111] bg-white shadow-[0_10px_28px_rgba(17,17,17,0.16)] ring-1 ring-[#111111]/20"
      : "border-[#e5e5e5] bg-[#fafafa] shadow-none hover:border-[#a3a3a3]",
  ].join(" ");
}

function datePillClass(active: boolean) {
  return [
    "flex h-24 min-w-[4.75rem] cursor-pointer flex-col items-center justify-center rounded-2xl border px-4 py-3 transition",
    "focus:outline-none focus:ring-2 focus:ring-[#111111]/20",
    active
      ? "border-[#111111] bg-[#111111] text-white"
      : "border-[#e5e5e5] bg-[#fafafa] text-[#404040] hover:border-[#a3a3a3]",
  ].join(" ");
}

function timeButtonClass(active: boolean) {
  return [
    "h-12 cursor-pointer rounded-xl border text-sm font-semibold transition",
    "focus:outline-none focus:ring-2 focus:ring-[#111111]/20",
    active
      ? "border-[#111111] bg-[#111111] text-white"
      : "border-[#e5e5e5] bg-[#fafafa] text-[#404040] hover:border-[#a3a3a3]",
  ].join(" ");
}

function choiceCardClass(active: boolean) {
  return [
    "min-h-14 cursor-pointer rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition",
    "focus:outline-none focus:ring-2 focus:ring-[#111111]/20",
    active
      ? "border-[#111111] bg-[#111111] text-white"
      : "border-[#e5e5e5] bg-[#fafafa] text-[#404040] hover:border-[#a3a3a3]",
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

function getAdminClients(appointments: Appointment[]) {
  const clients = new Map<
    string,
    {
      key: string;
      name: string;
      email: string;
      phone: string;
      count: number;
      lastVisit: string;
    }
  >();

  appointments.forEach((appointment) => {
    const key = appointment.patientEmail || appointment.patientName;
    const current = clients.get(key);

    if (!current) {
      clients.set(key, {
        key,
        name: appointment.patientName,
        email: appointment.patientEmail,
        phone: appointment.patientPhone,
        count: 1,
        lastVisit: appointment.startsAt,
      });
      return;
    }

    current.count += 1;
    if (new Date(appointment.startsAt) > new Date(current.lastVisit)) {
      current.lastVisit = appointment.startsAt;
    }
    if (!current.phone && appointment.patientPhone) {
      current.phone = appointment.patientPhone;
    }
  });

  return Array.from(clients.values()).sort((first, second) =>
    second.lastVisit.localeCompare(first.lastVisit),
  );
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

function sanitizeAddressText(value: string) {
  return value
    .replace(/[^A-Za-zÀ-ÿА-Яа-яЁё0-9 .,'-]/g, "")
    .replace(/\s{2,}/g, " ");
}

function getDateOptions(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    date.setHours(0, 0, 0, 0);

    return {
      date,
      value: date.toISOString().slice(0, 10),
    };
  });
}

function getTodayDateValue() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function formatWeekday(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : locale, {
    weekday: "short",
    timeZone,
  }).format(date);
}

function formatMonth(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : locale, {
    month: "short",
    timeZone,
  }).format(date);
}

function formatSummaryDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : locale, {
    day: "numeric",
    month: "short",
    weekday: "short",
    timeZone,
  }).format(new Date(value.includes("T") ? value : `${value}T00:00:00`));
}

function isSameDateValue(value: string, dateValue: string) {
  return value.slice(0, 10) === dateValue;
}

function formatTimeOnly(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function formatServicePrice(
  service: (typeof fallbackServices)[number],
  locale: Locale,
  t: Record<string, string>,
  displayCurrency: DisplayCurrency,
) {
  const priceCents =
    displayCurrency === "USD" ? service.priceUsdCents : service.priceCents;
  const currency = displayCurrency === "USD" ? "USD" : service.priceLabel;

  if (!priceCents) {
    return t.priceToConfirm;
  }

  const formatter = new Intl.NumberFormat(locale === "es" ? "es-AR" : locale, {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  });

  return formatter.format(priceCents / 100);
}

function getAppointmentPlaceLabel(place: AppointmentPlace, t: Record<string, string>) {
  const labels: Record<AppointmentPlace, string> = {
    home: t.placeHome,
    zapiola: t.placeZapiola,
    other_studio: t.placeOtherStudio,
  };

  return labels[place];
}

function buildAppointmentNotes({
  address,
  notes,
  placeLabel,
}: {
  address: string;
  notes: string;
  placeLabel: string;
}) {
  const parts = [`Modalidad: ${placeLabel}`];
  const normalizedAddress = address.trim();
  const normalizedNotes = notes.trim();

  if (normalizedAddress) {
    parts.push(`Direccion: ${normalizedAddress}`);
  }

  if (normalizedNotes) {
    parts.push(normalizedNotes);
  }

  return parts.join("\n").slice(0, 600);
}

function formatHomeAddress({
  apartment,
  neighborhood,
  number,
  street,
  t,
}: {
  apartment: string;
  neighborhood: string;
  number: string;
  street: string;
  t: Record<string, string>;
}) {
  const parts = [`${street.trim()} ${number.trim()}`.trim()];
  const normalizedApartment = apartment.trim();
  const normalizedNeighborhood = neighborhood.trim();

  if (normalizedApartment) {
    parts.push(`${t.addressApartment.split(" (")[0]}: ${normalizedApartment}`);
  }

  if (normalizedNeighborhood) {
    parts.push(normalizedNeighborhood);
  }

  return parts.filter(Boolean).join(", ");
}

function validateBookingForm({
  appointmentNumber,
  appointmentPlace,
  appointmentStreet,
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
  appointmentNumber: string;
  appointmentPlace: AppointmentPlace;
  appointmentStreet: string;
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

  if (appointmentPlace === "home" && appointmentStreet.trim().length < 3) {
    errors.appointmentStreet = t.addressStreetError;
  }

  if (appointmentPlace === "home" && appointmentNumber.trim().length < 1) {
    errors.appointmentNumber = t.addressNumberError;
  }

  if (!namePattern.test(name)) {
    errors.patientName = t.nameError;
  }

  if (!emailPattern.test(email)) {
    errors.patientEmail = t.emailError;
  }

  if (!phone) {
    errors.patientPhone = t.phoneRequired;
  } else if (
    phone.length < phoneCountry.minLength ||
    phone.length > phoneCountry.maxLength ||
    !/^\d+$/.test(phone)
  ) {
    errors.patientPhone = `${t.phoneError} (${phoneCountry.minLength}-${phoneCountry.maxLength})`;
  }

  if (trimmedNotes && (trimmedNotes.length < 3 || trimmedNotes.length > 600)) {
    errors.notes = t.notesError;
  }

  return errors;
}
