import { message } from 'antd';

/**
 * Global API Error Handler for the Web App.
 * Logs the error and displays a message via AntD message.error.
 */
export function handleError(err: unknown, defaultMessage: string = 'Có lỗi xảy ra, vui lòng thử lại sau'): string {
  console.error('[API Error]:', err);

  // Handle Axios response error structure
  const responseError = err as { response?: { data?: { message?: string } } };
  const messageError = err as { message?: string };
  const errMsg = responseError.response?.data?.message || messageError.message || defaultMessage;

  message.error(errMsg);
  return errMsg;
}
