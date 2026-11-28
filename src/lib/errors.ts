/** Chuyển lỗi kỹ thuật thành thông báo tiếng Việt thân thiện (mục 9.4) */

export type FriendlyError = { message: string; detail?: string }

// Có ký tự tiếng Việt → lỗi do RPC/trigger raise → hiển thị nguyên văn
const VIETNAMESE_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

type Rule = { test: (message: string, code: string) => boolean; text: string }

const RULES: Rule[] = [
  { test: (m, c) => c === 'invalid_credentials' || /invalid login credentials/i.test(m), text: 'Email hoặc mật khẩu không đúng' },
  { test: (m, c) => c === 'user_already_exists' || c === 'email_exists' || /already registered/i.test(m), text: 'Email này đã được đăng ký' },
  { test: (m, c) => c === 'email_not_confirmed' || /email not confirmed/i.test(m), text: 'Email chưa được xác nhận, vui lòng kiểm tra hộp thư' },
  { test: (m) => /trip_members_trip_email/.test(m), text: 'Email này đã có trong danh sách thành viên' },
  { test: (m, c) => c === '42501' || /row-level security/i.test(m), text: 'Bạn không có quyền thực hiện thao tác này' },
  { test: (m) => /failed to fetch|networkerror|load failed|network request failed/i.test(m), text: 'Không kết nối được máy chủ, vui lòng kiểm tra mạng' },
  { test: (m, c) => c === 'weak_password' || /password should be/i.test(m), text: 'Mật khẩu quá yếu, cần ít nhất 8 ký tự' },
  { test: (m, c) => c === 'same_password' || /different from the old password/i.test(m), text: 'Mật khẩu mới phải khác mật khẩu hiện tại' },
  { test: (m, c) => c.startsWith('over_') || /rate limit/i.test(m), text: 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau ít phút' },
  { test: (m, c) => c === 'otp_expired' || /token has expired or is invalid/i.test(m), text: 'Liên kết đã hết hạn hoặc không hợp lệ' },
  { test: (m, c) => c === 'email_address_invalid' || /unable to validate email|invalid format/i.test(m), text: 'Email không hợp lệ' },
  { test: (_m, c) => c === 'signup_disabled', text: 'Chức năng đăng ký đang tạm tắt' },
]

function extract(err: unknown): { message: string; code: string } {
  if (typeof err === 'string') return { message: err, code: '' }
  if (typeof err === 'object' && err !== null) {
    const o = err as { message?: unknown; code?: unknown }
    return {
      message: typeof o.message === 'string' ? o.message : '',
      code: o.code === undefined || o.code === null ? '' : String(o.code),
    }
  }
  return { message: '', code: '' }
}

export function toFriendlyError(err: unknown): FriendlyError {
  const { message, code } = extract(err)
  if (VIETNAMESE_CHARS.test(message)) return { message }
  const rule = RULES.find((r) => r.test(message, code))
  if (rule) return { message: rule.text }
  return { message: 'Có lỗi xảy ra', detail: message || undefined }
}
