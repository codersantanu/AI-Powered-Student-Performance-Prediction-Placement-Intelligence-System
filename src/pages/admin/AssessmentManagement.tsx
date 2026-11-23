import { useState } from 'react';
import { Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useResource } from '../../hooks/useWorkspace';
import { assessmentService } from '../../services/assessmentService';
import { errorMessage } from '../../services/api';
import type { ImportedAssessment } from '../../types';
import { Badge, Card, DataTable, ErrorState, FormError, LoadingState, PageHeading } from '../../components/dashboard/Page';

export default function AssessmentManagement() {
  const { isPreview } = useAuth();
  const imported = useResource<ImportedAssessment[]>('/admin/special-assessments', isPreview ? [] : null);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');

  const toggle = async (item: ImportedAssessment) => {
    const key = `${item.kind}:${item.id}`;
    setBusyKey(key);
    setError('');
    try {
      if (isPreview) {
        throw new Error('Publishing imported assessments requires the live Flask API.');
      }
      await assessmentService.setImportedPublished(item.kind, item.id, !item.published);
      imported.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyKey('');
    }
  };

  return (
    <>
      <PageHeading
        title="Imported Assessment Suites"
        description="Publish or hide the MySQL-backed assessments students can take."
      />
      <Card>
        <div className="card-heading">
          <div>
            <h2>Assessment visibility</h2>
            <p>Question content, answer keys, and dimension mappings remain in the imported MySQL banks.</p>
          </div>
          <Badge tone="purple"><Database size={13} />MySQL question banks</Badge>
        </div>
        {imported.loading ? <LoadingState /> : imported.error ? <ErrorState message={imported.error} /> : imported.data?.length ? (
          <DataTable columns={['Assessment', 'Type', 'Visibility', 'Student access']} empty={false}>
            {imported.data.map((item) => (
              <tr key={`${item.kind}:${item.id}`}>
                <td><strong>{item.title}</strong></td>
                <td>{item.kind}</td>
                <td><Badge tone={item.published ? 'green' : 'neutral'}>{item.published ? 'Published' : 'Draft'}</Badge></td>
                <td>
                  <button
                    type="button"
                    className={`button button--small ${item.published ? 'button--secondary' : 'button--primary'}`}
                    disabled={busyKey !== ''}
                    onClick={() => void toggle(item)}
                  >
                    {busyKey === `${item.kind}:${item.id}` ? 'Saving…' : item.published ? 'Unpublish' : 'Publish'}
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <p className="muted-note">No imported assessments found. Connect the Flask API and import the three assessment SQL files.</p>
        )}
        <FormError message={error} />
      </Card>
    </>
  );
}
