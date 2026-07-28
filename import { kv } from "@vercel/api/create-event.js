// Backend serverless (Vercel) — cria o evento automaticamente no Google Agenda do dono do negócio
// sempre que um cliente confirma um agendamento no app.
//
// COMO USAR:
// 1. Siga os passos 1 e 2 explicados no chat para conseguir:
//      GOOGLE_CLIENT_ID
//      GOOGLE_CLIENT_SECRET
//      GOOGLE_REFRESH_TOKEN
// 2. Crie um projeto na Vercel (vercel.com) e suba esta pasta (com a subpasta /api).
// 3. Em "Settings > Environment Variables" do projeto na Vercel, adicione:
//      GOOGLE_CLIENT_ID
//      GOOGLE_CLIENT_SECRET
//      GOOGLE_REFRESH_TOKEN
//      GOOGLE_CALENDAR_ID   -> use "primary" para a agenda principal, ou o e-mail da agenda específica
// 4. Depois do deploy, você terá uma URL tipo:
//      https://seu-projeto.vercel.app/api/create-event
//    Cole essa URL na constante BACKEND_CALENDAR_URL no topo do arquivo agendamento.jsx.
//
// O Client Secret e o Refresh Token nunca ficam expostos no navegador — só existem aqui, no servidor.

const EVENT_DURATION_MIN = 50;

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Falha ao renovar token do Google");
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { name, phone, serviceName, date, time, price } = req.body || {};
  if (!name || !serviceName || !date || !time) {
    return res.status(400).json({ error: "Dados incompletos" });
  }

  try {
    const accessToken = await getAccessToken();

    const [h, m] = time.split(":").map(Number);
    const start = new Date(`${date}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    const end = new Date(start.getTime() + EVENT_DURATION_MIN * 60000);

    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    const event = {
      summary: `${serviceName} - ${name}`,
      description: `Cliente: ${name}\nWhatsApp: ${phone || "-"}\nServiço: ${serviceName}\nValor: R$ ${price}`,
      start: { dateTime: start.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: end.toISOString(), timeZone: "America/Sao_Paulo" },
    };

    const gcalRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    const gcalData = await gcalRes.json();
    if (!gcalRes.ok) {
      return res.status(gcalRes.status).json({ error: gcalData?.error?.message || "Falha ao criar evento" });
    }

    return res.status(200).json({ success: true, eventId: gcalData.id });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro ao criar evento no Google Agenda" });
  }
}
