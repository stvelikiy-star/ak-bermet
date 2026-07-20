import { IconCheck } from "@/components/ui/icons";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";

export default function FormSuccess({
  message,
  whatsappUrl,
  onReset,
}: {
  message: string;
  whatsappUrl?: string;
  onReset?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-700/30 bg-emerald-900/5 p-6 text-center sm:p-8">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-emerald-deep">
        <IconCheck className="h-7 w-7" />
      </span>
      <h3 className="font-display text-xl font-semibold text-emerald-deep">
        Заявка принята
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
        {message}
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-gold-soft to-gold px-6 py-3 text-sm font-semibold text-emerald-deep transition-transform hover:-translate-y-0.5"
          >
            <WhatsAppIcon size={16} className="shrink-0" />
            Продолжить в WhatsApp
          </a>
        )}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center rounded-full border border-gold/40 bg-cream px-6 py-3 text-sm font-semibold text-emerald-deep transition-colors hover:border-gold hover:text-gold-dark"
          >
            Отправить ещё одну
          </button>
        )}
      </div>
    </div>
  );
}
