import type { Metadata } from 'next';
import { ResourceFooter } from '@/components/tool-page';
import SavedResults from '@/components/saved-results';
import './saved-results.css';
export const metadata: Metadata = { title: 'Saved Results — BPM Finder', description: 'Revisit your saved track analysis.', robots: { index: false, follow: false } };
export default function SavedResultsPage() {
  return <><main className="saved-main page-width"><div className="saved-intro"><span className="eyebrow">BPM FINDER / YOUR COLLECTION</span><h1>Back to<br /><em>your discoveries.</em></h1><p>The tracks you checked. The numbers you kept.</p></div><SavedResults /></main><ResourceFooter /></>;
}
