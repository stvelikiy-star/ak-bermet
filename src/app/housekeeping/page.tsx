export default function HousekeepingHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-emerald-deep">
        Кабинет горничной
      </h1>
      <p className="text-sm text-muted">
        Доступ подтверждён по роли «Горничная». Экран задач по уборке
        появится на следующем этапе.
      </p>
    </main>
  );
}
