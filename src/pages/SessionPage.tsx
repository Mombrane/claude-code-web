import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { useSessionStore } from '../stores/sessionStore';
import { decodePath } from '../utils/format';

export function SessionPage() {
  const { dir, id } = useParams<{ dir: string; id?: string }>();
  const navigate = useNavigate();
  const { setCurrentSession } = useSessionStore();

  useEffect(() => {
    if (id) {
      setCurrentSession(id);
    }
  }, [id, setCurrentSession]);

  // Decode project path from URL-safe encoding
  const projectPath = dir ? decodePath(dir) : undefined;

  return <AppLayout projectPath={projectPath} />;
}
