export type Locale = "es" | "en" | "ru";

export type Service = {
  id: string;
  slug: string;
  durationMinutes: number;
  priceLabel: string;
  priceCents?: number | null;
  priceUsdCents?: number | null;
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
    priceCents: 5500000,
    priceUsdCents: 4000,
    title: {
      es: "Masaje descontracturante",
      en: "Deep tissue massage",
      ru: "Глубокий расслабляющий массаж",
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
    priceCents: 6500000,
    priceUsdCents: 4500,
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
    priceCents: 9000000,
    priceUsdCents: 6500,
    title: {
      es: "Masaje descontracturante extendido",
      en: "Extended deep tissue massage",
      ru: "Расширенный глубокий массаж",
    },
    description: {
      es: "Sesion extendida para abordaje completo y trabajo por zonas.",
      en: "Extended session for a complete treatment and focused body areas.",
      ru: "Расширенный сеанс для комплексной работы и отдельных зон.",
    },
  },
  {
    id: "body-rehabilitation",
    slug: "body-rehabilitation",
    durationMinutes: 60,
    priceLabel: "ARS",
    priceCents: null,
    priceUsdCents: null,
    title: {
      es: "Servicio de rehabilitacion corporal",
      en: "Body rehabilitation service",
      ru: "Телесная реабилитация",
    },
    description: {
      es: "Abordaje personalizado para recuperar movilidad, aliviar molestias y acompanar procesos de rehabilitacion.",
      en: "Personalized support to restore mobility, ease discomfort, and support rehabilitation processes.",
      ru: "Индивидуальный подход для восстановления подвижности, снятия дискомфорта и поддержки реабилитации.",
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
    professionalName: "Maria Mikhailova",
    professionalRole: "Masajista Terapeutica",
    navHome: "Home",
    navServices: "Servicios",
    navBenefits: "Beneficios",
    navAbout: "Acerca de Maria",
    eyebrow: "",
    title: "",
    subtitle:
      "Sesiones de masaje terapeutico y deportivo orientadas a aliviar tension, mejorar movilidad y acompañar la recuperacion corporal.",
    bookTab: "Reservar",
    adminTab: "Ingresar",
    loginAdmin: "Ingresar",
    currency: "Moneda",
    arsCurrency: "$ARG",
    usdCurrency: "USD",
    language: "Idioma",
    appointmentPlace: "Modalidad de atencion",
    placeHome: "A domicilio",
    placeZapiola: "Zapiola",
    placeOtherStudio: "Otro domicilio de atención",
    patientAddress: "Dirección para domicilio",
    addressPlaceholder: "Ej: Av. Santa Fe 2450, Palermo, CABA",
    addressStreet: "Calle",
    addressStreetPlaceholder: "Ej: Juana Azurduy",
    addressNumber: "Número",
    addressApartment: "Departamento (opcional)",
    addressNeighborhood: "Barrio (opcional)",
    addressError: "Ingresá la direccion para el servicio a domicilio.",
    addressStreetError: "Ingresá la calle.",
    addressNumberError: "Ingresá la altura.",
    service: "Servicio",
    date: "Fecha",
    time: "Horario",
    patient: "Datos del paciente",
    fullName: "Nombre completo",
    email: "Email",
    phone: "Telefono",
    phoneCountry: "Pais",
    phoneNumber: "Numero",
    notes: "Notas o motivo de consulta",
    chooseService: "Elegi el servicio",
    chooseDay: "Elegi el dia",
    chooseTime: "Elegi el horario",
    summary: "Resumen",
    duration: "Duracion",
    total: "Total",
    priceToConfirm: "Precio a consultar",
    openCalendar: "Abrir calendario",
    contactTitle: "Consultas",
    contactCopy: "Si tenes una consulta antes de reservar, escribile a Maria desde este formulario.",
    contactName: "Nombre",
    contactMessage: "Consulta",
    contactSend: "Enviar consulta",
    contactSuccess: "Consulta enviada correctamente.",
    contactError: "No se pudo enviar la consulta. Intentá nuevamente.",
    selected: "Seleccionado",
    nameError:
      "Ingresá nombre y apellido usando solo letras, espacios, apostrofes o guiones.",
    emailError: "Ingresá un email válido, por ejemplo nombre@email.com.",
    phoneError: "Ingresá solo números para el país elegido.",
    phoneRequired: "Ingresá un número de teléfono.",
    notesError: "Las notas deben tener entre 3 y 600 caracteres.",
    slotError: "Elegí un horario disponible.",
    formHasErrors: "Revisá los campos marcados antes de solicitar el turno.",
    request: "Solicitar pre-aprobacion",
    preApprovalSent: "Solicitud enviada",
    requestCode: "Código de solicitud",
    preApprovalExplanation:
      "Tu solicitud fue enviada correctamente y queda pendiente de aprobación profesional. Maria revisará los datos y confirmará si puede tomar el turno.",
    emailSentTo: "Enviamos el detalle de la solicitud a {email}.",
    spamReminder: "Si no ves el email, revisá Spam o Correo no deseado.",
    newRequest: "Hacer otra solicitud",
    close: "Entendido",
    pendingCopy:
      "La solicitud bloquea el horario y queda pendiente hasta que la masajista la confirme.",
    noSlots: "No hay horarios disponibles para esa fecha.",
    success: "Solicitud creada. El turno queda pendiente de aprobacion.",
    adminTitle: "Solicitudes y turnos",
    adminPanel: "Panel",
    adminServices: "Servicios",
    adminAgenda: "Agenda",
    adminRequests: "Solicitudes",
    adminBlocks: "Bloquear Dias",
    adminTeam: "Equipo",
    adminClients: "Clientes",
    adminIncome: "Ingresos",
    adminProfile: "Perfil",
    adminGreeting: "Hola Maria :)",
    todayPatients: "Pacientes hoy",
    todayConfirmed: "Confirmados hoy",
    todayPending: "Por confirmar",
    todayAvailable: "Horarios disponibles",
    requestsIntro: "Revisá primero las solicitudes pendientes y filtrá rápido por paciente o servicio.",
    requestSearchPlaceholder: "Buscar solicitud...",
    servicesPending:
      "Vista inicial de servicios. La edición completa de precios y duración queda preparada para la próxima etapa.",
    teamPending: "Por ahora trabaja una profesional. Esta sección queda lista para sumar equipo más adelante.",
    clientsRegistered: "registrados",
    noClientsYet: "Todavia no hay clientes registrados.",
    appointmentsLabel: "turnos",
    incomePending:
      "Primer resumen de ingresos. En la próxima etapa sumaremos edición manual y gráficos mensuales.",
    dailyIncome: "Ingresos diarios",
    monthlyIncome: "Ingresos mensuales",
    completedAppointments: "Turnos realizados",
    incomeManualPending:
      "Pendiente: campo para registrar dinero ingresado por fuera o precios acordados a consultar.",
    adminLoginTitle: "Ingresar",
    adminLoginHint: "",
    password: "Contraseña",
    login: "Ingresar",
    register: "Registrarse",
    logout: "Salir",
    refresh: "Actualizar",
    loggedInAs: "Sesión iniciada como",
    adminLoginRequired:
      "Para proteger los datos de pacientes, el panel requiere iniciar sesión.",
    adminLoaded: "",
    adminUpdated: "Turno actualizado.",
    signInError: "No se pudo iniciar sesión. Revisá el email y la contraseña.",
    accountNotConfirmed:
      "La cuenta existe, pero todavía falta confirmarla antes de ingresar.",
    accessUnavailable:
      "El sistema de acceso no está disponible en este momento. Intentá nuevamente.",
    systemError: "No se pudo completar la acción. Intentá nuevamente.",
    blockCreated: "Horario bloqueado correctamente.",
    blockDaysTitle: "Bloquear dias y horarios",
    blockDaysCopy: "Bloqueá dias libres, feriados, vacaciones o franjas donde no se atiende.",
    blockStart: "Desde",
    blockEnd: "Hasta",
    blockReason: "Motivo opcional",
    blockDay: "Bloquear horario",
    blockedTime: "Bloqueado",
    noAppointmentsThisDay: "Sin turnos este dia",
    shareBookingLink: "Compartí tu link para recibir reservas",
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
    loading: "Conectando...",
    remoteReady: "",
    localMode: "No se pudo conectar con el sistema de turnos.",
    remoteRequestSuccess:
      "Solicitud enviada. El turno queda pendiente de aprobacion.",
    emailSkipped:
      "El turno se guardo correctamente, pero el email no pudo enviarse o aun no esta configurado.",
    schedule: "",
    timezone: "Hora de Argentina",
    howItWorksTitle: "Como funciona",
    stepChoose: "Elegis servicio, fecha y horario disponible.",
    stepPending: "El turno queda pendiente de aprobacion profesional.",
    stepEmail: "Recibis un email cuando la masajista confirma o rechaza.",
    benefitsTitle: "Beneficios del masaje",
    benefitsIntro:
      "El masaje terapeutico puede ayudar a regular el sistema nervioso, reducir tension muscular y acompañar procesos de recuperacion corporal.",
    benefitReleaseTitle: "Alivio de tension y estres",
    benefitReleaseCopy:
      "El trabajo manual favorece la relajacion profunda, puede estimular la liberacion de endorfinas y dopamina, y ayuda a bajar la carga de estres acumulada.",
    benefitSportTitle: "Movilidad y rendimiento deportivo",
    benefitSportCopy:
      "Las sesiones deportivas se orientan a descargar zonas sobreexigidas, mejorar rango de movimiento y acompañar la recuperacion despues del entrenamiento.",
    benefitRecoveryTitle: "Rehabilitacion corporal",
    benefitRecoveryCopy:
      "Un abordaje personalizado permite trabajar molestias especificas, postura, movilidad y procesos de recuperacion con criterio corporal y kinesiologico.",
    aboutMariaCopy:
      "Soy una masajista profesional originaria de Rusia y viviendo en Argentina. Mi trabajo integra masaje terapeutico, deportologia y rehabilitacion corporal, con formacion vinculada a estudios kinesiologicos para acompañar cada proceso de manera personalizada.",
    privacyTitle: "Datos protegidos",
    privacyCopy: "",
  },
  en: {
    appName: "Massage booking",
    professionalName: "Maria Mikhailova",
    professionalRole: "Therapeutic Massage Therapist",
    navHome: "Home",
    navServices: "Services",
    navBenefits: "Benefits",
    navAbout: "About Maria",
    eyebrow: "",
    title: "",
    subtitle:
      "Therapeutic and sports massage sessions focused on easing tension, improving mobility, and supporting body recovery.",
    bookTab: "Book",
    adminTab: "Sign in",
    loginAdmin: "Log In",
    currency: "Currency",
    arsCurrency: "$ARG",
    usdCurrency: "USD",
    language: "Language",
    appointmentPlace: "Appointment location",
    placeHome: "At home",
    placeZapiola: "Zapiola",
    placeOtherStudio: "Other treatment location",
    patientAddress: "Address for home visit",
    addressPlaceholder: "Example: Av. Santa Fe 2450, Palermo, CABA",
    addressStreet: "Street",
    addressStreetPlaceholder: "Example: Juana Azurduy",
    addressNumber: "Number",
    addressApartment: "Apartment (optional)",
    addressNeighborhood: "Neighborhood (optional)",
    addressError: "Enter the address for the home visit.",
    addressStreetError: "Enter the street.",
    addressNumberError: "Enter the street number.",
    service: "Service",
    date: "Date",
    time: "Time",
    patient: "Patient details",
    fullName: "Full name",
    email: "Email",
    phone: "Phone",
    phoneCountry: "Country",
    phoneNumber: "Number",
    notes: "Notes or reason for visit",
    chooseService: "Choose a service",
    chooseDay: "Choose a day",
    chooseTime: "Choose a time",
    summary: "Summary",
    duration: "Duration",
    total: "Total",
    priceToConfirm: "Price on request",
    openCalendar: "Open calendar",
    contactTitle: "Questions",
    contactCopy: "If you have a question before booking, send Maria a message from this form.",
    contactName: "Name",
    contactMessage: "Message",
    contactSend: "Send message",
    contactSuccess: "Message sent successfully.",
    contactError: "The message could not be sent. Please try again.",
    selected: "Selected",
    nameError:
      "Enter first and last name using only letters, spaces, apostrophes, or hyphens.",
    emailError: "Enter a valid email, for example name@email.com.",
    phoneError: "Enter numbers only for the selected country.",
    phoneRequired: "Enter a phone number.",
    notesError: "Notes must be between 3 and 600 characters.",
    slotError: "Choose an available time.",
    formHasErrors: "Review the highlighted fields before requesting the appointment.",
    request: "Request pre-approval",
    preApprovalSent: "Request sent",
    requestCode: "Request code",
    preApprovalExplanation:
      "Your request was sent successfully and is pending professional approval. Maria will review the details and confirm whether she can take the appointment.",
    emailSentTo: "We sent the request details to {email}.",
    spamReminder: "If you do not see the email, check Spam or Junk.",
    newRequest: "Make another request",
    close: "Got it",
    pendingCopy:
      "The request blocks the slot and remains pending until the therapist confirms it.",
    noSlots: "No available times for this date.",
    success: "Request created. The appointment is pending approval.",
    adminTitle: "Requests and appointments",
    adminPanel: "Dashboard",
    adminServices: "Services",
    adminAgenda: "Schedule",
    adminRequests: "Requests",
    adminBlocks: "Block Days",
    adminTeam: "Team",
    adminClients: "Clients",
    adminIncome: "Income",
    adminProfile: "Profile",
    adminGreeting: "Hi Maria :)",
    todayPatients: "Patients today",
    todayConfirmed: "Confirmed today",
    todayPending: "Pending",
    todayAvailable: "Available times",
    requestsIntro: "Review pending requests first and filter quickly by patient or service.",
    requestSearchPlaceholder: "Search request...",
    servicesPending:
      "Initial services view. Full editing for prices and duration is prepared for the next stage.",
    teamPending: "One professional for now. This section is ready for adding a team later.",
    clientsRegistered: "registered",
    noClientsYet: "No clients registered yet.",
    appointmentsLabel: "appointments",
    incomePending:
      "First income summary. In the next stage we will add manual entries and monthly charts.",
    dailyIncome: "Daily income",
    monthlyIncome: "Monthly income",
    completedAppointments: "Completed appointments",
    incomeManualPending:
      "Pending: field to register outside payments or agreed prices for price-on-request services.",
    adminLoginTitle: "Sign in",
    adminLoginHint: "",
    password: "Password",
    login: "Sign in",
    register: "Register",
    logout: "Sign out",
    refresh: "Refresh",
    loggedInAs: "Signed in as",
    adminLoginRequired:
      "To protect patient data, the admin panel requires sign in.",
    adminLoaded: "",
    adminUpdated: "Appointment updated.",
    signInError: "Could not sign in. Check the email and password.",
    accountNotConfirmed:
      "The account exists, but it still needs to be confirmed before signing in.",
    accessUnavailable:
      "The access system is not available right now. Please try again.",
    systemError: "The action could not be completed. Please try again.",
    blockCreated: "Time blocked successfully.",
    blockDaysTitle: "Block days and times",
    blockDaysCopy: "Block days off, holidays, vacations, or time ranges when appointments are unavailable.",
    blockStart: "From",
    blockEnd: "To",
    blockReason: "Optional reason",
    blockDay: "Block time",
    blockedTime: "Blocked",
    noAppointmentsThisDay: "No appointments this day",
    shareBookingLink: "Share your booking link to receive reservations",
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
    loading: "Connecting...",
    remoteReady: "",
    localMode: "Could not connect to the booking system.",
    remoteRequestSuccess:
      "Request sent. The appointment is pending approval.",
    emailSkipped:
      "The appointment was saved, but email could not be sent or is not configured yet.",
    schedule: "Mon to Fri, 9:00 to 19:00. Saturdays configurable.",
    timezone: "Argentina time",
    howItWorksTitle: "How it works",
    stepChoose: "Choose a service, date, and available time.",
    stepPending: "The appointment stays pending professional approval.",
    stepEmail: "You receive an email when the therapist confirms or declines.",
    benefitsTitle: "Massage benefits",
    benefitsIntro:
      "Therapeutic massage can help regulate the nervous system, reduce muscular tension, and support body recovery.",
    benefitReleaseTitle: "Tension and stress relief",
    benefitReleaseCopy:
      "Manual therapy encourages deep relaxation, may support the release of endorphins and dopamine, and helps reduce accumulated stress.",
    benefitSportTitle: "Mobility and sports performance",
    benefitSportCopy:
      "Sports-focused sessions help unload overworked areas, improve range of motion, and support recovery after training.",
    benefitRecoveryTitle: "Body rehabilitation",
    benefitRecoveryCopy:
      "A personalized approach can address specific discomfort, posture, mobility, and recovery processes with body-aware therapeutic criteria.",
    aboutMariaCopy:
      "I am a professional massage therapist from Russia, living in Argentina. My work integrates therapeutic massage, sports therapy, and body rehabilitation, with training connected to kinesiology studies to support each process in a personalized way.",
    privacyTitle: "Protected data",
    privacyCopy:
      "Patient information is only visible in the therapist's private panel.",
  },
  ru: {
    appName: "Запись на массаж",
    professionalName: "Maria Mikhailova",
    professionalRole: "Терапевтический массажист",
    navHome: "Главная",
    navServices: "Услуги",
    navBenefits: "Польза",
    navAbout: "О Марии",
    eyebrow: "",
    title: "",
    subtitle:
      "Сеансы терапевтического и спортивного массажа для снятия напряжения, улучшения подвижности и восстановления тела.",
    bookTab: "Запись",
    adminTab: "Войти",
    loginAdmin: "Log In",
    currency: "Валюта",
    arsCurrency: "$ARG",
    usdCurrency: "USD",
    language: "Язык",
    appointmentPlace: "Место приема",
    placeHome: "На дому",
    placeZapiola: "Zapiola",
    placeOtherStudio: "Другое место приема",
    patientAddress: "Адрес для выезда на дом",
    addressPlaceholder: "Напр.: Av. Santa Fe 2450, Palermo, CABA",
    addressStreet: "Улица",
    addressStreetPlaceholder: "Напр.: Juana Azurduy",
    addressNumber: "Номер дома",
    addressApartment: "Квартира (необязательно)",
    addressNeighborhood: "Район (необязательно)",
    addressError: "Введите адрес для выезда на дом.",
    addressStreetError: "Введите улицу.",
    addressNumberError: "Введите номер дома.",
    service: "Услуга",
    date: "Дата",
    time: "Время",
    patient: "Данные пациента",
    fullName: "Полное имя",
    email: "Email",
    phone: "Телефон",
    phoneCountry: "Страна",
    phoneNumber: "Номер",
    notes: "Комментарий или причина визита",
    chooseService: "Выберите услугу",
    chooseDay: "Выберите день",
    chooseTime: "Выберите время",
    summary: "Итог",
    duration: "Длительность",
    total: "Итого",
    priceToConfirm: "Цена по запросу",
    openCalendar: "Открыть календарь",
    contactTitle: "Вопросы",
    contactCopy: "Если у вас есть вопрос перед записью, отправьте сообщение Марии через эту форму.",
    contactName: "Имя",
    contactMessage: "Сообщение",
    contactSend: "Отправить сообщение",
    contactSuccess: "Сообщение успешно отправлено.",
    contactError: "Не удалось отправить сообщение. Попробуйте еще раз.",
    selected: "Выбрано",
    nameError:
      "Введите имя и фамилию, используя только буквы, пробелы, апострофы или дефисы.",
    emailError: "Введите корректный email, например name@email.com.",
    phoneError: "Введите только цифры для выбранной страны.",
    phoneRequired: "Введите номер телефона.",
    notesError: "Комментарий должен содержать от 3 до 600 символов.",
    slotError: "Выберите доступное время.",
    formHasErrors: "Проверьте отмеченные поля перед отправкой запроса.",
    request: "Запросить предварительное подтверждение",
    preApprovalSent: "Запрос отправлен",
    requestCode: "Код запроса",
    preApprovalExplanation:
      "Ваш запрос успешно отправлен и ожидает подтверждения специалиста. Мария проверит данные и подтвердит, сможет ли принять запись.",
    emailSentTo: "Мы отправили детали запроса на {email}.",
    spamReminder: "Если письма нет, проверьте папку Спам.",
    newRequest: "Создать другой запрос",
    close: "Понятно",
    pendingCopy:
      "Запрос блокирует время и остается ожидающим, пока специалист его не подтвердит.",
    noSlots: "На эту дату нет свободного времени.",
    success: "Запрос создан. Запись ожидает подтверждения.",
    adminTitle: "Запросы и записи",
    adminPanel: "Панель",
    adminServices: "Услуги",
    adminAgenda: "Расписание",
    adminRequests: "Запросы",
    adminBlocks: "Блокировать дни",
    adminTeam: "Команда",
    adminClients: "Клиенты",
    adminIncome: "Доходы",
    adminProfile: "Профиль",
    adminGreeting: "Здравствуйте Maria :)",
    todayPatients: "Пациенты сегодня",
    todayConfirmed: "Подтверждены сегодня",
    todayPending: "Ожидают",
    todayAvailable: "Свободное время",
    requestsIntro: "Сначала проверьте ожидающие запросы и быстро фильтруйте по пациенту или услуге.",
    requestSearchPlaceholder: "Поиск заявки...",
    servicesPending:
      "Начальный список услуг. Полное редактирование цен и длительности подготовим на следующем этапе.",
    teamPending: "Пока работает один специалист. Этот раздел готов для будущей команды.",
    clientsRegistered: "зарегистрировано",
    noClientsYet: "Клиентов пока нет.",
    appointmentsLabel: "записей",
    incomePending:
      "Первичный обзор доходов. На следующем этапе добавим ручные записи и месячные графики.",
    dailyIncome: "Доход за день",
    monthlyIncome: "Доход за месяц",
    completedAppointments: "Завершенные записи",
    incomeManualPending:
      "Позже: поле для внесения оплат вне системы или согласованных цен по запросу.",
    adminLoginTitle: "Войти",
    adminLoginHint: "",
    password: "Пароль",
    login: "Войти",
    register: "Регистрация",
    logout: "Выйти",
    refresh: "Обновить",
    loggedInAs: "Вход выполнен как",
    adminLoginRequired:
      "Для защиты данных пациентов панель требует входа.",
    adminLoaded: "",
    adminUpdated: "Запись обновлена.",
    signInError: "Не удалось войти. Проверьте email и пароль.",
    accountNotConfirmed:
      "Аккаунт существует, но его нужно подтвердить перед входом.",
    accessUnavailable:
      "Система входа сейчас недоступна. Попробуйте еще раз.",
    systemError: "Не удалось выполнить действие. Попробуйте еще раз.",
    blockCreated: "Время заблокировано.",
    blockDaysTitle: "Заблокировать дни и время",
    blockDaysCopy: "Блокируйте выходные, праздники, отпуск или часы, когда прием недоступен.",
    blockStart: "С",
    blockEnd: "До",
    blockReason: "Причина, необязательно",
    blockDay: "Заблокировать время",
    blockedTime: "Заблокировано",
    noAppointmentsThisDay: "На этот день записей нет",
    shareBookingLink: "Поделитесь ссылкой для получения записей",
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
    loading: "Подключение...",
    remoteReady: "",
    localMode: "Не удалось подключиться к системе записи.",
    remoteRequestSuccess:
      "Запрос отправлен. Запись ожидает подтверждения.",
    emailSkipped:
      "Запись сохранена, но email не был отправлен или еще не настроен.",
    schedule: "Пн-Пт, 9:00-19:00. Суббота настраивается.",
    timezone: "Время Аргентины",
    howItWorksTitle: "Как это работает",
    stepChoose: "Выберите услугу, дату и доступное время.",
    stepPending: "Запись ожидает подтверждения специалиста.",
    stepEmail: "Вы получите email после подтверждения или отклонения.",
    benefitsTitle: "Польза массажа",
    benefitsIntro:
      "Терапевтический массаж может помогать нервной системе, снижать мышечное напряжение и поддерживать восстановление тела.",
    benefitReleaseTitle: "Снижение напряжения и стресса",
    benefitReleaseCopy:
      "Ручная терапия способствует глубокому расслаблению, может поддерживать выработку эндорфинов и дофамина и помогает уменьшить накопленный стресс.",
    benefitSportTitle: "Подвижность и спортивное восстановление",
    benefitSportCopy:
      "Спортивные сеансы помогают разгрузить перегруженные зоны, улучшить амплитуду движения и восстановление после тренировок.",
    benefitRecoveryTitle: "Телесная реабилитация",
    benefitRecoveryCopy:
      "Индивидуальный подход помогает работать с конкретным дискомфортом, осанкой, подвижностью и процессами восстановления.",
    aboutMariaCopy:
      "Я профессиональный массажист из России, живу в Аргентине. В работе соединяю терапевтический массаж, спортивное направление и телесную реабилитацию, опираясь на знания, связанные с кинезиологией, чтобы сопровождать каждый процесс индивидуально.",
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
