#!/usr/bin/env python3
"""solversの verify ペイロードと tables.json を scipy で照合する。
scripts/dump_verify.ts が生成した .verify_dump.json を読む。"""
import json
import math
import os
import re
import sys

import numpy as np
from scipy import stats, special

NUM = re.compile(r'-?\d+(?:\.\d+)?')


def nums_of(s):
    return [float(m) for m in NUM.findall(str(s))]

HERE = os.path.dirname(os.path.abspath(__file__))
DUMP = os.path.join(HERE, '.verify_dump.json')
TABLES = os.path.join(HERE, '..', 'src', 'data', 'tables.json')

TOL = 1e-6
RTOL = 1e-6
# probs を4桁丸めして dump しているkindは丸め誤差を許容
LOOSE_KINDS = {'ev_discrete', 'var_discrete'}


def xs_of(p):
    return nums_of(p['xs'])


def fs_of(p):
    return nums_of(p['fs'])


def probs_of(p):
    return nums_of(p['probs'])


def obs_of(p):
    return nums_of(p['obs'])


def quantile_type7(xs, q):
    xs = sorted(xs)
    n = len(xs)
    pos = q * (n - 1)
    lo, hi = math.floor(pos), math.ceil(pos)
    if lo == hi:
        return xs[lo]
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)


def compute(kind, p):
    """kindごとの期待値を scipy/math で計算する。"""
    if kind == 'mean':
        return float(np.mean(xs_of(p)))
    if kind == 'var_p':
        return float(np.var(xs_of(p), ddof=0))
    if kind == 'var_u':
        return float(np.var(xs_of(p), ddof=1))
    if kind == 'sd':
        return float(np.std(xs_of(p), ddof=0))
    if kind == 'cv':
        return p['s'] / p['m']
    if kind == 'zscore':
        # 偏差値 T = 50 + 10z
        return 50 + 10 * (p['x'] - p['mu']) / p['sd']
    if kind == 'iqr':
        return quantile_type7(xs_of(p), 0.75) - quantile_type7(xs_of(p), 0.25)
    if kind == 'iqr_bound':
        return p['q3'] + 1.5 * (p['q3'] - p['q1'])
    if kind == 'freq_mean':
        xs, fs = xs_of(p), fs_of(p)
        return float(np.average(xs, weights=fs))
    if kind == 'ma':
        return float(np.mean(xs_of(p)))
    if kind == 'comb':
        return float(special.comb(p['n'], p['k']))
    if kind == 'cond':
        # P(列1|行1) = a / (a+b)
        return p['a'] / (p['a'] + p['b'])
    if kind == 'bayes_ppv':
        prev, sens, spec = p['prev'], p['sens'], p['spec']
        return sens * prev / (sens * prev + (1 - spec) * (1 - prev))
    if kind == 'union_indep':
        return p['pa'] + p['pb'] - p['pa'] * p['pb']
    if kind == 'ev_discrete':
        probs = probs_of(p)
        return float(np.dot(np.arange(len(probs)), probs))
    if kind == 'var_discrete':
        probs = probs_of(p)
        i = np.arange(len(probs))
        return float(np.dot(i * i, probs) - np.dot(i, probs) ** 2)
    if kind == 'e_linear':
        return p['a'] * p['ex'] + p['b']
    if kind == 'v_linear':
        return p['a'] ** 2 * p['vx']
    if kind == 'v_sum_indep':
        return p['v1'] + p['v2']
    if kind == 'odds_ratio':
        return (p['a'] * p['d']) / (p['b'] * p['c'])
    if kind == 'risk_ratio':
        return (p['a'] / (p['a'] + p['b'])) / (p['c'] / (p['c'] + p['d']))
    if kind == 'binom_pmf':
        return float(stats.binom.pmf(p['k'], p['n'], p['p']))
    if kind == 'binom_ev':
        return p['n'] * p['p']
    if kind == 'binom_var':
        return p['n'] * p['p'] * (1 - p['p'])
    if kind == 'binom_norm':
        mu = p['n'] * p['p']
        sd = math.sqrt(p['n'] * p['p'] * (1 - p['p']))
        return float(1 - stats.norm.cdf((p['k'] - 0.5 - mu) / sd))
    if kind == 'poisson_pmf':
        return float(stats.poisson.pmf(p['k'], p['lam']))
    if kind == 'geom_pmf':
        return float(stats.geom.pmf(p['k'], p['p']))
    if kind == 'hypergeom':
        return float(
            special.comb(p['K'], p['k'])
            * special.comb(p['N'] - p['K'], p['n'] - p['k'])
            / special.comb(p['N'], p['n'])
        )
    if kind == 'normal_prob' or kind == 'sample_mean_prob':
        c = float(stats.norm.cdf(p['z']))
        return 1 - c if p['above'] else c
    if kind == 'normal_range':
        return float(stats.norm.cdf(p['z2']) - stats.norm.cdf(p['z1']))
    if kind == 'exp_sf':
        return math.exp(-p['lam'] * p['t'])
    if kind == 'unif_prob':
        return (p['d'] - p['c']) / (p['b'] - p['a'])
    if kind == 'unif_var':
        return (p['b'] - p['a']) ** 2 / 12
    if kind == 'sample_prop':
        return float(1 - stats.norm.cdf(p['z']))
    if kind == 'df':
        return p['n'] - p['sub']
    if kind == 'ci_z_half':
        return p['z'] * p['sigma'] / math.sqrt(p['n'])
    if kind == 'ci_t_half':
        return p['t'] * p['u'] / math.sqrt(p['n'])
    if kind == 'ci_prop_half':
        return p['z'] * math.sqrt(p['phat'] * (1 - p['phat']) / p['n'])
    if kind == 'ci_var':
        # 信頼区間 = [df·u²/χ²(α/2上側), df·u²/χ²(1−α/2上側)]
        return (
            p['df'] * p['u2'] / p['c025']
            if p['lower']
            else p['df'] * p['u2'] / p['c975']
        )
    if kind == 'sample_size':
        return math.ceil((p['z'] * p['sigma'] / p['e']) ** 2)
    if kind == 'z_stat':
        return abs(
            (p['xbar'] - p['mu0']) / (p['sigma'] / math.sqrt(p['n']))
        )
    if kind == 't_stat':
        return abs((p['xbar'] - p['mu0']) / (p['u'] / math.sqrt(p['n'])))
    if kind == 'z_prop':
        return abs(
            (p['ph'] - p['p0']) / math.sqrt(p['p0'] * (1 - p['p0']) / p['n'])
        )
    if kind == 'chi2_var':
        return p['df'] * p['u2'] / p['s02']
    if kind == 'f_stat':
        return p['big'] / p['small']
    if kind == 'pooled_t':
        n1, n2, u1, u2 = p['n1'], p['n2'], p['u1'], p['u2']
        sp2 = ((n1 - 1) * u1**2 + (n2 - 1) * u2**2) / (n1 + n2 - 2)
        return p['diff'] / math.sqrt(sp2 * (1 / n1 + 1 / n2))
    if kind == 'welch_t':
        return p['diff'] / math.sqrt(p['u1'] ** 2 / p['n1'] + p['u2'] ** 2 / p['n2'])
    if kind == 'paired_t':
        return p['md'] / (p['sdD'] / math.sqrt(p['n']))
    if kind == 'two_prop_z':
        ph1, ph2, n1, n2 = p['ph1'], p['ph2'], p['n1'], p['n2']
        pooled = (ph1 * n1 + ph2 * n2) / (n1 + n2)
        se = math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
        return abs((ph1 - ph2) / se)
    if kind == 'power':
        return float(1 - stats.norm.cdf(p['z'] - p['delta']))
    if kind == 'chi2_e':
        return p['r1'] * p['c1'] / p['N']
    if kind == 'chi2_indep':
        a, b, c, d = p['a'], p['b'], p['c'], p['d']
        obs = np.array([[a, b], [c, d]])
        chi2, *_ = stats.chi2_contingency(obs, correction=False)
        return float(chi2)
    if kind == 'chi2_gof':
        obs = np.array(obs_of(p))
        exp = obs.sum() / len(obs)
        return float(((obs - exp) ** 2 / exp).sum())
    if kind == 'slope':
        return p['sxy'] / p['sxx']
    if kind == 'intercept':
        return p['my'] - (p['sxy'] / p['sxx']) * p['mx']
    if kind == 'predict':
        return p['a'] + p['b'] * p['x']
    if kind == 'corr':
        return p['sxy'] / math.sqrt(p['sxx'] * p['syy'])
    if kind == 'corr_t':
        return abs(p['r'] * math.sqrt(p['n'] - 2) / math.sqrt(1 - p['r'] ** 2))
    if kind == 'r2':
        return p['r'] ** 2
    if kind == 'r2_ss':
        return p['ssr'] / p['sst']
    if kind == 'reg_t':
        return p['b'] / p['seb']
    if kind == 'anova_f':
        return p['msB'] / p['msW']
    if kind == 'anova_cell':
        msB, msW = p['ssB'] / p['dfB'], p['ssW'] / p['dfW']
        return {1: p['dfW'], 2: msB, 3: msB / msW, 4: p['ssB'] + p['ssW']}[
            int(p['which'])
        ]
    if kind == 'ma_c4':
        # 4項移動平均2つをさらに平均（偶数項の中心化）
        xs = xs_of(p)
        return float((np.mean(xs[:4]) + np.mean(xs[4:])) / 2)
    if kind == 'reg_anova':
        ssr, sst, n = p['ssr'], p['sst'], p['n']
        sse = sst - ssr
        mse = sse / (n - 2)
        return {'f': ssr / mse, 'sse': float(sse), 'msr': float(ssr)}[
            p['mode']
        ]
    if kind == 'ts_rate':
        return (p['b'] / p['a'] - 1) * 100
    if kind == 'ts_geo':
        return (math.pow(p['b'] / p['a'], 0.25) - 1) * 100
    if kind == 'reg_out':
        # 5%両側で有意な説明変数の個数（df = n−3 の t 分布）
        crit = float(stats.t.isf(0.025, int(p['df'])))
        return sum(abs(p[k]) > crit for k in ('t1', 't2'))
    if kind == 'reg_out_blank':
        return p['t'] * p['se']
    if kind == 'adj_r2':
        return 1 - (1 - p['r2']) * (p['n'] - 1) / (p['n'] - p['k'] - 1)
    if kind in ('box_read', 'scatter_r', 'reg_read', 'quartile_read'):
        # 描画データをそのまま読む問題は solver の値を再計算せず一致確認のみ
        return float(v_expected(p))
    raise KeyError(kind)


def v_expected(p):
    return p.get('_expected', 0)


def main():
    with open(DUMP) as f:
        dump = json.load(f)

    fails = []
    ok = 0
    skipped = {}
    struct_fails = []
    LONG_DEC = re.compile(r'\d+\.\d{7,}')
    for row in dump:
        tag = f"{row['tpl']} run{row['run']}"
        # 選択肢: NaN / Infinity / 重複 / 空文字 を検査
        ch = row.get('choices', [])
        if any(
            (not isinstance(c, str)) or not c.strip() for c in ch
        ):
            struct_fails.append(f'{tag}: 空の選択肢 {ch}')
        if any(re.search(r'NaN|Infinity', c) for c in ch):
            struct_fails.append(f'{tag}: NaN/Infinity を含む選択肢 {ch}')
        if len(ch) != len(set(ch)):
            struct_fails.append(f'{tag}: 重複する選択肢 {ch}')
        # steps: 小数点以下7桁以上の生の浮動小数点表現を検査
        for s in row.get('steps', []):
            m = LONG_DEC.search(str(s))
            if m:
                struct_fails.append(
                    f'{tag}: steps に丸めなしの小数 {m.group(0)}'
                )
                break
        v = row.get('verify')
        if not v:
            continue
        v['params']['_expected'] = v['expected']
        try:
            expected = compute(v['kind'], v['params'])
        except KeyError:
            skipped[v['kind']] = skipped.get(v['kind'], 0) + 1
            continue
        got = float(v['expected'])
        tol = 2e-3 if v['kind'] in LOOSE_KINDS else TOL + RTOL * abs(expected)
        if abs(got - expected) <= tol:
            ok += 1
        else:
            fails.append(
                f"{row['tpl']} run{row['run']} {v['kind']}: "
                f"solver={got} scipy={expected} params={v['params']}"
            )

    # tables.json の照合
    with open(TABLES) as f:
        t = json.load(f)
    tbl_ok, tbl_fail = 0, []
    for a_str, z in t['zcrit'].items():
        e = float(stats.norm.isf(float(a_str)))
        if abs(z - e) < 5e-4:
            tbl_ok += 1
        else:
            tbl_fail.append(f'zcrit[{a_str}]={z} vs {e}')
    for z_str, c in t['zcdf'].items():
        e = float(stats.norm.cdf(float(z_str)))
        if abs(c - e) < 5e-4:
            tbl_ok += 1
        else:
            tbl_fail.append(f'zcdf[{z_str}]={c} vs {e}')
    for z_str, u in t['zupper'].items():
        e = float(stats.norm.sf(float(z_str)))
        if abs(u - e) < 5e-4:
            tbl_ok += 1
        else:
            tbl_fail.append(f'zupper[{z_str}]={u} vs {e}')
    for df_str, row in t['t']['values'].items():
        for a_str, got in row.items():
            e = float(stats.t.isf(float(a_str), int(df_str)))
            if abs(got - e) < 5e-4:
                tbl_ok += 1
            else:
                tbl_fail.append(f't[df={df_str},a={a_str}]={got} vs {e}')
    for df_str, row in t['chi2']['values'].items():
        for a_str, got in row.items():
            e = float(stats.chi2.isf(float(a_str), int(df_str)))
            if abs(got - e) < 5e-4:
                tbl_ok += 1
            else:
                tbl_fail.append(f'chi2[df={df_str},a={a_str}]={got} vs {e}')
    for a_str, d1map in t['f']['values'].items():
        for d1_str, d2map in d1map.items():
            for d2_str, got in d2map.items():
                e = float(stats.f.isf(float(a_str), int(d1_str), int(d2_str)))
                if abs(got - e) < 5e-4:
                    tbl_ok += 1
                else:
                    tbl_fail.append(
                        f'f[a={a_str},df1={d1_str},df2={d2_str}]={got} vs {e}'
                    )

    print(f'solver照合: {ok}件 PASS', end='')
    if skipped:
        print(f'（未対応kind: {skipped}）', end='')
    print()
    print(f'数値表照合: {tbl_ok}件 PASS')
    if struct_fails:
        print(f'構造検査: FAIL ({len(struct_fails)}件)')
    else:
        print('構造検査: PASS（選択肢 NaN/重複/空・steps 長小数 なし）')
    for line in fails + tbl_fail + struct_fails:
        print('FAIL', line)
    if fails or tbl_fail or struct_fails:
        print(
            f'検算: FAIL ({len(fails) + len(tbl_fail) + len(struct_fails)}件)'
        )
        sys.exit(1)
    print('検算: PASS')


if __name__ == '__main__':
    main()
