import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const EMOTIONS = ['Patient', 'Confident', 'FOMO', 'Revenge', 'Anxious', 'Disciplined', 'Frustrated', 'Greedy']
const inp = "w-full bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/70 transition-colors"
const lbl = "text-zinc-500 text-xs block mb-1.5 font-medium tracking-wide"

function calcRR(entry, sl, tp, dir) {
  const e = parseFloat(entry), s = parseFloat(sl), t = parseFloat(tp)
  if (!e || !s || !t) return null
  const risk = dir === 'Long' ? e - s : s - e
  const reward = dir === 'Long' ? t - e : e - t
  if (risk <= 0 || reward <= 0) return null
  return (reward / risk).toFixed(2)
}

function RRBox({ entry, sl, tp, dir }) {
  const rr = calcRR(entry, sl, tp, dir)
  if (!rr) return null
  const val = parseFloat(rr)
  const color = val >= 2 ? 'text-green-400' : val >= 1 ? 'text-yellow-400' : 'text-red-400'
  const bg = val >= 2 ? 'bg-green-500/10 border-green-500/20' : val >= 1 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'
  const label = val >= 2 ? 'Strong setup — meets 2R target' : val >= 1 ? 'Acceptable — aim for 2R+' : 'Weak R:R — consider skipping'
  return (
    <div className={`mb-4 px-4 py-3 rounded-xl border flex items-center gap-4 ${bg}`}>
      <div>
        <div className="text-xs text-zinc-500 mb-0.5 tracking-wide">R:R RATIO</div>
        <div className={`text-2xl font-mono font-bold ${color}`}>1:{rr}</div>
      </div>
      <div className={`text-sm ${color}`}>{label}</div>
    </div>
  )
}

function EmotionTags({ emotions, onChange }) {
  return (
    <div className="mb-4">
      <label className={lbl}>How did you feel?</label>
      <div className="flex flex-wrap gap-2 mt-1">
        {EMOTIONS.map(em => {
          const active = emotions.includes(em)
          const isNeg = ['FOMO','Revenge','Anxious','Frustrated','Greedy'].includes(em)
          return (
            <button key={em} type="button"
              onClick={() => onChange(active ? emotions.filter(e => e !== em) : [...emotions, em])}
              className={`px-3 py-1 rounded-full text-xs border transition-all ${active ? (isNeg ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-green-500/20 border-green-500/40 text-green-400') : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:border-zinc-500'}`}>
              {em}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'log', label: 'Log Trade', icon: '+' },
  { id: 'history', label: 'History', icon: '≡' },
  { id: 'calendar', label: 'Calendar', icon: '◫' },
]

export default function Dashboard({ user }) {
  const [trades, setTrades] = useState([])
  const [view, setView] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [editingTrade, setEditingTrade] = useState(null)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [dailyLimit, setDailyLimit] = useState(() => localStorage.getItem('dailyLimit') || '100')
  const [showLimitInput, setShowLimitInput] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    session: 'London', direction: 'Long',
    entry: '', stop_loss: '', take_profit: '', lots: '0.01',
    result: '', outcome: 'Win', pair: 'XAUUSD', setup: '', notes: '',
    chart_url: '', emotions: []
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { fetchTrades() }, [])

  async function fetchTrades() {
    const { data } = await supabase.from('trades').select('*').order('created_at', { ascending: false })
    if (data) setTrades(data)
  }

  async function logTrade(e) {
    e.preventDefault(); setLoading(true)
    const { error } = await supabase.from('trades').insert([{
      user_id: user.id, date: form.date, session: form.session, direction: form.direction,
      entry: parseFloat(form.entry) || null, stop_loss: parseFloat(form.stop_loss) || null,
      take_profit: parseFloat(form.take_profit) || null, lots: parseFloat(form.lots) || null,
      result: parseFloat(form.result), outcome: form.outcome, pair: form.pair,
      setup: form.setup, notes: form.notes, chart_url: form.chart_url, emotions: form.emotions
    }])
    if (error) { setMsg('Error saving.'); setLoading(false); return }
    setMsg('Trade logged!'); setTimeout(() => setMsg(''), 2000)
    setForm(emptyForm); fetchTrades(); setLoading(false)
  }

  async function saveEdit(e) {
    e.preventDefault(); setLoading(true)
    const { error } = await supabase.from('trades').update({
      date: editingTrade.date, session: editingTrade.session, direction: editingTrade.direction,
      entry: parseFloat(editingTrade.entry) || null, stop_loss: parseFloat(editingTrade.stop_loss) || null,
      take_profit: parseFloat(editingTrade.take_profit) || null, lots: parseFloat(editingTrade.lots) || null,
      result: parseFloat(editingTrade.result), outcome: editingTrade.outcome, pair: editingTrade.pair || '',
      setup: editingTrade.setup, notes: editingTrade.notes, chart_url: editingTrade.chart_url,
      emotions: editingTrade.emotions || []
    }).eq('id', editingTrade.id)
    if (error) { setMsg('Error updating.'); setLoading(false); return }
    setMsg('Updated!'); setTimeout(() => setMsg(''), 2000)
    setEditingTrade(null); fetchTrades(); setLoading(false)
  }

  async function deleteTrade(id) {
    await supabase.from('trades').delete().eq('id', id); fetchTrades()
  }

  function exportCSV() {
    const headers = ['Date','Pair','Direction','Session','Entry','Stop Loss','Take Profit','Lots','Result','Outcome','Setup','Emotions','Notes']
    const rows = trades.map(t => [
      t.date, t.pair||'', t.direction, t.session,
      t.entry||'', t.stop_loss||'', t.take_profit||'', t.lots||'',
      t.result, t.outcome, t.setup||'',
      (t.emotions||[]).join(' | '), (t.notes||'').replace(/,/g,'')
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `propjournals-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const wins = trades.filter(t => t.outcome === 'Win')
  const losses = trades.filter(t => t.outcome === 'Loss')
  const totalPnL = trades.reduce((a, t) => a + (t.result || 0), 0)
  const closed = trades.filter(t => t.outcome !== 'Breakeven')
  const winRate = closed.length ? (wins.length / closed.length * 100) : 0
  const avgWin = wins.length ? wins.reduce((a, t) => a + t.result, 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((a, t) => a + t.result, 0) / losses.length : 0

  const todayStr = new Date().toISOString().split('T')[0]
  const todayPnL = trades.filter(t => t.date === todayStr).reduce((a, t) => a + (t.result || 0), 0)
  const limitNum = parseFloat(dailyLimit) || 100
  const limitUsed = Math.abs(Math.min(0, todayPnL))
  const limitPct = Math.min((limitUsed / limitNum) * 100, 100)

  const equityCurve = [...trades].reverse().reduce((acc, t, i) => {
    const prev = acc[i - 1]?.equity || 0
    acc.push({ trade: i + 1, equity: parseFloat((prev + (t.result || 0)).toFixed(2)) })
    return acc
  }, [])

  const equityMin = Math.min(...equityCurve.map(e => e.equity), 0)
  const equityMax = Math.max(...equityCurve.map(e => e.equity), 0)
  const zeroPercent = equityMax === equityMin ? 0 : (equityMax / (equityMax - equityMin)) * 100

  const monthlyPnL = trades.reduce((acc, t) => {
    const m = t.date?.slice(0, 7)
    if (!m) return acc
    acc[m] = (acc[m] || 0) + (t.result || 0)
    return acc
  }, {})
  const monthlyData = Object.entries(monthlyPnL).sort().slice(-6).map(([month, pnl]) => ({
    month: month.slice(5) + '/' + month.slice(2,4),
    pnl: parseFloat(pnl.toFixed(2))
  }))

  const pieData = [
    { name: 'Wins', value: wins.length, color: '#22c55e' },
    { name: 'Losses', value: losses.length, color: '#ef4444' },
    { name: 'BE', value: trades.filter(t => t.outcome === 'Breakeven').length, color: '#71717a' }
  ].filter(d => d.value > 0)

  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const tradesByDate = {}
  trades.forEach(t => { if (!tradesByDate[t.date]) tradesByDate[t.date] = []; tradesByDate[t.date].push(t) })
  const getDateStr = (d) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  const CustomBar = (props) => {
    const { x, y, width, height, value } = props
    const fill = value >= 0 ? '#22c55e' : '#ef4444'
    return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} />
  }

  const StatCard = ({ label, value, color = 'text-white', sub }) => (
    <div className="bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 hover:border-zinc-700/50 transition-colors">
      <div className="text-zinc-500 text-xs font-medium tracking-widest uppercase mb-3">{label}</div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-zinc-600 text-xs mt-1">{sub}</div>}
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">

      {/* SIDEBAR desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-zinc-900 border-r border-zinc-800/50 fixed h-full z-20">
        <div className="p-5 border-b border-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold text-sm">P</div>
            <div>
              <div className="font-bold text-sm">PropJournals</div>
              <div className="text-zinc-600 text-xs">Pro trader</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all ${view === item.id ? 'bg-red-600/20 text-red-400 border border-red-600/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800/50">
          <div className="text-zinc-600 text-xs truncate mb-2 px-2">{user.email}</div>
          <button onClick={() => supabase.auth.signOut()}
            className="w-full text-left px-3 py-2 text-zinc-500 hover:text-white text-sm rounded-xl hover:bg-zinc-800/50 transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* MOBILE TOP NAV */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-zinc-900 border-b border-zinc-800/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center font-bold text-xs">P</div>
          <span className="font-bold text-sm">PropJournals</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-zinc-400 text-xl">☰</button>
      </div>

      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80" onClick={() => setSidebarOpen(false)}>
          <div className="w-56 h-full bg-zinc-900 border-r border-zinc-800/50 p-4" onClick={e => e.stopPropagation()}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => { setView(item.id); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium ${view === item.id ? 'bg-red-600/20 text-red-400' : 'text-zinc-400'}`}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
            <button onClick={() => supabase.auth.signOut()} className="w-full text-left px-3 py-2.5 text-zinc-500 text-sm mt-4">Sign out</button>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">

          {/* DASHBOARD */}
          {view === 'dashboard' && (
            <div>
              <div className="mb-6">
                <h1 className="text-xl font-bold">Dashboard</h1>
                <p className="text-zinc-500 text-sm">Your trading performance overview</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total trades" value={trades.length} />
                <StatCard label="Win rate" value={trades.length ? winRate.toFixed(1) + '%' : '—'} color={winRate >= 50 ? 'text-green-400' : trades.length ? 'text-red-400' : 'text-white'} />
                <StatCard label="Total P&L" value={trades.length ? (totalPnL >= 0 ? '+' : '') + totalPnL.toFixed(0) + '$' : '—'} color={totalPnL >= 0 ? 'text-green-400' : 'text-red-400'} />
                <StatCard label="Avg win / loss" value={wins.length ? '+' + avgWin.toFixed(0) + '$' : '—'} color="text-green-400" sub={losses.length ? 'Avg loss: ' + avgLoss.toFixed(0) + '$' : ''} />
              </div>

              {/* DAILY LIMIT */}
              <div className="bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-zinc-500 text-xs font-medium tracking-widest uppercase">Daily loss limit</div>
                  <button onClick={() => setShowLimitInput(!showLimitInput)} className="text-zinc-600 hover:text-zinc-400 text-xs">Edit</button>
                </div>
                {showLimitInput && (
                  <div className="flex gap-2 mb-3">
                    <input type="number" className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs w-20 focus:outline-none"
                      value={dailyLimit} onChange={e => { setDailyLimit(e.target.value); localStorage.setItem('dailyLimit', e.target.value) }} />
                    <button onClick={() => setShowLimitInput(false)} className="text-xs text-zinc-400 hover:text-white">Done</button>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-lg font-bold font-mono ${limitPct >= 80 ? 'text-red-400' : limitPct >= 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {limitUsed > 0 ? '-' + limitUsed.toFixed(0) : '0'}$ used
                  </span>
                  <span className="text-zinc-500 text-sm">Limit: -{limitNum}$</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${limitPct >= 80 ? 'bg-red-500' : limitPct >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{width: limitPct + '%'}}></div>
                </div>
                {limitPct >= 80 && <div className="text-red-400 text-xs mt-2">⚠ Approaching daily limit — stop trading</div>}
              </div>

              {/* CHARTS */}
              {trades.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* EQUITY CURVE */}
                  <div className="md:col-span-2 bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-zinc-500 text-xs font-medium tracking-widest uppercase">Equity curve</div>
                      <span className={`text-sm font-bold font-mono ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(0)}$</span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={equityCurve}>
                        <defs>
                          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={`${zeroPercent}%`} stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset={`${zeroPercent}%`} stopColor="#ef4444" stopOpacity={0.3} />
                          </linearGradient>
                          <linearGradient id="equityStroke" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={`${zeroPercent}%`} stopColor="#22c55e" />
                            <stop offset={`${zeroPercent}%`} stopColor="#ef4444" />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="trade" hide />
                        <YAxis hide />
                        <ReferenceLine y={0} stroke="#3f3f46" strokeDasharray="3 3" />
                        <Tooltip
                          contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                          formatter={(v) => [(v >= 0 ? '+' : '') + v + '$', 'Equity']}
                          labelFormatter={(l) => 'Trade ' + l}
                        />
                        <Area type="monotone" dataKey="equity" stroke="url(#equityStroke)" strokeWidth={2} fill="url(#equityGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* PIE */}
                  <div className="bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5">
                    <div className="text-zinc-500 text-xs font-medium tracking-widest uppercase mb-4">Win / Loss</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                      {pieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{background: d.color}}></div>
                          <span className="text-xs text-zinc-400">{d.name} {d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MONTHLY BAR CHART */}
              {monthlyData.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 mb-6">
                  <div className="text-zinc-500 text-xs font-medium tracking-widest uppercase mb-4">Monthly P&L</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthlyData} barSize={40} barGap={8}>
                      <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => v + '$'} />
                      <ReferenceLine y={0} stroke="#3f3f46" />
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [(v >= 0 ? '+' : '') + v + '$', 'P&L']}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      />
                      <Bar dataKey="pnl" shape={<CustomBar />} label={{ position: 'top', fill: '#71717a', fontSize: 11, formatter: v => (v >= 0 ? '+' : '') + v + '$' }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* RECENT TRADES */}
              <div className="bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5">
                <div className="text-zinc-500 text-xs font-medium tracking-widest uppercase mb-4">Recent trades</div>
                {!trades.length && <div className="text-zinc-600 text-sm text-center py-8">No trades yet — log your first trade</div>}
                {trades.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-3 border-b border-zinc-800/50 last:border-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.outcome==='Win'?'bg-green-500':t.outcome==='Loss'?'bg-red-500':'bg-zinc-500'}`} />
                    <span className="text-xs text-zinc-500 w-20 flex-shrink-0">{t.date}</span>
                    <span className="text-sm font-bold">{t.pair||'XAUUSD'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.direction==='Long'?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{t.direction}</span>
                    <span className="text-xs text-zinc-500">{t.session}</span>
                    <span className={`ml-auto font-mono text-sm font-bold ${t.result>=0?'text-green-400':'text-red-400'}`}>{t.result>=0?'+':''}{t.result}$</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LOG TRADE */}
          {view === 'log' && (
            <div>
              <div className="mb-6">
                <h1 className="text-xl font-bold">Log trade</h1>
                <p className="text-zinc-500 text-sm">Record your trade details</p>
              </div>
              <form onSubmit={logTrade} className="bg-zinc-900 border border-zinc-800/50 rounded-2xl p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div><label className={lbl}>Date</label><input type="date" className={inp} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                  <div><label className={lbl}>Session</label>
                    <select className={inp} value={form.session} onChange={e => setForm({...form, session: e.target.value})}>
                      {['London','NY Open','New York','Asian'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Direction</label>
                    <select className={inp} value={form.direction} onChange={e => setForm({...form, direction: e.target.value})}>
                      <option>Long</option><option>Short</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div><label className={lbl}>Entry</label><input type="number" step="0.01" className={inp} value={form.entry} onChange={e => setForm({...form, entry: e.target.value})} placeholder="2350" /></div>
                  <div><label className={lbl}>Stop loss</label><input type="number" step="0.01" className={inp} value={form.stop_loss} onChange={e => setForm({...form, stop_loss: e.target.value})} placeholder="2340" /></div>
                  <div><label className={lbl}>Take profit</label><input type="number" step="0.01" className={inp} value={form.take_profit} onChange={e => setForm({...form, take_profit: e.target.value})} placeholder="2370" /></div>
                  <div><label className={lbl}>Lots</label><input type="number" step="0.01" className={inp} value={form.lots} onChange={e => setForm({...form, lots: e.target.value})} /></div>
                </div>
                <RRBox entry={form.entry} sl={form.stop_loss} tp={form.take_profit} dir={form.direction} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div><label className={lbl}>Result ($)</label><input type="number" step="0.01" className={inp} value={form.result} onChange={e => setForm({...form, result: e.target.value})} placeholder="+43 or -97" /></div>
                  <div><label className={lbl}>Outcome</label>
                    <select className={inp} value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})}>
                      <option>Win</option><option>Loss</option><option>Breakeven</option>
                    </select>
                  </div>
                  <div><label className={lbl}>Pair</label><input type="text" className={inp} value={form.pair} onChange={e => setForm({...form, pair: e.target.value})} placeholder="XAUUSD" /></div>
                  <div><label className={lbl}>Setup</label><input type="text" className={inp} value={form.setup} onChange={e => setForm({...form, setup: e.target.value})} placeholder="H4 retest" /></div>
                </div>
                <EmotionTags emotions={form.emotions} onChange={emotions => setForm({...form, emotions})} />
                <div className="mb-4"><label className={lbl}>Chart URL (optional)</label><input type="url" className={inp} value={form.chart_url} onChange={e => setForm({...form, chart_url: e.target.value})} placeholder="https://i.imgur.com/..." /></div>
                <div className="mb-6"><label className={lbl}>Notes</label><textarea className={inp + ' h-24 resize-none'} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="What went well? What did you mess up?" /></div>
                <div className="flex items-center gap-4">
                  <button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    {loading ? 'Saving...' : 'Log trade'}
                  </button>
                  {msg && <span className="text-green-400 text-sm">{msg}</span>}
                </div>
              </form>
            </div>
          )}

          {/* HISTORY */}
          {view === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold">History</h1>
                  <p className="text-zinc-500 text-sm">{trades.length} trades logged</p>
                </div>
                {trades.length > 0 && (
                  <button onClick={exportCSV} className="text-zinc-400 hover:text-white text-xs border border-zinc-700/50 px-3 py-1.5 rounded-lg transition-colors">
                    Export CSV
                  </button>
                )}
              </div>
              {!trades.length && <div className="text-center text-zinc-600 py-16">No trades yet.</div>}
              {trades.map(t => (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5 mb-3 hover:border-zinc-700/50 transition-colors">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.outcome==='Win'?'bg-green-500':t.outcome==='Loss'?'bg-red-500':'bg-zinc-500'}`} />
                    <span className="text-xs text-zinc-500">{t.date}</span>
                    <span className="text-sm font-bold">{t.pair||'XAUUSD'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.direction==='Long'?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{t.direction}</span>
                    <span className="text-xs text-zinc-500">{t.session}</span>
                    {t.setup && <span className="text-xs text-zinc-600">{t.setup}</span>}
                    {(t.emotions||[]).map(em => (
                      <span key={em} className={`text-xs px-2 py-0.5 rounded-full ${['FOMO','Revenge','Anxious','Frustrated','Greedy'].includes(em)?'bg-red-500/10 text-red-400':'bg-green-500/10 text-green-400'}`}>{em}</span>
                    ))}
                    <span className={`ml-auto font-mono font-bold ${t.result>=0?'text-green-400':'text-red-400'}`}>{t.result>=0?'+':''}{t.result}$</span>
                    <button onClick={() => setEditingTrade({...t, emotions: t.emotions||[]})} className="text-zinc-600 hover:text-yellow-400 text-xs border border-zinc-800 px-2 py-0.5 rounded-lg transition-colors">Edit</button>
                    <button onClick={() => deleteTrade(t.id)} className="text-zinc-700 hover:text-red-400 text-xs transition-colors">✕</button>
                  </div>
                  {t.notes && <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{t.notes}</p>}
                  {t.chart_url && <img src={t.chart_url} alt="chart" className="mt-3 rounded-xl max-h-48 object-cover cursor-pointer border border-zinc-800" onClick={() => window.open(t.chart_url)} />}
                </div>
              ))}
            </div>
          )}

          {/* CALENDAR */}
          {view === 'calendar' && (
            <div>
              <div className="mb-6">
                <h1 className="text-xl font-bold">Calendar</h1>
                <p className="text-zinc-500 text-sm">Your trading days at a glance</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800/50 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <button onClick={() => setCalendarDate(new Date(year, month-1, 1))} className="text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl border border-zinc-800 text-sm transition-colors">← Prev</button>
                  <div className="font-bold">{monthNames[month]} {year}</div>
                  <button onClick={() => setCalendarDate(new Date(year, month+1, 1))} className="text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl border border-zinc-800 text-sm transition-colors">Next →</button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="text-center text-zinc-600 text-xs py-1 font-medium">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array(firstDay).fill(null).map((_,i) => <div key={'e'+i} />)}
                  {Array(daysInMonth).fill(null).map((_,i) => {
                    const d = i+1, dateStr = getDateStr(d)
                    const dayTrades = tradesByDate[dateStr] || []
                    const dayPnL = dayTrades.reduce((a,t) => a+(t.result||0), 0)
                    const isSelected = selectedDate === dateStr
                    const isToday = dateStr === todayStr
                    return (
                      <div key={d} onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                        className={`min-h-14 rounded-xl p-1.5 cursor-pointer border transition-all ${isSelected ? 'border-red-500/50 bg-red-500/5' : isToday ? 'border-zinc-600' : 'border-zinc-800/50'} ${dayTrades.length ? 'bg-zinc-800/30 hover:border-zinc-600' : 'hover:bg-zinc-800/20'}`}>
                        <div className={`text-xs mb-1 font-medium ${isToday ? 'text-red-400' : 'text-zinc-500'}`}>{d}</div>
                        {dayTrades.length > 0 && (
                          <>
                            <div className={`text-xs font-mono font-bold ${dayPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>{dayPnL >= 0 ? '+' : ''}{dayPnL.toFixed(0)}</div>
                            <div className="flex gap-0.5 mt-0.5">
                              {dayTrades.some(t => t.outcome==='Win') && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                              {dayTrades.some(t => t.outcome==='Loss') && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectedDate && tradesByDate[selectedDate] && (
                  <div className="mt-5 pt-5 border-t border-zinc-800/50">
                    <div className="text-sm font-semibold text-zinc-300 mb-3">Trades on {selectedDate}</div>
                    {tradesByDate[selectedDate].map(t => (
                      <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-800/50 last:border-0 flex-wrap">
                        <div className={`w-2 h-2 rounded-full ${t.outcome==='Win'?'bg-green-500':t.outcome==='Loss'?'bg-red-500':'bg-zinc-500'}`} />
                        <span className="text-sm font-medium">{t.pair||'XAUUSD'}</span>
                        <span className="text-xs text-zinc-500">{t.direction} · {t.session}</span>
                        {(t.emotions||[]).map(em => <span key={em} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{em}</span>)}
                        <span className={`ml-auto font-mono font-bold text-sm ${t.result>=0?'text-green-400':'text-red-400'}`}>{t.result>=0?'+':''}{t.result}$</span>
                        <button onClick={() => setEditingTrade({...t, emotions: t.emotions||[]})} className="text-zinc-600 hover:text-yellow-400 text-xs border border-zinc-800 px-2 py-0.5 rounded-lg">Edit</button>
                        <button onClick={() => deleteTrade(t.id)} className="text-zinc-700 hover:text-red-400 text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FLOATING + BUTTON */}
      <button
        onClick={() => setView('log')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-red-600 hover:bg-red-500 text-white rounded-full text-2xl font-bold shadow-lg transition-all hover:scale-110 z-30 flex items-center justify-center"
        title="Log a trade"
      >
        +
      </button>

      {/* EDIT MODAL */}
      {editingTrade && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 px-4 py-8 overflow-y-auto backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="font-bold text-lg">Edit trade</div>
              <button onClick={() => setEditingTrade(null)} className="text-zinc-500 hover:text-white w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div><label className={lbl}>Date</label><input type="date" className={inp} value={editingTrade.date} onChange={e => setEditingTrade({...editingTrade, date: e.target.value})} /></div>
                <div><label className={lbl}>Session</label>
                  <select className={inp} value={editingTrade.session} onChange={e => setEditingTrade({...editingTrade, session: e.target.value})}>
                    {['London','NY Open','New York','Asian'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Direction</label>
                  <select className={inp} value={editingTrade.direction} onChange={e => setEditingTrade({...editingTrade, direction: e.target.value})}>
                    <option>Long</option><option>Short</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div><label className={lbl}>Entry</label><input type="number" step="0.01" className={inp} value={editingTrade.entry||''} onChange={e => setEditingTrade({...editingTrade, entry: e.target.value})} /></div>
                <div><label className={lbl}>Stop loss</label><input type="number" step="0.01" className={inp} value={editingTrade.stop_loss||''} onChange={e => setEditingTrade({...editingTrade, stop_loss: e.target.value})} /></div>
                <div><label className={lbl}>Take profit</label><input type="number" step="0.01" className={inp} value={editingTrade.take_profit||''} onChange={e => setEditingTrade({...editingTrade, take_profit: e.target.value})} /></div>
                <div><label className={lbl}>Lots</label><input type="number" step="0.01" className={inp} value={editingTrade.lots||''} onChange={e => setEditingTrade({...editingTrade, lots: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div><label className={lbl}>Result ($)</label><input type="number" step="0.01" className={inp} value={editingTrade.result||''} onChange={e => setEditingTrade({...editingTrade, result: e.target.value})} /></div>
                <div><label className={lbl}>Outcome</label>
                  <select className={inp} value={editingTrade.outcome} onChange={e => setEditingTrade({...editingTrade, outcome: e.target.value})}>
                    <option>Win</option><option>Loss</option><option>Breakeven</option>
                  </select>
                </div>
                <div><label className={lbl}>Pair</label><input type="text" className={inp} value={editingTrade.pair||''} onChange={e => setEditingTrade({...editingTrade, pair: e.target.value})} /></div>
                <div><label className={lbl}>Setup</label><input type="text" className={inp} value={editingTrade.setup||''} onChange={e => setEditingTrade({...editingTrade, setup: e.target.value})} /></div>
              </div>
              <EmotionTags emotions={editingTrade.emotions||[]} onChange={emotions => setEditingTrade({...editingTrade, emotions})} />
              <div className="mb-4"><label className={lbl}>Chart URL</label><input type="url" className={inp} value={editingTrade.chart_url||''} onChange={e => setEditingTrade({...editingTrade, chart_url: e.target.value})} /></div>
              <div className="mb-6"><label className={lbl}>Notes</label><textarea className={inp + ' h-20 resize-none'} value={editingTrade.notes||''} onChange={e => setEditingTrade({...editingTrade, notes: e.target.value})} /></div>
              <div className="flex items-center gap-4">
                <button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-semibold">
                  {loading ? 'Saving...' : 'Save changes'}
                </button>
                <button type="button" onClick={() => setEditingTrade(null)} className="text-zinc-400 hover:text-white text-sm">Cancel</button>
                {msg && <span className="text-green-400 text-sm">{msg}</span>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}