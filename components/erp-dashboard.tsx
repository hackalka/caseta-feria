'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { database } from '@/lib/firebase';

type Status = 'Cobrado' | 'Pagado' | 'Pendiente';
type Movement = { id: string; date: string; concept: string; counterparty: string; category: string; amount: number; status: Status };
type Partner = { id: string; name: string; email: string; phone: string; status: 'Activo' | 'Inactivo'; paymentStatus?: 'Pagado' | 'Pendiente'; cuota?: number };
type Supplier = { id: string; name: string; phone: string; email?: string; contact?: string };
type Section = 'inicio' | 'ingresos' | 'gastos' | 'socios' | 'cuentas' | 'proveedores' | 'informes';
type Metrics = { collected: number; paid: number; receivable: number; payable: number; balance: number; profit: number };

const euro = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
const navigation: { id: Section; label: string; icon: string }[] = [
  { id: 'inicio', label: 'Resumen', icon: '◈' }, 
  { id: 'ingresos', label: 'Ingresos', icon: '↗' },
  { id: 'gastos', label: 'Gastos y compras', icon: '↙' }, 
  { id: 'socios', label: 'Socios', icon: '♙' },
  { id: 'proveedores', label: 'Proveedores', icon: '👥' }, 
  { id: 'cuentas', label: 'Caja y bancos', icon: '▣' }, 
  { id: 'informes', label: 'Informes', icon: '▤' }
];

export function ErpDashboard() {
  const [section, setSection] = useState<Section>('inicio');
  const [period, setPeriod] = useState('Este mes');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modal, setModal] = useState<'movement' | 'partner' | 'supplier' | 'editMovement' | 'editPartner' | null>(null);
  const [kind, setKind] = useState<'income' | 'expense'>('income');
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [syncStatus, setSyncStatus] = useState<'loading' | 'live' | 'error'>('loading');

  useEffect(() => {
    const stopTransactions = onValue(ref(database, 'erp/transactions'), snapshot => {
      const data = snapshot.val() as Record<string, Omit<Movement, 'id'>> | null;
      setMovements(data ? Object.entries(data).map(([id, item]) => ({ id, ...item })).sort((a, b) => b.date.localeCompare(a.date)) : []);
      setSyncStatus('live');
    }, () => setSyncStatus('error'));
    
    const stopPartners = onValue(ref(database, 'erp/partners'), snapshot => {
      const data = snapshot.val() as Record<string, Omit<Partner, 'id'>> | null;
      setPartners(data ? Object.entries(data).map(([id, item]) => ({ id, ...item })).sort((a, b) => a.name.localeCompare(b.name)) : []);
    }, () => setSyncStatus('error'));
    
    const stopSuppliers = onValue(ref(database, 'erp/suppliers'), snapshot => {
      const data = snapshot.val() as Record<string, Omit<Supplier, 'id'>> | null;
      setSuppliers(data ? Object.entries(data).map(([id, item]) => ({ id, ...item })).sort((a, b) => a.name.localeCompare(b.name)) : []);
    }, () => setSyncStatus('error'));
    
    return () => { stopTransactions(); stopPartners(); stopSuppliers(); };
  }, []);

  const metrics = useMemo<Metrics>(() => {
    const collected = movements.filter(m => m.amount > 0 && m.status === 'Cobrado').reduce((sum, m) => sum + m.amount, 0);
    const paid = movements.filter(m => m.amount < 0 && m.status === 'Pagado').reduce((sum, m) => sum + Math.abs(m.amount), 0);
    const receivable = movements.filter(m => m.amount > 0 && m.status === 'Pendiente').reduce((sum, m) => sum + m.amount, 0);
    const payable = movements.filter(m => m.amount < 0 && m.status === 'Pendiente').reduce((sum, m) => sum + Math.abs(m.amount), 0);
    return { collected, paid, receivable, payable, balance: collected - paid, profit: collected - paid };
  }, [movements]);

  const deleteRecord = (path: string, label: string) => {
    if (!window.confirm(`¿Eliminar ${label}? Esta acción no se puede deshacer.`)) return;
    void remove(ref(database, path)).catch(() => setSyncStatus('error'));
  };
  
  const openMovement = (newKind: 'income' | 'expense') => { setKind(newKind); setModal('movement'); };

  return <main className="min-h-screen bg-slate-950 text-slate-100 lg:flex">
    <aside className="border-b border-slate-800 bg-[#13090d] lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="p-5 lg:p-6">
        <p className="gold text-xs font-bold uppercase tracking-[.22em]">Los Manolos</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-white">ERP financiero</h1>
        <p className="mt-1 text-xs text-slate-400">Caseta nº 28 · Feria 2026</p>
      </div>
      <nav className="flex overflow-x-auto px-3 pb-4 lg:block lg:px-3">
        {navigation.map(item => <button key={item.id} onClick={() => setSection(item.id)} className={`mr-2 flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:mb-1 lg:mr-0 lg:w-full ${section === item.id ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}>
          <span>{item.icon}</span>{item.label}
        </button>)}
      </nav>
      <div className="m-4 hidden rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 lg:block">
        <p className="text-xs font-bold text-amber-300">Saldo disponible</p>
        <p className="mt-1 text-xl font-bold text-white">{euro(metrics.balance)}</p>
        <p className="mt-2 text-xs text-slate-400">Actualizado en tiempo real</p>
      </div>
    </aside>
    
    <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="gold text-xs font-bold uppercase tracking-[.2em]">Administración</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-white">{navigation.find(n => n.id === section)?.label}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
            <option>Este mes</option><option>Mes anterior</option><option>Trimestre</option><option>Año</option>
          </select>
          {section === 'socios' ? <button onClick={() => { setEditingPartner(null); setModal('partner'); }} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">+ Añadir socio</button> : section === 'proveedores' ? <button onClick={() => { setEditingSupplier(null); setModal('supplier'); }} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">+ Añadir proveedor</button> : <button onClick={() => openMovement(section === 'gastos' ? 'expense' : 'income')} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">+ Registrar movimiento</button>}
        </div>
      </header>
      
      {section === 'inicio' && <Overview metrics={metrics} movements={movements} period={period} onCreate={openMovement} onDelete={deleteRecord} />}
      {section === 'ingresos' && <Movements title="Ingresos y facturas" movements={movements.filter(m => m.amount > 0)} onCreate={() => openMovement('income')} onEdit={(m) => { setEditingMovement(m); setModal('editMovement'); }} onDelete={deleteRecord} />}
      {section === 'gastos' && <Movements title="Gastos, proveedores y compras" movements={movements.filter(m => m.amount < 0)} onCreate={() => openMovement('expense')} onEdit={(m) => { setEditingMovement(m); setModal('editMovement'); }} onDelete={deleteRecord} />}
      {section === 'socios' && <Partners partners={partners} profit={0} onCreate={() => { setEditingPartner(null); setModal('partner'); }} onEdit={(p) => { setEditingPartner(p); setModal('partner'); }} onEditPayment={(p) => { setEditingPartner(p); setModal('editPartner'); }} onDelete={deleteRecord} />}
      {section === 'proveedores' && <Suppliers suppliers={suppliers} onCreate={() => { setEditingSupplier(null); setModal('supplier'); }} onEdit={(s) => { setEditingSupplier(s); setModal('supplier'); }} onDelete={deleteRecord} />}
      {section === 'cuentas' && <Accounts metrics={metrics} movements={movements} onDelete={deleteRecord} />}
      {section === 'informes' && <Reports metrics={metrics} movements={movements} period={period} />}
    </section>
    
    {modal === 'movement' && <MovementModal kind={kind} onClose={() => setModal(null)} onSaved={() => setModal(null)} onError={() => setSyncStatus('error')} />}
    {modal === 'editMovement' && editingMovement && <EditMovementModal movement={editingMovement} onClose={() => { setModal(null); setEditingMovement(null); }} onSaved={() => { setModal(null); setEditingMovement(null); }} onError={() => setSyncStatus('error')} />}
    {modal === 'partner' && <PartnerModal partners={partners} editing={editingPartner} onClose={() => { setModal(null); setEditingPartner(null); }} onSaved={() => { setModal(null); setEditingPartner(null); }} onError={() => setSyncStatus('error')} />}
    {modal === 'editPartner' && editingPartner && <EditPartnerModal partner={editingPartner} onClose={() => { setModal(null); setEditingPartner(null); }} onSaved={() => { setModal(null); setEditingPartner(null); }} onError={() => setSyncStatus('error')} />}
    {modal === 'supplier' && <SupplierModal supplier={editingSupplier} onClose={() => { setModal(null); setEditingSupplier(null); }} onSaved={() => { setModal(null); setEditingSupplier(null); }} onError={() => setSyncStatus('error')} />}
  </main>;
}

function Overview({ metrics, movements, period, onCreate, onDelete }: { metrics: Metrics; movements: Movement[]; period: string; onCreate: (kind: 'income' | 'expense') => void; onDelete: (path: string, label: string) => void }) {
  const cards: [string, number, string][] = [['Saldo disponible', metrics.balance, 'text-amber-300'], ['Ingresos cobrados', metrics.collected, 'text-emerald-400'], ['Gastos pagados', metrics.paid, 'text-rose-400'], ['Resultado', metrics.profit, metrics.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'], ['Por cobrar', metrics.receivable, 'text-sky-400'], ['Por pagar', metrics.payable, 'text-amber-300']];
  const max = Math.max(metrics.collected, metrics.paid, 1);
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(([label, value, tone]) => <article key={label} className="panel rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${tone}`}>{euro(value)}</p>
        <p className="mt-2 text-xs text-slate-500">{period} · datos contables</p>
      </article>)}
    </div>
    <div className="grid gap-5 xl:grid-cols-5">
      <article className="panel rounded-2xl p-5 xl:col-span-3">
        <h3 className="font-bold text-white">Ingresos vs. gastos</h3>
        <div className="mt-8 flex h-44 items-end gap-8 border-b border-slate-700 px-8">
          <Bar label="Ingresos" height={metrics.collected / max * 145} color="bg-emerald-500/80" />
          <Bar label="Gastos" height={metrics.paid / max * 145} color="bg-rose-500/80" />
        </div>
      </article>
      <article className="panel rounded-2xl p-5 xl:col-span-2">
        <h3 className="font-bold text-white">Alertas</h3>
        <div className="mt-4 space-y-3">
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-100">{euro(metrics.receivable)} pendiente de cobro.</p>
          <p className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sm text-sky-100">Los datos se guardan en Firebase.</p>
        </div>
      </article>
    </div>
    <Movements title="Últimos movimientos" movements={movements.slice(0, 5)} onCreate={() => onCreate('income')} onDelete={onDelete} />
  </div>;
}

function Bar({ label, height, color }: { label: string; height: number; color: string }) { 
  return <div className="flex flex-1 flex-col items-center gap-2">
    <div className={`w-full max-w-24 rounded-t-lg ${color}`} style={{ height: `${Math.max(10, height)}px` }} />
    <span className="text-xs text-slate-400">{label}</span>
  </div>; 
}

function Movements({ title, movements, onCreate, onEdit, onDelete }: { title: string; movements: Movement[]; onCreate?: () => void; onEdit?: (m: Movement) => void; onDelete: (path: string, label: string) => void }) { 
  return <article className="panel overflow-hidden rounded-2xl">
    <div className="flex items-center justify-between border-b border-slate-800 p-5">
      <div>
        <h3 className="font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-400">Movimientos guardados en Firebase</p>
      </div>
      {onCreate && <button onClick={onCreate} className="text-sm font-bold text-amber-300">Añadir</button>}
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-950 text-xs uppercase text-slate-500">
          <tr>
            <th className="p-4">Fecha</th>
            <th className="p-4">Concepto</th>
            <th className="p-4">Tercero</th>
            <th className="p-4">Estado</th>
            <th className="p-4 text-right">Total</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody>
          {movements.length ? movements.map(m => <tr key={m.id} className="border-t border-slate-800/80">
            <td className="p-4 text-slate-400">{new Date(`${m.date}T12:00:00`).toLocaleDateString('es-ES')}</td>
            <td className="p-4 font-medium text-white">{m.concept}<span className="mt-1 block text-xs text-slate-500">{m.category}</span></td>
            <td className="p-4 text-slate-300">{m.counterparty}</td>
            <td className="p-4">
              <button onClick={() => onEdit?.(m)} className={`rounded-full px-2 py-1 text-xs font-bold cursor-pointer transition ${m.status === 'Pendiente' ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/30' : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30'}`}>
                {m.status}
              </button>
            </td>
            <td className={`p-4 text-right font-bold ${m.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{m.amount >= 0 ? '+' : '−'}{euro(Math.abs(m.amount))}</td>
            <td className="p-4 text-right space-x-2">
              <button onClick={() => onEdit?.(m)} className="rounded-lg px-2 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/10">Editar</button>
              <button onClick={() => onDelete(`erp/transactions/${m.id}`, 'este movimiento')} className="rounded-lg px-2 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/10">Eliminar</button>
            </td>
          </tr>) : <tr><td colSpan={6} className="p-8 text-center text-slate-500">No hay movimientos todavía.</td></tr>}
        </tbody>
      </table>
    </div>
  </article>;
}

function Partners({ partners, onCreate, onEdit, onEditPayment, onDelete }: { partners: Partner[]; profit: number; onCreate: () => void; onEdit: (p: Partner) => void; onEditPayment: (p: Partner) => void; onDelete: (path: string, label: string) => void }) { 
  const activeCount = partners.filter(p => p.status === 'Activo').length;
  const paidCount = partners.filter(p => p.paymentStatus === 'Pagado').length;
  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      <article className="panel rounded-2xl p-5">
        <p className="text-xs font-bold uppercase text-slate-400">Socios activos</p>
        <p className="mt-2 text-2xl font-bold text-amber-300">{activeCount}</p>
      </article>
      <article className="panel rounded-2xl p-5">
        <p className="text-xs font-bold uppercase text-slate-400">Pagados</p>
        <p className="mt-2 text-2xl font-bold text-emerald-400">{paidCount} / {activeCount}</p>
      </article>
    </div>
    <SociosList title="Directorio de socios" partners={partners} onCreate={onCreate} onEdit={onEdit} onEditPayment={onEditPayment} onDelete={onDelete} />
  </div>; 
}
}

function SociosList({ title, partners, onCreate, onEdit, onEditPayment, onDelete }: { title: string; partners: Partner[]; onCreate: () => void; onEdit: (p: Partner) => void; onEditPayment: (p: Partner) => void; onDelete: (path: string, label: string) => void }) { 
  return <article className="panel overflow-hidden rounded-2xl">
    <div className="flex items-center justify-between border-b border-slate-800 p-5">
      <div>
        <h3 className="font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-400">Gestión de socios y estado de cuotas</p>
      </div>
      <button onClick={onCreate} className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950">+ Añadir socio</button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-slate-950 text-xs uppercase text-slate-500">
          <tr>
            <th className="p-4">Socio</th>
            <th className="p-4">Teléfono</th>
            <th className="p-4">Email</th>
            <th className="p-4">Estado cuota</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody>
          {partners.length ? partners.map(p => <tr key={p.id} className="border-t border-slate-800">
            <td className="p-4 font-bold text-white">{p.name}</td>
            <td className="p-4 text-slate-400">{p.phone || '—'}</td>
            <td className="p-4 text-slate-400">{p.email || '—'}</td>
            <td className="p-4">
              <button onClick={() => onEditPayment(p)} className={`rounded-full px-2 py-1 text-xs font-bold cursor-pointer transition ${p.paymentStatus === 'Pagado' ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30' : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/30'}`}>
                {p.paymentStatus || 'Pendiente'}
              </button>
            </td>
            <td className="p-4 text-right space-x-2">
              <button onClick={() => onEdit(p)} className="rounded-lg px-2 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/10">Editar</button>
              <button onClick={() => onDelete(`erp/partners/${p.id}`, `al socio ${p.name}`)} className="rounded-lg px-2 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/10">Eliminar</button>
            </td>
          </tr>) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">No hay socios registrados. Pulsa "Añadir socio" para empezar.</td></tr>}
        </tbody>
      </table>
    </div>
  </article>; 
}

function Suppliers({ suppliers, onCreate, onEdit, onDelete }: { suppliers: Supplier[]; onCreate: () => void; onEdit: (s: Supplier) => void; onDelete: (path: string, label: string) => void }) {
  return <article className="panel overflow-hidden rounded-2xl">
    <div className="flex items-center justify-between border-b border-slate-800 p-5">
      <div>
        <h3 className="font-bold text-white">Registro de Proveedores</h3>
        <p className="mt-1 text-xs text-slate-400">Gestión de proveedores y contactos</p>
      </div>
      <button onClick={onCreate} className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950">+ Añadir proveedor</button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="bg-slate-950 text-xs uppercase text-slate-500">
          <tr>
            <th className="p-4">Nombre</th>
            <th className="p-4">Teléfono</th>
            <th className="p-4">Email</th>
            <th className="p-4">Contacto</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody>
          {suppliers.length ? suppliers.map(s => <tr key={s.id} className="border-t border-slate-800">
            <td className="p-4 font-bold text-white">{s.name}</td>
            <td className="p-4 text-slate-300">{s.phone || '—'}</td>
            <td className="p-4 text-slate-400">{s.email || '—'}</td>
            <td className="p-4 text-slate-400">{s.contact || '—'}</td>
            <td className="p-4 text-right space-x-2">
              <button onClick={() => onEdit(s)} className="rounded-lg px-2 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/10">Editar</button>
              <button onClick={() => onDelete(`erp/suppliers/${s.id}`, `al proveedor ${s.name}`)} className="rounded-lg px-2 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/10">Eliminar</button>
            </td>
          </tr>) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">No hay proveedores registrados.</td></tr>}
        </tbody>
      </table>
    </div>
  </article>;
}

function Accounts({ metrics, movements, onDelete }: { metrics: Metrics; movements: Movement[]; onDelete: (path: string, label: string) => void }) { 
  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-3">
      <Account name="Saldo operativo" value={metrics.balance} type="CUENTA PRINCIPAL" />
      <Account name="Por cobrar" value={metrics.receivable} type="PENDIENTE" />
      <Account name="Por pagar" value={-metrics.payable} type="PENDIENTE" />
    </div>
    <Movements title="Flujo de caja" movements={movements} onDelete={onDelete} />
  </div>; 
}

function Account({ name, value, type }: { name: string; value: number; type: string }) { 
  return <article className="panel rounded-2xl p-5">
    <span className="text-xs font-bold text-slate-400">{type}</span>
    <h3 className="mt-2 font-bold text-white">{name}</h3>
    <p className={`mt-3 text-2xl font-bold ${value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{euro(value)}</p>
  </article>; 
}

function Reports({ metrics, movements, period }: { metrics: Metrics; movements: Movement[]; period: string }) { 
  const [filter, setFilter] = useState<'todos' | 'ingresos' | 'gastos'>('todos');
  
  const filteredMovements = filter === 'todos' ? movements : filter === 'ingresos' ? movements.filter(m => m.amount > 0) : movements.filter(m => m.amount < 0);
  
  const exportToCSV = () => {
    const headers = ['Fecha', 'Concepto', 'Contrapartida', 'Categoría', 'Importe', 'Estado'];
    const rows = filteredMovements.map(m => [m.date, m.concept, m.counterparty, m.category, m.amount.toFixed(2), m.status]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`);
    element.setAttribute('download', `informe-${filter}-${new Date().toISOString().slice(0, 10)}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const printReport = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Informe - Los Manolos</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .summary { margin: 20px 0; }
          .total { font-weight: bold; background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <h1>Informe Financiero - Los Manolos</h1>
        <p>Período: ${period}</p>
        <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')}</p>
        
        <div class="summary">
          <h3>Resumen</h3>
          <p><strong>Ingresos totales:</strong> €${metrics.collected.toFixed(2)}</p>
          <p><strong>Gastos totales:</strong> €${metrics.paid.toFixed(2)}</p>
          <p><strong>Resultado:</strong> €${metrics.profit.toFixed(2)}</p>
        </div>
        
        <h3>Detalle de ${filter === 'todos' ? 'Movimientos' : filter === 'ingresos' ? 'Ingresos' : 'Gastos'}</h3>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Contrapartida</th>
              <th>Categoría</th>
              <th>Importe</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMovements.map(m => `
              <tr>
                <td>${m.date}</td>
                <td>${m.concept}</td>
                <td>${m.counterparty}</td>
                <td>${m.category}</td>
                <td style="text-align: right;">€${m.amount.toFixed(2)}</td>
                <td>${m.status}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="4"></td>
              <td style="text-align: right;">€${filteredMovements.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };
  
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2">
      <article className="panel rounded-2xl p-6">
        <h3 className="font-bold text-white">Cuenta de resultados</h3>
        <dl className="mt-5 space-y-3 text-sm">
          <Row label="Ingresos" value={metrics.collected} tone="text-emerald-400" />
          <Row label="Gastos" value={metrics.paid} tone="text-rose-400" />
          <Row label="Resultado" value={metrics.profit} tone="text-amber-300" strong />
        </dl>
      </article>
      <article className="panel rounded-2xl p-6">
        <h3 className="font-bold text-white">Exportar informe</h3>
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="radio" name="filter" value="todos" checked={filter === 'todos'} onChange={(e) => setFilter(e.target.value as any)} className="cursor-pointer" />
              Todos los movimientos
            </label>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="radio" name="filter" value="ingresos" checked={filter === 'ingresos'} onChange={(e) => setFilter(e.target.value as any)} className="cursor-pointer" />
              Solo ingresos/cobros
            </label>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="radio" name="filter" value="gastos" checked={filter === 'gastos'} onChange={(e) => setFilter(e.target.value as any)} className="cursor-pointer" />
              Solo gastos/pagos
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={exportToCSV} className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600 transition">📥 Descargar CSV</button>
            <button onClick={printReport} className="flex-1 rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-white hover:bg-sky-600 transition">🖨️ Imprimir</button>
          </div>
        </div>
      </article>
    </div>
    <article className="panel rounded-2xl p-6">
      <h3 className="font-bold text-white">Información importante</h3>
      <p className="mt-3 text-sm text-slate-400">Los cálculos fiscales son orientativos y requieren revisión profesional.</p>
      <p className="mt-2 text-xs text-amber-300">Los datos descargados se generan según el período seleccionado y los filtros aplicados.</p>
    </article>
  </div>; 
}

function Row({ label, value, tone, strong }: { label: string; value: number; tone: string; strong?: boolean }) { 
  return <div className={`flex justify-between ${strong ? 'border-t border-slate-700 pt-3 font-bold' : ''}`}>
    <dt className="text-slate-400">{label}</dt>
    <dd className={tone}>{euro(value)}</dd>
  </div>; 
}

function MovementModal({ kind, onClose, onSaved, onError }: { kind: 'income' | 'expense'; onClose: () => void; onSaved: () => void; onError: () => void }) { 
  const [concept, setConcept] = useState(''); 
  const [amount, setAmount] = useState(''); 
  const [counterparty, setCounterparty] = useState(''); 
  const [category, setCategory] = useState(kind === 'income' ? 'Otros ingresos' : 'Otros gastos'); 
  const [status, setStatus] = useState<Status>(kind === 'income' ? 'Cobrado' : 'Pagado'); 
  
  const save = (event: FormEvent) => { 
    event.preventDefault(); 
    const value = Number(amount.replace(',', '.')); 
    if (!concept.trim() || !Number.isFinite(value) || value <= 0) return; 
    const record = { 
      date: new Date().toISOString().slice(0, 10), 
      concept, 
      counterparty: counterparty || 'Sin asignar', 
      category, 
      amount: kind === 'income' ? value : -value, 
      status 
    }; 
    const newRef = push(ref(database, 'erp/transactions')); 
    void set(newRef, record).then(onSaved).catch(onError); 
  }; 
  
  return <Modal title={`Registrar ${kind === 'income' ? 'ingreso' : 'gasto'}`} onClose={onClose}>
    <form onSubmit={save} className="space-y-4">
      <Field label="Concepto">
        <input required value={concept} onChange={e => setConcept(e.target.value)} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={kind === 'income' ? 'Cliente / origen' : 'Proveedor'}>
          <input value={counterparty} onChange={e => setCounterparty(e.target.value)} className="input" />
        </Field>
        <Field label="Importe total (€)">
          <input required value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" className="input" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría">
          <input value={category} onChange={e => setCategory(e.target.value)} className="input" />
        </Field>
        <Field label="Estado">
          <select value={status} onChange={e => setStatus(e.target.value as Status)} className="input">
            <option>Cobrado</option><option>Pagado</option><option>Pendiente</option>
          </select>
        </Field>
      </div>
      <Actions onClose={onClose} label={`Registrar ${kind === 'income' ? 'ingreso' : 'gasto'}`} />
    </form>
  </Modal>; 
}

function EditMovementModal({ movement, onClose, onSaved, onError }: { movement: Movement; onClose: () => void; onSaved: () => void; onError: () => void }) {
  const [concept, setConcept] = useState(movement.concept);
  const [counterparty, setCounterparty] = useState(movement.counterparty);
  const [amount, setAmount] = useState(Math.abs(movement.amount).toString());
  const [category, setCategory] = useState(movement.category);
  const [status, setStatus] = useState<Status>(movement.status);
  const [date, setDate] = useState(movement.date);
  
  const save = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!concept.trim() || !Number.isFinite(value) || value <= 0) return;
    const updates = {
      concept,
      counterparty: counterparty || 'Sin asignar',
      category,
      amount: movement.amount < 0 ? -value : value,
      status,
      date
    };
    void update(ref(database, `erp/transactions/${movement.id}`), updates).then(onSaved).catch(onError);
  };
  
  return <Modal title="Editar movimiento" onClose={onClose}>
    <form onSubmit={save} className="space-y-4">
      <Field label="Concepto">
        <input required value={concept} onChange={e => setConcept(e.target.value)} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={movement.amount > 0 ? 'Cliente / origen' : 'Proveedor'}>
          <input value={counterparty} onChange={e => setCounterparty(e.target.value)} className="input" />
        </Field>
        <Field label="Importe total (€)">
          <input required value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" className="input" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría">
          <input value={category} onChange={e => setCategory(e.target.value)} className="input" />
        </Field>
        <Field label="Fecha">
          <input required value={date} onChange={e => setDate(e.target.value)} type="date" className="input" />
        </Field>
      </div>
      <Field label="Estado">
        <select value={status} onChange={e => setStatus(e.target.value as Status)} className="input">
          <option value="Pendiente">Pendiente</option>
          <option value="Cobrado">Cobrado</option>
          <option value="Pagado">Pagado</option>
        </select>
      </Field>
      <Actions onClose={onClose} label="Guardar cambios" />
    </form>
  </Modal>;
}

function PartnerModal({ partners, editing, onClose, onSaved, onError }: { partners: Partner[]; editing: Partner | null; onClose: () => void; onSaved: () => void; onError: () => void }) { 
  const [name, setName] = useState(editing?.name || ''); 
  const [email, setEmail] = useState(editing?.email || ''); 
  const [phone, setPhone] = useState(editing?.phone || ''); 
  const [cuota, setCuota] = useState(editing?.cuota?.toString() || ''); 
  
  const save = (event: FormEvent) => { 
    event.preventDefault(); 
    if (!name.trim() || !phone.trim()) {
      window.alert('Nombre y teléfono son obligatorios.');
      return;
    }
    const cuotaValue = Number(cuota.replace(',', '.')) || 0;
    if (editing) {
      void update(ref(database, `erp/partners/${editing.id}`), { name, email, phone, cuota: cuotaValue }).then(onSaved).catch(onError);
    } else {
      const newRef = push(ref(database, 'erp/partners')); 
      void set(newRef, { name, email, phone, cuota: cuotaValue, status: 'Activo', paymentStatus: 'Pendiente' }).then(onSaved).catch(onError); 
    }
  }; 
  
  return <Modal title={editing ? "Editar socio" : "Añadir socio"} onClose={onClose}>
    <form onSubmit={save} className="space-y-4">
      <Field label="Nombre completo">
        <input required value={name} onChange={e => setName(e.target.value)} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono">
          <input required value={phone} onChange={e => setPhone(e.target.value)} className="input" />
        </Field>
        <Field label="Email">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
        </Field>
      </div>
      <Field label="Cuota (€)">
        <input value={cuota} onChange={e => setCuota(e.target.value)} inputMode="decimal" className="input" />
      </Field>
      <Actions onClose={onClose} label={editing ? "Guardar cambios" : "Añadir socio"} />
    </form>
  </Modal>; 
}

function EditPartnerModal({ partner, onClose, onSaved, onError }: { partner: Partner; onClose: () => void; onSaved: () => void; onError: () => void }) {
  const [paymentStatus, setPaymentStatus] = useState<'Pagado' | 'Pendiente'>(partner.paymentStatus || 'Pendiente');
  const wasChanged = paymentStatus !== (partner.paymentStatus || 'Pendiente');
  
  const generateWhatsAppMessage = () => {
    const message = `Hola ${partner.name} 👋, desde la caseta *Los Manolos y Cia.* te confirmamos que hemos recibido el pago de tu cuota por un importe de ${partner.cuota ? euro(partner.cuota) : 'su cuota'}. ¡Muchas gracias y nos vemos en la Feria! 🎉`;
    return encodeURIComponent(message);
  };
  
  const save = (event: FormEvent) => {
    event.preventDefault();
    void update(ref(database, `erp/partners/${partner.id}`), { paymentStatus }).then(onSaved).catch(onError);
  };
  
  return <Modal title="Editar estado de pago del socio" onClose={onClose}>
    <form onSubmit={save} className="space-y-4">
      <div className="bg-slate-800 rounded-xl p-4 space-y-2">
        <div><p className="text-xs text-slate-400">Nombre</p><p className="font-bold text-white">{partner.name}</p></div>
        <div><p className="text-xs text-slate-400">Teléfono</p><p className="font-bold text-white">{partner.phone}</p></div>
        {partner.cuota && <div><p className="text-xs text-slate-400">Cuota</p><p className="font-bold text-white">{euro(partner.cuota)}</p></div>}
      </div>
      <Field label="Estado de pago">
        <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as 'Pagado' | 'Pendiente')} className="input">
          <option value="Pendiente">Pendiente</option>
          <option value="Pagado">Pagado</option>
        </select>
      </Field>
      {wasChanged && paymentStatus === 'Pagado' && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-2">
          <p className="text-sm font-bold text-emerald-300">✓ Pago confirmado</p>
          <p className="text-xs text-emerald-200">Haz clic en el botón abajo para enviar confirmación por WhatsApp</p>
          <a href={`https://wa.me/${partner.phone.replace(/[^0-9]/g, '')}?text=${generateWhatsAppMessage()}`} target="_blank" rel="noopener noreferrer" className="block mt-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 text-center text-sm transition">
            📱 Enviar por WhatsApp
          </a>
        </div>
      )}
      <Actions onClose={onClose} label="Guardar cambios" />
    </form>
  </Modal>;
}

function SupplierModal({ supplier, onClose, onSaved, onError }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void; onError: () => void }) {
  const [name, setName] = useState(supplier?.name || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [email, setEmail] = useState(supplier?.email || '');
  const [contact, setContact] = useState(supplier?.contact || '');
  
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) {
      window.alert('El nombre y teléfono son obligatorios.');
      return;
    }
    const record = { name, phone, email, contact };
    if (supplier) {
      void update(ref(database, `erp/suppliers/${supplier.id}`), record).then(onSaved).catch(onError);
    } else {
      const newRef = push(ref(database, 'erp/suppliers'));
      void set(newRef, record).then(onSaved).catch(onError);
    }
  };
  
  return <Modal title={supplier ? "Editar proveedor" : "Añadir proveedor"} onClose={onClose}>
    <form onSubmit={save} className="space-y-4">
      <Field label="Nombre proveedor">
        <input required value={name} onChange={e => setName(e.target.value)} className="input" />
      </Field>
      <Field label="Teléfono">
        <input required value={phone} onChange={e => setPhone(e.target.value)} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" />
        </Field>
        <Field label="Persona de contacto">
          <input value={contact} onChange={e => setContact(e.target.value)} className="input" />
        </Field>
      </div>
      <Actions onClose={onClose} label={supplier ? "Guardar cambios" : "Añadir proveedor"} />
    </form>
  </Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { 
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4">
    <div className="panel w-full max-w-lg rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <button type="button" onClick={onClose} className="text-slate-400">✕</button>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  </div>; 
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { 
  return <label className="block text-sm text-slate-300">{label}<span className="mt-1 block">{children}</span></label>; 
}

function Actions({ onClose, label }: { onClose: () => void; label: string }) { 
  return <div className="flex justify-end gap-2 pt-3">
    <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm">Cancelar</button>
    <button className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950">{label}</button>
  </div>; 
}
