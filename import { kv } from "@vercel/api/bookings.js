import { kv } from "@vercel/kv";

const KEY = "novaki:bookings";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const bookings = (await kv.get(KEY)) || [];
      return res.status(200).json({ bookings });
    }

    if (req.method === "POST") {
      const entry = req.body;
      if (!entry || !entry.id || !entry.date || !entry.time) {
        return res.status(400).json({ error: "Dados incompletos" });
      }
      const bookings = (await kv.get(KEY)) || [];
      const alreadyTaken = bookings.some((b) => b.date === entry.date && b.time === entry.time);
      if (alreadyTaken) {
        return res.status(409).json({ error: "Horário já reservado" });
      }
      const updated = [...bookings, entry];
      await kv.set(KEY, updated);
      return res.status(200).json({ success: true, bookings: updated });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      const bookings = (await kv.get(KEY)) || [];
      const updated = bookings.filter((b) => b.id !== id);
      await kv.set(KEY, updated);
      return res.status(200).json({ success: true, bookings: updated });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Erro no servidor" });
  }
}
