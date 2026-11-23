import { useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, ChartNoAxesCombined, Check, Database, GitCompareArrows, ShieldCheck, Sparkles, Target, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useResource, useWorkspace } from '../../hooks/useWorkspace';
import { isBackendConfigured } from '../../services/api';
import { predictionService } from '../../services/predictionService';
import { emptyModelInfo } from '../../data/preview';
import type { ModelInfo, Prediction } from '../../types';
import { Badge, Card, DataTable, EmptyState, ErrorState, FormError, LoadingState, PageHeading, ProgressBar, SectionTitle } from '../../components/dashboard/Page';
import { GradientStatCard } from '../../components/dashboard/Statistics';

const fields = [
  { key: 'previousMarks', label: 'Previous semester marks (%)', max: 100, step: 0.1 },
  { key: 'currentMarks', label: 'Current subject marks (%)', max: 100, step: 0.1 },
  { key: 'sgpa', label: 'Current SGPA (0–10)', max: 10, step: 0.01 },
  { key: 'cgpa', label: 'Current CGPA (0–10)', max: 10, step: 0.01 },
  { key: 'attendance', label: 'Attendance (%)', max: 100, step: 0.1 },
  { key: 'studyHours', label: 'Average daily study hours', max: 24, step: 0.1 },
  { key: 'backlogs', label: 'Active backlogs', max: 50, step: 1 },
  { key: 'assessmentScore', label: 'Relevant assessment score (%)', max: 100, step: 0.1 },
];

export default function PerformancePrediction() {
  const { isPreview } = useAuth();
  const workspace = useWorkspace();
  const model = useResource<ModelInfo>('/predictions/model-metrics', isPreview ? emptyModelInfo : null);
  const history = useResource<Prediction[]>('/predictions/history', isPreview ? [] : null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [target, setTarget] = useState('next_semester');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const info = model.data || emptyModelInfo;
  const predictions = history.data ?? [];
  const available = info.available && isBackendConfigured && !isPreview;
  const latest = workspace.data?.academicRecords.at(-1);
  const attendanceRisk = latest?.attendance != null && latest.attendance < 75;
  const backlogRisk = (latest?.activeBacklogs || 0) > 0;

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!available) { setError('A trained model is not connected. Complete your academic profile and ask your institution to connect the model.'); return; }
    setBusy(true);
    try {
      const numericInputs = Object.fromEntries(Object.entries(inputs).map(([key, value]) => [key, Number(value)]));
      const result = await predictionService.generate({ target, inputs: numericInputs });
      setPrediction(result);
      history.reload();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to generate a prediction.'); }
    finally { setBusy(false); }
  };

  const placeholder = (key: string) => {
    if (key === 'sgpa' || key === 'cgpa') {
      const value = key === 'sgpa' ? latest?.sgpa : (latest ? latest.sgpa : null);
      return value == null ? '0–10' : String(value);
    }
    if (key === 'attendance') return latest?.attendance == null ? '0–100' : String(latest.attendance);
    return 'Enter verified value';
  };

  return (
    <>
      <PageHeading title="Performance Prediction" description="Explore model-based academic estimates and supportive next steps—not labels or guarantees." actions={<Badge tone="purple"><ShieldCheck size={12} />Decision Tree · Random Forest</Badge>} />
      {model.loading || history.loading ? <LoadingState /> : model.error || history.error ? <ErrorState message={model.error || history.error} /> : (
        <>
          <div className="prediction-target-banner"><span><Target size={22} /></span><div><strong>Prediction target: {info.target}</strong><p>Estimates describe a defined academic outcome. They do not define your ability or your future.</p></div><Badge tone="blue">{available ? 'Model connected' : 'Model not connected'}</Badge></div>
          {!available && <div className="prediction-unavailable"><span className="prediction-unavailable-icon"><ChartNoAxesCombined size={30} /></span><div><h2>Prediction is not available yet.</h2><p>Complete your academic profile to generate a prediction. A trained model must also be connected by your institution.</p><p className="muted-note">No predicted score or probabilities are invented while the model is unavailable.</p></div></div>}
          {prediction && <div className="prediction-generated"><div className="prediction-result-title"><span className="insight-icon"><Sparkles size={23} /></span><div><span className="eyebrow">MODEL-BASED ESTIMATE</span><h2>Predicted outcome: {prediction.outcome}</h2><p>Generated {new Date(prediction.createdAt).toLocaleString()} · {prediction.modelVersion}</p></div></div><div className="statistics-grid statistics-grid--three"><GradientStatCard title="Pass Estimate" value={prediction.passProbability == null ? '—' : `${Math.round(prediction.passProbability * 100)}%`} icon={Check} tone="green" detail="Estimated probability for the defined target" /><GradientStatCard title="Fail Estimate" value={prediction.failProbability == null ? '—' : `${Math.round(prediction.failProbability * 100)}%`} icon={TriangleAlert} tone="peach" detail="Complement of the model pass estimate" /><GradientStatCard title="Prediction Support" value={prediction.confidence == null ? '—' : `${Math.round(prediction.confidence * 100)}%`} icon={ShieldCheck} tone="purple" detail={prediction.confidence == null ? 'Uncalibrated confidence is not displayed' : 'Calibrated model confidence'} /></div><p className="supportive-guidance">An estimate is an opportunity to plan support, not a judgment. Review your academic information with a mentor and focus on manageable next steps.</p></div>}
          <div className="prediction-grid">
            <Card className="prediction-input-card"><div className="card-heading"><div><h2>Academic Inputs</h2><p>Use verified information for a meaningful model estimate</p></div><Activity size={19} className="muted-icon" /></div><form onSubmit={generate}><div className="prediction-input-fields">{fields.map((field) => <label className="form-field" key={field.key}>{field.label}<input type="number" required min={0} max={field.max} step={field.step} placeholder={placeholder(field.key)} value={inputs[field.key] || ''} onChange={(event) => setInputs((previous) => ({ ...previous, [field.key]: event.target.value }))} /></label>)}</div><label className="form-field">Prediction target<select value={target} onChange={(event) => setTarget(event.target.value)}><option value="next_semester">Passing the next semester</option></select><span className="field-hint">Use the target defined by the connected model. Changing the target does not train a new model.</span></label><FormError message={error} /><button type="submit" className="button button--primary" disabled={busy}>{busy ? 'Generating…' : 'Generate Prediction'}<Sparkles size={15} /></button>{!available && <p className="field-hint">Connect a trained model to enable real predictions.</p>}</form></Card>
            <div className="prediction-side"><Card><div className="card-heading"><h2>Risk Factor Analysis</h2><Badge tone="blue">From your records</Badge></div><div className="risk-factors"><ProgressBar label="Attendance below 75%" value={latest?.attendance ?? null} detail={attendanceRisk ? 'Discuss attendance barriers with your mentor.' : latest?.attendance == null ? 'Attendance data is not available.' : 'No low-attendance indicator in the available record.'} color={attendanceRisk ? 'peach' : 'blue'} /><ProgressBar label="Active academic backlogs" value={latest ? Math.min(100, latest.activeBacklogs * 25) : null} detail={backlogRisk ? 'Ask your institution about available academic support.' : 'Based on your latest available backlog record.'} color={backlogRisk ? 'peach' : 'blue'} /><div className="risk-topic-note"><strong>Review subject-level results</strong><p>Weak topics and previous marks are useful discussion points. A prediction should never be the only basis for an academic decision.</p></div></div></Card><Card className="prediction-model-note"><Database size={22} /><h3>Transparent model information</h3><p>Only metrics from a held-out test set are displayed. Confidence is shown only for a calibrated model.</p><Badge tone="purple">{info.available ? info.selectedModel : 'No trained model connected'}</Badge></Card></div>
          </div>
          <Card><div className="card-heading"><div><h2>Model Evaluation</h2><p>Held-out evaluation results supplied by the connected model artifact</p></div><GitCompareArrows size={20} className="muted-icon" /></div>{info.available && info.metrics ? <><div className="model-metrics-grid">{([['Accuracy', info.metrics.accuracy], ['Precision', info.metrics.precision], ['Recall', info.metrics.recall], ['F1-score', info.metrics.f1]] as const).map(([label, value]) => <div key={label}><span>{label}</span><strong>{Math.round(value * 100) / 100}</strong></div>)}</div><div className="model-details-grid"><div><h3>Confusion Matrix</h3><p>Rows: actual outcome · columns: predicted outcome</p><table className="confusion-matrix"><thead><tr><th>Actual ↓ / predicted →</th><th>Fail (0)</th><th>Pass (1)</th></tr></thead><tbody>{info.metrics.confusionMatrix.map((row, i) => <tr key={i}><th>{i === 0 ? 'Fail (0)' : 'Pass (1)'}</th>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div><div><h3>Training Dataset</h3><dl className="information-list"><div><dt>Model version</dt><dd>{info.version}</dd></div><div><dt>Selected algorithm</dt><dd>{info.selectedModel}</dd></div><div><dt>Dataset records</dt><dd>{info.dataset?.rows ?? 'Not provided'}</dd></div><div><dt>Features</dt><dd>{info.dataset?.features ?? 'Not provided'}</dd></div><div><dt>Train / validation / test</dt><dd>{info.dataset ? `${info.dataset.train} / ${info.dataset.validation} / ${info.dataset.test}` : 'Not provided'}</dd></div><div><dt>Trained at</dt><dd>{info.trainedAt ? new Date(info.trainedAt).toLocaleDateString() : 'Not provided'}</dd></div></dl></div></div></> : <EmptyState title="No model evaluation is available" description="Your institution can connect a trained Decision Tree or Random Forest model and its actual evaluation metadata." icon={Database} />}</Card>
          <Card><SectionTitle title="Prediction History" description="Track changes in model-based estimates over time" /><DataTable columns={['Date', 'Target', 'Outcome', 'Pass estimate', 'Model']} empty={!predictions.length}>{predictions.slice().reverse().map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleDateString()}</td><td>{item.target === 'next_semester' ? 'Next semester' : item.target}</td><td><Badge tone={item.outcome.toLowerCase().includes('pass') ? 'green' : 'peach'}>{item.outcome}</Badge></td><td>{item.passProbability == null ? 'Not available' : `${Math.round(item.passProbability * 100)}%`}</td><td>{item.modelVersion}</td></tr>)}</DataTable></Card>
        </>
      )}
    </>
  );
}
