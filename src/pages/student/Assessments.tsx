import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Brain, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Code2, FileText, Play, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useResource } from '../../hooks/useWorkspace';
import { isBackendConfigured } from '../../services/api';
import { assessmentService } from '../../services/assessmentService';
import { previewStart, previewSubmit, previewQuestionBank, psychometricBank } from '../../data/assessments';
import { previewStore } from '../../data/preview';
import type { Assessment, AssessmentAttempt, AssessmentResult } from '../../types';
import { Badge, Card, DataTable, ErrorState, FormError, LoadingState, Modal, PageHeading, ProgressBar, SectionTitle } from '../../components/dashboard/Page';
import { AssessmentScoreChart } from '../../components/dashboard/Charts';

type AssessmentKind = 'technical' | 'behavioural' | 'psychometric';

const meta = {
  technical: { title: 'Technical Assessment', description: 'Evaluate your computer science knowledge using the institution question bank.', intro: 'Apply your technical knowledge', icon: Code2, snapshot: '20 technical questions', detail: 'Programming, DSA, DBMS, OS, Networks and Software Engineering', instructions: ['Read each MCQ and choose one option.', 'You may move between questions before submitting.', 'The official answer key and scoring configuration determine your score.', 'Your score and topic-wise performance are saved to your account.'] },
  behavioural: { title: 'Behavioural Assessment', description: 'Reflect on workplace scenarios across communication, teamwork, leadership and related dimensions.', intro: 'Explore your workplace response tendencies', icon: Users, snapshot: '15 scenario questions', detail: 'Communication, teamwork, leadership, adaptability, accountability and more', instructions: ['Choose the response closest to how you would naturally act.', 'You may leave an item unanswered.', 'Results summarize the dimension mappings supplied with this assessment.', 'This is a self-reflection tool, not an objective measure of character or job suitability.'] },
  psychometric: { title: 'Psychometric Assessment', description: 'Explore work preferences and situational responses through the supplied scenario question bank.', intro: 'Reflect on how you approach situations', icon: Brain, snapshot: '15 scenario questions', detail: 'Emotional response, priority management, social orientation, decision-making and autonomy', instructions: ['Choose the response closest to how you would naturally act.', 'You may leave an item unanswered.', 'Results summarize response tendencies across the supplied dimensions.', 'This is not a clinically validated psychological instrument or diagnosis.'] },
};

function getPreviewAssessments(kind: AssessmentKind): Assessment[] {
  if (kind === 'technical') return previewQuestionBank.map((item) => ({
    id: item.id, title: item.title, category: item.category, difficulty: item.difficulty,
    duration: item.duration, questionCount: item.questions.length, dueAt: null,
  }));
  if (kind === 'psychometric') return [{
    id: psychometricBank.id, title: psychometricBank.title, category: 'Psychometric',
    difficulty: 'Situational', duration: psychometricBank.duration,
    questionCount: psychometricBank.questions.length, dueAt: null,
  }];
  return [];
}

export default function Assessments({ kind = 'technical' }: { kind?: AssessmentKind }) {
  const { isPreview } = useAuth();
  const details = meta[kind];
  const Icon = details.icon;
  const reflective = kind !== 'technical';
  const bank = useResource<Assessment[]>('/special-assessments/' + kind, isPreview ? getPreviewAssessments(kind) : null);
  const history = useResource<AssessmentResult[]>('/special-assessments/' + kind + '/results', isPreview
    ? previewStore.results.filter((item) => item.category.toLowerCase() === kind)
    : null);
  const [starting, setStarting] = useState(false);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [question, setQuestion] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const submitRef = useRef<() => void>(() => {});
  const submittingRef = useRef(false);

  const submit = async () => {
    if (!attempt || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    setConfirm(false);
    try {
      const response = isPreview ? previewSubmit(attempt, answers) : await assessmentService.submitSpecial(kind, attempt.id, answers);
      setResult(response);
      setAttempt(null);
      history.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit this assessment.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => { submitRef.current = () => { void submit(); }; });
  useEffect(() => {
    if (!attempt) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
      const seconds = Math.max(0, attempt.duration - elapsed);
      setRemaining(seconds);
      if (seconds === 0) submitRef.current();
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [attempt]);

  const start = async (id?: number) => {
    setStarting(true);
    setError('');
    try {
      const assessmentId = id ?? bank.data?.[0]?.id;
      if (!assessmentId) {
        throw new Error(isPreview
          ? 'This assessment has no sample preview. Connect the MySQL-backed Flask API to try the imported question set.'
          : 'No published assessment is available yet. Ask an administrator to publish it.');
      }
      const next = isPreview ? previewStart(assessmentId) : await assessmentService.startSpecial(kind, assessmentId);
      setAttempt(next);
      setAnswers(Array(next.questions.length).fill(null));
      setQuestion(0);
      setRemaining(next.duration);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start this assessment.');
    } finally { setStarting(false); }
  };

  const reset = () => { setAttempt(null); setResult(null); setAnswers([]); setError(''); };
  const results = history.data || [];
  const scoreLabel = (item: AssessmentResult) => reflective
    ? item.total + ' responses · ' + (item.dimensions?.length ?? item.categories.length) + ' dimensions'
    : item.score == null ? 'Not scored' : item.score + '%';

  const renderResult = (item: AssessmentResult) => (
    <div className="assessment-results">
      <div className="assessment-result-hero">
        <span className="assessment-result-icon">{reflective ? <Brain size={29} /> : <CheckCircle2 size={29} />}</span>
        <div><span className="eyebrow">{isPreview ? 'SAMPLE ASSESSMENT RESULT' : 'ASSESSMENT COMPLETE'}</span><h2>{item.title}</h2><p>{reflective ? 'Your selected responses are summarized below. This is for reflection, not diagnosis.' : 'Review your answers, score and topic-wise performance.'}</p></div>
      </div>
      <div className="statistics-grid statistics-grid--three">
        <div className="result-stat"><span>{reflective ? 'Responses in this assessment' : 'Score'}</span><strong>{reflective ? item.total : item.score == null ? '—' : item.score + '%'}</strong></div>
        <div className="result-stat"><span>{reflective ? 'Dimensions explored' : 'Correct answers'}</span><strong>{reflective ? (item.dimensions?.length ?? item.categories.length) : item.correct + ' / ' + item.total}</strong></div>
        <div className="result-stat"><span>{reflective ? 'Assessment type' : 'Performance band'}</span><strong>{reflective ? 'Self-reflection' : item.performanceBand || 'Completed'}</strong></div>
      </div>
      <Card>
        <div className="card-heading"><h2>{reflective ? 'Dimension Summary' : 'Technical Performance'}</h2><Badge tone="purple">Based on your responses</Badge></div>
        {reflective
          ? <div className="assessment-category-grid">{(item.dimensions || item.categories).map((dimension) => <ProgressBar key={dimension.name} label={dimension.name} value={dimension.score} />)}</div>
          : <AssessmentScoreChart data={[{ name: 'Score', score: item.score || 0 }, { name: 'Remaining marks', score: Math.max(0, 100 - (item.score || 0)) }]} />}
        <p className="muted-note">{item.note || (reflective ? 'Dimension scores summarize the response mappings in the assessment database.' : 'Technical score is calculated with the imported answer key and scoring configuration.')}</p>
      </Card>
      {item.review.length > 0 && <Card>
        <SectionTitle title="Review Your Responses" description={reflective ? 'Review the interpretation attached to your selected options.' : 'Review correct answers and explanations.'} />
        <div className="assessment-review">{item.review.map((review, i) => <details key={i}>
          <summary><span className={'review-status' + (review.correct === true ? ' review-status--correct' : '')}>{reflective ? <Brain size={14} /> : review.correct ? <Check size={14} /> : <X size={14} />}</span><span>{review.question}</span><ChevronRight size={14} className="review-chevron" /></summary>
          <div><p><strong>Your response:</strong> {review.selected}</p>{!reflective && review.correctAnswer && <p><strong>Correct response:</strong> {review.correctAnswer}</p>}{(reflective ? review.interpretation : review.explanation) && <p>{reflective ? review.interpretation : review.explanation}</p>}</div>
        </details>)}</div>
      </Card>}
      <div className="assessment-bottom-actions">
        <button type="button" className="button button--secondary" onClick={reset}><ArrowLeft size={15} />Back to assessments</button>
        <button type="button" className="button button--primary" onClick={() => { setResult(null); void start(item.assessmentId); }}><Play size={15} />Try again</button>
      </div>
    </div>
  );

  return <>
    <PageHeading title={details.title} description={details.description} actions={attempt || result ? undefined : <Badge tone="purple"><ShieldCheck size={12} />Your own results, securely stored</Badge>} />
    {bank.loading || history.loading ? <LoadingState /> : bank.error || history.error ? <ErrorState message={bank.error || history.error} /> : attempt ? <>
      <Card className="assessment-taking">
        <div className="assessment-taking-header">
          <div><Badge tone="blue">{details.title}</Badge><h2>{bank.data?.find((a) => a.id === attempt.assessmentId)?.title || details.title}</h2><p>Question {question + 1} of {attempt.questions.length}</p></div>
          <div className={'assessment-timer' + (remaining < 60 ? ' assessment-timer--warning' : '')}><Clock3 size={18} /><strong>{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</strong><span>remaining</span></div>
        </div>
        <div className="progress-track assessment-progress"><span style={{ width: (answers.filter((a) => a !== null).length / attempt.questions.length * 100) + '%' }} /></div>
        <div className="assessment-question">
          <span className="eyebrow">{kind === 'technical' ? 'TECHNICAL QUESTION' : kind === 'behavioural' ? 'WORKPLACE SCENARIO' : 'SITUATION-BASED QUESTION'}</span>
          <h3>{attempt.questions[question].text}</h3>
          <div className="answer-options">{attempt.questions[question].options.map((option, i) => <label key={i} className={'answer-option' + (answers[question] === i ? ' answer-option--selected' : '')}>
            <input type="radio" name={'question-' + question} checked={answers[question] === i} onChange={() => setAnswers((previous) => previous.map((answer, index) => index === question ? i : answer))} />
            <span className="answer-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>{answers[question] === i && <Check size={18} />}
          </label>)}</div>
        </div>
        <div className="assessment-navigation">
          <button type="button" className="button button--secondary" disabled={question === 0} onClick={() => setQuestion((q) => q - 1)}><ChevronLeft size={16} />Previous</button>
          <div className="question-number-buttons">{attempt.questions.map((q, i) => <button type="button" key={q.id} className={(question === i ? 'current' : '') + (answers[i] !== null ? ' answered' : '')} aria-label={'Go to question ' + (i + 1)} aria-current={question === i ? 'step' : undefined} onClick={() => setQuestion(i)}>{i + 1}</button>)}</div>
          {question === attempt.questions.length - 1
            ? <button type="button" className="button button--primary" onClick={() => setConfirm(true)}>Submit Assessment <Check size={15} /></button>
            : <button type="button" className="button button--primary" onClick={() => setQuestion((q) => q + 1)}>Next <ChevronRight size={16} /></button>}
        </div>
        <div className="assessment-submit-footer"><span>{answers.filter((a) => a !== null).length} of {attempt.questions.length} answered</span><button type="button" className="text-link" onClick={() => setConfirm(true)}>Finish & submit <ArrowRight size={14} /></button></div>
      </Card>
      <FormError message={error} />
    </> : result ? renderResult(result) : <>
      {!isBackendConfigured && !isPreview && <ErrorState message="Connect the Flask backend to load published assessments and submit answers securely." />}
      <div className="assessment-setup-grid">
        <Card className="assessment-setup-card">
          <span className="large-feature-icon"><Icon size={28} /></span><h2>{details.intro}</h2><p>{details.description}</p>
          <div className="assessment-instructions"><h3>Before you begin</h3>{details.instructions.map((instruction) => <span key={instruction}><Check size={15} />{instruction}</span>)}</div>
          {isPreview && <p className="field-hint">Preview mode uses sample data and does not save a real student attempt.</p>}
          <FormError message={error} />
        </Card>
        <Card className="assessment-overview-card">
          <span className="eyebrow">ASSESSMENT SNAPSHOT</span><h2>Practice with a purpose.</h2>
          <div><span className="overview-icon overview-icon--purple"><FileText size={21} /></span><div><strong>{details.snapshot}</strong><p>{details.detail}</p></div></div>
          <div><span className="overview-icon overview-icon--green"><Clock3 size={21} /></span><div><strong>Timed session</strong><p>Question navigation and saved attempts</p></div></div>
          <div><span className="overview-icon overview-icon--peach"><Brain size={21} /></span><div><strong>Feedback to guide learning</strong><p>Technical explanations or mapped reflection dimensions</p></div></div>
        </Card>
      </div>
      {bank.data?.length ? <Card className="published-assessments">
        <SectionTitle title="Available Assessments" description="Published by your institution" />
        {bank.data.map((assessment) => <div key={assessment.id}>
          <span className="published-assessment-icon">{kind === 'technical' ? <Code2 size={20} /> : kind === 'behavioural' ? <Users size={20} /> : <Brain size={20} />}</span>
          <div><h3>{assessment.title}</h3><p>{assessment.questionCount} questions · {Math.ceil(assessment.duration / 60)} minutes</p></div>
          <Badge tone="neutral">{assessment.difficulty}</Badge>
          <button type="button" className="button button--secondary button--small" disabled={starting} onClick={() => void start(assessment.id)}>{starting ? 'Preparing…' : 'Start'} <ArrowRight size={14} /></button>
        </div>)}
      </Card> : <p className="assessment-preview-note">{isPreview
        ? 'This assessment type has no sample preview. Connect the MySQL-backed API to load the imported assessment SQL data.'
        : 'No published assessment is available yet. An administrator can publish the imported assessment from the admin dashboard.'}</p>}
      <Card>
        <div className="card-heading"><div><h2>Previous Assessments</h2><p>Your own attempts and feedback</p></div><Badge>{results.length} attempts</Badge></div>
        <DataTable columns={['Assessment', 'Date', reflective ? 'Responses' : 'Score', 'Result']} empty={!results.length}>
          {results.map((item) => <tr key={item.id}><td><strong>{item.title}</strong></td><td>{new Date(item.date).toLocaleDateString()}</td><td>{scoreLabel(item)}</td><td><button type="button" className="text-link" onClick={() => { setResult(item); setAttempt(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>View result <ArrowRight size={13} /></button></td></tr>)}
        </DataTable>
      </Card>
    </>}
    {confirm && attempt && <Modal title="Ready to submit?" onClose={() => setConfirm(false)}>
      <div className="modal-form">
        <p className="form-description">You answered {answers.filter((a) => a !== null).length} of {attempt.questions.length} questions. {answers.some((a) => a === null) ? reflective ? 'Unanswered items will be omitted from your dimension summary.' : 'Unanswered technical questions receive no points.' : 'Your answers will be submitted for scoring.'}</p>
        <div className="modal-actions"><button type="button" className="button button--secondary" onClick={() => setConfirm(false)}>Keep working</button><button type="button" className="button button--primary" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Submitting…' : 'Submit Assessment'}<Check size={15} /></button></div>
      </div>
    </Modal>}
  </>;
}
