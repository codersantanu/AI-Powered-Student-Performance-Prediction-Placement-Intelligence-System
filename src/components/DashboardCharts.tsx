import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const semesterData = [
  { semester: 'Sem 1', sgpa: 6.8 },
  { semester: 'Sem 2', sgpa: 7.1 },
  { semester: 'Sem 3', sgpa: 7.4 },
  { semester: 'Sem 4', sgpa: 7.8 },
  { semester: 'Sem 5', sgpa: 8.1 },
  { semester: 'Sem 6', sgpa: 8.4 },
];

export const subjectData = [
  { subject: 'Data Structures', score: 72 },
  { subject: 'Algorithms', score: 78 },
  { subject: 'DBMS', score: 88 },
  { subject: 'Operating Systems', score: 85 },
  { subject: 'Mathematics', score: 91 },
  { subject: 'Computer Networks', score: 86 },
];

export const studyData = [
  { day: 'Mon', hours: 3.5 },
  { day: 'Tue', hours: 4.2 },
  { day: 'Wed', hours: 3.8 },
  { day: 'Thu', hours: 5.0 },
  { day: 'Fri', hours: 4.4 },
  { day: 'Sat', hours: 5.5 },
  { day: 'Sun', hours: 5.1 },
];

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly { name?: string; value?: number | string; color?: string; payload?: { semester?: string; day?: string; subject?: string } }[];
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = item.payload?.semester || item.payload?.day || item.payload?.subject || label || '';
  return (
    <div className="chart-tooltip">
      <span>{name}</span>
      <strong>{item.value}{item.name === 'Study hours' ? ' hrs' : item.name === 'SGPA' ? ' / 10' : '%'}</strong>
    </div>
  );
}

export function SemesterChart({ semester = '6' }: { semester?: string }) {
  return (
    <div className="performance-chart" role="img" aria-label="Sample semester SGPA from 6.8 in semester one to 8.4 in semester six">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={semesterData.filter((item) => Number(item.semester.slice(-1)) <= Number(semester))} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="semesterFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#EDF0F5" strokeDasharray="3 4" />
          <XAxis dataKey="semester" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9 }} dy={8} />
          <YAxis domain={[4, 10]} ticks={[4, 6, 8, 10]} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 9 }} width={38} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#C7D2FE', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="sgpa" name="SGPA" stroke="#6366F1" strokeWidth={2.5} fill="url(#semesterFill)" dot={{ r: 3, fill: '#fff', stroke: '#6366F1', strokeWidth: 2 }} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 3 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SubjectChart() {
  return (
    <div className="subject-chart" role="img" aria-label="Sample subject scores: Data Structures 72%, Algorithms 78%, DBMS 88%, Operating Systems 85%, Mathematics 91%, Computer Networks 86%">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={subjectData} layout="vertical" margin={{ top: 0, right: 8, left: -2, bottom: 0 }} barSize={9}>
          <CartesianGrid horizontal={false} stroke="#EDF0F5" strokeDasharray="3 4" />
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 8.5 }} />
          <YAxis type="category" dataKey="subject" width={102} axisLine={false} tickLine={false} tick={{ fill: '#7C899D', fontSize: 9 }} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F3FF' }} />
          <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {subjectData.map((item, index) => <Cell key={item.subject} fill={index < 2 ? '#6366F1' : '#A5B4FC'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StudyChart() {
  return (
    <div className="study-chart" role="img" aria-label="Illustrative daily study hours, Monday through Sunday">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={studyData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#EDF0F5" strokeDasharray="3 4" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} dy={8} />
          <YAxis domain={[0, 6]} ticks={[0, 2, 4, 6]} axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} width={38} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="hours" name="Study hours" stroke="#6366F1" strokeWidth={2.5} fill="url(#studyFill)" dot={{ r: 3, fill: '#fff', stroke: '#6366F1', strokeWidth: 2 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
