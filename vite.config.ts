import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages のプロジェクトサイト用のベースパス。
// ローカル開発では '/' を使う。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/anki-toukei/' : '/',
  plugins: [react()],
}));
