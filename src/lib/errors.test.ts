import { describe, expect, it } from 'vitest'
import { toFriendlyError } from './errors'

describe('toFriendlyError (mục 9.4)', () => {
  it('lỗi đăng nhập', () => {
    expect(toFriendlyError({ message: 'Invalid login credentials', code: 'invalid_credentials' }).message)
      .toBe('Email hoặc mật khẩu không đúng')
    expect(toFriendlyError(new Error('Email not confirmed')).message)
      .toBe('Email chưa được xác nhận, vui lòng kiểm tra hộp thư')
    expect(toFriendlyError({ message: 'User already registered' }).message).toBe('Email này đã được đăng ký')
  })

  it('lỗi quyền và trùng email thành viên', () => {
    expect(toFriendlyError({ message: 'new row violates row-level security policy for table "trips"', code: '42501' }).message)
      .toBe('Bạn không có quyền thực hiện thao tác này')
    expect(toFriendlyError({ message: 'duplicate key value violates unique constraint "trip_members_trip_email"', code: '23505' }).message)
      .toBe('Email này đã có trong danh sách thành viên')
  })

  it('mất mạng', () => {
    expect(toFriendlyError(new TypeError('Failed to fetch')).message)
      .toBe('Không kết nối được máy chủ, vui lòng kiểm tra mạng')
  })

  it('lỗi tiếng Việt từ RPC hiển thị nguyên văn, kể cả khi mã 42501', () => {
    expect(toFriendlyError({ message: 'Bạn chỉ được đánh dấu mục được giao cho mình', code: '42501' }).message)
      .toBe('Bạn chỉ được đánh dấu mục được giao cho mình')
  })

  it('lỗi lạ → "Có lỗi xảy ra" + chi tiết', () => {
    expect(toFriendlyError(new Error('boom'))).toEqual({ message: 'Có lỗi xảy ra', detail: 'boom' })
    expect(toFriendlyError(undefined)).toEqual({ message: 'Có lỗi xảy ra', detail: undefined })
  })
})
