import { useState } from 'react';
import {
  ArrowDownToLine,
  BarChart3,
  BookOpen,
  Brain,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  FileChartColumn,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Brand from './Brand';
import { SemesterChart, semesterData, StudyChart, SubjectChart } from './DashboardCharts';

type DashboardTab = 'Overview' | 'Academic Performance' | 'Study Behaviour' | 'Assessments' | 'Predictions' | 'Reports';

const navigation: { label: DashboardTab; icon: LucideIcon }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Academic Performance', icon: GraduationCap },
  { label: 'Study Behaviour', icon: Clock3 },
  { label: 'Assessments', icon: Brain },
  { label: 'Predictions', icon: Sparkles },
  { label: 'Reports', icon: FileChartColumn },
];

const descriptions: Record<DashboardTab, string> = {
  Overview: "Here's your academic performance overview.",
  'Academic Performance': 'A closer look at your semester and subject results.',
  'Study Behaviour': 'Build consistency with a clearer view of your study habits.',
  Assessments: 'Understand your strengths across sample assessments.',
  Predictions: 'An illustrative look at future academic performance.',
  Reports: 'Your academic information, all in one place.',
};

const semesterValues: Record<string, { cgpa: string; attendance: number; hours: string }> = {
  '4': { cgpa: '7.8', attendance: 88, hours: '3.8' },
  '5': { cgpa: '8.1', attendance: 90, hours: '4.2' },
  '6': { cgpa: '8.4', attendance: 92, hours: '4.5' },
};

function SummaryCard({ title, value, unit, icon: Icon, detail }: { title: string; value: string; unit?: string; icon: LucideIcon; detail: string }) {
  return (
    <div className="dashboard-stat">
      <div className="stat-top"><span>{title}</span><Icon size={14} strokeWidth={1.7} /></div>
      <div className="stat-value">{value}<span>{unit}</span></div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

function PredictionCard({ large = false }: { large?: boolean }) {
  return (
    <div className={`prediction-card${large ? ' prediction-card--large' : ''}`}>
      <div className="insight-icon"><Sparkles size={17} strokeWidth={1.8} /></div>
      <div className="insight-content">
        <span className="insight-label">Performance Prediction</span>
        <p>Predicted Academic Status: <strong>Good <span className="status-dot" /></strong></p>
        <span className="insight-note">Illustrative result · not an actual ML prediction</span>
      </div>
    </div>
  );
}

function SuggestionCard() {
  return (
    <div className="suggestion-card">
      <div className="insight-icon"><Lightbulb size={17} strokeWidth={1.8} /></div>
      <div className="insight-content">
        <span className="insight-label">Personalized Improvement</span>
        <p>Focus more on <strong>Data Structures and Algorithms.</strong></p>
        <span className="insight-note">Small steps today. Stronger results tomorrow.</span>
      </div>
    </div>
  );
}

function AssessmentTable() {
  const assessments = [
    { name: 'Communication skills', type: 'Psychometric', score: '82 / 100', icon: Brain },
    { name: 'Problem-solving', type: 'Psychometric', score: '85 / 100', icon: Brain },
    { name: 'Technical knowledge', type: 'Technical', score: '78 / 100', icon: Code2 },
  ];
  return (
    <div className="sample-table-wrap">
      <table className="sample-table">
        <caption className="sr-only">Illustrative assessment results, not completed assessments</caption>
        <thead><tr><th>Assessment</th><th>Type</th><th>Sample score</th><th>Status</th></tr></thead>
        <tbody>{assessments.map(({ name, type, score, icon: Icon }) => (
          <tr key={name}><td><span className="table-subject"><Icon size={14} />{name}</span></td><td>{type}</td><td>{score}</td><td><span className="table-status"><Check size={11} /> Sample</span></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('Overview');
  const [semester, setSemester] = useState('6');
  const [downloaded, setDownloaded] = useState(false);
  const values = semesterValues[semester];

  const downloadReport = () => {
    const rows = [
      ['StudentIQ sample academic report — illustrative data only'],
      ['Metric', 'Sample value'],
      ['Current CGPA', values.cgpa],
      ['Attendance (%)', String(values.attendance)],
      ['Study hours per day', values.hours],
      ['Subjects', '6'],
      ['Predicted academic status (illustrative)', 'Good'],
      [],
      ['Semester', 'Sample SGPA'],
      ...semesterData.filter((item) => Number(item.semester.slice(-1)) <= Number(semester)).map((item) => [item.semester, String(item.sgpa)]),
      [],
      ['Subject', 'Sample score (%)'],
      ...[['Data Structures', '72'], ['Algorithms', '78'], ['DBMS', '88'], ['Operating Systems', '85'], ['Mathematics', '91'], ['Computer Networks', '86']],
      [],
      ['Note', 'Sample data only. No machine learning model has been used.'],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'StudentIQ-sample-academic-report.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  };

  return (
    <div className="dashboard-section" id="dashboard">
      <div className="page-container">
        <div className="dashboard-window">
          <aside className="dashboard-sidebar" aria-label="Sample student dashboard">
            <Brand compact />
            <span className="workspace-label">WORKSPACE</span>
            <nav className="dashboard-nav" aria-label="Dashboard preview navigation">
              {navigation.map(({ label, icon: Icon }) => (
                <button key={label} type="button" className={`dashboard-nav-item${activeTab === label ? ' dashboard-nav-item--active' : ''}`} aria-pressed={activeTab === label} onClick={() => { setActiveTab(label); setDownloaded(false); }}>
                  <Icon size={16} strokeWidth={1.7} /><span>{label}</span>{activeTab === label && <span className="nav-active-dot" />}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="sidebar-tip"><span className="sidebar-tip-icon"><TrendingUp size={17} /></span><strong>Every step counts.</strong><p>Your next chapter starts with a little progress.</p></div>
              <div className="student-profile"><span className="avatar">AL</span><div><strong>Alex Johnson</strong><span>Student account</span></div><span className="profile-status" /></div>
            </div>
          </aside>
          <div className="dashboard-main">
            <div className="dashboard-topbar">
              <div><h3>Welcome back, Alex! <span className="welcome-wave" aria-hidden="true">✦</span></h3><p>{descriptions[activeTab]}</p></div>
              <div className="dashboard-header-actions">
                <label className="semester-select"><CalendarDays size={12} /><span className="sr-only">Sample semester</span><select aria-label="Sample semester" value={semester} onChange={(event) => setSemester(event.target.value)}><option value="4">Semester 4</option><option value="5">Semester 5</option><option value="6">Semester 6</option></select><ChevronDown size={11} /></label>
                <span className="avatar avatar--small">AL</span>
              </div>
            </div>
            <div className="dashboard-stats">
              <SummaryCard title="Current CGPA" value={values.cgpa} unit="/ 10" icon={GraduationCap} detail="↑ 0.3 from last semester" />
              <SummaryCard title="Attendance" value={`${values.attendance}%`} icon={CalendarCheck2} detail="↑ 2% from last semester" />
              <SummaryCard title="Study Hours" value={values.hours} unit="hrs/day" icon={Clock3} detail="Consistent daily progress" />
              <SummaryCard title="Subjects" value="6" unit="active" icon={BookOpen} detail="This semester" />
            </div>
            {(activeTab === 'Overview' || activeTab === 'Academic Performance') && (
              <>
                <div className="dashboard-charts">
                  <section className="chart-card" aria-label="Sample semester performance chart">
                    <div className="chart-heading"><div><h4>Semester Performance</h4><p>Your progress, semester by semester</p></div><span className="chart-legend"><span /> SGPA</span></div>
                    <SemesterChart semester={semester} />
                  </section>
                  <section className="chart-card" aria-label="Sample subject-wise performance chart">
                    <div className="chart-heading"><div><h4>Subject-wise Performance</h4><p>A snapshot of your academic strengths</p></div><BarChart3 className="chart-header-icon" size={15} /></div>
                    <SubjectChart />
                  </section>
                </div>
                {activeTab === 'Overview' ? <div className="dashboard-insights"><PredictionCard /><SuggestionCard /></div> : (
                  <div className="academic-detail"><div className="detail-title"><h4>Your semester snapshot</h4><span>Sample academic records</span></div><div className="semester-history">{[4, 5, 6].map((item) => <div key={item}><span>Semester {item}</span><strong>{semesterValues[String(item)].cgpa} <small>SGPA</small></strong><span className="semester-check"><Check size={12} /> Sample record</span></div>)}</div><p className="detail-footnote">Select a semester above to explore the sample charts.</p></div>
                )}
              </>
            )}
            {activeTab === 'Study Behaviour' && (
              <div className="dashboard-detail-view"><section className="chart-card study-chart-card"><div className="chart-heading"><div><h4>Your Study Consistency</h4><p>Illustrative study hours over one week</p></div><span className="chart-legend"><span /> Study hours</span></div><StudyChart /></section><div className="study-bottom"><div className="study-habit"><Clock3 size={21} /><div><strong>A little consistency goes a long way.</strong><p>This sample routine averages 4.5 study hours a day.</p></div></div><SuggestionCard /></div></div>
            )}
            {activeTab === 'Assessments' && (
              <div className="dashboard-detail-view"><div className="detail-title"><h4>Your Assessment Snapshot</h4><span>Illustrative scores only</span></div><AssessmentTable /><div className="detail-notice"><Brain size={15} /><span>These sample assessments demonstrate psychometric and technical insights. No assessments have been completed.</span></div></div>
            )}
            {activeTab === 'Predictions' && (
              <div className="dashboard-detail-view"><PredictionCard large /><section className="prediction-factors"><div className="detail-title"><h4>What contributes to this sample?</h4><span>Illustrative factors</span></div>{[{ label: 'Attendance', value: `${values.attendance}%`, width: values.attendance }, { label: 'Study consistency', value: '86%', width: 86 }, { label: 'Assessment average', value: '82%', width: 82 }].map((factor) => <div className="factor-row" key={factor.label}><span>{factor.label}</span><div><span style={{ width: `${factor.width}%` }} /></div><strong>{factor.value}</strong></div>)}<p className="detail-footnote">This is a frontend demonstration, not output from a trained ML model.</p></section></div>
            )}
            {activeTab === 'Reports' && (
              <div className="dashboard-detail-view report-view"><div className="report-icon"><FileChartColumn size={28} strokeWidth={1.5} /></div><h4>Your Academic Snapshot</h4><p>A simple summary of your sample semester results,<br />subject scores, attendance, and study habits.</p><button type="button" className="button button--primary button--small" onClick={downloadReport}>{downloaded ? <Check size={14} /> : <ArrowDownToLine size={14} />}{downloaded ? 'Report downloaded' : 'Download sample report'}</button><span className="report-format">CSV format · sample data only</span>{downloaded && <span className="sr-only" role="status">Your sample report has been downloaded.</span>}</div>
            )}
          </div>
        </div>
        <p className="dashboard-disclaimer"><span className="preview-dot" /> Illustrative dashboard preview. Sample data only — not actual ML predictions.</p>
      </div>
    </div>
  );
}
