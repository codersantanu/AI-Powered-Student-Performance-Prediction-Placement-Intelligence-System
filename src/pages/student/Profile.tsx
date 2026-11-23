import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Award, BriefcaseBusiness, ChevronRight, Code2, ExternalLink, FileBadge, FolderGit2, GraduationCap, ImagePlus, LockKeyhole, Mail, Pencil, Plus, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useResource } from '../../hooks/useWorkspace';
import { studentService } from '../../services/studentService';
import { previewStore } from '../../data/preview';
import type { Profile as ProfileType, SkillEntry } from '../../types';
import { Badge, Card, EmptyState, ErrorState, FormError, LoadingState, Modal, PageHeading, SaveButton, useNotice } from '../../components/dashboard/Page';

const skillCategories = [
  { title: 'Programming Languages', values: ['C', 'C++', 'Java', 'Python', 'JavaScript'] },
  { title: 'Frameworks & Libraries', values: ['React.js', 'Flask', 'Node.js', 'Tailwind CSS', 'Scikit-learn'] },
  { title: 'Databases', values: ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite'] },
  { title: 'Technical Areas', values: ['Data Structures and Algorithms', 'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Web Development', 'Database Management'] },
];
const portfolioCategories = [
  { key: 'internship', label: 'Internships & Experience', icon: BriefcaseBusiness },
  { key: 'project', label: 'Projects', icon: FolderGit2 },
  { key: 'certification', label: 'Certifications', icon: FileBadge },
] as const;
type PortfolioCategory = typeof portfolioCategories[number]['key'];
type SkillCategory = 'programming' | 'technical';

const listValue = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const emptyEntry: Omit<SkillEntry, 'id'> = {
  category: 'programming', title: '', organization: '', description: '', level: 'Intermediate',
  startDate: '', endDate: '', url: '', secondaryUrl: '', projectCategory: '', technologies: [],
};
const today = new Date().toISOString().slice(0, 10);

function EditProfileForm({ profile, onClose, onSaved }: { profile: ProfileType; onClose: () => void; onSaved: () => void }) {
  const { isPreview } = useAuth();
  const [form, setForm] = useState({
    name: profile.name,
    dateOfBirth: profile.dateOfBirth || '',
    phone: profile.phone || '',
    address: profile.address || '',
    skills: profile.skills.join(', '),
    careerInterests: profile.careerInterests.join(', '),
    preferredRoles: profile.preferredRoles.join(', '),
    shortTermGoal: profile.shortTermGoal || '',
    longTermGoal: profile.longTermGoal || '',
    preferredTechnologies: profile.preferredTechnologies.join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const change = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.phone && !/^\+?[0-9][0-9\s().-]{5,29}$/.test(form.phone.trim())) {
      setError('Enter a valid phone number, including its country code if needed.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        phone: form.phone.trim(),
        address: form.address.trim(),
        skills: listValue(form.skills),
        careerInterests: listValue(form.careerInterests),
        preferredRoles: listValue(form.preferredRoles),
        shortTermGoal: form.shortTermGoal.trim(),
        longTermGoal: form.longTermGoal.trim(),
        preferredTechnologies: listValue(form.preferredTechnologies),
      };
      if (isPreview) previewStore.saveProfile(data);
      else await studentService.updateProfile(data);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return <Modal title="Edit your profile" onClose={onClose} wide>
    <form className="modal-form" onSubmit={submit}>
      <p className="form-description">Update personal details and career preferences. Official academic records and your registered email are managed by your institution.</p>
      <div className="form-grid">
        <label className="form-field">Full name<input required minLength={2} maxLength={120} value={form.name} onChange={(event) => change('name', event.target.value)} /></label>
        <label className="form-field">Date of birth<input type="date" max={today} value={form.dateOfBirth} onChange={(event) => change('dateOfBirth', event.target.value)} /></label>
      </div>
      <div className="form-grid">
        <label className="form-field">Registered email<input type="email" value={profile.email} readOnly /><span className="field-hint">Email changes require account verification through your institution.</span></label>
        <label className="form-field">Phone number<input type="tel" maxLength={30} value={form.phone} onChange={(event) => change('phone', event.target.value)} placeholder="+1 555 123 4567" /></label>
      </div>
      <label className="form-field">Current address<textarea rows={2} maxLength={500} value={form.address} onChange={(event) => change('address', event.target.value)} /></label>
      {([
        ['skills', 'Skills & technical expertise'],
        ['careerInterests', 'Technical areas of interest'],
        ['preferredRoles', 'Preferred job roles'],
        ['preferredTechnologies', 'Preferred technologies or domains'],
      ] as const).map(([key, title]) => <label className="form-field" key={key}>{title}<input maxLength={1000} value={form[key]} onChange={(event) => change(key, event.target.value)} placeholder="Separate multiple items with commas" /><span className="field-hint">Separate entries with commas.</span></label>)}
      <label className="form-field">Short-term career goal<textarea rows={2} maxLength={1000} value={form.shortTermGoal} onChange={(event) => change('shortTermGoal', event.target.value)} /></label>
      <label className="form-field">Long-term career goal<textarea rows={2} maxLength={1000} value={form.longTermGoal} onChange={(event) => change('longTermGoal', event.target.value)} /></label>
      <FormError message={error} />
      <div className="modal-actions"><button type="button" className="button button--secondary" onClick={onClose}>Cancel</button><SaveButton loading={saving}>Save changes</SaveButton></div>
    </form>
  </Modal>;
}

function SkillForm({ entry, onClose, onSaved }: { entry?: SkillEntry; onClose: () => void; onSaved: () => void }) {
  const { isPreview } = useAuth();
  const [form, setForm] = useState<Omit<SkillEntry, 'id'>>(entry || emptyEntry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isPreview) {
        if (entry) previewStore.updateSkill(entry.id, form);
        else previewStore.addSkill(form);
      } else if (entry) await studentService.updateSkill(entry.id, form);
      else await studentService.addSkill(form);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this skill.');
    } finally {
      setSaving(false);
    }
  };
  return <Modal title={entry ? 'Edit skill' : 'Add a skill'} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as SkillCategory })}><option value="programming">Programming language</option><option value="technical">Framework, database or technical area</option></select></label>
        <label className="form-field">Skill<input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
      </div>
      <label className="form-field">Proficiency<select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>{['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level) => <option key={level}>{level}</option>)}</select></label>
      <label className="form-field">Description<textarea rows={3} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      <FormError message={error} />
      <div className="modal-actions"><button type="button" className="button button--secondary" onClick={onClose}>Cancel</button><SaveButton loading={saving}>{entry ? 'Save changes' : 'Add skill'}</SaveButton></div>
    </form>
  </Modal>;
}

function PortfolioForm({ category, entry, onClose, onSaved }: { category: PortfolioCategory; entry?: SkillEntry; onClose: () => void; onSaved: () => void }) {
  const { isPreview } = useAuth();
  const [form, setForm] = useState<Omit<SkillEntry, 'id'>>(entry || { ...emptyEntry, category });
  const [technologies, setTechnologies] = useState((entry?.technologies || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const labels = {
    internship: { title: 'Internship role', organization: 'Company name', primaryUrl: 'Certificate or supporting document URL' },
    project: { title: 'Project name', organization: 'Project context', primaryUrl: 'GitHub repository URL' },
    certification: { title: 'Certificate name', organization: 'Issuing organization', primaryUrl: 'Certificate URL' },
  }[category];
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (form.url && !/^https?:\/\/\S+$/i.test(form.url)) throw new Error('Use a complete http:// or https:// link.');
      if (form.secondaryUrl && !/^https?:\/\/\S+$/i.test(form.secondaryUrl)) throw new Error('Use a complete http:// or https:// link.');
      if (form.startDate && form.endDate && form.endDate < form.startDate) throw new Error('The end date cannot be before the start date.');
      const data = { ...form, technologies: listValue(technologies) };
      if (isPreview) {
        if (entry) previewStore.updateSkill(entry.id, data);
        else previewStore.addSkill(data);
      } else if (entry) await studentService.updateSkill(entry.id, data);
      else await studentService.addSkill(data);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this entry.');
    } finally {
      setSaving(false);
    }
  };
  return <Modal title={entry ? `Edit ${category === 'internship' ? 'experience' : category}` : `Add ${category === 'internship' ? 'experience' : category}`} onClose={onClose} wide>
    <form className="modal-form" onSubmit={submit}>
      <div className="form-grid">
        <label className="form-field">{labels.title}<input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label className="form-field">{labels.organization}<input maxLength={160} value={form.organization} onChange={(event) => setForm({ ...form, organization: event.target.value })} /></label>
      </div>
      {category === 'project' && <label className="form-field">Project category<input maxLength={80} value={form.projectCategory} onChange={(event) => setForm({ ...form, projectCategory: event.target.value })} placeholder="Academic, personal, open source…" /></label>}
      <label className="form-field">{category === 'certification' ? 'Certificate details' : 'Description'}<textarea rows={3} required={category !== 'certification'} maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
      {category !== 'certification' && <label className="form-field">Technologies used<input maxLength={1000} value={technologies} onChange={(event) => setTechnologies(event.target.value)} placeholder="Separate technologies with commas" /></label>}
      <div className="form-grid">
        <label className="form-field">{category === 'certification' ? 'Issue date' : 'Start date'}<input type="date" required={category === 'certification'} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
        {category !== 'certification' && <label className="form-field">End date (leave blank if ongoing)<input type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>}
      </div>
      <div className="form-grid">
        <label className="form-field">{labels.primaryUrl}<input type="url" maxLength={1000} value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://…" /></label>
        {category === 'project' && <label className="form-field">Live project URL<input type="url" maxLength={1000} value={form.secondaryUrl} onChange={(event) => setForm({ ...form, secondaryUrl: event.target.value })} placeholder="https://…" /></label>}
      </div>
      <FormError message={error} />
      <div className="modal-actions"><button type="button" className="button button--secondary" onClick={onClose}>Cancel</button><SaveButton loading={saving}>{entry ? 'Save changes' : `Add ${category === 'internship' ? 'experience' : category}`}</SaveButton></div>
    </form>
  </Modal>;
}

function calculatePreviewCompletion(profile: ProfileType) {
  return Math.round((15 - getPreviewMissing(profile).length) / 15 * 100);
}

function getPreviewMissing(profile: ProfileType) {
  const fields: [string, unknown][] = [
    ['Full name', profile.name], ['Date of birth', profile.dateOfBirth], ['Phone number', profile.phone], ['Address', profile.address],
    ['College or university', profile.college], ['Department', profile.department], ['Degree or course', profile.degree],
    ['Specialization', profile.specialization], ['Admission year', profile.admissionYear], ['Current academic year', profile.academicYear],
    ['Current semester', profile.currentSemester], ['Expected graduation year', profile.expectedGraduationYear],
    ['Skills', profile.skills], ['Career interests', profile.careerInterests], ['Preferred roles', profile.preferredRoles],
  ];
  return fields.filter(([, value]) => !value).map(([label]) => label);
}

function InfoCard({ title, icon: Icon, children, badge }: { title: string; icon: typeof UserRound; children: ReactNode; badge?: string }) {
  return <Card className="profile-info-card"><div className="card-heading"><h2><Icon size={18} />{title}</h2>{badge && <Badge tone={title === 'Academic Information' ? 'blue' : 'neutral'}>{badge}</Badge>}</div>{children}</Card>;
}

export default function Profile() {
  const { isPreview } = useAuth();
  const profileResource = useResource<ProfileType>('/student/profile', previewStore.dashboard().profile);
  const portfolioResource = useResource<SkillEntry[]>('/student/skills', previewStore.skills());
  const { setNotice, node: noticeNode } = useNotice();
  const [editing, setEditing] = useState(false);
  const [skillEditing, setSkillEditing] = useState<SkillEntry | 'new' | null>(null);
  const [portfolioEditing, setPortfolioEditing] = useState<{ category: PortfolioCategory; entry?: SkillEntry } | null>(null);
  const [deleting, setDeleting] = useState<SkillEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const profile = profileResource.data;
  const entries = portfolioResource.data || [];
  const completion = profile ? (isPreview ? calculatePreviewCompletion(profile) : profile.completion) : 0;
  const completionMissing = profile ? (isPreview ? getPreviewMissing(profile) : profile.missingInformation) : [];

  useEffect(() => {
    if (!profile?.photoAvailable || isPreview) {
      setPhotoUrl('');
      return;
    }
    let active = true;
    let objectUrl = '';
    studentService.profilePhoto().then((url) => {
      objectUrl = url;
      if (active) setPhotoUrl(url);
      else URL.revokeObjectURL(url);
    }).catch(() => {
      if (active) setPhotoError('Your profile photo could not be loaded.');
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profile?.photoAvailable, isPreview]);

  const initials = useMemo(() => profile?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ST', [profile?.name]);
  const uploadPhoto = async (file?: File) => {
    if (!file || !profile) return;
    setPhotoError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setPhotoError('Choose a JPEG, PNG, or WebP image up to 5 MB.');
      return;
    }
    try {
      if (isPreview) {
        setPhotoUrl(URL.createObjectURL(file));
        setNotice('Preview only: this photo is not saved to an account.');
      } else {
        await studentService.uploadProfilePhoto(file);
        const url = URL.createObjectURL(file);
        setPhotoUrl(url);
        profileResource.reload();
        setNotice('Profile photo updated.');
      }
    } catch (uploadError) {
      setPhotoError(uploadError instanceof Error ? uploadError.message : 'Unable to upload your photo.');
    }
  };
  const deleteEntry = async () => {
    if (!deleting) return;
    setError('');
    setBusy(true);
    try {
      if (isPreview) previewStore.deleteSkill(deleting.id);
      else await studentService.deleteSkill(deleting.id);
      setDeleting(null);
      portfolioResource.reload();
      profileResource.reload();
      setNotice('Profile entry removed.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this entry.');
    } finally {
      setBusy(false);
    }
  };
  const refreshAfterSave = () => {
    setEditing(false);
    setSkillEditing(null);
    setPortfolioEditing(null);
    profileResource.reload();
    portfolioResource.reload();
    setNotice('Profile changes saved.');
  };

  return <>
    <nav className="profile-breadcrumb" aria-label="Breadcrumb"><Link to="/student/dashboard">Dashboard</Link><ChevronRight size={14} /><span aria-current="page">My Profile</span></nav>
    <PageHeading title="My Profile" description="Manage your personal details, academic background and professional information." actions={<button type="button" className="button button--primary" disabled={!profile} onClick={() => setEditing(true)}><Pencil size={15} />Edit Profile</button>} />
    {profileResource.loading || portfolioResource.loading ? <LoadingState label="Loading your profile…" /> : profileResource.error || portfolioResource.error ? <ErrorState message={profileResource.error || portfolioResource.error} action={<button type="button" className="button button--secondary" onClick={() => { profileResource.reload(); portfolioResource.reload(); }}>Try again</button>} /> : profile ? <>
      <Card className="profile-hero profile-hero--complete">
        <div className="profile-identity">
          <div className="profile-photo-wrap">
            {photoUrl ? <img className="profile-avatar profile-avatar--photo" src={photoUrl} alt={`${profile.name} profile`} /> : <span className="profile-avatar">{initials}</span>}
            <button type="button" className="profile-photo-edit" aria-label="Change profile photo" onClick={() => photoInput.current?.click()}><ImagePlus size={15} /></button>
            <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadPhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} />
          </div>
          <div className="profile-identity-copy"><span className="eyebrow">STUDENT PROFILE</span><h2>{profile.name || 'Complete your profile to get started.'}</h2><p>{profile.department || 'Department not provided'}{profile.college ? ` · ${profile.college}` : ''}</p>
            <div className="profile-badges"><Badge tone="blue">{profile.studentId || 'Student ID not provided'}</Badge><Badge tone={profile.accountStatus === 'Active' ? 'green' : 'neutral'}>{profile.accountStatus}</Badge></div>
          </div>
        </div>
        <div className="profile-completion profile-completion--dynamic">
          <div><strong>Profile completion</strong><span>{completion}%</span></div>
          <div className="progress-track" role="progressbar" aria-label="Profile completion" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${completion}%` }} /></div>
          <p>{completionMissing.length ? `Missing: ${completionMissing.slice(0, 3).join(', ')}${completionMissing.length > 3 ? ` and ${completionMissing.length - 3} more` : ''}.` : 'Your profile information is complete.'}</p>
          {completionMissing.length > 0 && <button type="button" className="text-link" onClick={() => setEditing(true)}>Complete profile <ChevronRight size={13} /></button>}
        </div>
      </Card>
      {photoError && <p className="profile-inline-error" role="alert">{photoError}</p>}
      {!profile.name && <Card className="profile-empty-cta"><EmptyState title="Complete your profile to get started." description="Add your personal details, career interests and skills to complete your student profile." icon={UserRound} action={<button type="button" className="button button--primary" onClick={() => setEditing(true)}>Complete Profile</button>} /></Card>}

      <div className="profile-grid">
        <InfoCard title="Personal Information" icon={UserRound} badge="Student-managed">
          <dl className="profile-data-grid">
            {[['Full Name', profile.name], ['Date of Birth', profile.dateOfBirth], ['Email Address', profile.email], ['Phone Number', profile.phone], ['Current Address', profile.address]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}
          </dl>
          <p className="profile-privacy-note"><LockKeyhole size={14} />Your profile is visible only to you and authorized institution staff.</p>
        </InfoCard>
        <InfoCard title="Academic Information" icon={GraduationCap} badge="Institution-managed">
          <dl className="profile-data-grid">
            {[['Student ID / Roll Number', profile.studentId], ['College / University', profile.college], ['Department', profile.department], ['Degree / Course', profile.degree], ['Specialization', profile.specialization], ['Admission Year', profile.admissionYear], ['Current Academic Year', profile.academicYear], ['Current Semester', profile.currentSemester ? `Semester ${profile.currentSemester}` : ''], ['Expected Graduation Year', profile.expectedGraduationYear]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Not provided'}</dd></div>)}
          </dl>
          <p className="data-footnote"><ShieldCheck size={14} />Verified academic information is read-only for students.</p>
        </InfoCard>
      </div>

      <Card className="profile-section-card">
        <div className="card-heading"><h2><Code2 size={18} />Skills & Technical Expertise</h2><button type="button" className="button button--secondary button--small" onClick={() => setSkillEditing('new')}><Plus size={14} />Add skill</button></div>
        <div className="profile-skill-categories">
          {skillCategories.map(({ title, values }) => {
            const matches = (profile.skills || []).filter((skill) => values.some((value) => value.toLowerCase() === skill.toLowerCase()));
            return <div key={title}><h3>{title}</h3><div className="profile-skill-tags">{matches.length ? matches.map((skill) => <span className="profile-skill-tag" key={skill}>{skill}</span>) : <span className="profile-muted">No entries yet</span>}</div></div>;
          })}
          {(() => {
            const recognized = skillCategories.flatMap((category) => category.values).map((value) => value.toLowerCase());
            const other = (profile.skills || []).filter((skill) => !recognized.includes(skill.toLowerCase()));
            return other.length ? <div><h3>Other student-reported skills</h3><div className="profile-skill-tags">{other.map((skill) => <span className="profile-skill-tag" key={skill}>{skill}</span>)}</div></div> : null;
          })()}
        </div>
        <div className="profile-record-skills">
          <h3>Skills with proficiency details</h3>
          {entries.filter((entry) => entry.category === 'programming' || entry.category === 'technical').length ? <div className="profile-entry-list">{entries.filter((entry) => entry.category === 'programming' || entry.category === 'technical').map((entry) => <div className="profile-entry-line" key={entry.id}><span><strong>{entry.title}</strong><small>{entry.category === 'programming' ? 'Programming language' : 'Technical expertise'} · {entry.level}</small></span><div><button type="button" className="icon-button" aria-label={`Edit ${entry.title}`} onClick={() => setSkillEditing(entry)}><Pencil size={14} /></button><button type="button" className="icon-button danger-icon" aria-label={`Delete ${entry.title}`} onClick={() => setDeleting(entry)}><Trash2 size={14} /></button></div></div>)}</div> : <p className="profile-muted">Add a skill with proficiency details to build this list.</p>}
        </div>
      </Card>

      {portfolioCategories.map(({ key, label, icon: Icon }) => {
        const items = entries.filter((entry) => entry.category === key);
        const emptyMessage = key === 'internship' ? 'No internship experience added yet.' : key === 'project' ? 'No projects added yet.' : 'No certifications added yet.';
        return <Card className="profile-section-card" key={key}>
          <div className="card-heading"><h2><Icon size={18} />{label}</h2><button type="button" className="button button--secondary button--small" onClick={() => setPortfolioEditing({ category: key })}><Plus size={14} />{key === 'internship' ? 'Add Experience' : `Add ${key === 'project' ? 'Project' : 'Certificate'}`}</button></div>
          {!items.length ? <div className="profile-portfolio-empty"><p>{emptyMessage}</p></div> : <div className="profile-portfolio-grid">{items.map((entry) => <article className="profile-portfolio-item" key={entry.id}>
            <div className="profile-portfolio-heading"><div><span className="eyebrow">{key === 'internship' ? 'EXPERIENCE' : key.toUpperCase()}</span><h3>{entry.title}</h3></div><div><button type="button" className="icon-button" aria-label={`Edit ${entry.title}`} onClick={() => setPortfolioEditing({ category: key, entry })}><Pencil size={14} /></button><button type="button" className="icon-button danger-icon" aria-label={`Delete ${entry.title}`} onClick={() => setDeleting(entry)}><Trash2 size={14} /></button></div></div>
            {entry.organization && <p className="profile-portfolio-org">{entry.organization}{entry.projectCategory ? ` · ${entry.projectCategory}` : ''}</p>}
            {entry.description && <p className="profile-portfolio-description">{entry.description}</p>}
            {(entry.startDate || entry.endDate) && <p className="profile-portfolio-date">{entry.startDate || 'Date not provided'}{entry.endDate ? ` – ${entry.endDate}` : key === 'internship' ? ' · Ongoing' : ''}</p>}
            {entry.technologies.length > 0 && <div className="profile-portfolio-tags">{entry.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div>}
            <div className="profile-portfolio-links">{entry.url && <a href={entry.url} target="_blank" rel="noopener noreferrer">{key === 'project' ? 'GitHub repository' : key === 'certification' ? 'View certificate' : 'Supporting document'}<ExternalLink size={13} /></a>}{entry.secondaryUrl && <a href={entry.secondaryUrl} target="_blank" rel="noopener noreferrer">Live project<ExternalLink size={13} /></a>}</div>
          </article>)}</div>}
        </Card>;
      })}

      <Card className="profile-section-card">
        <div className="card-heading"><h2><Award size={18} />Career Interests & Goals</h2><button type="button" className="text-link" onClick={() => setEditing(true)}><Pencil size={13} />Edit interests</button></div>
        <div className="profile-career-grid">
          <div><h3>Preferred job roles</h3><div className="profile-skill-tags">{profile.preferredRoles.length ? profile.preferredRoles.map((item) => <span className="profile-skill-tag" key={item}>{item}</span>) : <span className="profile-muted">No preferred roles added yet</span>}</div></div>
          <div><h3>Technical areas of interest</h3><div className="profile-skill-tags">{profile.careerInterests.length ? profile.careerInterests.map((item) => <span className="profile-skill-tag profile-skill-tag--blue" key={item}>{item}</span>) : <span className="profile-muted">No interests added yet</span>}</div></div>
          <div><h3>Preferred technologies or domains</h3><div className="profile-skill-tags">{profile.preferredTechnologies.length ? profile.preferredTechnologies.map((item) => <span className="profile-skill-tag profile-skill-tag--green" key={item}>{item}</span>) : <span className="profile-muted">No technologies or domains added yet</span>}</div></div>
          <div><h3>Short-term goal</h3><p>{profile.shortTermGoal || 'No short-term goal added yet'}</p></div>
          <div><h3>Long-term goal</h3><p>{profile.longTermGoal || 'No long-term goal added yet'}</p></div>
        </div>
        <p className="data-footnote"><Mail size={14} />Your interests are self-reported and are not used to automatically classify career readiness.</p>
      </Card>
      <div className="profile-contact-note"><LockKeyhole size={15} /><span>Registered email: <strong>{profile.email}</strong>. To update it, use your institution's verified account process.</span></div>
    </> : <Card><EmptyState title="Complete your profile to get started." description="Sign in with a registered account to view and manage your profile." icon={UserRound} /></Card>}

    {editing && profile && <EditProfileForm profile={profile} onClose={() => setEditing(false)} onSaved={refreshAfterSave} />}
    {skillEditing && <SkillForm entry={skillEditing === 'new' ? undefined : skillEditing} onClose={() => setSkillEditing(null)} onSaved={refreshAfterSave} />}
    {portfolioEditing && <PortfolioForm category={portfolioEditing.category} entry={portfolioEditing.entry} onClose={() => setPortfolioEditing(null)} onSaved={refreshAfterSave} />}
    {deleting && <Modal title="Remove this profile entry?" onClose={() => setDeleting(null)}><div className="modal-form"><p className="form-description">“{deleting.title}” will be deleted from your profile. This cannot be undone.</p><FormError message={error} /><div className="modal-actions"><button type="button" className="button button--secondary" onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="button button--danger" disabled={busy} onClick={() => void deleteEntry()}>{busy ? 'Deleting…' : 'Delete entry'}</button></div></div></Modal>}
    {noticeNode}
  </>;
}
