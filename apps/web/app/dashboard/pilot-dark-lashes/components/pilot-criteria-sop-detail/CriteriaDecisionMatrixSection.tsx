'use client';

import React from 'react';
import { Card } from 'antd';

/** Decision matrix presenting the 3 clinical conclusion branches and follow-up actions. */
export function CriteriaDecisionMatrixSection() {
  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
          Decision Matrix &amp; Action Flow
        </span>
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
          Quy Trình Kết Luận Điều Kiện Mi &amp; Hướng Xử Lý Tương Ứng
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Trường hợp 1: PASS TOÀN BỘ */}
        <Card
          variant="outlined"
          className="rounded-2xl border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                Trường hợp 1: PASS
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">5/5 ĐẠT</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">Đủ Điều Kiện Uốn Mi Bóng Tối</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
              Khách hàng thỏa mãn cả 5 tiêu chí: Sợi mi khỏe, dài ≥ 8mm, mật độ đều, không tổn thương và tạo form tốt.
            </p>
            <div className="pt-2 border-t border-emerald-500/20 space-y-1.5 text-xs">
              <div className="font-semibold text-emerald-800 dark:text-emerald-200">Quy trình thực hiện:</div>
              <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-emerald-600">1.</span>
                <span>Chụp ảnh Before chính diện và góc 45 độ lưu vào hồ sơ</span>
              </div>
              <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-emerald-600">2.</span>
                <span>Chọn size trục silicon (S, M, L hoặc trục cá heo R3)</span>
              </div>
              <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-emerald-600">3.</span>
                <span>Kích hoạt Quy trình kỹ thuật SOP 7 bước tiêu chuẩn</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
            Áp dụng: Ca #1, #6, #9, #11, #12, #15, #17, #18
          </div>
        </Card>

        {/* Trường hợp 2: FAIL KỸ THUẬT (Điển hình Ca #10) */}
        <Card
          variant="outlined"
          className="rounded-2xl border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300">
                Trường hợp 2: FAIL Kỹ Thuật
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Từ chối an toàn</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
              Mi Quá Ngắn / Trụi Trống / Hư Tổn
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
              Mi không đủ điều kiện an toàn (như Ca #10 khách Tâm: Mi quá ngắn, trụi trống nhiều chỗ, không ôm được
              trục).
            </p>
            <div className="pt-2 border-t border-rose-500/20 space-y-1.5 text-xs">
              <div className="font-semibold text-rose-800 dark:text-rose-200">Hướng xử lý chuẩn mực Wings:</div>
              <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-rose-600">1.</span>
                <span>Giải thích trung thực lý do kỹ thuật, tuyệt đối không làm gượng ép</span>
              </div>
              <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-rose-600">2.</span>
                <span>Tư vấn khách về dưỡng mi tại nhà bằng serum/keratin từ 1–2 tuần</span>
              </div>
              <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-rose-600">3.</span>
                <span>Hẹn lịch tái khám kiểm tra nang mi trước khi quyết định uốn</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
            Minh chứng đối chiếu: Ca #10 (Khách Tâm - 05/10/2026)
          </div>
        </Card>

        {/* Trường hợp 3: CHUYỂN ĐỔI DỊCH VỤ (Điển hình Ca #5, Ca #7) */}
        <Card
          variant="outlined"
          className="rounded-2xl border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300">
                Trường hợp 3: Chuyển Dịch Vụ
              </span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Tư vấn linh hoạt</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
              Nhu Cầu Khác Hoặc Cần Độ Che Phủ
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 m-0 leading-relaxed">
              Khách hàng có mi thưa mỏng cần che phủ (Ca #5) hoặc thích phong cách dày đậm cá tính (Ca #7).
            </p>
            <div className="pt-2 border-t border-blue-500/20 space-y-1.5 text-xs">
              <div className="font-semibold text-blue-800 dark:text-blue-200">Hướng chuyển đổi phù hợp:</div>
              <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-blue-600">•</span>
                <span>
                  <strong>Mi thưa ngắn (Ca #5):</strong> Chuyển sang Nối mi Hyper / Thiết kế mi tơ có độ che phủ cao
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-blue-600">•</span>
                <span>
                  <strong>Mi khỏe thích dày đậm (Ca #7):</strong> Tôn trọng sở thích, chuyển sang Nối mi chồn sắc sảo
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-blue-600">•</span>
                <span>Ghi nhận trạng thái INELIGIBLE kèm lý do và chuyển ca mượt mà</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
            Minh chứng đối chiếu: Ca #5 (Phương Thảo) &amp; Ca #7 (Vân Anh)
          </div>
        </Card>
      </div>
    </div>
  );
}
