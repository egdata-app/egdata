export function GlobalBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] max-w-[100vw] h-[500px] opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, var(--ambient-blue), transparent 70%)",
        }}
      />
    </div>
  );
}
