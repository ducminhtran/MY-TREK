import { describe, expect, it } from 'vitest'
import { buildStoragePath, fileKind, formatBytes, validateUpload } from './files'

const norm = (s: string) => s.replace(/[  ]/g, ' ')

describe('files', () => {
  it('buildStoragePath bắt đầu bằng trip_id, tên không dấu (KT-11)', () => {
    expect(buildStoragePath('trip-1', 'Hóa đơn Khách sạn.PDF', 'u-1')).toBe('trip-1/u-1-hoa-don-khach-san.pdf')
    expect(buildStoragePath('trip-1', 'ảnh.jpg')).toMatch(/^trip-1\/[0-9a-f-]{36}-anh\.jpg$/)
  })

  it('formatBytes', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(norm(formatBytes(1536))).toBe('1,5 KB')
    expect(norm(formatBytes(10 * 1024 * 1024))).toBe('10 MB')
  })

  it('fileKind', () => {
    expect(fileKind('image/jpeg', 'a.jpg')).toBe('image')
    expect(fileKind('', 'scan.HEIC')).toBe('image')
    expect(fileKind('application/pdf', 'x')).toBe('pdf')
    expect(fileKind(null, 'x.docx')).toBe('other')
  })

  it('validateUpload ≤ 10 MB (BR-12)', () => {
    expect(validateUpload({ size: 10 * 1024 * 1024 })).toBeNull()
    expect(validateUpload({ size: 10 * 1024 * 1024 + 1 })).toContain('10 MB')
    expect(validateUpload({ size: 0 })).not.toBeNull()
  })
})
