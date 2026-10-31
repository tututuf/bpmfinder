import Analyzer from '@/components/analyzer';
import { analysisConfiguration } from '@/lib/analysis-config';
import { pageMetadata, applicationSchema } from '@/lib/site';
import StructuredData from '@/components/structured-data';
export const metadata = pageMetadata('/', 'BPM Finder — Find Song BPM & Key Online, Free', 'Find song BPM, musical key and Camelot from audio files. Use the free BPM analyzer, tap tempo, and export CSV. Pro adds saved results and track insights.');
export const dynamic = 'force-dynamic';
export default function Home() { return <><StructuredData value={applicationSchema('/', 'BPM Finder', 'Analyze the BPM and musical key of audio files in your browser.', ['Audio file BPM detection', 'Musical key and Camelot analysis', 'Tap tempo', 'Free CSV export'])} /><Analyzer configuration={analysisConfiguration()} /></>; }
