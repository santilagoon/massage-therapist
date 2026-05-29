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
  ClientAppointment,
  createAdminBlock,
  loadAdminBlocks,
  loadAdminAppointments,
  loadBusyAppointments,
  loadClientAppointments,
  loadRemoteServices,
  requestRemoteAppointment,
  requestRemoteAppointmentGroup,
  updateRemoteAppointmentStatus,
} from "@/lib/supabase/bookings";
import {
  AdminAuthError,
  getCurrentAdminUser,
  getCurrentUser,
  resendSignupCode,
  sendPasswordRecovery,
  signInAdmin,
  signInWithGoogle,
  signOutAdmin,
  signUpAccount,
  updateAccountPassword,
  verifyRecoveryCode,
  verifySignupCode,
} from "@/lib/supabase/auth";
import {
  notifyAppointmentRequested,
  notifyGroupedAppointmentsRequested,
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
  appointments: Appointment[];
  emailDelivery: "failed" | "pending" | "sent";
  placeLabel: string;
  priceLabel: string;
  serviceTitle: string;
  unavailableSlots: string[];
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
  const isLocalDemoMode =
    process.env.NODE_ENV === "development" && !isSupabaseConfigured();
  const [locale, setLocale] = useState<Locale>("es");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("ARS");
  const [adminView, setAdminView] = useState<AdminView>("panel");
  const [availableServices, setAvailableServices] = useState(fallbackServices);
  const [serviceId, setServiceId] = useState(fallbackServices[0].id);
  const [date, setDate] = useState(getInitialDate);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (isSupabaseConfigured() || !isLocalDemoMode) {
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
    if (remoteMode || !isLocalDemoMode) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(appointments));
  }, [appointments, isLocalDemoMode, remoteMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      if (!isSupabaseConfigured()) {
        setIsLoadingRemote(false);
        setRemoteMode(false);
        if (!isLocalDemoMode) {
          setNotice(t.localMode);
        }
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
  }, [isLocalDemoMode, t.localMode]);

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

  const selectedSlot = selectedSlots[0] ?? "";
  const dateOptions = useMemo(() => getDateOptions(12), []);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      if (!isSupabaseConfigured()) {
        return;
      }

      const admin = await getCurrentAdminUser();
      if (cancelled) {
        return;
      }

      setAdminUser(admin);

      if (isAdminPage && !admin) {
        const account = await getCurrentUser();
        if (!cancelled && account) {
          window.location.replace("/cuenta");
        }
      }

      if (!isAdminPage && !admin) {
        const account = await getCurrentUser();
        if (cancelled || !account) {
          return;
        }

        let previousAppointments: ClientAppointment[] = [];
        try {
          previousAppointments = await loadClientAppointments();
        } catch (error) {
          logTechnicalError(error);
        }

        if (!cancelled) {
          const previousAppointment = previousAppointments[0];
          const parsedPhone = splitStoredPhone(previousAppointment?.patientPhone ?? "");
          const accountName = [
            account.user_metadata?.first_name,
            account.user_metadata?.last_name,
          ]
            .filter((part): part is string => typeof part === "string" && part.length > 0)
            .join(" ");
          setForm((current) => ({
            ...current,
            patientName:
              current.patientName ||
              previousAppointment?.patientName ||
              account.user_metadata?.full_name ||
              accountName ||
              "",
            patientEmail: current.patientEmail || account.email || "",
            phoneCountryCode: current.patientPhone
              ? current.phoneCountryCode
              : parsedPhone.countryCode,
            patientPhone: current.patientPhone || parsedPhone.phone,
          }));
        }
      }
    }

    void loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [isAdminPage]);

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

    const usesRemoteBooking = remoteMode && isSupabaseConfigured();
    if (!usesRemoteBooking && !isLocalDemoMode) {
      setNotice(t.localMode);
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

      let createdAppointments: Appointment[];
      let unavailableSlots: string[] = [];
      let requestPublicToken = "";

      if (usesRemoteBooking && selectedSlots.length > 1) {
        const groupedResult = await requestRemoteAppointmentGroup({
          ...appointmentInput,
          startsAt: selectedSlots,
        });
        createdAppointments = groupedResult.appointments;
        unavailableSlots = groupedResult.unavailableStartsAt;
        requestPublicToken = groupedResult.requestPublicToken;
      } else if (usesRemoteBooking) {
        createdAppointments = [await requestRemoteAppointment(appointmentInput)];
      } else {
        createdAppointments = selectedSlots.map((startsAt) =>
          createAppointment({ ...appointmentInput, startsAt }),
        );
      }

      const appointment = createdAppointments[0];
      if (!appointment) {
        setSelectedSlots([]);
        setNotice(t.allSlotsUnavailable);
        void refreshBusySlots(date);
        return;
      }

      setAppointments((current) => [...createdAppointments, ...current]);
      setSubmittedRequest({
        address: appointmentAddress,
        appointment,
        appointments: createdAppointments,
        emailDelivery: usesRemoteBooking ? "pending" : "failed",
        placeLabel: getAppointmentPlaceLabel(form.appointmentPlace, t),
        priceLabel: formatServicePrice(selectedService, locale, t, displayCurrency),
        serviceTitle: selectedService.title[locale],
        unavailableSlots,
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
      setSelectedSlots([]);

      if (usesRemoteBooking) {
        const notification = requestPublicToken
          ? notifyGroupedAppointmentsRequested(requestPublicToken)
          : notifyAppointmentRequested(appointment);

        void notification
          .then(() => {
            setSubmittedRequest((current) =>
              current?.appointment.id === appointment.id
                ? { ...current, emailDelivery: "sent" }
                : current,
            );
          })
          .catch(() => {
            setSubmittedRequest((current) =>
              current?.appointment.id === appointment.id
                ? { ...current, emailDelivery: "failed" }
                : current,
            );
            setNotice(t.emailSkipped);
          });
        void refreshBusySlots(date);
      }
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.systemError);
    } finally {
      setIsSaving(false);
    }
  }

  async function submitContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      name: contactForm.name.trim(),
      email: contactForm.email.trim().toLowerCase(),
      message: contactForm.message.trim(),
    };

    if (!payload.name || !payload.email || !payload.message || isSendingContact) {
      return;
    }

    setIsSendingContact(true);
    setContactNotice("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Contact request failed.");
      }

      setContactForm({ name: "", email: "", message: "" });
      setContactNotice(t.contactSuccess);
    } catch (error) {
      logTechnicalError(error);
      setContactNotice(t.contactError);
    } finally {
      setIsSendingContact(false);
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

  async function handleAccountRegister(input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    setIsLoadingAdmin(true);
    try {
      await signUpAccount({
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.trim(),
        password: input.password,
      });
      setNotice(t.registerSuccess);
      return true;
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.registerError);
      return false;
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleVerifySignup(email: string, code: string) {
    setIsLoadingAdmin(true);
    try {
      await verifySignupCode(email.trim(), code.trim());
      await signOutAdmin();
      setNotice(t.emailVerified);
      return true;
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.codeVerificationError);
      return false;
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleResendSignup(email: string) {
    setIsLoadingAdmin(true);
    try {
      await resendSignupCode(email.trim());
      setNotice(t.codeResent);
      return true;
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.codeResendError);
      return false;
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleSendRecovery(email: string) {
    setIsLoadingAdmin(true);
    try {
      await sendPasswordRecovery(email.trim());
      setNotice(t.recoveryCodeSent);
      return true;
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.recoveryError);
      return false;
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleVerifyRecovery(email: string, code: string) {
    setIsLoadingAdmin(true);
    try {
      await verifyRecoveryCode(email.trim(), code.trim());
      setNotice(t.recoveryCodeVerified);
      return true;
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.codeVerificationError);
      return false;
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleUpdatePassword(password: string) {
    setIsLoadingAdmin(true);
    try {
      await updateAccountPassword(password);
      await signOutAdmin();
      setNotice(t.passwordUpdated);
      return true;
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.passwordUpdateError);
      return false;
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  async function handleGoogleLogin() {
    setIsLoadingAdmin(true);
    try {
      await signInWithGoogle("/cuenta");
      return true;
    } catch (error) {
      logTechnicalError(error);
      setNotice(t.googleLoginError);
      setIsLoadingAdmin(false);
      return false;
    }
  }

  function openAdminAccess() {
    if (adminUser) {
      setIsAdminUserMenuOpen((current) => !current);
      return;
    }

    if (isAdminPage) {
      document.querySelector("form")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    window.location.href = "/cuenta";
  }

  async function logoutFromUserMenu() {
    setIsAdminUserMenuOpen(false);
    await handleAdminLogout();
  }

  async function handleAdminLogout() {
    await signOutAdmin();
    setAdminUser(null);
    setAppointments([]);
    setAvailabilityBlocks([]);
    setNotice("");
    setIsAdminUserMenuOpen(false);

    if (isAdminPage && typeof window !== "undefined") {
      window.location.href = "/";
    }
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

  async function updateStatus(id: string, status: AppointmentStatus) {
    if (!remoteMode || !adminUser) {
      setNotice(t.adminLoginRequired);
      return;
    }

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
        void notifyAppointmentStatus(updatedAppointment, status).catch(() => {
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
  }

  useEffect(() => {
    if (isAdminPage && adminUser && remoteMode && appointments.length === 0) {
      void loadAdminData();
    }
  }, [adminUser, appointments.length, isAdminPage, remoteMode]);

  const adminNotice =
    notice &&
    notice !== t.adminLoaded &&
    notice !== t.remoteReady &&
    notice !== t.adminLoginRequired
      ? notice
      : "";

  if (isAdminPage) {
    return (
      <main className="min-h-screen bg-[#f5f5f5] text-[#111111]">
        <section
          className={[
            "min-h-screen w-full",
            adminUser ? "lg:grid lg:grid-cols-[240px_minmax(0,1fr)]" : "flex flex-col",
          ].join(" ")}
        >
          {adminUser ? (
            <AdminSideNav
              adminView={adminView}
              t={t}
              userEmail={adminUser.email ?? ""}
              onLogout={handleAdminLogout}
              onViewChange={setAdminView}
            />
          ) : null}

          <div className="min-w-0">
            <header
              className={[
                "sticky top-0 z-20 border-b border-[#dedede] bg-[#f5f5f5]/95 backdrop-blur",
                adminUser ? "lg:hidden" : "",
              ].join(" ")}
            >
              <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
                <a href="/" className="shrink-0 text-sm font-semibold tracking-[0.16em] text-[#111111]">
                  MM
                </a>
                {adminUser ? (
                  <AdminTopNav adminView={adminView} t={t} onViewChange={setAdminView} />
                ) : (
                  <div className="flex-1" />
                )}
                <div className="flex shrink-0 items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={openAdminAccess}
                      title={adminUser ? t.logout : t.loginAdmin}
                      aria-label={adminUser ? t.logout : t.loginAdmin}
                      aria-expanded={adminUser ? isAdminUserMenuOpen : undefined}
                      className="group flex h-10 w-10 cursor-pointer items-center justify-center border border-[#d4d4d4] bg-white text-[#111111] transition hover:bg-[#fafafa]"
                    >
                      <UserIcon />
                      {!adminUser ? (
                        <span className="pointer-events-none absolute right-0 top-12 hidden bg-[#111111] px-3 py-1.5 text-xs font-semibold text-white group-hover:block">
                          {t.loginAdmin}
                        </span>
                      ) : null}
                    </button>
                    {adminUser && isAdminUserMenuOpen ? (
                      <div className="absolute right-0 top-12 z-20 min-w-28 border border-[#e5e5e5] bg-white p-1">
                        <button
                          type="button"
                          onClick={() => void logoutFromUserMenu()}
                          className="h-9 w-full cursor-pointer px-3 text-left text-sm font-semibold text-[#111111] transition hover:bg-[#f5f5f5]"
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
                    className="h-10 cursor-pointer border border-[#d4d4d4] bg-white px-3 text-sm font-medium"
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

            <div
              className={[
                "grid w-full flex-1 gap-6 px-4 py-6 sm:px-6",
                adminUser ? "lg:px-10 lg:py-10" : "mx-auto max-w-6xl lg:py-10",
              ].join(" ")}
            >
              {adminNotice && adminUser ? (
                <p className="w-full rounded-none border border-[#dcdcdc] bg-white p-3 text-sm font-medium text-[#404040]">
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
                notice={adminNotice}
                onLogin={handleAdminLogin}
                onRegister={handleAccountRegister}
                onResendSignup={handleResendSignup}
                onSendRecovery={handleSendRecovery}
                onUpdatePassword={handleUpdatePassword}
                onVerifyRecovery={handleVerifyRecovery}
                onVerifySignup={handleVerifySignup}
                onGoogleLogin={handleGoogleLogin}
                onLogout={handleAdminLogout}
                onRefresh={loadAdminData}
                onCreateBlock={handleCreateBlock}
                onStatusChange={updateStatus}
                onViewChange={setAdminView}
              />
            </div>
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
                            setSelectedSlots([]);
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
                      const hasSelectedSlot = selectedSlots.some((slot) =>
                        slot.startsWith(option.value),
                      );

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setDate(option.value);
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
                          <span
                            className={[
                              "mt-1 h-1.5 w-1.5 rounded-full transition",
                              hasSelectedSlot
                                ? isSelected
                                  ? "bg-white"
                                  : "bg-[#111111]"
                                : "bg-transparent",
                            ].join(" ")}
                          />
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
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid gap-3">
                  <StepHeading number={4} label={t.chooseTime} />
                  <p className="text-xs text-[#737373]">{t.multiSlotHint}</p>
                  {availableSlots.length === 0 ? (
                    <p className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 text-sm text-[#525252]">
                      {t.noSlots}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {availableSlots.map((availableSlot) => {
                        const isSelected = selectedSlots.includes(availableSlot);

                        return (
                          <button
                            key={availableSlot}
                            type="button"
                            disabled={!isSelected && selectedSlots.length >= 12}
                            onClick={() => {
                              setSelectedSlots((current) =>
                                current.includes(availableSlot)
                                  ? current.filter((item) => item !== availableSlot)
                                  : [...current, availableSlot].sort(),
                              );
                              setFormErrors((current) => ({ ...current, slot: undefined }));
                          }}
                          aria-pressed={isSelected}
                          className={timeButtonClass(isSelected)}
                        >
                            <LocalizedTimeLabel value={availableSlot} locale={locale} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedSlots.length ? (
                    <div className="grid gap-2 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#737373]">
                        {t.selectedSlots} ({selectedSlots.length})
                      </p>
                      {selectedSlots.map((selectedAppointmentSlot) => (
                        <div
                          key={selectedAppointmentSlot}
                          className="flex items-center justify-between gap-3 text-sm text-[#404040]"
                        >
                          <span>
                            {formatSummaryDate(selectedAppointmentSlot, locale)} ·{" "}
                            <LocalizedTimeLabel value={selectedAppointmentSlot} locale={locale} />
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedSlots((current) =>
                                current.filter((item) => item !== selectedAppointmentSlot),
                              )
                            }
                            className="cursor-pointer font-semibold text-[#737373] transition hover:text-[#111111]"
                          >
                            {t.removeSlot}
                          </button>
                        </div>
                      ))}
                      {selectedSlots.length >= 12 ? (
                        <p className="pt-1 text-xs text-[#737373]">{t.slotSelectionLimit}</p>
                      ) : null}
                    </div>
                  ) : null}
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
                  selectedSlots={selectedSlots}
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
    {selectedSlots.length > 0 && !submittedRequest ? (
      <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 sm:hidden">
        <div className="flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 shadow-lg">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#111111]">
            {selectedSlots.length}
          </span>
          <span className="text-sm font-semibold text-white">{t.selectedSlots}</span>
        </div>
      </div>
    ) : null}
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
  const isGroupedRequest =
    details.appointments.length > 1 || details.unavailableSlots.length > 0;

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
            {!isGroupedRequest ? (
              <>
                <SummaryRow
                  label={t.date}
                  value={formatSummaryDate(details.appointment.startsAt, locale)}
                />
                <SummaryRow
                  label={t.time}
                  value={formatTimeOnly(details.appointment.startsAt, locale)}
                />
              </>
            ) : null}
            <SummaryRow
              label={t.duration}
              value={`${Math.round(
                (new Date(details.appointment.endsAt).getTime() -
                  new Date(details.appointment.startsAt).getTime()) /
                  60000,
              )} min`}
            />
            <div className="border-t border-[#e5e5e5] pt-3">
              <SummaryRow
                label={isGroupedRequest ? t.pricePerAppointment : t.total}
                value={details.priceLabel}
                strong
              />
            </div>
          </dl>

          {isGroupedRequest ? (
            <div className="grid gap-4 rounded-2xl border border-[#e5e5e5] p-4 text-sm">
              <div className="grid gap-2">
                <p className="font-semibold text-[#111111]">{t.savedSlots}</p>
                {details.appointments.map((appointment) => (
                  <p key={appointment.id} className="text-[#404040]">
                    {formatSummaryDate(appointment.startsAt, locale)} ·{" "}
                    {formatTimeOnly(appointment.startsAt, locale)}
                  </p>
                ))}
              </div>
              {details.unavailableSlots.length ? (
                <div className="grid gap-2 border-t border-[#e5e5e5] pt-3">
                  <p className="font-semibold text-[#8a4329]">{t.unavailableSlots}</p>
                  {details.unavailableSlots.map((startsAt) => (
                    <p key={startsAt} className="text-[#525252]">
                      {formatSummaryDate(startsAt, locale)} ·{" "}
                      {formatTimeOnly(startsAt, locale)}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2 rounded-2xl bg-[#f5f5f5] p-4 text-sm leading-6 text-[#404040]">
            {details.emailDelivery === "sent" ? (
              <>
                <p>{t.emailSentTo.replace("{email}", details.appointment.patientEmail)}</p>
                <p>{t.spamReminder}</p>
              </>
            ) : null}
            {details.emailDelivery === "pending" ? <p>{t.emailSending}</p> : null}
            {details.emailDelivery === "failed" ? <p>{t.emailFailed}</p> : null}
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

function LocalizedTimeLabel({ value, locale }: { value: string; locale: Locale }) {
  const [label, setLabel] = useState("--:--");

  useEffect(() => {
    setLabel(formatTimeOnly(value, locale));
  }, [locale, value]);

  return label;
}

function BookingSummary({
  date,
  displayCurrency,
  locale,
  selectedService,
  selectedSlot,
  selectedSlots,
  t,
}: {
  date: string;
  displayCurrency: DisplayCurrency;
  locale: Locale;
  selectedService: (typeof fallbackServices)[number];
  selectedSlot: string;
  selectedSlots: string[];
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
          value={
            selectedSlot
              ? selectedSlots.length > 1
                ? `${selectedSlots.length} ${t.appointmentsUnit}`
                : formatTimeOnly(selectedSlot, locale)
              : "-"
          }
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
  notice,
  onLogin,
  onRegister,
  onResendSignup,
  onSendRecovery,
  onUpdatePassword,
  onVerifyRecovery,
  onVerifySignup,
  onGoogleLogin,
  onLogout,
  onRefresh,
  onCreateBlock,
  onStatusChange,
  onViewChange,
}: {
  adminView: AdminView;
  appointments: Appointment[];
  availabilityBlocks: AvailabilityBlock[];
  services: typeof fallbackServices;
  adminUser: User | null;
  isLoading: boolean;
  locale: Locale;
  t: Record<string, string>;
  notice: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<boolean>;
  onResendSignup: (email: string) => Promise<boolean>;
  onSendRecovery: (email: string) => Promise<boolean>;
  onUpdatePassword: (password: string) => Promise<boolean>;
  onVerifyRecovery: (email: string, code: string) => Promise<boolean>;
  onVerifySignup: (email: string, code: string) => Promise<boolean>;
  onGoogleLogin: () => Promise<boolean>;
  onLogout: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onCreateBlock: (input: {
    date: string;
    startsAt: string;
    endsAt: string;
    reason: string;
  }) => Promise<void>;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
  onViewChange: (view: AdminView) => void;
}) {
  const [filter, setFilter] = useState<AdminFilter>("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDateValue());
  const stats = getAdminStats(appointments);
  const dateOptions = useMemo(() => getDateOptions(10), []);
  const visibleAppointments = appointments.filter((appointment) => {
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
    return (
      <AuthPanel
        allowRegistration={false}
        isLoading={isLoading}
        notice={notice}
        showGoogle={false}
        t={t}
        onLogin={onLogin}
        onRegister={onRegister}
        onResendSignup={onResendSignup}
        onSendRecovery={onSendRecovery}
        onUpdatePassword={onUpdatePassword}
        onVerifyRecovery={onVerifyRecovery}
        onVerifySignup={onVerifySignup}
        onGoogleLogin={onGoogleLogin}
      />
    );
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
        <AdminClients
          appointments={appointments}
          locale={locale}
          t={t}
          onViewRequests={(email) => {
            setRequestSearch(email);
            setFilter("all");
            onViewChange("requests");
          }}
        />
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

function getAdminNavItems(t: Record<string, string>): Array<[AdminView, string, string]> {
  return [
    ["panel", t.adminPanel, "#"],
    ["agenda", t.adminAgenda, "[]"],
    ["requests", t.adminRequests, "!"],
    ["blocks", t.adminBlocks, "o"],
    ["services", t.adminServices, "<>"],
    ["team", t.adminTeam, "**"],
    ["clients", t.adminClients, "()"],
    ["income", t.adminIncome, "$"],
    ["profile", t.adminProfile, "@"],
  ];
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
  const items = getAdminNavItems(t);

  return (
    <div className="min-w-0 flex-1">
      <label className="sr-only" htmlFor="admin-section">
        {t.adminPanel}
      </label>
      <select
        id="admin-section"
        value={adminView}
        onChange={(event) => onViewChange(event.target.value as AdminView)}
        className="h-10 w-full cursor-pointer border border-[#d4d4d4] bg-white px-3 text-sm font-semibold text-[#111111] outline-none transition focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/15"
      >
        {items.map(([view, label]) => (
          <option key={view} value={view}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AdminSideNav({
  adminView,
  t,
  userEmail,
  onLogout,
  onViewChange,
}: {
  adminView: AdminView;
  t: Record<string, string>;
  userEmail: string;
  onLogout: () => Promise<void>;
  onViewChange: (view: AdminView) => void;
}) {
  const items = getAdminNavItems(t);
  const initial = (userEmail || "M").slice(0, 1).toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-[240px] border-r border-[#d7d7d7] bg-[#f5f5f5] lg:flex lg:flex-col">
      <div className="border-b border-[#dedede] px-6 py-8">
        <p className="text-2xl font-semibold text-[#111111]">{t.adminPanel}</p>
      </div>

      <nav className="flex-1 py-4">
        {items.map(([view, label, glyph]) => {
          const active = adminView === view;

          return (
            <button
              key={view}
              type="button"
              onClick={() => onViewChange(view)}
              className={[
                "flex h-14 w-full cursor-pointer items-center gap-4 border-l-4 px-5 text-left text-xs font-semibold uppercase tracking-[0.18em] transition",
                active
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-transparent text-[#404040] hover:bg-white hover:text-[#111111]",
              ].join(" ")}
            >
              <span className="grid h-5 w-5 place-items-center font-mono text-[0.7rem] leading-none">
                {glyph}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#dedede] p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center bg-[#111111] text-sm font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#111111]">Maria M.</p>
            <p className="truncate text-xs text-[#666666]">{userEmail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="mt-4 h-10 w-full cursor-pointer border border-[#111111] bg-white text-sm font-semibold text-[#111111] transition hover:bg-[#111111] hover:text-white"
        >
          {t.logout}
        </button>
      </div>
    </aside>
  );
}

function AdminDashboard({
  appointments,
  availabilityBlocks,
  isLoading,
  locale,
  selectedDate,
  services,
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
  t: Record<string, string>;
  onDateChange: (date: string) => void;
  onRefresh: () => Promise<void>;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const selectedDateAppointments = appointments.filter((appointment) =>
    isSameDateValue(appointment.startsAt, selectedDate),
  );
  const selectedDateBlocks = availabilityBlocks.filter((block) =>
    isSameDateValue(block.startsAt, selectedDate),
  );
  const selectedDateConfirmed = selectedDateAppointments.filter(
    (appointment) => appointment.status === "confirmed",
  );
  const selectedDatePending = selectedDateAppointments.filter(
    (appointment) => appointment.status === "pending_approval",
  );
  const selectedDateActive = selectedDateAppointments.filter((appointment) =>
    ["confirmed", "pending_approval"].includes(appointment.status),
  );
  return (
    <section className="grid gap-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#666666]">
            {t.adminEyebrow}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-normal text-[#111111]">
            {t.adminControlPanel}
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AdminDateControls locale={locale} selectedDate={selectedDate} t={t} onDateChange={onDateChange} />
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            className="h-11 cursor-pointer border border-[#d4d4d4] bg-white px-5 text-sm font-semibold uppercase tracking-[0.12em] text-[#404040] transition hover:border-[#111111] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t.loading : t.refresh}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <AdminKpiCard label={t.todayConfirmed} value={selectedDateConfirmed.length} suffix={t.sessionsUnit} />
        <AdminKpiCard label={t.todayPending} value={selectedDatePending.length} suffix={t.requestsUnit} />
        <AdminKpiCard label={t.dayAppointments} value={selectedDateActive.length} suffix={t.appointmentsUnit} inverted />
      </div>

      <AdminDayTimeline
        appointments={selectedDateAppointments}
        blocks={selectedDateBlocks}
        isLoading={isLoading}
        locale={locale}
        services={services}
        t={t}
        onStatusChange={onStatusChange}
      />
    </section>
  );
}

function AdminDateControls({
  locale,
  selectedDate,
  t,
  onDateChange,
}: {
  locale: Locale;
  selectedDate: string;
  t: Record<string, string>;
  onDateChange: (date: string) => void;
}) {
  const today = getTodayDateValue();
  const controls: Array<[string, string]> = [
    [shiftDateValue(today, -1), t.yesterday],
    [today, t.today + ", " + getShortDayMonthLabel(today, locale)],
    [shiftDateValue(today, 1), t.tomorrow],
  ];

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] border border-[#d4d4d4] bg-white">
      {controls.map(([value, label]) => {
        const active = selectedDate === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onDateChange(value)}
            className={[
              "h-11 cursor-pointer px-4 text-xs font-semibold uppercase tracking-[0.1em] transition sm:px-5",
              active ? "bg-[#111111] text-white" : "text-[#666666] hover:bg-[#f5f5f5] hover:text-[#111111]",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
      <label className="grid h-11 w-12 cursor-pointer place-items-center border-l border-[#d4d4d4] text-[#404040]">
        <span className="sr-only">{t.openCalendar}</span>
        <input
          type="date"
          value={selectedDate}
          min={getTodayDateValue()}
          onChange={(event) => onDateChange(event.target.value)}
          className="absolute h-10 w-10 cursor-pointer opacity-0"
        />
        <span className="font-mono text-lg" aria-hidden="true">
          []
        </span>
      </label>
    </div>
  );
}

function AdminKpiCard({
  inverted = false,
  label,
  suffix,
  value,
}: {
  inverted?: boolean;
  label: string;
  suffix: string;
  value: number;
}) {
  return (
    <article
      className={[
        "border p-5",
        inverted ? "border-[#111111] bg-[#111111] text-white" : "border-[#d7d7d7] bg-white text-[#111111]",
      ].join(" ")}
    >
      <p className={[
        "text-sm font-medium uppercase tracking-[0.04em]",
        inverted ? "text-white/60" : "text-[#666666]",
      ].join(" ")}
      >
        {label}
      </p>
      <div className="mt-8 flex items-end gap-3">
        <span className="text-5xl font-light tabular-nums leading-none">{String(value).padStart(2, "0")}</span>
        <span className={[
          "pb-1 text-sm font-medium uppercase tracking-[0.04em]",
          inverted ? "text-white/65" : "text-[#666666]",
        ].join(" ")}
        >
          {suffix}
        </span>
      </div>
    </article>
  );
}

function AdminDayTimeline({
  appointments,
  blocks,
  isLoading,
  locale,
  services,
  t,
  onStatusChange,
}: {
  appointments: Appointment[];
  blocks: AvailabilityBlock[];
  isLoading: boolean;
  locale: Locale;
  services: typeof fallbackServices;
  t: Record<string, string>;
  onStatusChange: (id: string, status: AppointmentStatus) => Promise<void>;
}) {
  const items = [
    ...appointments.map((appointment) => ({ type: "appointment" as const, appointment, startsAt: appointment.startsAt })),
    ...blocks.map((block) => ({ type: "block" as const, block, startsAt: block.startsAt })),
  ].sort((first, second) => first.startsAt.localeCompare(second.startsAt));

  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-semibold text-[#111111]">{t.daySchedule}</h2>
        <div className="h-px flex-1 bg-[#d7d7d7]" />
        <p className="font-mono text-sm uppercase tracking-[0.16em] text-[#404040]">GMT -03:00</p>
      </div>

      <div className="border border-[#d7d7d7] bg-white">
        <div className="hidden grid-cols-[6.5rem_minmax(0,1fr)] border-b border-[#d7d7d7] text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#666666] sm:grid">
          <div className="border-r border-[#d7d7d7] px-4 py-3 text-center">{t.time}</div>
          <div className="px-5 py-3">{t.serviceDetails}</div>
        </div>

        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#666666]">
            {t.noAppointmentsThisDay}
          </div>
        ) : null}

        <div className="grid">
          {items.map((item) => {
            if (item.type === "block") {
              return (
                <div key={item.block.id} className="grid border-b border-[#e5e5e5] last:border-b-0 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
                  <div className="border-[#d7d7d7] px-4 py-5 font-mono text-sm text-[#404040] sm:border-r">
                    {formatTimeOnly(item.block.startsAt, locale)}
                  </div>
                  <div className="px-5 py-5">
                    <div className="bg-[#eeeeee] px-4 py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-[#666666]">
                      {t.blockedTime}{item.block.reason ? " - " + item.block.reason : ""}
                    </div>
                  </div>
                </div>
              );
            }

            const service = findServiceInList(item.appointment.serviceId, services);
            const canUpdate = item.appointment.status === "pending_approval";

            return (
              <div key={item.appointment.id} className="grid border-b border-[#e5e5e5] last:border-b-0 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
                <div className="border-[#d7d7d7] px-4 py-5 font-mono text-sm text-[#404040] sm:border-r">
                  {formatTimeOnly(item.appointment.startsAt, locale)}
                </div>
                <div className="px-5 py-5">
                  <article className="border border-[#dedede] bg-[#f7f7f7] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-[#111111]">{item.appointment.patientName}</h3>
                        <p className="mt-2 text-sm text-[#666666]">
                          {service.title[locale]} - {service.durationMinutes} min
                        </p>
                        <p className="mt-2 text-xs text-[#666666]">{item.appointment.patientEmail}</p>
                      </div>
                      <span className="w-fit border border-[#111111] bg-white px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[#111111]">
                        {t[item.appointment.status]}
                      </span>
                    </div>
                    {canUpdate ? (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void onStatusChange(item.appointment.id, "declined")}
                          className="h-10 cursor-pointer border border-[#111111] text-sm font-semibold text-[#111111] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {t.decline}
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void onStatusChange(item.appointment.id, "confirmed")}
                          className="h-10 cursor-pointer bg-[#111111] text-sm font-semibold text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {t.approve}
                        </button>
                      </div>
                    ) : null}
                  </article>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
  const appointmentGroups = groupAdminAppointments(appointments);

  return (
    <section className="grid gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-[#111111]">{t.adminRequests}</h1>
        <p className="mt-2 text-sm text-[#737373]">{t.requestsIntro}</p>
      </div>

      <input
        value={requestSearch}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={t.requestSearchPlaceholder}
        className="h-10 w-full border border-[#d4d4d4] bg-white px-3 text-sm outline-none transition placeholder:text-[#8a8a8a] focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/15 sm:max-w-[14rem]"
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {([
          ["all", t.allAppointments, stats.total],
          ["pending_approval", t.pendingAppointments, stats.pending],
          ["confirmed", t.confirmedAppointments, stats.confirmed],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => onFilterChange(value)}
            className={[filterButtonClass(filter === value), "shrink-0"].join(" ")}
          >
            {label} · {count}
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <p className="border border-[#e5e5e5] bg-[#fafafa] p-5 text-sm text-[#737373]">
          {t.noFilteredAppointments}
        </p>
      ) : null}

      <div className="grid gap-3">
        {appointmentGroups.map((group) => (
          <section
            key={group.key}
            className={
              group.requestId
                ? "grid gap-3 border border-[#d7d7d7] bg-[#fafafa] p-3"
                : ""
            }
          >
            {group.requestId ? (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#525252]">
                  {t.groupedRequest}
                </p>
                <p className="text-xs text-[#737373]">
                  {group.appointments.length} {t.appointmentsUnit}
                </p>
              </div>
            ) : null}
            {group.appointments.map((appointment) => (
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
          </section>
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
          className="flex items-center justify-between gap-4 border border-[#e5e5e5] bg-white p-4"
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
  onViewRequests,
}: {
  appointments: Appointment[];
  locale: Locale;
  t: Record<string, string>;
  onViewRequests: (email: string) => void;
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
        <p className="border border-[#e5e5e5] bg-[#fafafa] p-8 text-center text-sm text-[#737373]">
          {t.noClientsYet}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {clients.map((client) => (
            <article key={client.key} className="border border-[#e5e5e5] bg-white">
              <div className="p-4">
                <h2 className="font-semibold text-[#111111]">{client.name}</h2>
                <p className="mt-1 text-sm text-[#737373]">{client.email}</p>
                {client.phone ? <p className="mt-1 text-sm text-[#737373]">{client.phone}</p> : null}
                <p className="mt-3 text-sm font-semibold text-[#404040]">
                  {client.count} {t.appointmentsLabel} · {formatDateTime(client.lastVisit, locale)}
                </p>
              </div>
              <div className="border-t border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => onViewRequests(client.email)}
                  className="h-11 w-full cursor-pointer text-sm font-semibold uppercase tracking-[0.08em] text-[#404040] transition hover:bg-[#f5f5f5]"
                >
                  {t.viewClientRequests}
                </button>
              </div>
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
      <p className="border border-[#e5e5e5] bg-[#fafafa] p-8 text-center text-sm text-[#737373]">
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
    <section className="mx-auto grid w-full max-w-xl gap-4 border border-[#e5e5e5] bg-white p-5">
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
          className="h-10 cursor-pointer border border-[#d4d4d4] px-4 text-sm font-semibold text-[#404040] transition hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? t.loading : t.refresh}
        </button>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="h-10 cursor-pointer border border-[#111111] px-4 text-sm font-semibold text-[#111111] transition hover:bg-[#111111] hover:text-white"
        >
          {t.logout}
        </button>
      </div>
    </section>
  );
}

function AdminPlaceholder({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-2 border border-[#e5e5e5] bg-[#fafafa] p-8 text-center">
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
    <section className="grid gap-4 border border-[#e5e5e5] bg-white p-4 sm:p-6">
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
            className={`${adminInputClass} cursor-pointer`}
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
              className={adminDatePillClass(isSelected)}
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
              className="border border-[#d7d7d7] bg-[#eeeeee] p-3 text-sm text-[#404040]"
            >
              <strong>{t.blockedTime}</strong> {formatTimeOnly(block.startsAt, locale)} -{" "}
              {formatTimeOnly(block.endsAt, locale)}
              {block.reason ? ` · ${block.reason}` : ""}
            </div>
          ))}
        </div>
      ) : null}

      {appointments.length === 0 && blocks.length === 0 ? (
        <div className="border border-[#e5e5e5] bg-[#fafafa] p-10 text-center">
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
    <section className="mx-auto grid w-full max-w-3xl gap-5 border border-[#e5e5e5] bg-white p-4 sm:p-6">
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
              className={adminDatePillClass(isSelected)}
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

      <form onSubmit={submitBlock} className="grid gap-4 border border-[#e5e5e5] bg-[#fafafa] p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.blockStart}>
            <input
              required
              type="time"
              value={blockForm.startsAt}
              onChange={(event) =>
                setBlockForm((current) => ({ ...current, startsAt: event.target.value }))
              }
              className={adminInputClass}
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
              className={adminInputClass}
            />
          </Field>
        </div>

        <Field label={t.blockReason}>
          <input
            value={blockForm.reason}
            onChange={(event) =>
              setBlockForm((current) => ({ ...current, reason: event.target.value }))
            }
            className={adminInputClass}
          />
        </Field>

        <button
          type="submit"
          disabled={isLoading}
          className="h-12 cursor-pointer bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:bg-[#b5b5b5]"
        >
          {isLoading ? t.loading : t.blockDay}
        </button>
      </form>

      {blocks.length > 0 ? (
        <div className="grid gap-2">
          {blocks.slice(0, 8).map((block) => (
            <div key={block.id} className="border border-[#e5e5e5] p-3 text-sm">
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

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[#d7d7d7] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[#111111]">{value}</p>
    </div>
  );
}

export function AuthPanel({
  allowRegistration = true,
  isLoading,
  notice,
  showGoogle = true,
  t,
  onLogin,
  onRegister,
  onResendSignup,
  onSendRecovery,
  onUpdatePassword,
  onVerifyRecovery,
  onVerifySignup,
  onGoogleLogin,
}: {
  allowRegistration?: boolean;
  isLoading: boolean;
  notice: string;
  showGoogle?: boolean;
  t: Record<string, string>;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<boolean>;
  onResendSignup: (email: string) => Promise<boolean>;
  onSendRecovery: (email: string) => Promise<boolean>;
  onUpdatePassword: (password: string) => Promise<boolean>;
  onVerifyRecovery: (email: string, code: string) => Promise<boolean>;
  onVerifySignup: (email: string, code: string) => Promise<boolean>;
  onGoogleLogin: () => Promise<boolean>;
}) {
  const [authMode, setAuthMode] = useState<
    "login" | "register" | "verifySignup" | "recover" | "verifyRecovery" | "resetPassword"
  >("login");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [registration, setRegistration] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [pendingEmail, setPendingEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authMode === "login") {
      void onLogin(credentials.email, credentials.password);
      return;
    }

    if (authMode === "register") {
      if (!allowRegistration) {
        return;
      }

      const registered = await onRegister(registration);
      if (registered) {
        setPendingEmail(registration.email.trim());
        setVerificationCode("");
        setAuthMode("verifySignup");
      }
      return;
    }

    if (authMode === "verifySignup") {
      const verified = await onVerifySignup(pendingEmail, verificationCode);
      if (verified) {
        setCredentials((current) => ({ ...current, email: pendingEmail }));
        setAuthMode("login");
      }
      return;
    }

    if (authMode === "recover") {
      const sent = await onSendRecovery(recoveryEmail);
      if (sent) {
        setPendingEmail(recoveryEmail.trim());
        setVerificationCode("");
        setAuthMode("verifyRecovery");
      }
      return;
    }

    if (authMode === "verifyRecovery") {
      const verified = await onVerifyRecovery(pendingEmail, verificationCode);
      if (verified) {
        setNewPassword("");
        setAuthMode("resetPassword");
      }
      return;
    }

    if (authMode === "resetPassword") {
      const updated = await onUpdatePassword(newPassword);
      if (updated) {
        setCredentials((current) => ({ ...current, email: pendingEmail }));
        setAuthMode("login");
      }
    }
  }

  const isCodeMode = authMode === "verifySignup" || authMode === "verifyRecovery";
  const title =
    authMode === "register"
      ? t.createAccountTitle
      : authMode === "verifySignup"
        ? t.codeSentTitle
        : authMode === "recover"
          ? t.forgotPassword
          : authMode === "verifyRecovery"
            ? t.recoveryCodeTitle
            : authMode === "resetPassword"
              ? t.newPasswordTitle
              : t.signInTitle;

  return (
    <form
      onSubmit={submitAuth}
      className="mx-auto mt-8 grid w-full max-w-[28rem] gap-5 rounded-xl border border-[#d8d8d8] bg-white px-7 py-8 text-[#111111] shadow-[0_18px_48px_rgba(17,17,17,0.14)]"
    >
      <div className="text-center">
        <p className="text-xl font-bold tracking-[0.08em]">MM</p>
        <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
        {isCodeMode ? (
          <p className="mt-2 text-sm text-[#666666]">
            {t.enterCodeFor.replace("{email}", pendingEmail)}
          </p>
        ) : null}
      </div>

      {allowRegistration && (authMode === "login" || authMode === "register") ? (
        <div className="grid grid-cols-2 rounded-md bg-[#f0f0f0] p-1">
          <button
            type="button"
            onClick={() => setAuthMode("login")}
            className={authModeTabClass(authMode === "login")}
          >
            {t.login}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("register")}
            className={authModeTabClass(authMode === "register")}
          >
            {t.register}
          </button>
        </div>
      ) : null}

      {authMode === "login" && showGoogle ? (
        <button
          type="button"
          onClick={() => void onGoogleLogin()}
          disabled={isLoading}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#d7d7d7] bg-white text-sm font-semibold text-[#333333] transition hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="text-base font-bold text-[#4285f4]">G</span>
          {t.continueWithGoogle}
        </button>
      ) : null}

      {allowRegistration && authMode === "register" ? (
        <div className="grid gap-3">
          <AuthInput
            label={t.firstName}
            value={registration.firstName}
            onChange={(value) =>
              setRegistration((current) => ({ ...current, firstName: value }))
            }
          />
          <AuthInput
            label={t.lastName}
            value={registration.lastName}
            onChange={(value) =>
              setRegistration((current) => ({ ...current, lastName: value }))
            }
          />
          <AuthInput
            label={t.email}
            type="email"
            value={registration.email}
            onChange={(value) =>
              setRegistration((current) => ({ ...current, email: value }))
            }
          />
          <AuthInput
            label={t.password}
            type="password"
            value={registration.password}
            minLength={6}
            onChange={(value) =>
              setRegistration((current) => ({ ...current, password: value }))
            }
          />
        </div>
      ) : null}

      {authMode === "login" ? (
        <div className="grid gap-3">
          <AuthInput
            label={t.email}
            type="email"
            value={credentials.email}
            onChange={(value) =>
              setCredentials((current) => ({ ...current, email: value }))
            }
          />
          <AuthInput
            label={t.password}
            type="password"
            value={credentials.password}
            onChange={(value) =>
              setCredentials((current) => ({ ...current, password: value }))
            }
          />
          <button
            type="button"
            onClick={() => {
              setRecoveryEmail(credentials.email);
              setAuthMode("recover");
            }}
            className="w-fit cursor-pointer justify-self-end text-sm font-medium text-[#111111] underline-offset-4 hover:underline"
          >
            {t.forgotPassword}
          </button>
        </div>
      ) : null}

      {isCodeMode ? (
        <div className="grid gap-3">
          <AuthInput
            label={t.verificationCode}
            value={verificationCode}
            inputMode="numeric"
            maxLength={8}
            onChange={(value) => setVerificationCode(value.replace(/\D/g, ""))}
          />
          <div className="flex flex-col gap-2 text-center text-sm sm:flex-row sm:items-center sm:justify-center">
            <span className="text-[#666666]">{t.didNotGetCode}</span>
            <button
              type="button"
              onClick={() =>
                void (authMode === "verifySignup"
                  ? onResendSignup(pendingEmail)
                  : onSendRecovery(pendingEmail))
              }
              className="cursor-pointer font-semibold text-[#111111] underline-offset-4 hover:underline"
            >
              {t.resendCode}
            </button>
            <button
              type="button"
              onClick={() => {
                setVerificationCode("");
                setAuthMode(authMode === "verifySignup" ? "register" : "recover");
              }}
              className="cursor-pointer font-semibold text-[#111111] underline-offset-4 hover:underline"
            >
              {t.useDifferentEmail}
            </button>
          </div>
        </div>
      ) : null}

      {authMode === "recover" ? (
        <AuthInput
          label={t.email}
          type="email"
          value={recoveryEmail}
          onChange={setRecoveryEmail}
        />
      ) : null}

      {authMode === "resetPassword" ? (
        <AuthInput
          label={t.newPassword}
          type="password"
          value={newPassword}
          minLength={6}
          onChange={setNewPassword}
        />
      ) : null}

      {notice ? (
        <p className="rounded-md border border-[#e5e5e5] bg-[#fafafa] px-3 py-2 text-center text-sm text-[#4b4b4b]">
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading || (isCodeMode && verificationCode.length < 4)}
        className="h-12 cursor-pointer rounded-md bg-[#111111] px-4 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:bg-[#b5b5b5]"
      >
        {isLoading
          ? t.loading
          : authMode === "login"
            ? t.login
            : authMode === "register"
              ? t.signUp
              : authMode === "recover"
                ? t.sendCode
                : authMode === "resetPassword"
                  ? t.savePassword
                  : t.next}
      </button>

      {allowRegistration && (authMode === "login" || authMode === "register") ? (
        <p className="text-center text-sm text-[#6b6b6b]">
          {authMode === "login" ? t.noAccount : t.alreadyAccount}{" "}
          <button
            type="button"
            onClick={() =>
              setAuthMode((current) => (current === "login" ? "register" : "login"))
            }
            className="cursor-pointer font-semibold text-[#111111] underline-offset-4 hover:underline"
          >
            {authMode === "login" ? t.register : t.login}
          </button>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setAuthMode("login")}
          className="cursor-pointer text-sm font-semibold text-[#111111] underline-offset-4 hover:underline"
        >
          {t.backToLogin}
        </button>
      )}
    </form>
  );
}

function AuthInput({
  label,
  type = "text",
  value,
  inputMode,
  maxLength,
  minLength,
  onChange,
}: {
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  minLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[#5b5b5b]">
      <span>{label}</span>
      <input
        required
        type={type}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        minLength={minLength}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-md border border-[#d7d7d7] bg-[#eef4ff] px-3 text-base text-[#111111] outline-none transition focus:border-[#111111] focus:bg-white focus:ring-2 focus:ring-[#111111]/10"
      />
    </label>
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
    <article className="border border-[#d7d7d7] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#111111]">
            {appointment.patientName}
          </p>
          <p className="mt-1 text-sm text-[#666666]">
            {formatDateTime(appointment.startsAt, locale)} -{" "}
            {service.durationMinutes} min
          </p>
          {!compact ? (
            <p className="mt-2 text-sm text-[#666666]">
              {service.title[locale]} · {appointment.patientEmail}
            </p>
          ) : null}
        </div>
        <span className={statusClass(appointment.status)}>
          {t[appointment.status]}
        </span>
      </div>

      {!compact && appointment.notes ? (
        <p className="mt-3 bg-[#f5f5f5] p-3 text-sm text-[#404040]">
          {appointment.notes}
        </p>
      ) : null}

      {appointment.status === "pending_approval" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void onStatusChange(appointment.id, "confirmed")}
            disabled={isUpdating}
            className="h-10 cursor-pointer bg-[#111111] px-4 text-sm font-semibold text-white transition hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:bg-[#b5b5b5]"
          >
            {t.approve}
          </button>
          <button
            type="button"
            onClick={() => void onStatusChange(appointment.id, "declined")}
            disabled={isUpdating}
            className="h-10 cursor-pointer border border-[#111111] px-4 text-sm font-semibold text-[#111111] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t.decline}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function logTechnicalError(error: unknown) {
  console.error(error);
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

const adminInputClass =
  "min-h-11 w-full border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#111111] outline-none transition focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/10";

function authModeTabClass(active: boolean) {
  return [
    "h-10 cursor-pointer rounded-[4px] text-sm font-semibold transition",
    active
      ? "bg-white text-[#111111] shadow-[0_1px_5px_rgba(17,17,17,0.12)]"
      : "text-[#777777] hover:text-[#111111]",
  ].join(" ");
}

function filterButtonClass(active: boolean) {
  return [
    "h-9 cursor-pointer border px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#111111]/15",
    active
      ? "border-[#111111] bg-[#111111] text-white"
      : "border-[#d7d7d7] bg-white text-[#404040] hover:border-[#111111] hover:text-[#111111]",
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
    "flex h-20 min-w-[4.5rem] cursor-pointer flex-col items-center justify-center gap-0 rounded-xl border px-3 py-2 transition",
    "focus:outline-none focus:ring-2 focus:ring-[#111111]/20",
    active
      ? "border-[#111111] bg-[#111111] text-white"
      : "border-[#e5e5e5] bg-[#fafafa] text-[#404040] hover:border-[#a3a3a3]",
  ].join(" ");
}

function adminDatePillClass(active: boolean) {
  return [
    "flex h-20 min-w-[4.5rem] cursor-pointer flex-col items-center justify-center gap-0 border px-3 py-2 text-center transition",
    "focus:outline-none focus:ring-2 focus:ring-[#111111]/15",
    active
      ? "border-[#111111] bg-[#111111] text-white"
      : "border-[#d7d7d7] bg-white text-[#404040] hover:border-[#111111]",
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
  const base = "w-fit border px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em]";
  const colors: Record<AppointmentStatus, string> = {
    pending_approval: "border-[#111111] bg-white text-[#111111]",
    confirmed: "border-[#111111] bg-[#111111] text-white",
    declined: "border-[#d7d7d7] bg-[#f5f5f5] text-[#666666]",
    cancelled: "border-[#d7d7d7] bg-[#eeeeee] text-[#666666]",
    completed: "border-[#111111] bg-white text-[#111111]",
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

/**
 * Por que existe: mantiene juntos en el panel los turnos nacidos de una misma
 * solicitud mensual mientras cada tarjeta conserva sus acciones individuales.
 * @returns Grupos en el orden original de la bandeja administrativa.
 * Efectos secundarios: ninguno.
 */
function groupAdminAppointments(appointments: Appointment[]) {
  const groups = new Map<
    string,
    { appointments: Appointment[]; key: string; requestId?: string }
  >();

  appointments.forEach((appointment) => {
    const key = appointment.requestId ?? appointment.id;
    const current = groups.get(key);
    if (current) {
      current.appointments.push(appointment);
      return;
    }

    groups.set(key, {
      appointments: [appointment],
      key,
      requestId: appointment.requestId,
    });
  });

  return Array.from(groups.values());
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

/**
 * Por que existe: recupera el telefono ya usado por un paciente autenticado
 * para precargar una nueva reserva sin pedirle sus datos nuevamente.
 * @returns Codigo de pais conocido y numero compuesto solo por digitos.
 * Efectos secundarios: ninguno.
 */
function splitStoredPhone(value: string) {
  const storedPhone = value.trim();
  const country =
    [...phoneCountries]
      .sort((first, second) => second.code.length - first.code.length)
      .find((item) => storedPhone.startsWith(item.code)) ?? phoneCountries[0];
  const phone = storedPhone.startsWith(country.code)
    ? onlyDigits(storedPhone.slice(country.code.length))
    : onlyDigits(storedPhone);

  return {
    countryCode: country.code,
    phone,
  };
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

function shiftDateValue(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function getShortDayMonthLabel(dateValue: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : locale, {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(new Date(`${dateValue}T00:00:00`));
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
