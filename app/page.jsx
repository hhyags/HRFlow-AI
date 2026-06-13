'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Filter,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'employees', label: 'People', icon: Users },
      { id: 'recruitment', label: 'Recruitment', icon: BriefcaseBusiness },
      { id: 'attendance', label: 'Time & attendance', icon: Clock3 },
      { id: 'leave', label: 'Leave', icon: CalendarDays },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'payroll', label: 'Payroll', icon: CircleDollarSign },
      { id: 'performance', label: 'Performance', icon: Target },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'documents', label: 'Documents', icon: FileText },
    ],
  },
]

const moduleCopy = {
  attendance: ['Time & attendance', 'Track attendance, shifts, working hours, and overtime.'],
  leave: ['Leave management', 'Review requests, manage balances, and plan team availability.'],
  payroll: ['Payroll', 'Run payroll, manage compensation, and keep every payment on track.'],
  performance: ['Performance', 'Align goals, track KPIs, and make growth conversations meaningful.'],
  analytics: ['People analytics', 'Turn workforce data into clear, confident decisions.'],
  documents: ['Documents', 'One secure home for contracts, policies, resumes, and employee files.'],
}

function Avatar({ initials, color, small = false }) {
  return (
    <span className={`avatar ${small ? 'avatarSmall' : ''}`} style={{ '--avatar': color || '#6366f1' }}>
      {initials}
    </span>
  )
}

function Logo() {
  return (
    <div className="brand">
      <span className="brandMark"><span /><span /><span /></span>
      <span className="brandName">HRFlow <b>AI</b></span>
    </div>
  )
}

function Sidebar({ active, setActive, open, setOpen, compact, setCompact, organizationName, badges }) {
  return (
    <>
      {open && <button className="backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebarOpen' : ''} ${compact ? 'sidebarCompact' : ''}`}>
        <div className="sidebarTop">
          <Logo />
          <button className="iconButton sidebarClose" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        <button className="orgSwitcher" onClick={() => setActive('settings')}>
          <span className="orgIcon">{organizationName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
          <span className="orgText"><b>{organizationName}</b><small>Organization workspace</small></span>
          <ChevronDown size={15} />
        </button>

        <nav className="nav">
          {navGroups.map((group) => (
            <div className="navGroup" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    className={active === item.id ? 'active' : ''}
                    onClick={() => { setActive(item.id); setOpen(false) }}
                    title={item.label}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                    {badges[item.id] > 0 && <em>{badges[item.id]}</em>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebarBottom">
          <button onClick={() => { setActive('copilot'); setOpen(false) }} className={active === 'copilot' ? 'copilot active' : 'copilot'}>
            <span className="aiIcon"><Sparkles size={17} /></span>
            <span><b>HR Copilot</b><small>Ask anything about your team</small></span>
          </button>
          <button className="settingsButton" onClick={() => setActive('settings')}>
            <Settings size={18} /><span>Settings</span>
          </button>
          <button className="collapseButton" onClick={() => setCompact(!compact)}>
            <PanelLeftClose size={17} /><span>Collapse sidebar</span>
          </button>
        </div>
      </aside>
    </>
  )
}

function Header({ setOpen, dark, setDark, search, setSearch, setActive, notifications, profile }) {
  const fullName = profile?.fullName || profile?.email || 'HRFlow user'
  const initials = fullName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel = (profile?.role || 'EMPLOYEE').toLowerCase().replace('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  return (
    <header className="header">
      <button className="iconButton mobileMenu" onClick={() => setOpen(true)}><Menu size={20} /></button>
      <div className="globalSearch">
        <Search size={17} />
        <input
          aria-label="Global search"
          placeholder="Search people, jobs, reports..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && search.trim()) setActive('employees')
          }}
        />
        <kbd>⌘ K</kbd>
      </div>
      <div className="headerActions">
        <button className="iconButton" onClick={() => setDark(!dark)} aria-label="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="iconButton notification" onClick={() => setActive('notifications')} aria-label="Notifications">
          <Bell size={18} />{notifications > 0 && <span />}
        </button>
        <button className="profileButton" type="button" onClick={() => window.location.assign('/api/auth/logout')} title="Sign out">
          <Avatar initials={initials} color="#4f46e5" small />
          <span><b>{fullName}</b><small>{roleLabel}</small></span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  )
}

function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="pageHeading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="headingActions">{children}</div>
    </div>
  )
}

const actionFields = {
  employee: [
    ['employeeNumber', 'Employee number', 'text'],
    ['firstName', 'First name', 'text'],
    ['lastName', 'Last name', 'text'],
    ['email', 'Work email', 'email'],
    ['jobTitle', 'Job title', 'text'],
    ['joiningDate', 'Joining date', 'date'],
    ['salary', 'Monthly salary', 'number'],
    ['location', 'Location', 'text'],
  ],
  job: [
    ['title', 'Job title', 'text'],
    ['description', 'Job description', 'textarea'],
    ['location', 'Location', 'text'],
    ['openings', 'Openings', 'number'],
  ],
  candidate: [
    ['firstName', 'First name', 'text'],
    ['lastName', 'Last name', 'text'],
    ['email', 'Email', 'email'],
    ['phone', 'Phone', 'text'],
    ['jobId', 'Job (optional)', 'job'],
  ],
  attendance: [
    ['employeeId', 'Employee', 'employee'],
    ['date', 'Date', 'date'],
    ['workMinutes', 'Work minutes', 'number'],
    ['overtimeMinutes', 'Overtime minutes', 'number'],
  ],
  leave: [
    ['employeeId', 'Employee', 'employee'],
    ['type', 'Leave type', 'leaveType'],
    ['startDate', 'Start date', 'date'],
    ['endDate', 'End date', 'date'],
    ['reason', 'Reason', 'textarea'],
  ],
  payroll: [
    ['employeeId', 'Employee', 'employee'],
    ['periodStart', 'Period start', 'date'],
    ['periodEnd', 'Period end', 'date'],
    ['baseSalary', 'Base salary', 'number'],
    ['bonus', 'Bonus', 'number'],
    ['deductions', 'Deductions', 'number'],
    ['netPay', 'Net pay', 'number'],
  ],
  review: [
    ['employeeId', 'Employee', 'employee'],
    ['period', 'Review period', 'text'],
    ['rating', 'Rating (0-5)', 'number'],
    ['goalsScore', 'Goals score (0-100)', 'number'],
    ['feedback', 'Feedback', 'textarea'],
  ],
  invitation: [
    ['email', 'Work email', 'email'],
    ['role', 'Access role', 'select'],
  ],
  correction: [
    ['employeeId', 'Employee', 'employee'],
    ['attendanceId', 'Attendance record ID (optional)', 'text'],
    ['requestedCheckIn', 'Requested check-in', 'datetime-local'],
    ['requestedCheckOut', 'Requested check-out', 'datetime-local'],
    ['reason', 'Reason', 'textarea'],
  ],
  payrollRun: [
    ['periodStart', 'Period start', 'date'],
    ['periodEnd', 'Period end', 'date'],
    ['overtimeHourlyRate', 'Overtime hourly rate', 'number'],
    ['finalize', 'Payroll status', 'payrollStatus'],
  ],
}

const actionResource = {
  employee: 'employees',
  job: 'jobs',
  candidate: 'candidates',
  attendance: 'attendance',
  leave: 'leave',
  payroll: 'payroll',
  review: 'reviews',
}

function ActionModal({ action, close, onSaved, role, employees, jobs }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!action) return null

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    const form = Object.fromEntries(new FormData(event.currentTarget))
    for (const [key, value] of Object.entries(form)) {
      if (value === '') delete form[key]
    }
    const numeric = new Set(['salary', 'openings', 'workMinutes', 'overtimeMinutes', 'baseSalary', 'bonus', 'deductions', 'netPay', 'rating', 'goalsScore', 'overtimeHourlyRate'])
    for (const key of numeric) {
      if (form[key] !== undefined && form[key] !== '') form[key] = Number(form[key])
    }
    if (action.type === 'job' && !action.record) form.status = 'OPEN'
    if (action.type === 'candidate' && !action.record) form.skills = []
    if (action.type === 'attendance') form.status = 'PRESENT'
    if (action.type === 'payroll') form.status = 'DRAFT'
    if (action.type === 'payrollRun') {
      form.finalize = form.finalize === 'true'
      form.bonuses = []
      form.deductions = []
    }

    try {
      const endpoint = action.type === 'invitation'
        ? '/api/auth/invitations'
        : action.type === 'leave'
          ? '/api/leave-workflow/requests'
          : action.type === 'correction'
            ? '/api/attendance-engine/corrections'
            : action.type === 'payrollRun'
              ? '/api/payroll-engine/process'
              : action.record?.id
                ? `/api/${actionResource[action.type]}/${action.record.id}`
                : `/api/${actionResource[action.type]}`
      const response = await fetch(endpoint, {
        method: action.record?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to save this record.')
      await onSaved(action.type, body.data)
      close()
    } catch (cause) {
      setError(cause.message || 'Unable to save this record.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modalBackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div className="modalCard" role="dialog" aria-modal="true" aria-labelledby="action-title">
        <div className="modalHead">
          <div><p>HRFlow workspace</p><h2 id="action-title">{action.title}</h2></div>
          <button className="iconButton" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <form className="modalForm" onSubmit={submit}>
          {error && <p className="formError">{error}</p>}
          {actionFields[action.type]
            .filter(([name]) => !(['leave', 'correction'].includes(action.type) && role === 'EMPLOYEE' && name === 'employeeId'))
            .map(([name, label, type]) => (
            <label key={name}>{label}
              {type === 'textarea'
                ? <textarea name={name} defaultValue={action.record?.[name] || ''} required={name === 'description' || name === 'reason'} />
                : type === 'select'
                  ? <select name={name} defaultValue={action.record?.[name] || 'EMPLOYEE'}><option value="EMPLOYEE">Employee</option><option value="RECRUITER">Recruiter</option></select>
                  : type === 'employee'
                    ? <select name={name} defaultValue={action.record?.[name] || ''} required><option value="">Select employee</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.name}</option>)}</select>
                    : type === 'job'
                      ? <select name={name} defaultValue={action.record?.[name] || ''}><option value="">Select job</option>{jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}</select>
                      : type === 'leaveType'
                        ? <select name={name} defaultValue={action.record?.[name] || 'CASUAL'}><option value="CASUAL">Casual</option><option value="SICK">Sick</option><option value="EARNED">Earned</option><option value="UNPAID">Unpaid</option></select>
                        : type === 'payrollStatus'
                          ? <select name={name} defaultValue="false"><option value="false">Draft calculation</option><option value="true">Finalize and notify</option></select>
                          : <input name={name} type={type} defaultValue={action.record?.[name] || ''} required={!label.includes('optional') && !['salary', 'location', 'phone', 'bonus', 'deductions', 'goalsScore', 'requestedCheckIn', 'requestedCheckOut'].includes(name)} />}
            </label>
            ))}
          <div className="modalActions">
            <button type="button" className="button secondary" onClick={close}>Cancel</button>
            <button className="button primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function downloadCsv(name, rows) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers.join(','), ...rows.map((row) => headers.map((key) => escape(row[key])).join(','))].join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

function MetricCard({ label, value, change, icon: Icon, tone, note }) {
  return (
    <div className="card metricCard">
      <div className={`metricIcon ${tone}`}><Icon size={19} /></div>
      <div className="metricTop">
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <div className="metricFoot">
        <span className={change?.startsWith('+') ? 'positive' : ''}>{change}</span>
        <small>{note}</small>
      </div>
    </div>
  )
}

function GrowthChart({ values }) {
  const chartValues = values?.length === 12 ? values : Array(12).fill(0)
  const max = Math.max(...chartValues, 1)
  const min = Math.min(...chartValues, 0)
  const range = Math.max(max - min, 1)
  const points = chartValues.map((value, index) => {
    const x = (index / 11) * 650
    const y = 195 - ((value - min) / range) * 167
    return `${x},${y}`
  }).join(' ')
  const lastPoint = points.split(' ').at(-1).split(',')
  return (
    <div className="chartArea">
      <div className="yLabels"><span>{max}</span><span>{Math.round(max * .66)}</span><span>{Math.round(max * .33)}</span><span>{min}</span></div>
      <svg viewBox="0 0 650 210" preserveAspectRatio="none" aria-label="Employee growth chart">
        <defs>
          <linearGradient id="growthFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity=".26" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="gridLines"><line x1="0" y1="20" x2="650" y2="20" /><line x1="0" y1="78" x2="650" y2="78" /><line x1="0" y1="136" x2="650" y2="136" /><line x1="0" y1="195" x2="650" y2="195" /></g>
        <polygon className="areaFill" points={`0,210 ${points} 650,210`} />
        <polyline className="chartLine" points={points} />
        <circle cx={lastPoint[0]} cy={lastPoint[1]} r="5" />
      </svg>
      <div className="xLabels"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span></div>
    </div>
  )
}

function Dashboard({ data, employees, setActive, openAction, profile, canManage }) {
  const now = new Date()
  const dateHeading = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(now)
  const dateShort = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(now)
  const totalEmployees = data?.totalEmployees ?? 0
  const activeEmployees = data?.activeEmployees ?? 0
  const openJobs = data?.openJobs ?? 0
  const monthlyPayroll = `$${((data?.monthlyPayroll || 0) / 1000).toFixed(1)}K`
  const attendance = data?.attendance || {}
  const attendanceTotal = Object.values(attendance).reduce((sum, value) => sum + value, 0)
  const attendanceRate = attendanceTotal ? Math.round(((attendance.PRESENT || 0) / attendanceTotal) * 100) : 0
  const recruitment = data?.recruitment || {}
  const funnelRows = [
    ['Applied', recruitment.APPLIED || 0],
    ['Screening', recruitment.SCREENING || 0],
    ['Interview', recruitment.INTERVIEW || 0],
    ['Offer', recruitment.SELECTED || 0],
    ['Hired', recruitment.SELECTED || 0],
  ]
  const funnelMax = Math.max(...funnelRows.map(([, count]) => count), 1)
  const recentActivity = data?.recentEmployees?.length
    ? data.recentEmployees.slice(0, 4).map((employee, index) => [
        `${employee.firstName[0]}${employee.lastName[0]}`,
        ['#ec4899', '#6366f1', '#8b5cf6', '#0ea5e9'][index],
        `${employee.firstName} ${employee.lastName} joined the ${employee.department?.name || 'team'} directory`,
        new Date(employee.createdAt).toLocaleDateString(),
      ])
    : []
  return (
    <>
      <PageHeading
        eyebrow={dateHeading}
        title={`Welcome, ${(profile?.fullName || profile?.email || 'HRFlow user').split(' ')[0]}`}
        description="Here’s what’s happening with your organization today."
      >
        <button className="button secondary" onClick={() => downloadCsv('employees', employees || [])}><Upload size={16} /> Export</button>
        {canManage && <button className="button primary" onClick={() => openAction('employee', 'Add employee')}><Plus size={16} /> Add employee</button>}
      </PageHeading>

      <section className="metricsGrid">
        <MetricCard label="Total employees" value={totalEmployees} change="" note="organization headcount" icon={Users} tone="indigo" />
        <MetricCard label="Active today" value={activeEmployees} change={`${attendanceRate}%`} note="attendance rate" icon={Activity} tone="green" />
        <MetricCard label="Open positions" value={openJobs} change="" note="currently recruiting" icon={BriefcaseBusiness} tone="purple" />
        <MetricCard label="Monthly payroll" value={monthlyPayroll} change="" note="current period" icon={CircleDollarSign} tone="amber" />
      </section>

      <section className="dashboardGrid">
        <div className="card growthCard">
          <div className="cardHeader">
            <div><h2>Employee growth</h2><p>Headcount over the past 12 months</p></div>
            <button className="selectButton" onClick={() => setActive('analytics')}>Last 12 months <ChevronRight size={14} /></button>
          </div>
          <div className="growthSummary"><strong>{totalEmployees}</strong><span><TrendingUp size={14} /> Live</span><small>Employee headcount</small></div>
          <GrowthChart values={data?.employeeGrowth} />
        </div>

        <div className="card attendanceCard">
          <div className="cardHeader">
            <div><h2>Attendance today</h2><p>{dateShort}</p></div>
            <button className="moreButton" onClick={() => setActive('attendance')} aria-label="Open attendance"><ChevronRight size={18} /></button>
          </div>
          <div className="donutWrap">
            <div className="donut" style={{ background: `conic-gradient(var(--primary) 0 ${attendanceRate}%, var(--border) ${attendanceRate}%)` }}><span><strong>{attendanceRate}%</strong><small>On time</small></span></div>
          </div>
          <div className="attendanceLegend">
            <div><i className="greenDot" /><span>Present</span><strong>{attendance.PRESENT || 0}</strong></div>
            <div><i className="amberDot" /><span>Late</span><strong>{attendance.LATE || 0}</strong></div>
            <div><i className="redDot" /><span>Absent</span><strong>{attendance.ABSENT || 0}</strong></div>
          </div>
          <button className="textButton" onClick={() => setActive('attendance')}>View attendance report <ChevronRight size={15} /></button>
        </div>
      </section>

      <section className="bottomGrid">
        <div className="card recruitmentCard">
          <div className="cardHeader">
            <div><h2>Recruitment pipeline</h2><p>{Object.values(recruitment).reduce((sum, count) => sum + count, 0)} candidates across {openJobs} open roles</p></div>
            <button className="textButton topLink" onClick={() => setActive('recruitment')}>View all <ChevronRight size={15} /></button>
          </div>
          <div className="funnel">
            {funnelRows.map(([label, count], i) => (
              <div className="funnelRow" key={label}>
                <span>{label}</span><div><i style={{ width: `${Math.max((count / funnelMax) * 100, count ? 8 : 0)}%`, '--shade': `var(--indigo-${i + 1})` }} /></div><strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card aiInsightCard">
          <div className="aiCardHead">
            <span className="aiIcon large"><Sparkles size={20} /></span>
            <div><p>HR Copilot</p><h2>Insights for you</h2></div>
            <span className="liveBadge"><i /> Live</span>
          </div>
          <div className="insightItem">
            <span className="insightIcon warning"><TrendingUp size={16} /></span>
            <div><b>Workforce risk analysis</b><p>Generate an evidence-based attrition assessment from current organization data.</p><button onClick={() => setActive('analytics')}>View analysis</button></div>
          </div>
          <div className="insightItem">
            <span className="insightIcon success"><Check size={16} /></span>
            <div><b>Hiring performance report</b><p>Review current candidates, open roles, and recruitment recommendations.</p><button onClick={() => setActive('analytics')}>View report</button></div>
          </div>
          <button className="askButton" onClick={() => setActive('copilot')}><Sparkles size={15} /> Ask HR Copilot anything <ChevronRight size={15} /></button>
        </div>

        <div className="card activityCard">
          <div className="cardHeader"><div><h2>Recent activity</h2><p>Latest updates across your workspace</p></div></div>
          <div className="activityList">
            {recentActivity.map(([avatar, color, text, time]) => (
              <div className="activityRow" key={text}><Avatar initials={avatar} color={color} small /><div><p>{text}</p><small>{time}</small></div></div>
            ))}
            {!recentActivity.length && <div className="emptyState"><Activity size={22} /><p>No recent employee activity.</p></div>}
          </div>
        </div>
      </section>
    </>
  )
}

function EmployeesPage({ employees = [], initialQuery = '', openAction, canManage, leaveRows = [], refresh }) {
  const [query, setQuery] = useState(initialQuery)
  useEffect(() => setQuery(initialQuery), [initialQuery])
  const filtered = useMemo(() => employees.filter((e) => `${e.name} ${e.role} ${e.dept}`.toLowerCase().includes(query.toLowerCase())), [employees, query])
  const departments = new Set(employees.map((employee) => employee.dept).filter((department) => department && department !== 'Unassigned')).size
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const newJoiners = employees.filter((employee) => employee.joiningDateRaw && new Date(employee.joiningDateRaw) >= monthStart).length
  const now = new Date()
  const onLeave = leaveRows.filter((request) => request.status === 'APPROVED' && new Date(request.startDate) <= now && new Date(request.endDate) >= now).length
  async function removeEmployee(employee) {
    if (!window.confirm(`Delete ${employee.name}? This cannot be undone.`)) return
    const response = await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      window.alert(body.error || 'Unable to delete employee.')
      return
    }
    refresh()
  }
  return (
    <>
      <PageHeading title="People" description="Manage your employee directory, profiles, and employment information.">
        <button className="button secondary" onClick={() => downloadCsv('employees', employees)}><Upload size={16} /> Export</button>
        {canManage && <button className="button primary" onClick={() => openAction('employee', 'Add employee')}><UserPlus size={16} /> Add employee</button>}
      </PageHeading>
      <div className="statStrip">
        <div><span>Total employees</span><strong>{employees.length}</strong><small className="positive">Live directory</small></div>
        <div><span>Departments</span><strong>{departments}</strong><small>Represented in directory</small></div>
        <div><span>New joiners</span><strong>{newJoiners}</strong><small>This month</small></div>
        <div><span>On leave</span><strong>{onLeave}</strong><small>Today</small></div>
      </div>
      <div className="card tableCard">
        <div className="tableTools">
          <div className="tableSearch"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employees..." /></div>
          <button className="button secondary" onClick={() => setQuery('')}><Filter size={15} /> Clear filters</button>
          <button className="button secondary" onClick={() => downloadCsv('employees', filtered)}>Export visible</button>
        </div>
        <div className="employeeTable">
          <div className="tableRow tableHead"><span>Employee</span><span>Department</span><span>Status</span><span>Join date</span><span /></div>
          {filtered.map((employee) => (
            <div className="tableRow" key={employee.name}>
              <div className="employeeCell"><Avatar initials={employee.avatar} color={employee.color} /><span><b>{employee.name}</b><small>{employee.role}</small></span></div>
              <span>{employee.dept}</span>
              <span><i className={`statusPill ${employee.status.toLowerCase().replace(' ', '')}`}>{employee.status}</i></span>
              <span>{employee.joiningDate || 'Not set'}</span>
              <div className="rowActions">
                {canManage && <button className="textButton" onClick={() => openAction('employee', 'Edit employee', employee.raw)}>Edit</button>}
                {canManage && <button className="textButton dangerText" onClick={() => removeEmployee(employee)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function RecruitmentPage({ candidates = {}, openJobs = 0, openAction, canRecruit, jobs = [], refresh }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState('')
  const [busyCandidate, setBusyCandidate] = useState('')
  const activeCandidates = Object.values(candidates).flat().length
  const filteredCandidates = Object.fromEntries(Object.entries(candidates).map(([stage, cards]) => [
    stage,
    cards.filter((candidate) => `${candidate.name} ${candidate.role}`.toLowerCase().includes(query.toLowerCase())),
  ]))
  const scoredCandidates = Object.values(candidates).flat().filter((candidate) => Number.isFinite(candidate.score))
  const averageScore = scoredCandidates.length
    ? Math.round(scoredCandidates.reduce((sum, candidate) => sum + candidate.score, 0) / scoredCandidates.length)
    : 0
  async function updateCandidate(candidate, data) {
    const response = await fetch(`/api/candidates/${candidate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.error || 'Unable to update candidate.')
    refresh()
  }

  async function deleteCandidate(candidate) {
    if (!window.confirm(`Delete ${candidate.name}?`)) return
    const response = await fetch(`/api/candidates/${candidate.id}`, { method: 'DELETE' })
    if (!response.ok) return window.alert('Unable to delete candidate.')
    refresh()
  }

  function analyzeResume(candidate) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/pdf'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setBusyCandidate(candidate.id)
      try {
        const upload = new FormData()
        upload.set('file', file)
        upload.set('category', 'resume')
        upload.set('candidateId', candidate.id)
        const stored = await fetch('/api/uploads', { method: 'POST', body: upload })
        if (!stored.ok) throw new Error((await stored.json()).error || 'Resume upload failed.')
        const analysis = new FormData()
        analysis.set('file', file)
        analysis.set('candidateId', candidate.id)
        const response = await fetch('/api/ai/resume-analysis', { method: 'POST', body: analysis })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Resume analysis failed.')
        setResult(`${candidate.name}: ${body.data.summary}`)
        refresh()
      } catch (error) {
        setResult(error.message)
      } finally {
        setBusyCandidate('')
      }
    }
    input.click()
  }

  async function candidateAi(candidate, kind) {
    if (!candidate.jobId) return setResult('Assign this candidate to a job before running AI ranking or interview questions.')
    setBusyCandidate(candidate.id)
    try {
      const endpoint = kind === 'rank' ? '/api/ai/candidate-ranking' : '/api/ai/interview-questions'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: candidate.id, jobId: candidate.jobId }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'AI request failed.')
      setResult(kind === 'rank'
        ? `${candidate.name}: ${body.data.matchScore}% match. ${body.data.hiringRecommendation}. ${body.data.recommendationRationale}`
        : `${candidate.name}: ${[...body.data.technical, ...body.data.behavioral, ...body.data.roleSpecific].map((item) => item.question).join(' | ')}`)
      refresh()
    } catch (error) {
      setResult(error.message)
    } finally {
      setBusyCandidate('')
    }
  }
  return (
    <>
      <PageHeading title="Recruitment" description="Move great candidates from application to offer, faster.">
        <button className="button secondary" onClick={() => downloadCsv('candidates', Object.values(candidates).flat())}><Users size={16} /> Export candidates</button>
        {canRecruit && <button className="button primary" onClick={() => openAction('job', 'Create job')}><Plus size={16} /> Create job</button>}
      </PageHeading>
      <div className="pipelineSummary">
        <div><BriefcaseBusiness size={18} /><span><strong>{openJobs}</strong> Open jobs</span></div>
        <div><Users size={18} /><span><strong>{activeCandidates}</strong> Active candidates</span></div>
        <div><Clock3 size={18} /><span><strong>{activeCandidates}</strong> Candidates in pipeline</span></div>
        <div><Sparkles size={18} /><span><strong>{averageScore}%</strong> Average AI score</span></div>
      </div>
      <div className="kanbanTools">
        <div className="tableSearch"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates..." /></div>
        <button className="button secondary" onClick={() => setQuery('')}><Filter size={15} /> Clear</button>
        {canRecruit && <button className="button secondary" onClick={() => openAction('candidate', 'Add candidate')}>Add candidate</button>}
      </div>
      {result && <div className="card actionResult"><Sparkles size={17} /><p>{result}</p><button className="iconButton" onClick={() => setResult('')}><X size={15} /></button></div>}
      <div className="kanban">
        {Object.entries(filteredCandidates).map(([stage, cards], stageIndex) => (
          <div className="kanbanColumn" key={stage}>
            <div className="kanbanHead"><span><i className={`stageDot stage${stageIndex}`} />{stage}</span><em>{cards.length}</em><MoreHorizontal size={17} /></div>
            {cards.map((candidate) => (
              <div className="candidateCard" key={candidate.name}>
                <div className="candidateTop"><Avatar initials={candidate.avatar} color={['#6366f1', '#8b5cf6', '#0ea5e9'][candidate.score % 3]} /><button className="moreButton" onClick={() => navigator.clipboard.writeText(candidate.id)} title="Copy candidate ID"><MoreHorizontal size={16} /></button></div>
                <b>{candidate.name}</b><p>{candidate.role}</p>
                <div className="candidateMeta"><span><Sparkles size={13} /> AI score</span><strong>{candidate.score}%</strong></div>
                <div className="scoreBar"><i style={{ width: `${candidate.score}%` }} /></div>
                <small>Applied {candidate.appliedAt ? new Date(candidate.appliedAt).toLocaleDateString() : 'date unavailable'}</small>
                {canRecruit && <div className="candidateActions">
                  <select value={candidate.stage} onChange={(event) => updateCandidate(candidate, { stage: event.target.value })} aria-label={`Stage for ${candidate.name}`}>
                    {['APPLIED', 'SCREENING', 'INTERVIEW', 'SELECTED', 'REJECTED'].map((stageValue) => <option value={stageValue} key={stageValue}>{stageValue}</option>)}
                  </select>
                  <button disabled={busyCandidate === candidate.id} onClick={() => analyzeResume(candidate)}>Resume AI</button>
                  <button disabled={busyCandidate === candidate.id} onClick={() => candidateAi(candidate, 'rank')}>Rank</button>
                  <button disabled={busyCandidate === candidate.id} onClick={() => candidateAi(candidate, 'questions')}>Questions</button>
                  <button onClick={() => openAction('candidate', 'Edit candidate', candidate.raw)}>Edit</button>
                  <button className="dangerText" onClick={() => deleteCandidate(candidate)}>Delete</button>
                </div>}
              </div>
            ))}
            {canRecruit && <button className="addCandidate" onClick={() => openAction('candidate', `Add ${stage} candidate`)}><Plus size={15} /> Add candidate</button>}
          </div>
        ))}
      </div>
    </>
  )
}

function CopilotPage() {
  const initialMessage = { type: 'ai', text: 'I am ready to help with your people, recruiting, attendance, payroll, and workforce planning.' }
  const [messages, setMessages] = useState([initialMessage])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function send(value = text) {
    if (!value.trim() || busy) return
    const history = messages.slice(-10).map((message) => ({
      role: message.type === 'ai' ? 'assistant' : 'user',
      content: message.text,
    }))
    setMessages((current) => [...current, { type: 'user', text: value }])
    setText('')
    setBusy(true)
    try {
      const response = await fetch('/api/ai/hr-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value, history }),
      })
      const body = await response.json()
      setMessages((current) => [...current, {
        type: 'ai',
        text: response.ok
          ? body.data.answer
          : `${body.error || 'HR Copilot is temporarily unavailable.'} Your HR records remain available.`,
      }])
    } catch {
      setMessages((current) => [...current, { type: 'ai', text: 'HR Copilot is temporarily unavailable. Your HR records remain available.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="copilotPage">
      <div className="chatHistory">
        <button className="button primary newChat" onClick={() => setMessages([initialMessage])}><Plus size={16} /> New chat</button>
        <p>Suggested reports</p>
        {['Monthly workforce summary', 'Engineering attrition risk', 'Q2 hiring performance', 'Leave policy questions'].map((item) => (
          <button key={item} onClick={() => send(item)}><MessageSquareText size={16} /><span>{item}</span><ChevronRight size={15} /></button>
        ))}
      </div>
      <div className="chatMain">
        <div className="chatTitle"><span className="aiIcon large"><Bot size={20} /></span><div><h1>HR Copilot</h1><p>Answers grounded in current organization data</p></div><span className="liveBadge"><i /> Online</span></div>
        <div className="chatMessages">
          {messages.length === 1 && <div className="promptGrid">
            {['Show employees with attendance issues', 'Generate the monthly HR report', 'Analyze our hiring performance', 'Recommend workforce actions'].map((prompt) => (
              <button onClick={() => send(prompt)} key={prompt}><Sparkles size={17} /><span>{prompt}</span><ChevronRight size={15} /></button>
            ))}
          </div>}
          {messages.map((message, index) => (
            <div className={`message ${message.type}`} key={`${message.text}-${index}`}>
              {message.type === 'ai' ? <span className="aiIcon"><Sparkles size={16} /></span> : <Avatar initials="ME" color="#4f46e5" small />}
              <p>{message.text}</p>
            </div>
          ))}
        </div>
        <div className="chatComposer">
          <textarea value={text} disabled={busy} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder={busy ? 'Analyzing organization data...' : 'Ask about your people, hiring, attendance, or payroll...'} />
          <div><span>Review important AI-generated insights.</span><button disabled={busy} onClick={() => send()}><Sparkles size={17} /></button></div>
        </div>
      </div>
      <div className="reportPanel">
        <p>Generated reports</p>
        <div className="reportPreview"><FileText size={24} /><b>Monthly HR Summary</b><span>Current organization data</span><button onClick={() => send('Generate the monthly HR report')}>Generate report</button></div>
        <div className="reportPreview"><BarChart3 size={24} /><b>Hiring Performance</b><span>Current recruitment data</span><button onClick={() => send('Analyze our hiring performance')}>Generate report</button></div>
      </div>
    </div>
  )
}

function SettingsPage({ role, refresh, openAction }) {
  const [settings, setSettings] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const canManageOrganization = role === 'HR_MANAGER'

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings', { credentials: 'include' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load settings.')
        if (!cancelled) setSettings(body.data)
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message)
      })
    return () => { cancelled = true }
  }, [])

  function update(section, key, value) {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value },
    }))
  }

  function updateWorkspace(key, value) {
    setSettings((current) => ({
      ...current,
      organization: {
        ...current.organization,
        workspace: { ...current.organization.workspace, [key]: value },
      },
    }))
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const payload = {
        profile: { fullName: settings.profile.fullName },
        preferences: settings.preferences,
        ...(canManageOrganization ? {
          organization: settings.organization,
          ai: settings.ai,
        } : {}),
      }
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to save settings.')
      setSettings(body.data)
      setMessage('Settings saved successfully.')
      refresh()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  function exportSettings() {
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: settings.profile,
      preferences: settings.preferences,
      organization: settings.organization,
      ai: settings.ai,
      services: settings.services,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `hrflow-settings-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Settings export downloaded.')
  }

  async function revokeSessions() {
    if (!window.confirm('Sign out this account from all devices?')) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/settings/security', { method: 'POST' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to revoke sessions.')
      window.location.assign('/login')
    } catch (error) {
      setMessage(error.message)
      setBusy(false)
    }
  }

  if (!settings) {
    return <>
      <PageHeading title="Settings" description="Manage organization access, security, and integrations." />
      <div className="card emptyState"><Settings size={24} /><h2>Loading settings</h2><p>{message || 'Retrieving your workspace configuration.'}</p></div>
    </>
  }

  return <>
    <PageHeading title="Settings" description="Manage organization access, security, and integrations.">
      {canManageOrganization && <button className="button secondary" onClick={() => openAction('invitation', 'Invite team member')}><UserPlus size={16} /> Invite member</button>}
      <button className="button secondary" type="button" onClick={exportSettings}><Download size={16} /> Export settings</button>
      <button className="button primary" type="submit" form="settings-form" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
    </PageHeading>
    {message && <div className="card actionResult" role="status"><Activity size={17} /><p>{message}</p><button className="iconButton" onClick={() => setMessage('')} aria-label="Dismiss message"><X size={15} /></button></div>}
    <div className="moduleGrid">
      <div className="card moduleCard"><span>Authentication</span><strong>{settings.services.authentication}</strong><p>Email/password and Google authentication</p></div>
      <div className="card moduleCard"><span>Tenant security</span><strong>RLS</strong><p>{settings.services.databaseSecurity} organization isolation</p></div>
      <div className="card moduleCard"><span>AI service</span><strong>Gemini</strong><p>{settings.services.aiModel}, cached and audited</p></div>
    </div>
    <form id="settings-form" className="settingsLayout" onSubmit={save}>
      <section className="card settingsSection">
        <div className="settingsTitle"><Users size={18} /><div><h2>Profile</h2><p>Your personal workspace identity.</p></div></div>
        <div className="settingsFields">
          <label>Full name<input value={settings.profile.fullName} onChange={(event) => update('profile', 'fullName', event.target.value)} required minLength={2} /></label>
          <label>Work email<input value={settings.profile.email} disabled /></label>
          <label>Role<input value={settings.profile.role.replace('_', ' ')} disabled /></label>
        </div>
      </section>

      <section className="card settingsSection">
        <div className="settingsTitle"><Building2 size={18} /><div><h2>Organization</h2><p>Regional defaults used by HR and payroll.</p></div></div>
        <div className="settingsFields">
          <label>Organization name<input value={settings.organization.name} disabled={!canManageOrganization} onChange={(event) => update('organization', 'name', event.target.value)} required /></label>
          <label>Timezone<select value={settings.organization.workspace.timezone} disabled={!canManageOrganization} onChange={(event) => updateWorkspace('timezone', event.target.value)}><option value="UTC">UTC</option><option value="Asia/Kolkata">Asia/Kolkata</option><option value="America/New_York">America/New York</option><option value="Europe/London">Europe/London</option></select></label>
          <label>Locale<select value={settings.organization.workspace.locale} disabled={!canManageOrganization} onChange={(event) => updateWorkspace('locale', event.target.value)}><option value="en-US">English (US)</option><option value="en-IN">English (India)</option><option value="en-GB">English (UK)</option></select></label>
          <label>Currency<select value={settings.organization.workspace.currency} disabled={!canManageOrganization} onChange={(event) => updateWorkspace('currency', event.target.value)}><option value="USD">USD</option><option value="INR">INR</option><option value="GBP">GBP</option><option value="EUR">EUR</option></select></label>
        </div>
        {!canManageOrganization && <p className="settingsHint">Organization controls are read-only for your role.</p>}
      </section>

      <section className="card settingsSection">
        <div className="settingsTitle"><Bell size={18} /><div><h2>Notifications</h2><p>Choose how HRFlow keeps you informed.</p></div></div>
        <div className="settingsToggles">
          <label><span><b>In-app notifications</b><small>Show workflow updates in the notification center.</small></span><input type="checkbox" checked={settings.preferences.inAppNotifications} onChange={(event) => update('preferences', 'inAppNotifications', event.target.checked)} /></label>
          <label><span><b>Email notifications</b><small>Send important approvals and reminders by email.</small></span><input type="checkbox" checked={settings.preferences.emailNotifications} onChange={(event) => update('preferences', 'emailNotifications', event.target.checked)} /></label>
          <label><span><b>Weekly digest</b><small>Receive a weekly workforce summary.</small></span><input type="checkbox" checked={settings.preferences.weeklyDigest} onChange={(event) => update('preferences', 'weeklyDigest', event.target.checked)} /></label>
          <label className="themePreference"><span><b>Theme preference</b><small>Applied on your next session.</small></span><select value={settings.preferences.theme} onChange={(event) => update('preferences', 'theme', event.target.value)}><option value="SYSTEM">System</option><option value="LIGHT">Light</option><option value="DARK">Dark</option></select></label>
        </div>
      </section>

      <section className="card settingsSection">
        <div className="settingsTitle"><Bot size={18} /><div><h2>AI configuration</h2><p>Control how Gemini uses organization context.</p></div></div>
        <div className="settingsToggles">
          <label><span><b>Enable AI features</b><small>Resume analysis, ranking, analytics, and Copilot.</small></span><input type="checkbox" disabled={!canManageOrganization} checked={settings.ai.enabled} onChange={(event) => update('ai', 'enabled', event.target.checked)} /></label>
          <label><span><b>Cache AI responses</b><small>Improve repeat-response speed and control usage.</small></span><input type="checkbox" disabled={!canManageOrganization} checked={settings.ai.cacheEnabled} onChange={(event) => update('ai', 'cacheEnabled', event.target.checked)} /></label>
          <label><span><b>Allow payroll context</b><small>Permit Copilot to use aggregated payroll figures.</small></span><input type="checkbox" disabled={!canManageOrganization} checked={settings.ai.payrollContext} onChange={(event) => update('ai', 'payrollContext', event.target.checked)} /></label>
        </div>
      </section>

      <section className="card settingsSection">
        <div className="settingsTitle"><Activity size={18} /><div><h2>Service readiness</h2><p>Configuration status without exposing credentials.</p></div></div>
        <div className="serviceRows">
          <div><span>Email delivery</span><strong className={settings.services.emailConfigured ? 'serviceReady' : 'servicePending'}>{settings.services.emailConfigured ? 'Configured' : 'Needs setup'}</strong></div>
          <div><span>Error monitoring</span><strong className={settings.services.monitoringConfigured ? 'serviceReady' : 'servicePending'}>{settings.services.monitoringConfigured ? 'Configured' : 'Needs setup'}</strong></div>
          <div><span>Organization isolation</span><strong className="serviceReady">Active</strong></div>
        </div>
      </section>

      <section className="card settingsSection">
        <div className="settingsTitle"><ShieldCheck size={18} /><div><h2>Roles & permissions</h2><p>Access levels enforced by API RBAC and organization isolation.</p></div></div>
        <div className="permissionRows">
          {settings.permissions.map((permission) => <div key={permission.role}>
            <span><b>{permission.label}</b><small>{permission.summary}</small></span>
            <strong className={permission.role === role ? 'currentRole' : ''}>{permission.role === role ? 'Your role' : 'Defined'}</strong>
          </div>)}
        </div>
      </section>

      <section className="card settingsSection">
        <div className="settingsTitle"><KeyRound size={18} /><div><h2>Account security</h2><p>Manage password recovery and active Firebase sessions.</p></div></div>
        <div className="securityActions">
          <button className="button secondary" type="button" onClick={() => window.location.assign('/forgot-password')}><KeyRound size={15} /> Reset password</button>
          <button className="button secondary dangerButton" type="button" disabled={busy} onClick={revokeSessions}><LogOut size={15} /> Sign out all devices</button>
        </div>
        <p className="settingsHint">Session cookies are secure, HTTP-only, and checked for revocation on protected requests.</p>
      </section>

      <section className="card settingsSection settingsWide">
        <div className="settingsTitle"><History size={18} /><div><h2>Recent security activity</h2><p>Latest account and settings events visible to your role.</p></div></div>
        <div className="auditRows">
          {settings.audit.length ? settings.audit.map((entry) => <div key={entry.id}>
            <span><b>{entry.action.replaceAll('.', ' ')}</b><small>{entry.actor || 'System'} · {entry.resource}</small></span>
            <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
          </div>) : <p className="settingsHint">No recent settings or security events.</p>}
        </div>
      </section>
    </form>
  </>
}

function ModulePage({ type, rows = [], openAction, setActive, refresh, role, profile }) {
  const [title, description] = moduleCopy[type] || [type === 'notifications' ? 'Notifications' : 'Settings', type === 'notifications' ? 'Review alerts and activity across your workspace.' : 'Manage organization access, security, and integrations.']
  const Icon = navGroups.flatMap((group) => group.items).find((item) => item.id === type)?.icon || (type === 'notifications' ? Bell : Settings)
  const [analysis, setAnalysis] = useState('')
  const [busy, setBusy] = useState(false)
  const [operation, setOperation] = useState('')
  const [analyticsType, setAnalyticsType] = useState('WORKFORCE_PLANNING')
  const createTypes = role === 'HR_MANAGER'
    ? { attendance: 'attendance', leave: 'leave', payroll: 'payroll', performance: 'review', settings: 'invitation' }
    : role === 'EMPLOYEE'
      ? { leave: 'leave' }
      : {}

  async function generateAnalysis() {
    setBusy(true)
    try {
      const response = await fetch('/api/ai/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type === 'analytics' ? analyticsType : 'ATTRITION_RISK', horizonMonths: 6 }),
      })
      const body = await response.json()
      setAnalysis(response.ok ? body.data.executiveSummary : body.error || 'AI insights are temporarily unavailable.')
    } catch {
      setAnalysis('AI insights are temporarily unavailable. Existing records remain available.')
    } finally {
      setBusy(false)
    }
  }

  async function markRead(id) {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    })
    refresh()
  }

  async function runOperation(endpoint, body, success, method = 'POST') {
    setOperation('')
    setBusy(true)
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Operation failed.')
      setOperation(success)
      refresh()
    } catch (error) {
      setOperation(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function openDocument(row) {
    const response = await fetch(`/api/uploads?path=${encodeURIComponent(row.storagePath)}`)
    const body = await response.json()
    if (!response.ok) return setOperation(body.error || 'Unable to open document.')
    window.open(body.data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  function uploadDocument() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.docx,.png,.jpg,.jpeg'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const form = new FormData()
      form.set('file', file)
      form.set('category', 'general')
      const response = await fetch('/api/uploads', { method: 'POST', body: form })
      const body = await response.json()
      if (!response.ok) window.alert(body.error || 'Upload failed.')
      refresh()
    }
    input.click()
  }

  if (type === 'settings') {
    return <SettingsPage role={role} refresh={refresh} openAction={openAction} />
  }

  return <>
    <PageHeading title={title} description={description}>
      <button className="button secondary" onClick={() => downloadCsv(type, rows)}><Upload size={16} /> Export</button>
      {createTypes[type] && type !== 'payroll' && <button className="button primary" onClick={() => openAction(createTypes[type], `Create ${title} record`)}><Plus size={16} /> Create new</button>}
      {type === 'attendance' && role === 'EMPLOYEE' && <>
        <button className="button secondary" disabled={busy} onClick={() => runOperation('/api/attendance-engine/clock', { action: 'CHECK_IN' }, 'Checked in successfully.')}>Check in</button>
        <button className="button secondary" disabled={busy} onClick={() => runOperation('/api/attendance-engine/clock', { action: 'CHECK_OUT' }, 'Checked out successfully.')}>Check out</button>
      </>}
      {type === 'attendance' && <button className="button secondary" onClick={() => openAction('correction', 'Request attendance correction')}>Request correction</button>}
      {type === 'payroll' && role === 'HR_MANAGER' && <>
        <a className="button secondary" href="/api/payroll-engine/export">Export payroll</a>
        <button className="button primary" onClick={() => openAction('payrollRun', 'Run payroll engine')}><CircleDollarSign size={16} /> Run payroll</button>
      </>}
      {type === 'documents' && role !== 'RECRUITER' && <button className="button primary" onClick={uploadDocument}><Upload size={16} /> Upload document</button>}
    </PageHeading>
    {operation && <div className="card actionResult"><Activity size={17} /><p>{operation}</p><button className="iconButton" onClick={() => setOperation('')}><X size={15} /></button></div>}
    <div className="moduleGrid">
      <div className="card moduleCard"><span>Total records</span><strong>{rows.length}</strong><p>Live organization data</p><div className="miniBars"><i /><i /><i /><i /><i /><i /></div></div>
      <div className="card moduleCard"><span>Current module</span><strong>{title}</strong><p>Protected by organization RBAC</p><div className="miniBars mini1"><i /><i /><i /><i /><i /><i /></div></div>
      <div className="card moduleCard"><span>Data status</span><strong>Live</strong><p>Loaded from production APIs</p><div className="miniBars mini2"><i /><i /><i /><i /><i /><i /></div></div>
    </div>
    <div className="card recordsCard">
      {rows.length ? rows.slice(0, 50).map((row) => <div className="recordRow" key={row.id}>
        <div className="moduleHeroIcon"><Icon size={18} /></div>
        <div><b>{row.title || row.name || row.type || row.period || `${row.employee?.firstName || ''} ${row.employee?.lastName || ''}`.trim() || 'HRFlow record'}</b><p>{row.body || row.status || row.category || row.employee?.email || row.id}</p></div>
        <div className="rowActions">
          {type === 'payroll' && <a className="textButton" href={`/api/payroll-engine/payslip/${row.id}`} target="_blank">Payslip</a>}
          {type === 'documents' && <button className="textButton" onClick={() => openDocument(row)}>Open</button>}
          {type === 'notifications' && !row.readAt && <button className="textButton" onClick={() => markRead(row.id)}>Mark read</button>}
          {type === 'leave' && role === 'HR_MANAGER' && row.status === 'PENDING' && <>
            <button className="textButton" disabled={busy} onClick={() => runOperation('/api/leave-workflow/approve', { leaveRequestId: row.id, level: 1, decision: 'APPROVED' }, 'Leave request approved.')}>Approve</button>
            <button className="textButton dangerText" disabled={busy} onClick={() => runOperation('/api/leave-workflow/approve', { leaveRequestId: row.id, level: 1, decision: 'REJECTED' }, 'Leave request rejected.')}>Reject</button>
          </>}
          {type === 'leave' && role === 'EMPLOYEE' && row.status === 'PENDING' && <button className="textButton dangerText" onClick={() => runOperation(`/api/leave/${row.id}`, { status: 'CANCELLED' }, 'Leave request cancelled.', 'PUT')}>Cancel</button>}
        </div>
      </div>) : <div className="emptyState"><Icon size={24} /><h2>No records yet</h2><p>Create the first real record for this module.</p></div>}
    </div>
    <div className="card emptyModule"><div className="moduleHeroIcon"><Sparkles size={24} /></div><h2>AI insights</h2><p>{analysis || 'Generate an insight grounded in current organization data.'}</p><div className="headingActions">{type === 'analytics' && <select value={analyticsType} onChange={(event) => setAnalyticsType(event.target.value)}><option value="WORKFORCE_PLANNING">Workforce planning</option><option value="ATTRITION_RISK">Attrition risk</option><option value="HIRING_FORECAST">Hiring forecast</option></select>}<button className="button secondary" disabled={busy || role !== 'HR_MANAGER'} onClick={generateAnalysis}><Sparkles size={16} /> {busy ? 'Analyzing...' : 'Generate insight'}</button><button className="button secondary" onClick={() => setActive('copilot')}>Open Copilot</button></div></div>
  </>
}

function useHrflowData(active) {
  const [data, setData] = useState({
    dashboard: null,
    session: null,
    employees: [],
    jobs: [],
    candidates: {},
    raw: {},
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const readResponse = async (response) => {
        if (!response?.ok) return null
        return (await response.json()).data
      }
      const session = await fetch('/api/auth/session', { credentials: 'include' })
        .then(readResponse)
        .catch(() => null)
      if (cancelled) return
      setData((current) => ({ ...current, session }))

      const role = session?.profile?.role
      const requests = [
        role === 'HR_MANAGER' || role === 'RECRUITER' ? fetch('/api/dashboard', { credentials: 'include' }) : Promise.resolve(null),
        fetch('/api/employees?limit=100', { credentials: 'include' }),
        role === 'HR_MANAGER' || role === 'RECRUITER' ? fetch('/api/jobs?limit=100', { credentials: 'include' }) : Promise.resolve(null),
        role === 'HR_MANAGER' || role === 'RECRUITER' ? fetch('/api/candidates?limit=100', { credentials: 'include' }) : Promise.resolve(null),
        fetch('/api/notifications', { credentials: 'include' }),
      ]
      const responses = await Promise.allSettled(requests)

      const read = async (result) => {
        if (result.status !== 'fulfilled' || !result.value?.ok) return null
        return (await result.value.json()).data
      }

      const [dashboard, employeeRows, jobs, candidateRows, notifications] = await Promise.all(responses.map(read))
      if (cancelled) return

      const mappedEmployees = employeeRows?.map((employee, index) => ({
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        role: employee.jobTitle,
        dept: employee.department?.name || 'Unassigned',
        status: employee.status === 'ON_LEAVE'
          ? 'On leave'
          : employee.status.charAt(0) + employee.status.slice(1).toLowerCase(),
        avatar: `${employee.firstName[0]}${employee.lastName[0]}`,
        color: ['#ec4899', '#6366f1', '#8b5cf6', '#0ea5e9', '#f59e0b'][index % 5],
        joiningDate: new Date(employee.joiningDate).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        }),
        joiningDateRaw: employee.joiningDate,
        raw: {
          employeeNumber: employee.employeeNumber,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          jobTitle: employee.jobTitle,
          joiningDate: employee.joiningDate.slice(0, 10),
          salary: employee.salary ? Number(employee.salary) : '',
          location: employee.location || '',
        },
      }))

      const groupedCandidates = candidateRows?.reduce((groups, candidate) => {
        const label = candidate.stage.charAt(0) + candidate.stage.slice(1).toLowerCase()
        if (label === 'Rejected') return groups
        if (!groups[label]) groups[label] = []
        groups[label].push({
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
          role: candidate.job?.title || 'Open application',
          score: candidate.aiScore || 0,
          avatar: `${candidate.firstName[0]}${candidate.lastName[0]}`,
          appliedAt: candidate.appliedAt,
          jobId: candidate.jobId,
          stage: candidate.stage,
          raw: {
            firstName: candidate.firstName,
            lastName: candidate.lastName,
            email: candidate.email,
            phone: candidate.phone || '',
            jobId: candidate.jobId || '',
          },
        })
        return groups
      }, { Applied: [], Screening: [], Interview: [], Selected: [] })

      setData((current) => ({
        session,
        dashboard,
        employees: mappedEmployees || [],
        jobs: jobs || [],
        candidates: groupedCandidates || {},
        raw: {
          ...current.raw,
          analytics: current.raw.analytics || [],
          notifications: notifications || [],
        },
      }))
    }

    load().catch(() => {})
    return () => { cancelled = true }
  }, [version])

  useEffect(() => {
    const moduleEndpoints = {
      attendance: '/api/attendance?limit=100',
      leave: '/api/leave?limit=100',
      payroll: '/api/payroll?limit=100',
      performance: '/api/reviews?limit=100',
      documents: '/api/documents',
    }
    const key = active === 'employees' ? 'leave' : moduleEndpoints[active] ? active : null
    if (!key || !data.session) return
    let cancelled = false
    const endpoint = key === 'leave' ? '/api/leave?limit=100' : moduleEndpoints[key]
    fetch(endpoint, { credentials: 'include' })
      .then(async (response) => response.ok ? (await response.json()).data : [])
      .then((rows) => {
        if (!cancelled) setData((current) => ({ ...current, raw: { ...current.raw, [key]: rows || [] } }))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [active, version, data.session])

  return { ...data, refresh: () => setVersion((current) => current + 1) }
}

export default function Home() {
  const [active, setActive] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [dark, setDark] = useState(false)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState(null)
  const liveData = useHrflowData(active)
  const profile = liveData.session?.profile
  const role = profile?.role || 'EMPLOYEE'

  useEffect(() => {
    const preference = profile?.preferences?.theme
    if (preference === 'DARK') setDark(true)
    else if (preference === 'LIGHT') setDark(false)
    else if (preference === 'SYSTEM') {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }, [profile?.preferences?.theme])
  const canManage = role === 'HR_MANAGER'
  const canRecruit = role === 'HR_MANAGER' || role === 'RECRUITER'
  const badges = {
    employees: liveData.employees.length,
    recruitment: Object.values(liveData.candidates).flat().length,
    leave: liveData.raw.leave?.filter((request) => request.status === 'PENDING').length || 0,
  }
  const openAction = (type, title, record = null) => setAction({ type, title, record })
  const onSaved = async (type, saved) => {
    if (type === 'invitation' && saved?.token) {
      await navigator.clipboard.writeText(saved.token).catch(() => {})
      window.alert('Invitation created. The secure invitation code was copied to your clipboard.')
    }
    liveData.refresh()
  }
  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <Sidebar
        active={active}
        setActive={setActive}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        compact={compact}
        setCompact={setCompact}
        organizationName={profile?.organization?.name || 'HRFlow organization'}
        badges={badges}
      />
      <div className={`mainShell ${compact ? 'shellCompact' : ''}`}>
        <Header
          setOpen={setSidebarOpen}
          dark={dark}
          setDark={setDark}
          search={search}
          setSearch={setSearch}
          setActive={setActive}
          notifications={liveData.raw.notifications?.filter((item) => item.status !== 'READ').length || 0}
          profile={profile}
        />
        <main className={active === 'copilot' ? 'content contentChat' : 'content'}>
          {active === 'dashboard' && <Dashboard data={liveData.dashboard} employees={liveData.employees} setActive={setActive} openAction={openAction} profile={profile} canManage={canManage} />}
          {active === 'employees' && <EmployeesPage employees={liveData.employees} initialQuery={search} openAction={openAction} canManage={canManage} leaveRows={liveData.raw.leave} refresh={liveData.refresh} />}
          {active === 'recruitment' && (
            <RecruitmentPage
              candidates={liveData.candidates}
              openJobs={liveData.dashboard?.openJobs ?? 0}
              openAction={openAction}
              canRecruit={canRecruit}
              jobs={liveData.jobs}
              refresh={liveData.refresh}
            />
          )}
          {active === 'copilot' && <CopilotPage />}
          {!['dashboard', 'employees', 'recruitment', 'copilot'].includes(active) && (
            <ModulePage
              type={active}
              rows={liveData.raw[active] || []}
              openAction={openAction}
              setActive={setActive}
              refresh={liveData.refresh}
              role={role}
            />
          )}
        </main>
      </div>
      <ActionModal action={action} close={() => setAction(null)} onSaved={onSaved} role={role} employees={liveData.employees} jobs={liveData.jobs} />
    </div>
  )
}
