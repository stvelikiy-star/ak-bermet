"use client";

import { useState } from "react";
import type { LeadInput } from "@/types/lead";
import { validateLead } from "@/lib/lead-schema";

type Status = "idle" | "submitting" | "success" | "error";

export function useLeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverMessage, setServerMessage] = useState<string>("");
  const [leadId, setLeadId] = useState<string>("");

  async function submit(input: LeadInput): Promise<boolean> {
    setServerMessage("");
    // Клиентская валидация до запроса
    const { ok, errors: vErrors } = validateLead(input);
    if (!ok) {
      setErrors(vErrors);
      setStatus("error");
      return false;
    }
    setErrors({});
    setStatus("submitting");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setServerMessage(data.message ?? "Не удалось отправить заявку");
        if (data.errors) setErrors(data.errors);
        setStatus("error");
        return false;
      }

      setLeadId(data.leadId ?? "");
      setStatus("success");
      return true;
    } catch {
      setServerMessage(
        "Сетевая ошибка. Попробуйте ещё раз или напишите нам в WhatsApp."
      );
      setStatus("error");
      return false;
    }
  }

  function reset() {
    setStatus("idle");
    setErrors({});
    setServerMessage("");
    setLeadId("");
  }

  return { status, errors, serverMessage, leadId, submit, reset };
}
