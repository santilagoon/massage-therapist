import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;
const therapistEmail = process.env.THERAPIST_EMAIL;

export function getEmailConfig() {
  return {
    isConfigured: Boolean(resendApiKey && emailFrom && therapistEmail),
    emailFrom,
    therapistEmail,
  };
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const config = getEmailConfig();

  if (!config.isConfigured || !resendApiKey || !emailFrom) {
    return { skipped: true };
  }

  const resend = new Resend(resendApiKey);

  const { data, error } = await resend.emails.send({
    from: emailFrom,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    throw new Error(
      `${error.name}: ${error.message}${error.statusCode ? ` (${error.statusCode})` : ""}`,
    );
  }

  return { id: data?.id, skipped: false };
}
