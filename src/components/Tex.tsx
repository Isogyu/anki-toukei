import { useMemo } from 'react';
import katex from 'katex';

/** テキスト中の $...$ を KaTeX でレンダリングする。 */
export function Tex({ text }: { text: string }) {
  const parts = useMemo(() => {
    const segs = text.split('$');
    return segs.map((seg, i) => {
      if (i % 2 === 0) return { math: false, seg };
      try {
        return {
          math: true,
          seg: katex.renderToString(seg, { throwOnError: true }),
        };
      } catch {
        return { math: false, seg: `$${seg}$` };
      }
    });
  }, [text]);

  return (
    <>
      {parts.map((p, i) =>
        p.math ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: p.seg }} />
        ) : (
          <span key={i}>{p.seg}</span>
        ),
      )}
    </>
  );
}
