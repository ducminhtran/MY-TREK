import { defineConfig } from 'vitest/config'

// Cấu hình test tách riêng để không nạp plugin PWA/Tailwind khi chạy unit test
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
