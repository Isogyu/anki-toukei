#!/usr/bin/env python3
"""PWA用アイコンを生成する（青地 + 白い棒グラフ）。
外部ライブラリ不要の純粋Python PNGエンコーダ。
maskable は全面塗り（OS側で切り抜かれるため角丸にしない）。"""
import struct
import zlib
import os

BLUE = (37, 99, 235)
WHITE = (255, 255, 255)


def png_write(path, size, rounded=True):
    s = size
    radius = s // 8
    rows = []
    for y in range(s):
        row = bytearray(b"\x00")
        for x in range(s):
            px = BLUE
            alpha = 255
            if rounded:
                corner = None
                if x < radius and y < radius:
                    corner = (radius, radius)
                elif x >= s - radius and y < radius:
                    corner = (s - radius, radius)
                elif x < radius and y >= s - radius:
                    corner = (radius, s - radius)
                elif x >= s - radius and y >= s - radius:
                    corner = (s - radius, s - radius)
                if corner and (x - corner[0]) ** 2 + (y - corner[1]) ** 2 > radius ** 2:
                    alpha = 0
            # 棒グラフ（3本の白い棒）
            bw, gap = s // 8, s // 16
            base = s * 4 // 5
            for i, h in enumerate((s * 2 // 5, s * 3 // 5, s * 11 // 20)):
                x0 = s // 5 + i * (bw + gap)
                if x0 <= x < x0 + bw and base - h <= y < base:
                    px = WHITE
            row += bytes(px + (alpha,))
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n" +
           chunk(b"IHDR", struct.pack(">IIBBBBB", s, s, 8, 6, 0, 0, 0)) +
           chunk(b"IDAT", zlib.compress(raw, 9)) +
           chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({s}x{s})")


os.makedirs("public", exist_ok=True)
png_write("public/icon-192.png", 192)
png_write("public/icon-512.png", 512)
png_write("public/apple-touch-icon.png", 180)
png_write("public/icon-maskable.png", 512, rounded=False)
