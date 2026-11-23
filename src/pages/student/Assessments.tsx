import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Brain, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Code2, FileText, Play, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useResource } from '../../hooks/useWorkspace';
import { isBackendConfigured } from '../../services/api';
import { assessmentService } from '../../services/assessmentService';
import { previewStart, previewSubmit, previewQuestionBank } from '../../data/assessments';
import { previewStore } from '../../data/preview';
import type { AssessmentAttempt, AssessmentResult } from '../../types';
import { Badge, Card, DataTable, ErrorState, FormError, LoadingState, Modal, PageHeading, ProgressBar, SectionTitle } from '../../components/dashboard/Page';
import { AssessmentScoreChart } from '../../components/dashboard/Charts';

export default function Assessments({ psychometric = false }: { psychometric?: boolean }) {
  const { isPreview } = useAuth();
  const bank = useResource('/assessments' + (psychometric ? '?category=Psychometric' : ''), psychometric ? [previewStore.assessments[1]] : previewStore.assessments.slice(0, 1));
  const history = useResource<AssessmentResult[]>('/assessments/results', psychometric ? previewStore.results : []);
  const [category, setCategory] = useState('Python');
  const [difficulty, setDifficulty] = useState('Basic');
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
  const categories = psychometric ? ['Psychometric'] : [...new Set([...previewQuestionBank.map((a) => a.category), ...(bank.data || []).map((a) => a.category)])];

  const submit = async () => {
    if (!attempt || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    setConfirm(false);
    try {
      const response = isPreview ? previewSubmit(attempt, answers) : await assessmentService.submit(attempt.id, answers);
      setResult(response);
      setAttempt(null);
      history.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit the assessment.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => { submitRef.current = () => { void submit(); }; });
  useEffect(() => {
    if (!attempt) return;
    const tick = () => {
      const seconds = Math.max(0, attempt.duration - Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000));
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
      const assessmentId = id || (psychometric ? 201 : previewQuestionBank.find((a) => a.category === category && a.difficulty === difficulty)?.id);
      if (!assessmentId) throw new Error('No questions are available for this subject and difficulty. Ask your administrator to publish an assessment.');
      const next = isPreview ? previewStart(assessmentId) : await assessmentService.start(assessmentId);
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
  const filteredHistory = (history.data || []).filter((r) => psychometric ? r.category === 'Psychometric' : r.category !== 'Psychometric');
  const scoreLabel = (r: AssessmentResult) => psychometric ? `${r.total} responses` : r.score == null ? 'Not scored' : `${r.score}%`;

  const renderResult = (r: AssessmentResult) => (
    <div className="assessment-results">
      <div className="assessment-result-hero">
        <span className="assessment-result-icon">{psychometric ? <Brain size={29} /> : <CheckCircle2 size={29} />}</span>
        <div><span className="eyebrow">{isPreview ? 'SAMPLE ASSESSMENT RESULT' : 'ASSESSMENT COMPLETE'}</span><h2>{r.title}</h2><p>{psychometric ? 'A reflection of your responses, not a clinical assessment.' : 'Every attempt is an opportunity to learn something new.'}</p></div>
      </div>
      <div className="statistics-grid statistics-grid--three">
        <div className="result-stat"><span>{psychometric ? 'Self-assessment responses' : 'Score'}</span><strong>{psychometric ? r.total : r.score == null ? 'Not scored' : `${r.score}%`}</strong></div>
        <div className="result-stat"><span>{psychometric ? 'Skill areas explored' : 'Correct answers'}</span><strong>{psychometric ? r.categories.length : `${r.correct} / ${r.total}`}</strong></div>
        <div className="result-stat"><span>{psychometric ? 'Purpose' : 'Incorrect answers'}</span><strong>{psychometric ? 'Personal reflection' : r.total - r.correct}</strong></div>
      </div>
      <Card>
        <div className="card-heading"><h2>{psychometric ? 'Your Skill Profile' : 'Performance Analysis'}</h2><Badge tone="purple">Based on your responses</Badge></div>
        {psychometric ? <div className="assessment-category-grid">{r.categories.map((c) => <ProgressBar key={c.name} label={c.name} value={c.score} />)}</div> : <AssessmentScoreChart data={[{ name: 'Correct answers', score: r.score || 0 }, { name: 'Incorrect answers', score: r.score == null ? 0 : 100 - r.score }]} />}
        <p className="muted-note">{psychometric ? 'These frequencies summarize your selected approaches. They are not validated psychological measurements or a personality diagnosis.' : 'Use the answer review below to understand your mistakes and identify topics to revisit.'}</p>
      </Card>
      {r.review.length > 0 && <Card><SectionTitle title="Review Your Responses" description="Learn from the reasoning behind each answer" /><div className="assessment-review">{r.review.map((review, i) => <details key={i}><summary><span className={`review-status${review.correct ? ' review-status--correct' : ''}`}>{review.correct ? <Check size={14} /> : <X size={14} />}</span><span>{review.question}</span><ChevronRight size={14} className="review-chevron" /></summary><div><p><strong>Your response:</strong> {review.selected}</p>{!psychometric && <p><strong>Correct response:</strong> {review.correctAnswer}</p>}<p>{review.explanation}</p></div></details>)}</div></Card>}
      <div className="assessment-bottom-actions"><button type="button" className="button button--secondary" onClick={reset}><ArrowLeft size={15} />Back to assessments</button><button type="button" className="button button--primary" onClick={() => { setResult(null); void start(); }}><Play size={15} />Try again</button></div>
    </div>
  );

  return (
    <>
      <PageHeading title={psychometric ? 'Psychometric Assessment' : 'Technical Assessment'} description={psychometric ? 'Reflect on real-world scenarios and discover your professional skill strengths.' : 'Put your knowledge into practice with subject-based assessments.'} actions={attempt || result ? undefined : <Badge tone="purple"><ShieldCheck size={12} />Your own results, securely stored</Badge>} />
      {bank.loading || history.loading ? <LoadingState /> : bank.error || history.error ? <ErrorState message={bank.error || history.error} /> : attempt ? (
        <>
          <Card className="assessment-taking">
            <div className="assessment-taking-header"><div><Badge tone="blue">{attempt.assessmentId === 201 ? 'Self-assessment' : category}</Badge><h2>{psychometric ? 'Professional Skills & Self-Assessment' : bank.data?.find((a) => a.id === attempt.assessmentId)?.title || 'Technical Knowledge Check'}</h2><p>Question {question + 1} of {attempt.questions.length}</p></div><div className={`assessment-timer${remaining < 60 ? ' assessment-timer--warning' : ''}`}><Clock3 size={18} /><strong>{Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}</strong><span>remaining</span></div></div>
            <div className="progress-track assessment-progress"><span style={{ width: `${answers.filter((a) => a !== null).length / attempt.questions.length * 100}%` }} /></div>
            <div className="assessment-question"><span className="eyebrow">SCENARIO-BASED QUESTION</span><h3>{attempt.questions[question].text}</h3><div className="answer-options">{attempt.questions[question].options.map((option, i) => <label key={i} className={`answer-option${answers[question] === i ? ' answer-option--selected' : ''}`}><input type="radio" name={`question-${question}`} checked={answers[question] === i} onChange={() => setAnswers((previous) => previous.map((answer, index) => index === question ? i : answer))} /><span className="answer-letter">{String.fromCharCode(65 + i)}</span><span>{option}</span>{answers[question] === i && <Check size={18} />}</label>)}</div></div>
            <div className="assessment-navigation"><button type="button" className="button button--secondary" disabled={question === 0} onClick={() => setQuestion((q) => q - 1)}><ChevronLeft size={16} />Previous</button><div className="question-number-buttons">{attempt.questions.map((q, i) => <button type="button" key={q.id} className={`${question === i ? 'current' : ''}${answers[i] !== null ? ' answered' : ''}`} aria-label={`Go to question ${i + 1}${answers[i] !== null ? ', answered' : ''}`} aria-current={question === i ? 'step' : undefined} onClick={() => setQuestion(i)}>{i + 1}</button>)}</div>{question === attempt.questions.length - 1 ? <button type="button" className="button button--primary" onClick={() => setConfirm(true)}>Submit Assessment <Check size={15} /></button> : <button type="button" className="button button--primary" onClick={() => setQuestion((q) => q + 1)}>Next <ChevronRight size={16} /></button>}</div>
            <div className="assessment-submit-footer"><span>{answers.filter((a) => a !== null).length} of {attempt.questions.length} answered</span><button type="button" className="text-link" onClick={() => setConfirm(true)}>Finish & submit <ArrowRight size={14} /></button></div>
          </Card>
          <FormError message={error} />
        </>
      ) : result ? renderResult(result) : (
        <>
          {!isBackendConfigured && !isPreview && <ErrorState message="Connect the Flask backend to load published assessments and submit your answers securely." />}
          <div className="assessment-setup-grid">
            <Card className="assessment-setup-card"><span className="large-feature-icon">{psychometric ? <Brain size={28} /> : <Code2 size={28} />}</span><h2>{psychometric ? 'Understand how you approach challenges' : 'Build confidence in your technical knowledge'}</h2><p>{psychometric ? 'Explore communication, teamwork, decision-making, and more through realistic professional scenarios.' : 'Choose a subject and difficulty, then practice with questions published by your institution.'}</p><div className="assessment-instructions"><h3>Before you begin</h3><span><Check size={15} />{psychometric ? 'Choose the approach you would naturally take in each scenario.' : 'Read each question carefully and select one answer.'}</span><span><Check size={15} />You can move between questions before submitting.</span><span><Check size={15} />{psychometric ? 'This is a reflection tool, not a clinical or diagnostic test.' : 'Your answers are scored using the official question bank.'}</span><span><Check size={15} />The timer submits your attempt automatically when time runs out.</span></div>{psychometric ? <button type="button" className="button button--primary" disabled={starting} onClick={() => void start()}>{starting ? 'Preparing…' : 'Start Self-Assessment'}<ArrowRight size={16} /></button> : <div className="assessment-selects"><label className="form-field">Subject<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label className="form-field">Difficulty<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>{['Basic', 'Intermediate', 'Advanced'].map((d) => <option key={d}>{d}</option>)}</select></label><button type="button" className="button button--primary" disabled={starting} onClick={() => void start()}>{starting ? 'Preparing…' : 'Start Assessment'}<Play size={15} /></button></div>}{isPreview && <p className="field-hint">Sample questions for preview only. No result is saved to a student record.</p>}<FormError message={error} /></Card>
            <Card className="assessment-overview-card"><span className="eyebrow">YOUR ASSESSMENT SNAPSHOT</span><h2>Practice with a purpose.</h2><div><span className="overview-icon overview-icon--purple"><FileText size={21} /></span><div><strong>{psychometric ? '8 skill areas' : '11 subject areas'}</strong><p>{psychometric ? 'Communication, teamwork, leadership, and more' : 'From programming fundamentals to machine learning'}</p></div></div><div><span className="overview-icon overview-icon--green"><Clock3 size={21} /></span><div><strong>A focused session</strong><p>Clear instructions, a timer, and question navigation</p></div></div><div><span className="overview-icon overview-icon--peach"><Brain size={21} /></span><div><strong>Feedback that helps you grow</strong><p>Review your responses and identify your next steps</p></div></div></Card>
          </div>
          {bank.data?.length ? <Card className="published-assessments"><SectionTitle title="Available Assessments" description="Published by your institution" />{bank.data.map((a) => <div key={a.id}><span className="published-assessment-icon">{a.category === 'Psychometric' ? <Brain size={20} /> : <Code2 size={20} />}</span><div><h3>{a.title}</h3><p>{a.category} · {a.difficulty} · {a.questionCount} questions</p></div><Badge tone={a.dueAt ? 'peach' : 'neutral'}>{a.dueAt ? `Due ${new Date(a.dueAt).toLocaleDateString()}` : 'Practice'}</Badge><button type="button" className="button button--secondary button--small" disabled={starting} onClick={() => void start(a.id)}>Start <ArrowRight size={14} /></button></div>)}</Card> : isPreview && <p className="assessment-preview-note">Preview question banks are available above. Real assessments will appear when your institution publishes them.</p>}
          <Card><div className="card-heading"><div><h2>Previous Assessments</h2><p>Your own attempts and feedback</p></div><Badge>{filteredHistory.length} attempts</Badge></div><DataTable columns={['Assessment', 'Date', 'Score', 'Result']} empty={!filteredHistory.length}>{filteredHistory.map((r) => <tr key={r.id}><td><strong>{r.title}</strong></td><td>{new Date(r.date).toLocaleDateString()}</td><td>{scoreLabel(r)}</td><td><button type="button" className="text-link" onClick={() => { setResult(r); setAttempt(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>View result <ArrowRight size={13} /></button></td></tr>)}</DataTable></Card>
        </>
      )}
      {confirm && attempt && <Modal title="Ready to submit?" onClose={() => setConfirm(false)}><div className="modal-form"><p className="form-description">You have answered {answers.filter((a) => a !== null).length} of {attempt.questions.length} questions. {answers.some((a) => a === null) ? 'Unanswered questions will receive no points.' : 'Your answers will be submitted for scoring.'}</p><div className="modal-actions"><button type="button" className="button button--secondary" onClick={() => setConfirm(false)}>Keep working</button><button type="button" className="button button--primary" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Submitting…' : 'Submit Assessment'}<Check size={15} /></button></div></div></Modal>}
    </>
  );
}
