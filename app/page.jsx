'use client'

import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { getFirebaseClientAuth } from '@/lib/firebase/client'
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
  FileText,
  Filter,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
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
      { id: 'employees', label: 'People', icon: Users, badge: '248' },
      { id: 'recruitment', label: 'Recruitment', icon: BriefcaseBusiness, badge: '12' },
      { id: 'attendance', label: 'Time & attendance', icon: Clock3 },
      { id: 'leave', label: 'Leave', icon: CalendarDays, badge: '5' },
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

const demoEmployees = [
  { name: 'Sarah Chen', role: 'Senior Product Designer', dept: 'Design', status: 'Active', avatar: 'SC', color: '#ec4899' },
  { name: 'Marcus Johnson', role: 'Frontend Engineer', dept: 'Engineering', status: 'Active', avatar: 'MJ', color: '#6366f1' },
  { name: 'Elena Rodriguez', role: 'People Operations Lead', dept: 'People', status: 'Remote', avatar: 'ER', color: '#8b5cf6' },
  { name: 'David Kim', role: 'Product Manager', dept: 'Product', status: 'Active', avatar: 'DK', color: '#0ea5e9' },
  { name: 'Aisha Patel', role: 'Growth Marketing Manager', dept: 'Marketing', status: 'On leave', avatar: 'AP', color: '#f59e0b' },
]

const demoCandidates = {
  Applied: [
    { name: 'Maya Brooks', role: 'Product Designer', score: 92, avatar: 'MB' },
    { name: 'Noah Williams', role: 'Frontend Engineer', score: 86, avatar: 'NW' },
  ],
  Screening: [
    { name: 'James Liu', role: 'Product Designer', score: 96, avatar: 'JL' },
    { name: 'Priya Nair', role: 'Data Analyst', score: 89, avatar: 'PN' },
  ],
  Interview: [
    { name: 'Olivia Smith', role: 'People Partner', score: 94, avatar: 'OS' },
    { name: 'Ethan Reed', role: 'Frontend Engineer', score: 88, avatar: 'ER' },
  ],
  Selected: [{ name: 'Liam Carter', role: 'Product Designer', score: 98, avatar: 'LC' }],
}

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

function Sidebar({ active, setActive, open, setOpen, compact, setCompact }) {
  return (
    <>
      {open && <button className="backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebarOpen' : ''} ${compact ? 'sidebarCompact' : ''}`}>
        <div className="sidebarTop">
          <Logo />
          <button className="iconButton sidebarClose" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        <button className="orgSwitcher">
          <span className="orgIcon">AC</span>
          <span className="orgText"><b>Acme Corporation</b><small>Business plan</small></span>
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
                    {item.badge && <em>{item.badge}</em>}
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

function Header({ setOpen, dark, setDark, logout }) {
  return (
    <header className="header">
      <button className="iconButton mobileMenu" onClick={() => setOpen(true)}><Menu size={20} /></button>
      <div className="globalSearch">
        <Search size={17} />
        <input aria-label="Global search" placeholder="Search people, jobs, reports..." />
        <kbd>⌘ K</kbd>
      </div>
      <div className="headerActions">
        <button className="iconButton" onClick={() => setDark(!dark)} aria-label="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="iconButton notification"><Bell size={18} /><span /></button>
        <button className="profileButton" onClick={logout} title="Sign out">
          <Avatar initials="GS" color="#4f46e5" small />
          <span><b>Goutham Sai</b><small>HR Administrator</small></span>
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

function MetricCard({ label, value, change, icon: Icon, tone, note }) {
  return (
    <div className="card metricCard">
      <div className={`metricIcon ${tone}`}><Icon size={19} /></div>
      <div className="metricTop">
        <span>{label}</span>
        <button className="moreButton"><MoreHorizontal size={18} /></button>
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
  const chartValues = values?.length === 12 ? values : [58, 67, 91, 101, 98, 142, 139, 176, 190, 207, 205, 248]
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

function Dashboard({ data }) {
  const totalEmployees = data?.totalEmployees ?? 248
  const activeEmployees = data?.activeEmployees ?? 219
  const openJobs = data?.openJobs ?? 12
  const monthlyPayroll = data ? `$${(data.monthlyPayroll / 1000).toFixed(1)}K` : '$1.24M'
  const attendance = data?.attendance || { PRESENT: 219, LATE: 12, ABSENT: 17 }
  const attendanceTotal = Object.values(attendance).reduce((sum, value) => sum + value, 0)
  const attendanceRate = attendanceTotal ? Math.round(((attendance.PRESENT || 0) / attendanceTotal) * 100) : 0
  const recruitment = data?.recruitment || { APPLIED: 48, SCREENING: 31, INTERVIEW: 18, SELECTED: 8, REJECTED: 5 }
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
    : [
        ['SC', '#ec4899', 'Sarah Chen submitted a leave request', '2 min ago'],
        ['MJ', '#6366f1', 'Marcus Johnson completed a performance review', '18 min ago'],
        ['ER', '#8b5cf6', 'Elena Rodriguez added a new candidate', '42 min ago'],
        ['DK', '#0ea5e9', 'David Kim updated a company policy', '1 hr ago'],
      ]
  return (
    <>
      <PageHeading
        eyebrow="Friday, June 5"
        title="Good morning, Goutham"
        description="Here’s what’s happening with your organization today."
      >
        <button className="button secondary"><Upload size={16} /> Export</button>
        <button className="button primary"><Plus size={16} /> Add employee</button>
      </PageHeading>

      <section className="metricsGrid">
        <MetricCard label="Total employees" value={totalEmployees} change="+12.5%" note="vs last month" icon={Users} tone="indigo" />
        <MetricCard label="Active today" value={activeEmployees} change={`${attendanceRate}%`} note="attendance rate" icon={Activity} tone="green" />
        <MetricCard label="Open positions" value={openJobs} change="+3" note="this month" icon={BriefcaseBusiness} tone="purple" />
        <MetricCard label="Monthly payroll" value={monthlyPayroll} change="+4.2%" note="vs last month" icon={CircleDollarSign} tone="amber" />
      </section>

      <section className="dashboardGrid">
        <div className="card growthCard">
          <div className="cardHeader">
            <div><h2>Employee growth</h2><p>Headcount over the past 12 months</p></div>
            <button className="selectButton">Last 12 months <ChevronDown size={14} /></button>
          </div>
          <div className="growthSummary"><strong>{totalEmployees}</strong><span><TrendingUp size={14} /> 18.4%</span><small>Employee headcount</small></div>
          <GrowthChart values={data?.employeeGrowth} />
        </div>

        <div className="card attendanceCard">
          <div className="cardHeader">
            <div><h2>Attendance today</h2><p>June 5, 2026</p></div>
            <button className="moreButton"><MoreHorizontal size={18} /></button>
          </div>
          <div className="donutWrap">
            <div className="donut" style={{ background: `conic-gradient(var(--primary) 0 ${attendanceRate}%, var(--border) ${attendanceRate}%)` }}><span><strong>{attendanceRate}%</strong><small>On time</small></span></div>
          </div>
          <div className="attendanceLegend">
            <div><i className="greenDot" /><span>Present</span><strong>{attendance.PRESENT || 0}</strong></div>
            <div><i className="amberDot" /><span>Late</span><strong>{attendance.LATE || 0}</strong></div>
            <div><i className="redDot" /><span>Absent</span><strong>{attendance.ABSENT || 0}</strong></div>
          </div>
          <button className="textButton">View attendance report <ChevronRight size={15} /></button>
        </div>
      </section>

      <section className="bottomGrid">
        <div className="card recruitmentCard">
          <div className="cardHeader">
            <div><h2>Recruitment pipeline</h2><p>{Object.values(recruitment).reduce((sum, count) => sum + count, 0)} candidates across {openJobs} open roles</p></div>
            <button className="textButton topLink">View all <ChevronRight size={15} /></button>
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
            <div><b>Engineering attrition risk is rising</b><p>3 high-performing employees show indicators of disengagement.</p><button>View analysis</button></div>
          </div>
          <div className="insightItem">
            <span className="insightIcon success"><Check size={16} /></span>
            <div><b>Hiring velocity improved by 18%</b><p>Average time-to-hire dropped from 32 to 26 days this quarter.</p><button>View report</button></div>
          </div>
          <button className="askButton"><Sparkles size={15} /> Ask HR Copilot anything <ChevronRight size={15} /></button>
        </div>

        <div className="card activityCard">
          <div className="cardHeader"><div><h2>Recent activity</h2><p>Latest updates across your workspace</p></div></div>
          <div className="activityList">
            {recentActivity.map(([avatar, color, text, time]) => (
              <div className="activityRow" key={text}><Avatar initials={avatar} color={color} small /><div><p>{text}</p><small>{time}</small></div></div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function EmployeesPage({ employees = demoEmployees }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => employees.filter((e) => `${e.name} ${e.role} ${e.dept}`.toLowerCase().includes(query.toLowerCase())), [employees, query])
  return (
    <>
      <PageHeading title="People" description="Manage your employee directory, profiles, and employment information.">
        <button className="button secondary"><Upload size={16} /> Import</button>
        <button className="button primary"><UserPlus size={16} /> Add employee</button>
      </PageHeading>
      <div className="statStrip">
        <div><span>Total employees</span><strong>{employees.length}</strong><small className="positive">Live directory</small></div>
        <div><span>Departments</span><strong>8</strong><small>Across 4 locations</small></div>
        <div><span>New joiners</span><strong>12</strong><small>This month</small></div>
        <div><span>On leave</span><strong>7</strong><small>Today</small></div>
      </div>
      <div className="card tableCard">
        <div className="tableTools">
          <div className="tableSearch"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employees..." /></div>
          <button className="button secondary"><Filter size={15} /> Filters</button>
          <button className="button secondary">All departments <ChevronDown size={14} /></button>
        </div>
        <div className="employeeTable">
          <div className="tableRow tableHead"><span>Employee</span><span>Department</span><span>Status</span><span>Join date</span><span /></div>
          {filtered.map((employee, index) => (
            <div className="tableRow" key={employee.name}>
              <div className="employeeCell"><Avatar initials={employee.avatar} color={employee.color} /><span><b>{employee.name}</b><small>{employee.role}</small></span></div>
              <span>{employee.dept}</span>
              <span><i className={`statusPill ${employee.status.toLowerCase().replace(' ', '')}`}>{employee.status}</i></span>
              <span>{employee.joiningDate || ['Mar 14, 2023', 'Jul 08, 2024', 'Jan 22, 2022', 'Sep 18, 2023', 'Feb 03, 2025'][index % 5]}</span>
              <button className="moreButton"><MoreHorizontal size={18} /></button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function RecruitmentPage({ candidates = demoCandidates, openJobs = 12 }) {
  const activeCandidates = Object.values(candidates).flat().length
  return (
    <>
      <PageHeading title="Recruitment" description="Move great candidates from application to offer, faster.">
        <button className="button secondary"><Users size={16} /> Candidates</button>
        <button className="button primary"><Plus size={16} /> Create job</button>
      </PageHeading>
      <div className="pipelineSummary">
        <div><BriefcaseBusiness size={18} /><span><strong>{openJobs}</strong> Open jobs</span></div>
        <div><Users size={18} /><span><strong>{activeCandidates}</strong> Active candidates</span></div>
        <div><Clock3 size={18} /><span><strong>26 days</strong> Avg. time to hire</span></div>
        <div><Sparkles size={18} /><span><strong>91%</strong> AI match accuracy</span></div>
      </div>
      <div className="kanbanTools">
        <div className="tableSearch"><Search size={16} /><input placeholder="Search candidates..." /></div>
        <button className="button secondary"><Filter size={15} /> Filter</button>
        <button className="button secondary">All jobs <ChevronDown size={14} /></button>
      </div>
      <div className="kanban">
        {Object.entries(candidates).map(([stage, cards], stageIndex) => (
          <div className="kanbanColumn" key={stage}>
            <div className="kanbanHead"><span><i className={`stageDot stage${stageIndex}`} />{stage}</span><em>{cards.length}</em><MoreHorizontal size={17} /></div>
            {cards.map((candidate) => (
              <div className="candidateCard" key={candidate.name}>
                <div className="candidateTop"><Avatar initials={candidate.avatar} color={['#6366f1', '#8b5cf6', '#0ea5e9'][candidate.score % 3]} /><button className="moreButton"><MoreHorizontal size={16} /></button></div>
                <b>{candidate.name}</b><p>{candidate.role}</p>
                <div className="candidateMeta"><span><Sparkles size={13} /> AI score</span><strong>{candidate.score}%</strong></div>
                <div className="scoreBar"><i style={{ width: `${candidate.score}%` }} /></div>
                <small>Applied {candidate.score % 2 ? '2 days' : '5 hours'} ago</small>
              </div>
            ))}
            <button className="addCandidate"><Plus size={15} /> Add candidate</button>
          </div>
        ))}
      </div>
    </>
  )
}

function CopilotPage() {
  const [messages, setMessages] = useState([{ type: 'ai', text: 'Good morning, Goutham. I’m ready to help with your people, recruiting, attendance, or workforce planning.' }])
  const [text, setText] = useState('')
  const send = (value = text) => {
    if (!value.trim()) return
    setMessages((current) => [...current, { type: 'user', text: value }, { type: 'ai', text: 'I’ve analyzed your workspace data. Attendance is stable at 88.3%, hiring velocity is up 18%, and three employees in Engineering may benefit from a manager check-in.' }])
    setText('')
  }
  return (
    <div className="copilotPage">
      <div className="chatHistory">
        <button className="button primary newChat"><Plus size={16} /> New chat</button>
        <p>Recent</p>
        {['Monthly workforce summary', 'Engineering attrition risk', 'Q2 hiring performance', 'Leave policy questions'].map((item, i) => (
          <button key={item} className={i === 0 ? 'selected' : ''}><MessageSquareText size={16} /><span>{item}</span><MoreHorizontal size={15} /></button>
        ))}
      </div>
      <div className="chatMain">
        <div className="chatTitle"><span className="aiIcon large"><Bot size={20} /></span><div><h1>HR Copilot</h1><p>AI-powered answers grounded in your organization’s data</p></div><span className="liveBadge"><i /> Online</span></div>
        <div className="chatMessages">
          {messages.length === 1 && (
            <div className="promptGrid">
              {['Show employees with attendance issues', 'Generate the monthly HR report', 'Analyze our hiring performance', 'Recommend promotion candidates'].map((prompt) => (
                <button onClick={() => send(prompt)} key={prompt}><Sparkles size={17} /><span>{prompt}</span><ChevronRight size={15} /></button>
              ))}
            </div>
          )}
          {messages.map((message, i) => (
            <div className={`message ${message.type}`} key={`${message.text}-${i}`}>
              {message.type === 'ai' ? <span className="aiIcon"><Sparkles size={16} /></span> : <Avatar initials="GS" color="#4f46e5" small />}
              <p>{message.text}</p>
            </div>
          ))}
        </div>
        <div className="chatComposer">
          <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Ask about your people, hiring, attendance, or payroll..." />
          <div><span>HRFlow AI can make mistakes. Review important insights.</span><button onClick={() => send()}><Sparkles size={17} /></button></div>
        </div>
      </div>
      <div className="reportPanel">
        <p>Generated reports</p>
        <div className="reportPreview"><FileText size={24} /><b>Monthly HR Summary</b><span>May 2026 · 12 pages</span><button>Open report</button></div>
        <div className="reportPreview"><BarChart3 size={24} /><b>Hiring Performance</b><span>Q2 2026 · 8 pages</span><button>Open report</button></div>
      </div>
    </div>
  )
}

function ModulePage({ type }) {
  const [title, description] = moduleCopy[type] || ['Settings', 'Manage your organization, security, roles, and AI preferences.']
  const Icon = navGroups.flatMap((g) => g.items).find((item) => item.id === type)?.icon || Settings
  return (
    <>
      <PageHeading title={title} description={description}>
        <button className="button secondary"><Upload size={16} /> Export</button>
        <button className="button primary"><Plus size={16} /> Create new</button>
      </PageHeading>
      <div className="moduleHero card">
        <div className="moduleHeroIcon"><Icon size={28} /></div>
        <div><span>HRFlow workspace</span><h2>{title} is ready for your team</h2><p>This module uses the same unified employee data, permissions, automations, and AI insights across your organization.</p></div>
        <button className="button primary">Explore module <ChevronRight size={16} /></button>
      </div>
      <div className="moduleGrid">
        {['Overview', 'Pending actions', 'Recent activity'].map((label, i) => (
          <div className="card moduleCard" key={label}><span>{label}</span><strong>{[type === 'payroll' ? '$1.24M' : '248', '12', '38'][i]}</strong><p>{['Updated a few moments ago', 'Requires your attention', 'Changes in the last 7 days'][i]}</p><div className={`miniBars mini${i}`}><i /><i /><i /><i /><i /><i /></div></div>
        ))}
      </div>
      <div className="card emptyModule"><div className="moduleHeroIcon"><Sparkles size={24} /></div><h2>AI insights built in</h2><p>Ask HR Copilot to summarize trends, flag risks, and generate a report from this module.</p><button className="button secondary"><Sparkles size={16} /> Ask Copilot</button></div>
    </>
  )
}

function useHrflowData() {
  const [data, setData] = useState({ dashboard: null, employees: null, candidates: null })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const responses = await Promise.allSettled([
        fetch('/api/dashboard', { credentials: 'include' }),
        fetch('/api/employees?limit=100', { credentials: 'include' }),
        fetch('/api/candidates?limit=100', { credentials: 'include' }),
      ])

      const read = async (result) => {
        if (result.status !== 'fulfilled' || !result.value.ok) return null
        return (await result.value.json()).data
      }

      const [dashboard, employeeRows, candidateRows] = await Promise.all(responses.map(read))
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
        })
        return groups
      }, {})

      setData({
        dashboard,
        employees: mappedEmployees?.length ? mappedEmployees : null,
        candidates: groupedCandidates && Object.keys(groupedCandidates).length ? groupedCandidates : null,
      })
    }

    load().catch(() => {})
    return () => { cancelled = true }
  }, [])

  return data
}

export default function Home() {
  const [active, setActive] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [dark, setDark] = useState(false)
  const liveData = useHrflowData()
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    await signOut(getFirebaseClientAuth()).catch(() => {})
    window.location.assign('/login')
  }

  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <Sidebar active={active} setActive={setActive} open={sidebarOpen} setOpen={setSidebarOpen} compact={compact} setCompact={setCompact} />
      <div className={`mainShell ${compact ? 'shellCompact' : ''}`}>
        <Header setOpen={setSidebarOpen} dark={dark} setDark={setDark} logout={logout} />
        <main className={active === 'copilot' ? 'content contentChat' : 'content'}>
          {active === 'dashboard' && <Dashboard data={liveData.dashboard} />}
          {active === 'employees' && <EmployeesPage employees={liveData.employees || demoEmployees} />}
          {active === 'recruitment' && (
            <RecruitmentPage
              candidates={liveData.candidates || demoCandidates}
              openJobs={liveData.dashboard?.openJobs ?? 12}
            />
          )}
          {active === 'copilot' && <CopilotPage />}
          {!['dashboard', 'employees', 'recruitment', 'copilot'].includes(active) && <ModulePage type={active} />}
        </main>
      </div>
    </div>
  )
}
