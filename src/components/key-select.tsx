'use client';

import { camelotFor } from '../../public/analysis-policy.mjs';
import { KEY_OPTIONS } from '@/lib/result-data';
import CustomSelect from './custom-select';

const options = KEY_OPTIONS.map(key => ({ value: key, label: key }));
const heading = <><span>Musical key</span><span>Camelot</span></>;

export default function KeySelect({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return <CustomSelect value={value} onChange={onChange} options={options} label="Musical key" ariaLabel="Track key"
    className="key-select" heading={heading} minMenuWidth={246}
    renderValue={option => <span className="key-select-value" data-mode={option.value.endsWith('major') ? 'major' : option.value.endsWith('minor') ? 'minor' : undefined}>{option.label}</span>}
    renderOption={option => {
      const [note, mode] = option.label.split(' ');
      return <><span className="key-select-name" data-mode={mode}><strong>{note}</strong>{mode && <span>{mode}</span>}</span>
        <span className="key-select-code mono" aria-hidden="true">{camelotFor(option.value)}</span></>;
    }} />;
}
