// Единая иконка WhatsApp для всего сайта.
// Использует ровно /icons/whatsapp-glyph-black.svg (загруженный официальный глиф).
// Не использовать emoji, старые inline-иконки или lucide MessageCircle как WhatsApp.

export default function WhatsAppIcon({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/whatsapp-glyph-black.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      draggable={false}
      // block + object-contain => глиф ровный по центру, не обрезается и не искажается.
      className={`inline-block shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
