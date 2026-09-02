import { isAdminOrSuperAdminRole, isSuperAdminRole } from '@mos-lab/shared';

export interface ImpersonationPrincipal {
  id: number;
  role: string;
  isActive: boolean;
}

export interface ImpersonationPolicyInput {
  actor: ImpersonationPrincipal | null;
  target: ImpersonationPrincipal | null;
  isAlreadyImpersonating: boolean;
}

export interface ImpersonationPolicyResult {
  allowed: boolean;
  statusCode: 400 | 401 | 403 | 404 | 409;
  message: string;
}

const allowed = (): ImpersonationPolicyResult => ({ allowed: true, statusCode: 400, message: '' });

/**
 * Central authorization rule for privileged account switching.
 *
 * An ordinary Admin can still assist active non-admin accounts. A Super Admin
 * may also enter active Admin accounts, but never another Super Admin account.
 * This prevents peer privileged-session takeover while preserving the support
 * workflow requested from the Staff screen.
 */
export function evaluateImpersonationPolicy({
  actor,
  target,
  isAlreadyImpersonating,
}: ImpersonationPolicyInput): ImpersonationPolicyResult {
  if (!actor || !actor.isActive) {
    return { allowed: false, statusCode: 401, message: 'Tài khoản khởi tạo không tồn tại hoặc đã bị khóa.' };
  }

  if (isAlreadyImpersonating) {
    return {
      allowed: false,
      statusCode: 409,
      message: 'Hãy thoát phiên giả lập hiện tại trước khi chuyển sang tài khoản khác.',
    };
  }

  if (!isAdminOrSuperAdminRole(actor.role)) {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Quyền truy cập bị từ chối. Chỉ Admin mới có thể thực hiện chức năng này.',
    };
  }

  if (!target) {
    return { allowed: false, statusCode: 404, message: 'Không tìm thấy người dùng đích.' };
  }

  if (!target.isActive) {
    return {
      allowed: false,
      statusCode: 400,
      message: 'Không thể đăng nhập dưới quyền tài khoản đang bị khóa.',
    };
  }

  if (actor.id === target.id) {
    return { allowed: false, statusCode: 400, message: 'Bạn đang đăng nhập bằng chính tài khoản này.' };
  }

  if (isSuperAdminRole(target.role)) {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Không được phép đăng nhập dưới quyền của Super Admin khác.',
    };
  }

  if (isAdminOrSuperAdminRole(target.role) && !isSuperAdminRole(actor.role)) {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Chỉ Super Admin mới được đăng nhập dưới quyền của Admin.',
    };
  }

  return allowed();
}
