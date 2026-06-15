import { useState, useEffect } from 'react';

const PROVINCES_API = 'https://provinces.open-api.vn/api/v2';

export interface ProvinceOption { code: number; name: string; }
export interface WardOption { code: string; name: string; }

export function useProvinceWard() {
    const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([]);
    const [wardOptions, setWardOptions] = useState<WardOption[]>([]);
    const [provincesLoading, setProvincesLoading] = useState(false);
    const [wardsLoading, setWardsLoading] = useState(false);
    const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null);

    useEffect(() => {
        setProvincesLoading(true);
        fetch(`${PROVINCES_API}/p/`)
            .then(r => r.json())
            .then((data: ProvinceOption[]) => setProvinceOptions(data))
            .catch(() => console.error('Không thể tải danh sách thành phố'))
            .finally(() => setProvincesLoading(false));
    }, []);

    const loadWards = async (provinceCode: number): Promise<WardOption[]> => {
        setWardsLoading(true);
        setWardOptions([]);
        try {
            const resp = await fetch(`${PROVINCES_API}/p/${provinceCode}?depth=2`);
            const data = await resp.json();
            const wards: WardOption[] = data.wards ?? [];
            setWardOptions(wards);
            return wards;
        } catch {
            return [];
        } finally {
            setWardsLoading(false);
        }
    };

    const onProvinceChange = async (provinceName: string | undefined, clearWard: () => void) => {
        clearWard();
        setWardOptions([]);
        if (!provinceName) { setSelectedProvinceCode(null); return; }
        const prov = provinceOptions.find(p => p.name === provinceName);
        if (prov) {
            setSelectedProvinceCode(prov.code);
            await loadWards(prov.code);
        } else {
            setSelectedProvinceCode(null);
        }
    };

    const preloadForEdit = async (provinceName: string) => {
        if (!provinceName || provinceOptions.length === 0) return;
        const prov = provinceOptions.find(p => p.name === provinceName);
        if (prov) {
            setSelectedProvinceCode(prov.code);
            await loadWards(prov.code);
        }
    };

    return {
        provinceOptions,
        wardOptions,
        provincesLoading,
        wardsLoading,
        selectedProvinceCode,
        onProvinceChange,
        preloadForEdit,
    };
}
