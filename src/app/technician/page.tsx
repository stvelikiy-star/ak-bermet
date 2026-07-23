export default function TechnicianHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-emerald-deep">
        Кабинет техника
      </h1>
      <p className="text-sm text-muted">
        Доступ подтверждён по роли «Техник». Экран заявок на ремонт
        появится на следующем этапе.
      </p>
    </main>
  );
}
