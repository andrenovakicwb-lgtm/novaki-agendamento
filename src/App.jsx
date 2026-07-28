import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, User, Phone, CheckCircle2, ChevronLeft, ChevronRight, X, CalendarDays } from "lucide-react";

// Depois de publicar o backend (ver /api/create-event.js), cole a URL aqui.
// Ex: "https://seu-projeto.vercel.app/api/create-event"
const BACKEND_CALENDAR_URL = "";

const INK = "#20233A";
const PINE = "#1F2345";
const PINE_DARK = "#15172F";
const SAND = "#F1F3F6";
const CARD = "#FBFCFD";
const CLAY = "#5695C1";
const WOOD = "#5C6B85";
const LINE = "#DCE1E8";

const SAGE = "#3E6B78";
const ROSE = "#8FB4D1";

const SERVICES = [
  { id: "relax", name: "Massagem relaxante", desc: "Alívio de tensões e bem-estar", price: 140, color: ROSE, tint: "#EAF1F7" },
  { id: "terapeutica", name: "Massagem terapêutica", desc: "Foco em pontos de dor e tensão", price: 160, color: CLAY, tint: "#E6EFF6" },
  { id: "quiro", name: "Quiropraxia", desc: "Ajuste postural e alívio de dores", price: 160, color: PINE, tint: "#E4E5EC" },
  { id: "miofascial", name: "Liberação miofascial", desc: "Liberação de tensões musculares profundas", price: 160, color: WOOD, tint: "#E7E9F0" },
  { id: "drenagem", name: "Drenagem linfática", desc: "Estímulo à circulação e redução de inchaço", price: 160, color: SAGE, tint: "#E3EDEE" },
];

const SCHEDULE = {
  1: ["10:00", "11:30", "15:00", "16:30", "18:00", "19:30", "21:00"],
  2: ["10:00", "11:30", "15:00", "16:30", "18:00", "19:30", "21:00"],
  3: ["10:00", "11:30", "15:00", "16:30", "18:00", "19:30", "21:00"],
  4: ["11:30", "15:00", "16:30", "18:00", "19:30", "21:00"],
  5: ["10:00", "11:30", "15:00", "16:30", "18:00", "19:30", "21:00"],
};
const WEEKDAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTH = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

import logoImg from "./logo.png";
const LOGO_SRC = logoImg;
const MIN_LEAD_HOURS = 4;

function hoursFor(d) {
  return SCHEDULE[d.getDay()] || [];
}

function isBookable(dateObj, timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const dt = new Date(dateObj);
  dt.setHours(h, m, 0, 0);
  return dt.getTime() - Date.now() >= MIN_LEAD_HOURS * 60 * 60 * 1000;
}

function nextDays(n) {
  const out = [];
  const d = new Date();
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    if (SCHEDULE[d.getDay()]) out.push(new Date(d));
  }
  return out;
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function onlyDigits(s) {
  return s.replace(/\D/g, "");
}

function waLink(phone, text) {
  const digits = onlyDigits(phone);
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}

const EVENT_DURATION_MIN = 50;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function icsStamp(d) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(
    d.getMinutes()
  )}00`;
}

function addToCalendar(entry) {
  const [h, m] = entry.time.split(":").map(Number);
  const start = new Date(entry.date + "T12:00:00");
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + EVENT_DURATION_MIN * 60000);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Novaki//Agendamento//PT",
    "BEGIN:VEVENT",
    `UID:${entry.id}@novaki`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${entry.serviceName} - Novaki`,
    `DESCRIPTION:Sessão de ${entry.serviceName} agendada para ${entry.name}. Valor: R$ ${entry.price}.`,
    "LOCATION:Novaki - Quiropraxia e Massoterapia",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agendamento-novaki.ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Vertebra({ label, active, taken, reason, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={taken}
      className="relative flex items-center gap-3 w-full group"
      style={{ opacity: taken ? 0.35 : 1 }}
    >
      <span
        className="flex items-center justify-center rounded-full text-sm font-medium transition-all"
        style={{
          width: 44,
          height: 30,
          background: active ? PINE : CARD,
          color: active ? "#fff" : INK,
          border: `1.5px solid ${active ? PINE : LINE}`,
          transform: active ? "scale(1.08)" : "scale(1)",
        }}
      >
        {label}
      </span>
      {taken && (
        <span className="text-xs" style={{ color: WOOD }}>
          {reason}
        </span>
      )}
    </button>
  );
}

export default function App() {
  const [view, setView] = useState("agendar");
  const [step, setStep] = useState(1);
  const [service, setService] = useState(null);
  const [dateIdx, setDateIdx] = useState(null);
  const [time, setTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState("");
  const [dayOffset, setDayOffset] = useState(0);
  const [persistOk, setPersistOk] = useState(true);

  const days = nextDays(21);
  const visibleDays = days.slice(dayOffset, dayOffset + 5);
  const selectedDate = dateIdx !== null ? days[dateIdx] : null;

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (e) {
      setBookings([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const isTaken = (dateStr, t) => bookings.some((b) => b.date === dateStr && b.time === t);

  const reset = () => {
    setStep(1);
    setService(null);
    setDateIdx(null);
    setTime(null);
    setName("");
    setPhone("");
    setConfirmed(null);
    setError("");
  };

  const confirmBooking = async () => {
    if (!name.trim() || !phone.trim()) {
      setError("Preencha nome e telefone para confirmar.");
      return;
    }
    const dateStr = iso(selectedDate);
    if (isTaken(dateStr, time)) {
      setError("Esse horário acabou de ser reservado. Escolha outro.");
      return;
    }
    if (!isBookable(selectedDate, time)) {
      setError(`É preciso agendar com pelo menos ${MIN_LEAD_HOURS}h de antecedência.`);
      return;
    }
    const entry = {
      id: `${dateStr}-${time}-${Date.now()}`,
      date: dateStr,
      time,
      service: service.id,
      serviceName: service.name,
      price: service.price,
      name: name.trim(),
      phone: phone.trim(),
    };
    const updated = [...bookings, entry];

    const notifyCalendar = () => {
      if (!BACKEND_CALENDAR_URL) return;
      fetch(BACKEND_CALENDAR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: entry.name,
          phone: entry.phone,
          serviceName: entry.serviceName,
          date: entry.date,
          time: entry.time,
          price: entry.price,
        }),
      }).catch(() => {});
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      if (!res.ok) throw new Error("falha ao salvar");
      setBookings(updated);
      setConfirmed(entry);
      setStep(5);
      notifyCalendar();
      return true;
    } catch (e) {
      setPersistOk(false);
      setBookings(updated);
      setConfirmed(entry);
      notifyCalendar();
      setStep(5);
      return true;
    }
  };

  const cancelBooking = async (id) => {
    const updated = bookings.filter((b) => b.id !== id);
    setBookings(updated);
    try {
      await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (e) {
      setPersistOk(false);
    }
  };

  const upcoming = [...bookings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <div className="min-h-screen" style={{ background: SAND, color: INK, fontFamily: "'Georgia', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Work+Sans:wght@400;500;600&display=swap');
        .display { font-family: 'Fraunces', serif; }
        .sans { font-family: 'Work Sans', sans-serif; }
      `}</style>

      <header className="px-6 pt-8 pb-6 sm:px-10" style={{ background: CARD, color: INK, borderBottom: `1px solid ${LINE}` }}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <img src={LOGO_SRC} alt="Novaki" style={{ height: 64, width: "auto" }} />
          <div style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: 16 }}>
            <p className="display text-lg" style={{ fontWeight: 600, color: PINE }}>
              Agende sua sessão
            </p>
            <p className="sans text-xs mt-0.5" style={{ color: WOOD }}>
              Quiropraxia & Massoterapia
            </p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto flex gap-6 mt-6 sans text-sm">
          <button
            onClick={() => setView("agendar")}
            className="pb-2"
            style={{
              borderBottom: view === "agendar" ? `2px solid ${PINE}` : "2px solid transparent",
              color: view === "agendar" ? PINE : WOOD,
              fontWeight: view === "agendar" ? 600 : 400,
            }}
          >
            Agendar sessão
          </button>
          <button
            onClick={() => setView("agenda")}
            className="pb-2"
            style={{
              borderBottom: view === "agenda" ? `2px solid ${PINE}` : "2px solid transparent",
              color: view === "agenda" ? PINE : WOOD,
              fontWeight: view === "agenda" ? 600 : 400,
            }}
          >
            Agenda ({bookings.length})
          </button>
        </div>
        {!persistOk && (
          <p className="max-w-2xl mx-auto sans text-xs mt-3" style={{ color: CLAY }}>
            ⚠ Salvando localmente nesta sessão — o armazenamento permanente está indisponível no momento.
          </p>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-6 sm:px-10 py-8">
        {view === "agendar" && step !== 5 && (
          <div className="space-y-8">
            <section>
              <p className="sans text-xs uppercase tracking-widest mb-3" style={{ color: WOOD }}>
                1. Escolha o atendimento
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setService(s);
                      setStep(2);
                      setDateIdx(null);
                      setTime(null);
                      setError("");
                    }}
                    className="text-left p-4 rounded-lg transition-all"
                    style={{
                      background: service?.id === s.id ? s.tint : CARD,
                      border: `1.5px solid ${service?.id === s.id ? s.color : LINE}`,
                    }}
                  >
                    <p className="display text-lg" style={{ fontWeight: 600, color: s.color }}>
                      {s.name}
                    </p>
                    <p className="sans text-sm mt-1" style={{ color: INK, opacity: 0.75 }}>
                      {s.desc}
                    </p>
                    <p className="sans text-xs mt-2" style={{ fontWeight: 600, color: s.color }}>
                      R$ {s.price}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {service && (
              <section>
                <p className="sans text-xs uppercase tracking-widest mb-3" style={{ color: WOOD }}>
                  2. Escolha o dia
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDayOffset(Math.max(0, dayOffset - 5))}
                    disabled={dayOffset === 0}
                    style={{ opacity: dayOffset === 0 ? 0.3 : 1 }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex gap-2 flex-1 overflow-hidden">
                    {visibleDays.map((d, i) => {
                      const realIdx = dayOffset + i;
                      const active = dateIdx === realIdx;
                      return (
                        <button
                          key={realIdx}
                          onClick={() => {
                            setDateIdx(realIdx);
                            setTime(null);
                            setStep(3);
                            setError("");
                          }}
                          className="flex-1 rounded-lg py-2 px-1 flex flex-col items-center sans"
                          style={{
                            background: active ? PINE : CARD,
                            color: active ? "#fff" : INK,
                            border: `1.5px solid ${active ? PINE : LINE}`,
                          }}
                        >
                          <span className="text-[11px] uppercase" style={{ opacity: 0.7 }}>
                            {WEEKDAY[d.getDay()]}
                          </span>
                          <span className="text-base" style={{ fontWeight: 600 }}>
                            {d.getDate()}
                          </span>
                          <span className="text-[10px]" style={{ opacity: 0.7 }}>
                            {MONTH[d.getMonth()]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setDayOffset(Math.min(days.length - 5, dayOffset + 5))}
                    disabled={dayOffset + 5 >= days.length}
                    style={{ opacity: dayOffset + 5 >= days.length ? 0.3 : 1 }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </section>
            )}

            {service && selectedDate && (
              <section>
                <p className="sans text-xs uppercase tracking-widest mb-4" style={{ color: WOOD }}>
                  3. Escolha o horário
                </p>
                <p className="sans text-xs mb-3" style={{ color: WOOD }}>
                  Agendamentos com no mínimo {MIN_LEAD_HOURS}h de antecedência.
                </p>
                <div className="relative pl-2" style={{ borderLeft: `2px solid ${LINE}`, marginLeft: 21 }}>
                  <div className="flex flex-col gap-3">
                    {hoursFor(selectedDate).map((h) => {
                      const bookedByOther = isTaken(iso(selectedDate), h);
                      const tooSoon = !isBookable(selectedDate, h);
                      return (
                        <div key={h} style={{ marginLeft: -23 }}>
                          <Vertebra
                            label={h}
                            active={time === h}
                            taken={bookedByOther || tooSoon}
                            reason={bookedByOther ? "ocupado" : tooSoon ? "indisponível" : ""}
                            onClick={() => {
                              setTime(h);
                              setStep(4);
                              setError("");
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {service && selectedDate && time && (
              <section className="p-5 rounded-lg" style={{ background: CARD, border: `1.5px solid ${LINE}` }}>
                <p className="sans text-xs uppercase tracking-widest mb-3" style={{ color: WOOD }}>
                  4. Seus dados
                </p>
                <div className="sans text-sm mb-4 flex items-center gap-4" style={{ color: INK }}>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> {selectedDate.getDate()} {MONTH[selectedDate.getMonth()]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {time}
                  </span>
                  <span style={{ color: service.color, fontWeight: 600 }}>{service.name}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ border: `1px solid ${LINE}`, background: "#fff" }}>
                    <User size={16} style={{ color: WOOD }} />
                    <input
                      className="sans w-full outline-none bg-transparent text-sm"
                      placeholder="Nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ border: `1px solid ${LINE}`, background: "#fff" }}>
                    <Phone size={16} style={{ color: WOOD }} />
                    <input
                      className="sans w-full outline-none bg-transparent text-sm"
                      placeholder="WhatsApp (com DDD)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                {error && (
                  <p className="sans text-sm mt-3" style={{ color: CLAY }}>
                    {error}
                  </p>
                )}
                <button
                  onClick={async () => {
                    const ok = await confirmBooking();
                    if (ok) {
                      const dateLabel = `${selectedDate.getDate()}/${selectedDate.getMonth() + 1}`;
                      window.open(
                        waLink(
                          phone,
                          `Olá ${name.trim()}! Sua sessão de ${service.name} está confirmada para o dia ${dateLabel} às ${time}. Valor: R$ ${service.price}. Até lá! - Novaki`
                        ),
                        "_blank"
                      );
                    }
                  }}
                  className="sans w-full mt-4 py-3 rounded-md text-sm"
                  style={{ background: "#25D366", color: "#fff", fontWeight: 500 }}
                >
                  Confirmar agendamento e enviar WhatsApp
                </button>
              </section>
            )}
          </div>
        )}

        {view === "agendar" && step === 5 && confirmed && (
          <div className="text-center py-10">
            <CheckCircle2 size={44} style={{ color: PINE, margin: "0 auto" }} />
            <p className="display text-2xl mt-4" style={{ fontWeight: 600 }}>
              Sessão confirmada
            </p>
            <p className="sans text-sm mt-2" style={{ color: INK, opacity: 0.75 }}>
              {confirmed.serviceName} (R$ {confirmed.price}) · {new Date(confirmed.date + "T12:00:00").getDate()}{" "}
              {MONTH[new Date(confirmed.date + "T12:00:00").getMonth()]} às {confirmed.time}
            </p>
            <a
              href={waLink(
                confirmed.phone,
                `Olá ${confirmed.name}! Sua sessão de ${confirmed.serviceName} está confirmada para o dia ${new Date(
                  confirmed.date + "T12:00:00"
                ).getDate()}/${new Date(confirmed.date + "T12:00:00").getMonth() + 1} às ${confirmed.time}. Valor: R$ ${
                  confirmed.price
                }. Até lá! - Novaki`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="sans inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-md text-sm"
              style={{ background: "#25D366", color: "#fff", fontWeight: 500 }}
            >
              Reenviar confirmação por WhatsApp
            </a>
            <br />
            <button
              onClick={() => addToCalendar(confirmed)}
              className="sans inline-flex items-center gap-2 mt-3 px-5 py-2.5 rounded-md text-sm"
              style={{ border: `1.5px solid ${PINE}`, color: PINE, background: "#fff" }}
            >
              <CalendarDays size={16} />
              Adicionar à agenda
            </button>
            <br />
            <button
              onClick={reset}
              className="sans mt-4 px-5 py-2 rounded-md text-sm"
              style={{ border: `1.5px solid ${PINE}`, color: PINE }}
            >
              Agendar outra sessão
            </button>
          </div>
        )}

        {view === "agenda" && (
          <div>
            {!loaded && (
              <p className="sans text-sm" style={{ color: WOOD }}>
                Carregando agenda…
              </p>
            )}
            {loaded && upcoming.length === 0 && (
              <div className="text-center py-14">
                <CalendarDays size={32} style={{ color: WOOD, margin: "0 auto" }} />
                <p className="sans text-sm mt-3" style={{ color: WOOD }}>
                  Nenhuma sessão agendada ainda.
                </p>
              </div>
            )}
            <div className="space-y-2">
              {upcoming.map((b) => {
                const s = SERVICES.find((x) => x.id === b.service);
                const d = new Date(b.date + "T12:00:00");
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: CARD, border: `1.5px solid ${LINE}` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex flex-col items-center justify-center rounded-md sans"
                        style={{ width: 48, height: 48, background: s?.tint, color: s?.color }}
                      >
                        <span className="text-[10px] uppercase">{WEEKDAY[d.getDay()]}</span>
                        <span className="text-sm" style={{ fontWeight: 600 }}>
                          {d.getDate()}/{d.getMonth() + 1}
                        </span>
                      </div>
                      <div>
                        <p className="sans text-sm" style={{ fontWeight: 500 }}>
                          {b.name}
                        </p>
                        <p className="sans text-xs" style={{ color: WOOD }}>
                          {b.serviceName} (R$ {b.price}) · {b.time} · {b.phone}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={waLink(
                          b.phone,
                          `Olá ${b.name}! Sua sessão de ${b.serviceName} está confirmada para o dia ${d.getDate()}/${
                            d.getMonth() + 1
                          } às ${b.time}. Valor: R$ ${b.price}. Até lá! - Novaki`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#25D366" }}
                        title="Enviar confirmação por WhatsApp"
                      >
                        <Phone size={16} />
                      </a>
                      <button onClick={() => addToCalendar(b)} style={{ color: WOOD }} title="Adicionar à agenda">
                        <CalendarDays size={16} />
                      </button>
                      <button onClick={() => cancelBooking(b.id)} style={{ color: WOOD }}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
