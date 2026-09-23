import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'anki-toukei:reports';

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

/** 「🚩おかしい」報告した項目ID（例 "card:12", "q:q-test-01", "pat:pat-03"）を保存する。 */
export function useReports() {
  const [reports, setReports] = useState<string[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch {
      // 無視
    }
  }, [reports]);

  const toggle = useCallback((key: string) => {
    setReports((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const isReported = useCallback(
    (key: string) => reports.includes(key),
    [reports],
  );

  return { reports, toggle, isReported };
}
