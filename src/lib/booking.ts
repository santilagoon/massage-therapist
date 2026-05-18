export type Locale = "es" | "en" | "ru";

export type Service = {
  id: string;
  slug: string;
  durationMinutes: number;
  priceLabel: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
};

export type AppointmentStatus =
  | "pending_approval"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "completed";

export type Appointment = {
  id: string;
  serviceId: string;
  startsAt: string;
  endsAt: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  language: Locale;
  notes: string;
  status: AppointmentStatus;
  createdAt: string;
};

export const locales: Locale[] = ["es", "en", "ru"];

export const timeZone = "America/Argentina/Buenos_Aires";

export const services: Service[] = [
  {
    id: "therapeutic-60",
    slug: "therapeutic-60",
    durationMinutes: 60,
    priceLabel: "ARS",
    title: {
      es: "Masaje terapeutico",
      en: "Therapeutic massage",
      ru: "Терапевтический массаж",
    },
    description: {
      es: "Para dolor muscular, tension cervical, espalda y recuperacion general.",
      en: "For muscle pain, neck tension, back care, and general recovery.",
      ru: "Для мышечной боли, напряжения в шее, спины и восстановления.",
    },
  },
  {
    id: "sports-90",
    slug: "sports-90",
    durationMinutes: 90,
    priceLabel: "ARS",
    title: {
      es: "Masaje deportivo",
      en: "Sports massage",
      ru: "Спортивный массаж",
    },
    description: {
      es: "Ideal para deportistas, cargas de entrenamiento y movilidad.",
      en: "Ideal for athletes, training load, and mobility work.",
      ru: "Подходит спортсменам, при нагрузках и для работы с подвижностью.",
    },
  },
  {
    id: "deep-recovery-120",
    slug: "deep-recovery-120",
    durationMinutes: 120,
    priceLabel: "ARS",
    title: {
      es: "Recuperacion profunda",
      en: "Deep recovery",
      ru: "Глубокое восстановление",
    },
    description: {
      es: "Sesion extendida para abordaje completo y trabajo por zonas.",
      en: "Extended session for a complete treatment and focused body areas.",
      ru: "Расширенный сеанс для комплексной работы и отдельных зон.",
    },
  },
];

export const initialAppointments: Appointment[] = [
  {
    id: "demo-1",
    serviceId: "sports-90",
    startsAt: makeIsoForDayOffset(1, 11, 0),
    endsAt: makeIsoForDayOffset(1, 12, 30),
    patientName: "Lucia Gomez",
    patientEmail: "lucia@example.com",
    patientPhone: "+54 9 11 5555-1212",
    language: "es",
    notes: "Molestia en gemelos despues de correr.",
    status: "pending_approval",
    createdAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    serviceId: "therapeutic-60",
    startsAt: makeIsoForDayOffset(2, 15, 0),
    endsAt: makeIsoForDayOffset(2, 16, 0),
    patientName: "Anna Petrova",
    patientEmail: "anna@example.com",
    patientPhone: "",
    language: "ru",
    notes: "Neck and upper back tension.",
    status: "confirmed",
    createdAt: new Date().toISOString(),
  },
];

export const translations = {
  es: {
    appName: "Turnos de masaje",
    eyebrow: "Terapia manual en Buenos Aires",
    title: "Reserva online con aprobacion profesional",
    subtitle:
      "El paciente solicita un horario disponible y la masajista confirma si acepta el turno. Sin WhatsApp manual como primer paso.",
    bookTab: "Reservar",
    adminTab: "Panel",
    language: "Idioma",
    service: "Servicio",
    date: "Fecha",
    time: "Horario",
    patient: "Datos del paciente",
    fullName: "Nombre completo",
    email: "Email",
    phone: "Telefono opcional",
    phoneCountry: "Pais",
    phoneNumber: "Numero",
    notes: "Notas o motivo de consulta",
    nameError:
      "Ingresá nombre y apellido usando solo letras, espacios, apostrofes o guiones.",
    emailError: "Ingresá un email válido, por ejemplo nombre@email.com.",
    phoneError: "Ingresá solo números para el país elegido.",
    notesError: "Las notas deben tener entre 3 y 600 caracteres.",
    slotError: "Elegí un horario disponible.",
    formHasErrors: "Revisá los campos marcados antes de solicitar el turno.",
    request: "Solicitar pre-aprobacion",
    pendingCopy:
      "La solicitud bloquea el horario y queda pendiente hasta que la masajista la confirme.",
    noSlots: "No hay horarios disponibles para esa fecha.",
    success: "Solicitud creada. El turno queda pendiente de aprobacion.",
    adminTitle: "Solicitudes y turnos",
    adminLoginTitle: "Ingreso de la masajista",
    adminLoginHint:
      "Usá el usuario creado en Supabase Auth para ver y gestionar turnos reales.",
    password: "Contraseña",
    login: "Ingresar",
    logout: "Salir",
    refresh: "Actualizar",
    loggedInAs: "Sesión iniciada como",
    adminLoginRequired:
      "Para proteger los datos de pacientes, el panel requiere iniciar sesión.",
    adminLoaded: "Panel conectado a Supabase.",
    adminUpdated: "Turno actualizado.",
    allAppointments: "Todos",
    totalAppointments: "Total",
    pendingAppointments: "Pendientes",
    confirmedAppointments: "Confirmados",
    futureAppointments: "Futuros",
    noFilteredAppointments: "No hay turnos para este filtro.",
    approve: "Confirmar",
    decline: "Rechazar",
    status: "Estado",
    pending_approval: "Pendiente",
    confirmed: "Confirmado",
    declined: "Rechazado",
    cancelled: "Cancelado",
    completed: "Realizado",
    emptyAdmin: "Todavia no hay solicitudes.",
    loading: "Conectando con Supabase...",
    remoteReady: "Conectado a Supabase.",
    localMode:
      "Modo local activo. Revisá las variables de Supabase o ejecutá el SQL pendiente.",
    remoteRequestSuccess:
      "Solicitud enviada a Supabase. El turno queda pendiente de aprobacion.",
    emailSkipped:
      "El turno se guardo correctamente, pero el email no pudo enviarse o aun no esta configurado.",
    schedule: "Lun a Vie, 9:00 a 19:00. Sabados configurables.",
    timezone: "Hora de Argentina",
    howItWorksTitle: "Como funciona",
    stepChoose: "Elegis servicio, fecha y horario disponible.",
    stepPending: "El turno queda pendiente de aprobacion profesional.",
    stepEmail: "Recibis un email cuando la masajista confirma o rechaza.",
    privacyTitle: "Datos protegidos",
    privacyCopy:
      "La informacion del paciente solo se ve en el panel privado de la masajista.",
  },
  en: {
    appName: "Massage booking",
    eyebrow: "Manual therapy in Buenos Aires",
    title: "Online booking with professional approval",
    subtitle:
      "Patients request an available slot and the therapist confirms whether to accept it. No manual WhatsApp first step.",
    bookTab: "Book",
    adminTab: "Admin",
    language: "Language",
    service: "Service",
    date: "Date",
    time: "Time",
    patient: "Patient details",
    fullName: "Full name",
    email: "Email",
    phone: "Optional phone",
    phoneCountry: "Country",
    phoneNumber: "Number",
    notes: "Notes or reason for visit",
    nameError:
      "Enter first and last name using only letters, spaces, apostrophes, or hyphens.",
    emailError: "Enter a valid email, for example name@email.com.",
    phoneError: "Enter numbers only for the selected country.",
    notesError: "Notes must be between 3 and 600 characters.",
    slotError: "Choose an available time.",
    formHasErrors: "Review the highlighted fields before requesting the appointment.",
    request: "Request pre-approval",
    pendingCopy:
      "The request blocks the slot and remains pending until the therapist confirms it.",
    noSlots: "No available times for this date.",
    success: "Request created. The appointment is pending approval.",
    adminTitle: "Requests and appointments",
    adminLoginTitle: "Therapist sign in",
    adminLoginHint:
      "Use the user created in Supabase Auth to view and manage real appointments.",
    password: "Password",
    login: "Sign in",
    logout: "Sign out",
    refresh: "Refresh",
    loggedInAs: "Signed in as",
    adminLoginRequired:
      "To protect patient data, the admin panel requires sign in.",
    adminLoaded: "Admin panel connected to Supabase.",
    adminUpdated: "Appointment updated.",
    allAppointments: "All",
    totalAppointments: "Total",
    pendingAppointments: "Pending",
    confirmedAppointments: "Confirmed",
    futureAppointments: "Future",
    noFilteredAppointments: "No appointments for this filter.",
    approve: "Confirm",
    decline: "Decline",
    status: "Status",
    pending_approval: "Pending",
    confirmed: "Confirmed",
    declined: "Declined",
    cancelled: "Cancelled",
    completed: "Completed",
    emptyAdmin: "No requests yet.",
    loading: "Connecting to Supabase...",
    remoteReady: "Connected to Supabase.",
    localMode:
      "Local mode active. Check Supabase variables or run the pending SQL.",
    remoteRequestSuccess:
      "Request sent to Supabase. The appointment is pending approval.",
    emailSkipped:
      "The appointment was saved, but email could not be sent or is not configured yet.",
    schedule: "Mon to Fri, 9:00 to 19:00. Saturdays configurable.",
    timezone: "Argentina time",
    howItWorksTitle: "How it works",
    stepChoose: "Choose a service, date, and available time.",
    stepPending: "The appointment stays pending professional approval.",
    stepEmail: "You receive an email when the therapist confirms or declines.",
    privacyTitle: "Protected data",
    privacyCopy:
      "Patient information is only visible in the therapist's private panel.",
  },
  ru: {
    appName: "Запись на массаж",
    eyebrow: "Мануальная терапия в Буэнос-Айресе",
    title: "Онлайн-запись с подтверждением специалиста",
    subtitle:
      "Пациент выбирает свободное время, а массажист подтверждает, принимает ли запись.",
    bookTab: "Запись",
    adminTab: "Панель",
    language: "Язык",
    service: "Услуга",
    date: "Дата",
    time: "Время",
    patient: "Данные пациента",
    fullName: "Полное имя",
    email: "Email",
    phone: "Телефон, необязательно",
    phoneCountry: "Страна",
    phoneNumber: "Номер",
    notes: "Комментарий или причина визита",
    nameError:
      "Введите имя и фамилию, используя только буквы, пробелы, апострофы или дефисы.",
    emailError: "Введите корректный email, например name@email.com.",
    phoneError: "Введите только цифры для выбранной страны.",
    notesError: "Комментарий должен содержать от 3 до 600 символов.",
    slotError: "Выберите доступное время.",
    formHasErrors: "Проверьте отмеченные поля перед отправкой запроса.",
    request: "Запросить предварительное подтверждение",
    pendingCopy:
      "Запрос блокирует время и остается ожидающим, пока специалист его не подтвердит.",
    noSlots: "На эту дату нет свободного времени.",
    success: "Запрос создан. Запись ожидает подтверждения.",
    adminTitle: "Запросы и записи",
    adminLoginTitle: "Вход для специалиста",
    adminLoginHint:
      "Используйте пользователя, созданного в Supabase Auth, чтобы управлять записями.",
    password: "Пароль",
    login: "Войти",
    logout: "Выйти",
    refresh: "Обновить",
    loggedInAs: "Вход выполнен как",
    adminLoginRequired:
      "Для защиты данных пациентов панель требует входа.",
    adminLoaded: "Панель подключена к Supabase.",
    adminUpdated: "Запись обновлена.",
    allAppointments: "Все",
    totalAppointments: "Всего",
    pendingAppointments: "Ожидают",
    confirmedAppointments: "Подтверждены",
    futureAppointments: "Будущие",
    noFilteredAppointments: "Нет записей для этого фильтра.",
    approve: "Подтвердить",
    decline: "Отклонить",
    status: "Статус",
    pending_approval: "Ожидает",
    confirmed: "Подтверждено",
    declined: "Отклонено",
    cancelled: "Отменено",
    completed: "Завершено",
    emptyAdmin: "Пока нет запросов.",
    loading: "Подключение к Supabase...",
    remoteReady: "Подключено к Supabase.",
    localMode:
      "Активен локальный режим. Проверьте переменные Supabase или выполните SQL.",
    remoteRequestSuccess:
      "Запрос отправлен в Supabase. Запись ожидает подтверждения.",
    emailSkipped:
      "Запись сохранена, но email не был отправлен или еще не настроен.",
    schedule: "Пн-Пт, 9:00-19:00. Суббота настраивается.",
    timezone: "Время Аргентины",
    howItWorksTitle: "Как это работает",
    stepChoose: "Выберите услугу, дату и доступное время.",
    stepPending: "Запись ожидает подтверждения специалиста.",
    stepEmail: "Вы получите email после подтверждения или отклонения.",
    privacyTitle: "Защита данных",
    privacyCopy:
      "Данные пациента видны только в приватной панели специалиста.",
  },
} satisfies Record<Locale, Record<string, string>>;

export function makeIsoForDayOffset(dayOffset: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function getInitialDate() {
  const date = new Date();
  while (!isBookableWeekday(date)) {
    date.setDate(date.getDate() + 1);
  }
  return toDateInputValue(date);
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function getAvailableSlots(
  dateValue: string,
  service: Service,
  appointments: Appointment[],
) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (!isBookableWeekday(date)) {
    return [];
  }

  const slots: string[] = [];
  const openingHour = 9;
  const closingHour = 19;
  const intervalMinutes = 30;

  for (
    let hour = openingHour, minute = 0;
    hour * 60 + minute + service.durationMinutes <= closingHour * 60;
    minute += intervalMinutes
  ) {
    if (minute >= 60) {
      hour += 1;
      minute = 0;
    }

    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);
    const slotEnd = addMinutes(slotStart, service.durationMinutes);

    const isBlocked = appointments.some((appointment) => {
      if (appointment.status === "declined" || appointment.status === "cancelled") {
        return false;
      }

      return rangesOverlap(
        slotStart,
        slotEnd,
        new Date(appointment.startsAt),
        new Date(appointment.endsAt),
      );
    });

    if (!isBlocked && slotStart > new Date()) {
      slots.push(slotStart.toISOString());
    }
  }

  return slots;
}

export function createAppointment(input: {
  service: Service;
  startsAt: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  language: Locale;
  notes: string;
}): Appointment {
  const start = new Date(input.startsAt);
  const end = addMinutes(start, input.service.durationMinutes);

  return {
    id: crypto.randomUUID(),
    serviceId: input.service.id,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    patientName: input.patientName,
    patientEmail: input.patientEmail,
    patientPhone: input.patientPhone,
    language: input.language,
    notes: input.notes,
    status: "pending_approval",
    createdAt: new Date().toISOString(),
  };
}

export function findService(serviceId: string) {
  return services.find((service) => service.id === serviceId) ?? services[0];
}

export function findServiceInList(serviceId: string, serviceList: Service[]) {
  return serviceList.find((service) => service.id === serviceId) ?? serviceList[0];
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return startA < endB && startB < endA;
}

function isBookableWeekday(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}
