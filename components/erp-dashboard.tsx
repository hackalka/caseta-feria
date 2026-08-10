'use client';

import { useMemo, useState } from 'react';

type Movement = { id: number; date: string; concept: string; counterparty: string; category: string; amount: number; status: 'Cobrado' | 'Pagado' | 'Pendiente' };
type Section = 'inicio' | 'ingresos' | 'gastos' | 'socios' | 'cuentas' | 'informes';

const initialMovements: Movement[] = [
  { id: 1, date: '2026-08-08', concept: 'Cuotas de socios', counterparty: 'Socios Los Manolos', category: 'Cuotas', amount: 2400, status: 'Cobrado' },
  { id: 2, date: '2026-08-07', concept: 'Catering cena inaugural', counterparty: 'Sabores del Sur', category: 'Catering', amount: -968, status: 'Pagado' },
  { id: 3, date: '2026-08-04', concept: 'Patrocinio local', counterparty: 'Bodega San Roque', category: 'Patrocinios', amount: 750, status: 'Pendiente' },
  { id: 4, date: '2026-08-03', concept: 'Montaje y decoración', counterparty: 'Feria Eventos', category: 'Montaje', amount: -1210, status: 'Pendiente' },
  { id: 5, date: '2026-08-01', concept: 'Aportación extraordinaria', counterparty: 'Socios Los Manolos', category: 'Aportaciones', amount: 900, status: 'Cobrado' }
];

const partners = [
  { name: 'Manuel R.', ownership: 40, capital: 4000, withdrawals: 500 },
  { name: 'Carmen G.', ownership: 35, capital: 3500, withdrawals: 0 },
  { name: 'Javier P.', ownership: 25, capital: 2500, withdrawals: 250 }
];

const euro = (amount: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
const navigation: { id: Section; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Resumen', icon: '◈' }, { id: 'ingresos', label: 'Ingresos', icon: '↗' },
  { id: 'gastos', label: 'Gastos y compras', icon: '↙' }, { id: 'socios', label: 'Socios', icon: '♙' },
  { id: 'cuentas', label: 'Caja y bancos', icon: '▣' }, { id: 'informes', label: 'Informes', icon: '▤' }
];

export function ErpDashboard() {
  const [section, setSection] = useState<Section>('inicio');
  const [period, setPeriod] = useState('Este mes');
  const [movements, setMovements] = useState(initialMovements);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<'income' | 'expense'>('income');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');

  const metrics = useMemo(() => {
    const collected = movements.filter(m => m.amount > 0 && m.status === 'Cobrado').reduce((sum, m) => sum + m.amount, 0);
    const paid = movements.filter(m => m.amount < 0 && m.status === 'Pagado').reduce((sum, m) => sum + Math.abs(m.amount), 0);
    const receivable = movements.filter(m => m.amount > 0 && m.status === 'Pendiente').reduce((sum, m) => sum + m.amount, 0);
    const payable = movements.filter(m => m.amount < 0 && m.status === 'Pendiente').reduce((sum, m) => sum + Math.abs(m.amount), 0);
    return { collected, paid, receivable, payable, balance: 1500 + collected - paid, profit: collected - paid };
  }, [movements]);

  const addMovement = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!concept.trim() || !Number.isFinite(value) || value <= 0) return;
    setMovements(current => [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), concept, counterparty: 'Registro manual', category: kind === 'income' ? 'Otros ingresos' : 'Otros gastos', amount: kind === 'income' ? value : -value, status: kind === 'income' ? 'Cobrado' : 'Pagado' }, ...current]);
    setConcept(''); setAmount(''); setShowForm(false);
  };

  return <main className="min-h-screen bg-slate-950 text-slate-100 lg:flex">
    <aside className="border-b border-slate-800 bg-[#13090d] lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="p-5 lg:p-6"><p className="gold text-xs font-bold uppercase tracking-[.22em]">Los Manolos</p><h1 className="mt-1 font-display text-2xl font-bold text-white">ERP financiero</h1><p className="mt-1 text-xs text-slate-400">Caseta nº 28 · Feria 2026</p></div>
      <nav className="flex overflow-x-auto px-3 pb-4 lg:block lg:px-3">{navigation.map(item => <button key={item.id} onClick={() => setSection(item.id)} className={`mr-2 flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:mb-1 lg:mr-0 lg:w-full ${section === item.id ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}><span>{item.icon}</span>{item.label}</button>)}</nav>
      <div className="m-4 hidden rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 lg:block"><p className="text-xs font-bold text-amber-300">Saldo disponible</p><p className="mt-1 text-xl font-bold text-white">{euro(metrics.balance)}</p><p className="mt-2 text-xs text-slate-400">Banco principal · actualizado</p></div>
    </aside>

    <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="gold text-xs font-bold uppercase tracking-[.2em]">Panel directivo</p><h2 className="mt-1 font-display text-3xl font-bold text-white">{navigation.find(n => n.id === section)?.label}</h2></div><div className="flex gap-2"><select value={period} onChange={e => setPeriod(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"><option>Este mes</option><option>Mes anterior</option><option>Trimestre</option><option>Año</option></select><button onClick={() => { setKind(section === 'gastos' ? 'expense' : 'income'); setShowForm(true); }} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300">+ Registrar movimiento</button></div></header>
      {section === 'inicio' ? <Overview metrics={metrics} movements={movements} period={period} /> : null}
      {section === 'ingresos' ? <Movements title="Ingresos y facturas" movements={movements.filter(m => m.amount > 0)} onCreate={() => { setKind('income'); setShowForm(true); }} /> : null}
      {section === 'gastos' ? <Movements title="Gastos, proveedores y compras" movements={movements.filter(m => m.amount < 0)} onCreate={() => { setKind('expense'); setShowForm(true); }} /> : null}
      {section === 'socios' ? <Partners profit={metrics.profit} /> : null}
      {section === 'cuentas' ? <Accounts metrics={metrics} movements={movements} /> : null}
      {section === 'informes' ? <Reports metrics={metrics} /> : null}
    </section>
    {showForm ? <Modal kind={kind} concept={concept} amount={amount} setConcept={setConcept} setAmount={setAmount} onClose={() => setShowForm(false)} onSubmit={addMovement} /> : null}
  </main>;
}

function Overview({ metrics, movements, period }: { metrics: ReturnType<typeof useMetrics>; movements: Movement[]; period: string }) {
  const cards = [['Saldo disponible', metrics.balance, 'text-amber-300'], ['Ingresos cobrados', metrics.collected, 'text-emerald-400'], ['Gastos pagados', metrics.paid, 'text-rose-400'], ['Resultado', metrics.profit, metrics.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'], ['Por cobrar', metrics.receivable, 'text-sky-400'], ['Por pagar', metrics.payable, 'text-amber-300']];
  const max = Math.max(metrics.collected, metrics.paid, 1);
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value, tone]) => <article key={label as string} className="panel rounded-2xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{euro(value as number)}</p><p className="mt-2 text-xs text-slate-500">{period} · datos contables</p></article>)}</div><div className="grid gap-5 xl:grid-cols-5"><article className="panel rounded-2xl p-5 xl:col-span-3"><div className="flex items-center justify-between"><div><h3 className="font-bold text-white">Ingresos vs. gastos</h3><p className="mt-1 text-xs text-slate-400">Comparativa del periodo seleccionado</p></div><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">EUR</span></div><div className="mt-8 flex h-44 items-end gap-8 border-b border-slate-700 px-8"><div className="flex flex-1 flex-col items-center gap-2"><div className="w-full max-w-24 rounded-t-lg bg-emerald-500/80" style={{ height: `${Math.max(10, metrics.collected / max * 145)}px` }} /><span className="text-xs text-slate-400">Ingresos</span></div><div className="flex flex-1 flex-col items-center gap-2"><div className="w-full max-w-24 rounded-t-lg bg-rose-500/80" style={{ height: `${Math.max(10, metrics.paid / max * 145)}px` }} /><span className="text-xs text-slate-400">Gastos</span></div></div></article><article className="panel rounded-2xl p-5 xl:col-span-2"><h3 className="font-bold text-white">Alertas</h3><div className="mt-4 space-y-3"><p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">{euro(metrics.receivable)} pendiente de cobro.</p><p className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-100">IVA e impuestos: cálculo orientativo.</p></div></article></div><Movements title="Últimos movimientos" movements={movements.slice(0, 5)} /></div>;
}
function useMetrics() { return { collected: 0, paid: 0, receivable: 0, payable: 0, balance: 0, profit: 0 }; }
function Movements({ title, movements, onCreate }: { title: string; movements: Movement[]; onCreate?: () => void }) { return <article className="panel overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-slate-800 p-5"><div><h3 className="font-bold text-white">{title}</h3><p className="mt-1 text-xs text-slate-400">Movimientos con trazabilidad</p></div>{onCreate ? <button onClick={onCreate} className="text-sm font-bold text-amber-300">Añadir</button> : null}</div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-950 text-xs uppercase text-slate-500"><tr><th className="p-4">Fecha</th><th className="p-4">Concepto</th><th className="p-4">Tercero</th><th className="p-4">Estado</th><th className="p-4 text-right">Total</th></tr></thead><tbody>{movements.map(m => <tr key={m.id} className="border-t border-slate-800/80"><td className="p-4 text-slate-400">{new Date(`${m.date}T12:00:00`).toLocaleDateString('es-ES')}</td><td className="p-4 font-medium text-white">{m.concept}<span className="mt-1 block text-xs text-slate-500">{m.category}</span></td><td className="p-4 text-slate-300">{m.counterparty}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${m.status === 'Pendiente' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{m.status}</span></td><td className={`p-4 text-right font-bold ${m.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{m.amount >= 0 ? '+' : '−'}{euro(Math.abs(m.amount))}</td></tr>)}</tbody></table></div></article>; }
function Partners({ profit }: { profit: number }) { return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3">{[['Capital aportado', 10000], ['Beneficio distribuible', Math.max(0, profit)], ['Pendiente de reparto', Math.max(0, profit - 750)]].map(([label, value]) => <article className="panel rounded-2xl p-5" key={label as string}><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-amber-300">{euro(value as number)}</p></article>)}</div><article className="panel overflow-hidden rounded-2xl"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-950 text-xs uppercase text-slate-500"><tr><th className="p-4">Socio</th><th className="p-4">Participación</th><th className="p-4">Capital</th><th className="p-4">Beneficio correspondiente</th><th className="p-4">Retirado</th></tr></thead><tbody>{partners.map(p => <tr key={p.name} className="border-t border-slate-800"><td className="p-4 font-bold text-white">{p.name}<span className="mt-1 block text-xs font-normal text-emerald-400">Activo</span></td><td className="p-4 text-amber-300">{p.ownership}%</td><td className="p-4">{euro(p.capital)}</td><td className="p-4 font-bold text-emerald-400">{euro(Math.max(0, profit) * p.ownership / 100)}</td><td className="p-4 text-slate-300">{euro(p.withdrawals)}</td></tr>)}</tbody></table></article></div>; }
function Accounts({ metrics, movements }: { metrics: ReturnType<typeof useMetrics>; movements: Movement[] }) { return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3">{[['Banco principal', metrics.balance, 'BANCO'], ['Caja', 240, 'CAJA'], ['Tarjeta empresa', -125, 'TARJETA']].map(([name, amount, type]) => <article className="panel rounded-2xl p-5" key={name as string}><span className="text-xs font-bold text-slate-400">{type}</span><h3 className="mt-2 font-bold text-white">{name}</h3><p className={`mt-3 text-2xl font-bold ${(amount as number) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{euro(amount as number)}</p></article>)}</div><Movements title="Flujo de caja" movements={movements} /></div>; }
function Reports({ metrics }: { metrics: ReturnType<typeof useMetrics> }) { return <div className="grid gap-4 md:grid-cols-2"><article className="panel rounded-2xl p-6"><h3 className="font-bold text-white">Cuenta de resultados</h3><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-400">Ingresos</dt><dd className="text-emerald-400">{euro(metrics.collected)}</dd></div><div className="flex justify-between"><dt className="text-slate-400">Gastos</dt><dd className="text-rose-400">{euro(metrics.paid)}</dd></div><div className="flex justify-between border-t border-slate-700 pt-3 font-bold"><dt>Resultado</dt><dd className="text-amber-300">{euro(metrics.profit)}</dd></div></dl></article><article className="panel rounded-2xl p-6"><h3 className="font-bold text-white">Exportación</h3><p className="mt-2 text-sm text-slate-400">Los informes se generan con el periodo aplicado.</p><div className="mt-5 flex gap-2"><button className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold">CSV</button><button className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold">Excel</button><button className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold">PDF</button></div><p className="mt-5 text-xs text-amber-300">Los cálculos fiscales son orientativos y requieren revisión profesional.</p></article></div>; }
function Modal({ kind, concept, amount, setConcept, setAmount, onClose, onSubmit }: { kind: 'income' | 'expense'; concept: string; amount: string; setConcept: (v: string) => void; setAmount: (v: string) => void; onClose: () => void; onSubmit: (e: React.FormEvent) => void }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4"><form onSubmit={onSubmit} className="panel w-full max-w-md rounded-2xl p-6"><div className="flex items-center justify-between"><h3 className="text-lg font-bold">Registrar {kind === 'income' ? 'ingreso' : 'gasto'}</h3><button type="button" onClick={onClose} className="text-slate-400">✕</button></div><label className="mt-5 block text-sm text-slate-300">Concepto<input value={concept} onChange={e => setConcept(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 outline-none focus:border-amber-400" /></label><label className="mt-4 block text-sm text-slate-300">Importe total (€)<input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" required className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 outline-none focus:border-amber-400" /></label><p className="mt-3 text-xs text-slate-500">En producción, este formulario guarda base, IVA, vencimiento, tercero y documento adjunto.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm">Cancelar</button><button className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">Guardar</button></div></form></div>; }
