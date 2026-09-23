#!/usr/bin/env python3
"""scipy で数値表 (src/data/tables.json) を生成する。

会場配布の数値表（正規・t・χ²・F）に相当する値をアプリ内で使うためのデータ。
- zcrit: 標準正規の上側臨界値（代表的なα）
- zcdf:  標準正規の累積分布表 Φ(z) z=0.00〜3.49 (0.01刻み)
- zupper: 標準正規の上側確率表 Q(z)（検定の配布表形式）
- t:     t分布の上側臨界値 t_α(df)
- chi2:  χ²分布の上側臨界値 χ²_α(df)
- f:     F分布の上側臨界値 F_α(df1, df2)
"""
import json
import os
from scipy.stats import norm, t, chi2, f

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "src", "data", "tables.json")


def r(x, digits=6):
    return round(float(x), digits)


def main():
    # 標準正規: 上側確率 α -> 臨界値 z
    z_alphas = [0.10, 0.05, 0.025, 0.02, 0.01, 0.005]
    zcrit = {f"{a:g}": r(norm.isf(a), 4) for a in z_alphas}

    # Φ(z), Q(z)  z=0.00..3.99 step 0.01
    zgrid = [i / 100 for i in range(0, 400)]
    zcdf = {f"{z:.2f}": r(norm.cdf(z), 4) for z in zgrid}
    zupper = {f"{z:.2f}": r(norm.sf(z), 4) for z in zgrid}

    # t分布 上側臨界値
    t_alphas = [0.10, 0.05, 0.025, 0.01, 0.005]
    t_dfs = list(range(1, 61)) + [80, 100, 120]
    ttab = {
        "alphas": t_alphas,
        "df": t_dfs,
        "values": {
            str(df): {f"{a:g}": r(t.isf(a, df), 4) for a in t_alphas}
            for df in t_dfs
        },
    }

    # χ²分布 上側臨界値（両側検定用に下側も）
    c_alphas = [0.995, 0.99, 0.975, 0.95, 0.10, 0.05, 0.025, 0.01, 0.005]
    c_dfs = list(range(1, 61)) + [80, 100]
    ctab = {
        "alphas": c_alphas,
        "df": c_dfs,
        "values": {
            str(df): {f"{a:g}": r(chi2.isf(a, df), 4) for a in c_alphas}
            for df in c_dfs
        },
    }

    # F分布 上側臨界値
    f_alphas = [0.10, 0.05, 0.025, 0.01]
    f_df1 = list(range(1, 11)) + [12, 15, 20, 24, 30]
    f_df2 = list(range(1, 61)) + [80, 100, 120]
    ftab = {
        "alphas": f_alphas,
        "df1": f_df1,
        "df2": f_df2,
        "values": {
            str(a): {
                str(d1): {str(d2): r(f.isf(a, d1, d2), 4) for d2 in f_df2}
                for d1 in f_df1
            }
            for a in f_alphas
        },
    }

    data = {
        "zcrit": zcrit,
        "zcdf": zcdf,
        "zupper": zupper,
        "t": ttab,
        "chi2": ctab,
        "f": ftab,
    }
    with open(OUT, "w", encoding="utf-8") as fp:
        json.dump(data, fp, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
