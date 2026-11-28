export const MIN_PASSWORD_LENGTH = 8

export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

/** Kiểm tra mật khẩu mới + nhập lại. Trả về lỗi theo từng ô, rỗng nếu hợp lệ */
export function validateNewPassword(password: string, confirm: string): { password?: string; confirm?: string } {
  const errors: { password?: string; confirm?: string } = {}
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự`
  if (confirm !== password) errors.confirm = 'Mật khẩu nhập lại không khớp'
  return errors
}
