import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' 로 두면 빌드 결과(dist)를 GitHub Pages 같은 하위 주소에 올려도 경로가 맞습니다.
export default defineConfig({
  plugins: [react()],
  base: './',
});
