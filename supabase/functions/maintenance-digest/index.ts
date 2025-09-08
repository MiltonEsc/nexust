// Deno Deploy/Edge Function: Daily maintenance digest
// Expects env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL

import { createClient } from "supabase";
import { SmtpClient } from "smtp";

interface ScheduleRow {
  id: number;
  company_id: string;
  title: string;
  responsible: string | null;
  next_date: string;
  active: boolean;
}

export const handler = async (_req: Request): Promise<Response> => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = Number(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const fromEmail = Deno.env.get("FROM_EMAIL") || "no-reply@nexsuit.app";

  if (!url || !key) {
    return new Response("Missing Supabase env", { status: 500 });
  }

  const supabase = createClient(url, key);

  const today = new Date();
  const in7 = new Date();
  in7.setDate(in7.getDate() + 7);

  // Obtener planes activos
  const { data, error } = await supabase
    .from("maintenance_schedules")
    .select("id, company_id, title, responsible, next_date, active")
    .eq("active", true);

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const schedules: ScheduleRow[] = (data as any) || [];

  // Agrupar por responsable (email). Si no hay, ignorar
  const toEmailToItems: Record<string, ScheduleRow[]> = {};
  for (const s of schedules) {
    if (!s.responsible) continue;
    const d = new Date(s.next_date);
    const overdue = d < today;
    const soon = d >= today && d <= in7;
    if (!overdue && !soon) continue;
    (toEmailToItems[s.responsible] = toEmailToItems[s.responsible] || []).push(s);
  }

  // Si no hay SMTP, devolver conteo (debug)
  if (!smtpHost || !smtpUser || !smtpPass) {
    const total = Object.values(toEmailToItems).reduce((acc, arr) => acc + arr.length, 0);
    return new Response(JSON.stringify({ recipients: Object.keys(toEmailToItems).length, items: total, note: "SMTP not configured" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const client = new SmtpClient();
  await client.connectTLS({ hostname: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass });

  // Enviar emails
  for (const [email, items] of Object.entries(toEmailToItems)) {
    const overdueItems = items.filter((s) => new Date(s.next_date) < today);
    const soonItems = items.filter((s) => {
      const d = new Date(s.next_date);
      return d >= today && d <= in7;
    });

    const html = `
      <p>Hola,</p>
      <p>Resumen de mantenimiento:</p>
      ${overdueItems.length > 0 ? `<h3>Vencidos</h3><ul>` + overdueItems.map((s) => `<li>${s.title} - ${new Date(s.next_date).toLocaleDateString()}</li>`).join("") + `</ul>` : ""}
      ${soonItems.length > 0 ? `<h3>Próximos 7 días</h3><ul>` + soonItems.map((s) => `<li>${s.title} - ${new Date(s.next_date).toLocaleDateString()}</li>`).join("") + `</ul>` : ""}
      <p>Ir a Nexsuit para gestionar los planes.</p>
    `;

    await client.send({
      from: fromEmail,
      to: email,
      subject: "Recordatorio de mantenimiento",
      content: html,
    });
  }

  try { await client.close(); } catch {}

  return new Response(JSON.stringify({ status: "ok", recipients: Object.keys(toEmailToItems).length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export default handler;


