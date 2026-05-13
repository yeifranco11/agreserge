export default function Home() {
  const modules = [
    ["Portal de Agremiados", "Registro, cargue documental, lista de chequeo y seguimiento de estado."],
    ["Revisión Documental", "Validación de soportes, aprobación, rechazo, observaciones y vencimientos."],
    ["Portal de Líderes", "Asignación de obligaciones, cargue de evidencias y generación de informes."],
    ["Inteligencia Artificial", "Lectura de documentos, análisis de inconsistencias y resumen automático."],
    ["Alertas Inteligentes", "Notificaciones por documentos vencidos, pendientes y próximos a actualizar."],
    ["Informes Automáticos", "Construcción de informes técnicos, jurídicos, financieros y de cumplimiento."],
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#22c55e33,transparent_35%),radial-gradient(circle_at_top_right,#38bdf833,transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-8">
          <header className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">
                Intranet Inteligente
              </p>
              <h1 className="text-2xl font-black tracking-tight">AGRESERGE</h1>
            </div>

            <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
              <a href="#modulos" className="hover:text-white">Módulos</a>
              <a href="#ia" className="hover:text-white">IA</a>
              <a href="#ruta" className="hover:text-white">Ruta</a>
            </nav>
          </header>

          <div className="grid items-center gap-12 py-20 lg:grid-cols-2">
            <div>
              <div className="mb-5 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
                Plataforma institucional en construcción
              </div>

              <h2 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                Gestión documental, obligaciones e IA en una sola plataforma.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                AGRESERGE será una intranet robusta para agremiados, líderes,
                revisores y administración, con cargue documental, validación,
                alertas, expedientes digitales e informes automáticos.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a className="rounded-2xl bg-emerald-400 px-7 py-4 text-center font-bold text-slate-950 shadow-lg shadow-emerald-400/20 hover:bg-emerald-300">
                  Ingresar al portal
                </a>
                <a className="rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-center font-bold text-white hover:bg-white/15">
                  Ver módulos
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <div className="rounded-[1.5rem] bg-slate-900 p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-bold">Panel de Control</h3>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-300">
                    En línea
                  </span>
                </div>

                <div className="grid gap-4">
                  {[
                    ["Agremiados registrados", "0"],
                    ["Documentos cargados", "0"],
                    ["Pendientes de revisión", "0"],
                    ["Alertas activas", "0"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <span className="text-slate-300">{label}</span>
                      <strong className="text-2xl">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modulos" className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
            Arquitectura modular
          </p>
          <h2 className="mt-3 text-4xl font-black">Módulos principales</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(([title, desc]) => (
            <article
              key={title}
              className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 hover:bg-white/[0.1]"
            >
              <div className="mb-5 h-12 w-12 rounded-2xl bg-emerald-400/15" />
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-3 leading-7 text-slate-300">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="ia" className="mx-auto max-w-7xl px-6 py-14">
        <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
            Inteligencia Artificial
          </p>
          <h2 className="mt-3 text-4xl font-black">IA para validar y generar informes</h2>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-200">
            La plataforma permitirá analizar documentos, detectar fechas de
            vencimiento, validar nombres y cédulas, generar observaciones,
            resumir soportes y construir informes automáticos según obligaciones.
          </p>
        </div>
      </section>

      <section id="ruta" className="mx-auto max-w-7xl px-6 py-14 pb-24">
        <h2 className="text-4xl font-black">Ruta de crecimiento</h2>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            "Usuarios y roles",
            "Cargue documental",
            "Revisión y alertas",
            "IA e informes",
          ].map((item, index) => (
            <div key={item} className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <span className="text-4xl font-black text-emerald-300">
                0{index + 1}
              </span>
              <p className="mt-4 font-bold">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}