import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { AcademicRecord, StudySession } from '../../types';

export const chartColors = ['#6366F1', '#93C5FD', '#6EE7B7', '#FDBA74', '#F9A8D4', '#A78BFA'];
const axis = { tick: { fill: '#94A3B8', fontSize: 10 }, axisLine: false, tickLine: false };
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: readonly { name?: string; value?: number | string; color?: string }[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label || payload[0].name}</strong>{payload.map((item, i) => <span key={i}><i style={{ background: item.color }} />{item.name}: {typeof item.value === 'number' ? Math.round(item.value * 100) / 100 : item.value}</span>)}</div>;
}
export function SemesterChart({ records }: { records: AcademicRecord[] }) {
  const data = [...records].sort((a, b) => a.semester - b.semester).map((r) => ({ name: `Sem ${r.semester}`, SGPA: r.sgpa }));
  return (
    <div className="app-chart" role="img" aria-label="Semester-wise SGPA from academic records">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={data} margin={{ top: 15, right: 18, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#EDF0F5" />
          <XAxis dataKey="name" {...axis} dy={8} />
          <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} {...axis} width={38} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="SGPA" stroke="#6366F1" strokeWidth={2.5} connectNulls={false} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
export function SubjectChart({ records, horizontal = false }: { records: AcademicRecord[]; horizontal?: boolean }) {
  const data = records.flatMap((r) => r.subjects).filter((s) => s.obtainedMarks !== null).map((s) => ({ name: s.name, Marks: s.obtainedMarks && s.totalMarks ? Math.round(s.obtainedMarks / s.totalMarks * 100) : 0 }));
  if (horizontal) return (
    <div className="app-chart app-chart--horizontal" role="img" aria-label="Subject marks percentage">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: -15, bottom: 0 }} barSize={12}>
          <CartesianGrid horizontal={false} strokeDasharray="3 4" stroke="#EDF0F5" />
          <XAxis type="number" domain={[0, 100]} {...axis} />
          <YAxis type="category" dataKey="name" width={115} {...axis} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="Marks" radius={[0, 4, 4, 0]} isAnimationActive={false}>{data.map((item, i) => <Cell key={item.name} fill={item.Marks < 60 ? '#FDBA74' : i % 2 ? '#93C5FD' : '#6366F1'} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
  return (
    <div className="app-chart" role="img" aria-label="Subject-wise obtained marks">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#EDF0F5" />
          <XAxis dataKey="name" {...axis} interval={0} tick={{ fill: '#94A3B8', fontSize: 9 }} angle={-15} textAnchor="end" height={55} />
          <YAxis domain={[0, 100]} {...axis} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="Marks" fill="#818CF8" radius={[5, 5, 0, 0]} maxBarSize={38} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function AttendanceChart({ records }: { records: AcademicRecord[] }) {
  const data = [...records].sort((a, b) => a.semester - b.semester).filter((r) => r.attendance !== null).map((r) => ({ name: `Sem ${r.semester}`, Attendance: r.attendance }));
  return (
    <div className="app-chart" role="img" aria-label="Semester attendance percentages">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 15, right: 15, left: -15, bottom: 0 }} barSize={35}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#EDF0F5" />
          <XAxis dataKey="name" {...axis} />
          <YAxis domain={[0, 100]} {...axis} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="Attendance" fill="#6EE7B7" radius={[5, 5, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function StudyHoursChart({ sessions }: { sessions: StudySession[] }) {
  const totals = new Map<string, number>();
  sessions.forEach((s) => totals.set(s.date, (totals.get(s.date) || 0) + s.duration));
  const data = [...totals].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, hours]) => ({ name: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), Hours: Math.round(hours * 100) / 100 }));
  return (
    <div className="app-chart" role="img" aria-label="Daily study hours from logged sessions">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 15, right: 15, left: -15, bottom: 0 }} barSize={22}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#EDF0F5" />
          <XAxis dataKey="name" {...axis} interval="preserveStartEnd" />
          <YAxis {...axis} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="Hours" fill="#A5B4FC" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function StudyDistributionChart({ sessions }: { sessions: StudySession[] }) {
  const totals = new Map<string, number>();
  sessions.forEach((s) => totals.set(s.subject, (totals.get(s.subject) || 0) + s.duration));
  const data = [...totals].map(([name, hours]) => ({ name, value: Math.round(hours * 100) / 100 }));
  return (
    <div className="app-chart app-chart--donut" role="img" aria-label="Study time distribution by subject">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="88%" paddingAngle={3} stroke="none" isAnimationActive={false}>{data.map((item, i) => <Cell key={item.name} fill={chartColors[i % chartColors.length]} />)}</Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-total"><strong>{Math.round(data.reduce((sum, item) => sum + item.value, 0) * 10) / 10}</strong><span>total hours</span></div>
    </div>
  );
}
export function StudyComparisonChart({ sessions, records }: { sessions: StudySession[]; records: AcademicRecord[] }) {
  const totals = new Map<string, number>();
  sessions.forEach((s) => totals.set(s.subject, (totals.get(s.subject) || 0) + s.duration));
  const marks = new Map<string, number>();
  records.forEach((r) => r.subjects.forEach((s) => { if (s.obtainedMarks !== null && s.totalMarks) marks.set(s.name, s.obtainedMarks / s.totalMarks * 100); }));
  const data = [...totals].map(([subject, hours]) => ({ subject, name: subject, hours, marks: marks.get(subject) ?? null })).filter((d) => d.marks !== null);
  return (
    <div className="app-chart" role="img" aria-label="Logged study hours compared with academic marks, an association not a causal relationship">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ScatterChart margin={{ top: 15, right: 20, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 4" stroke="#EDF0F5" />
          <XAxis type="number" dataKey="hours" name="Study hours" unit="hrs" {...axis} />
          <YAxis type="number" dataKey="marks" name="Marks" unit="%" domain={[0, 100]} {...axis} />
          <Tooltip content={<ChartTooltip />} />
          <Scatter data={data} fill="#818CF8" isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
export function AssessmentScoreChart({ data }: { data: { name: string; score: number }[] }) {
  return (
    <div className="app-chart" role="img" aria-label="Assessment category scores">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: -20, bottom: 0 }} barSize={12}>
          <CartesianGrid horizontal={false} strokeDasharray="3 4" stroke="#EDF0F5" />
          <XAxis type="number" domain={[0, 100]} {...axis} />
          <YAxis type="category" dataKey="name" width={110} {...axis} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="score" fill="#A5B4FC" radius={[0, 4, 4, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function InstitutionChart({ data }: { data: { name: string; value: number | null }[] }) {
  return (
    <div className="app-chart" role="img" aria-label="Institution-level academic aggregates">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 15, right: 20, left: -15, bottom: 0 }} barSize={35}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#EDF0F5" />
          <XAxis dataKey="name" {...axis} />
          <YAxis {...axis} domain={[0, 10]} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Average SGPA" fill="#A5B4FC" radius={[5, 5, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
