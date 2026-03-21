import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page Not Found');

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center animate-fade-in">
      <div className="relative mb-6">
        <p className="text-[120px] sm:text-[160px] font-extrabold text-text-tertiary/10 leading-none select-none">404</p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 bg-bg-tertiary rounded-2xl flex items-center justify-center">
            <Home className="w-7 h-7 text-text-tertiary" />
          </div>
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-text-secondary text-sm max-w-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Go Back
        </button>
        <Link to="/" className="btn-primary">
          <Home className="w-4 h-4" aria-hidden="true" /> Home
        </Link>
      </div>
    </div>
  );
}
