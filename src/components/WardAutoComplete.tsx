'use client';
import { useState, useEffect, useMemo } from 'react';
import { AutoComplete } from 'antd';

interface WardOption { name: string; }

interface Props {
    value?: string;
    onChange?: (val: string) => void;
    wardOptions: WardOption[];
    loading?: boolean;
    disabled?: boolean;
    placeholder?: string;
    style?: React.CSSProperties;
}

export default function WardAutoComplete({ value, onChange, wardOptions, loading, disabled, placeholder, style }: Props) {
    const [localValue, setLocalValue] = useState(value ?? '');
    const [search, setSearch] = useState('');

    // Sync when parent resets value (e.g. province changed → ward cleared)
    useEffect(() => {
        setLocalValue(value ?? '');
        setSearch('');
    }, [value]);

    const filteredOptions = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return wardOptions.slice(0, 50);
        return wardOptions.filter(w => w.name.toLowerCase().includes(q)).slice(0, 50);
    }, [search, wardOptions]);

    return (
        <AutoComplete
            value={localValue}
            onChange={(val) => setLocalValue(val ?? '')}
            onSearch={setSearch}
            onSelect={(val: string) => { setLocalValue(val); onChange?.(val); }}
            onBlur={() => onChange?.(localValue)}
            onClear={() => { setLocalValue(''); setSearch(''); onChange?.(''); }}
            filterOption={false}
            options={filteredOptions.map(w => ({ value: w.name, label: w.name }))}
            placeholder={placeholder}
            style={style}
            allowClear
            disabled={disabled}
        />
    );
}
