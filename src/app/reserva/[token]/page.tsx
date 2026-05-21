import { ManageAppointmentPage } from "@/components/ManageAppointmentPage";

export default async function AppointmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <ManageAppointmentPage token={token} />;
}
