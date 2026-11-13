# Đối chiếu source

Mobile tiếp tục source Expo SDK 58 tại `Forntend-mobile/mobile_app`. Backend và web chỉ được đọc để đối chiếu routes, services, models, validators và API/pages của web. Không sửa endpoint, database hay `.env` backend/web; không tạo dự án trùng lặp.

Các hợp đồng quan trọng được cập nhật:

- Có 6 vai trò, gồm `warehouse_keeper`. Thủ kho ghi nhập/chuyển/danh mục/duyệt bổ sung/cấp thuốc; Manager giám sát và đối soát. Thủ kho không truy cập ngựa/lịch task ngựa.
- `/prescriptions`: chốt/dừng đơn, người nhận, cấp FEFO, cấp một phần, revision/tồn/preview hash và xác nhận thực tế.
- `/medical-records/encounters`: bệnh án, nhiều chấn thương có version, lịch hẹn, hoàn tất tái khám và liên kết sự cố.
- `medical_support` được điều phối từ lịch khám; không tạo/sửa/hủy như task thường. Groom ghi hai checkpoint trước hoàn thành.
- Batch task dùng preview trước khi tạo, giữ request key khi retry. Telemetry là mô phỏng ở server; hoàn thành bằng số liệu server sau khi dừng, không gửi số đo tay.
- Tiếp nhận có tài liệu raw PNG/JPEG/PDF, duyệt theo giai đoạn và trả ngựa. Phả hệ/nhận dạng có revision và quyền riêng.
- `/stables` trả workspace theo scope. Bàn giao có preview token; mặt bằng, lưu trú và phân công có hợp đồng riêng.
- Kiểm kê có `linePagination`, save tối đa 100 dòng/lần. Không coi trang đầu là toàn bộ phiếu.
- Giám sát nhân sự yêu cầu khoảng ngày tối đa 93 ngày. Sổ kho có chọn lô, loại biến động và truy xuất chứng từ.

API tiền tố `/api`, envelope `{success,message,data}`; delete có thể không có data. Phân trang `{page,limit,total,totalPages}`. Ngày nghiệp vụ theo UTC+7. Lỗi API không chuyển thành dữ liệu mẫu/empty giả.

Snapshot input schemas ở `features/operations/contracts/generated-schemas.json`; source/hash ở `source.json`. Registry riêng theo domain, phần dùng chung ở `operations/contracts/work-operations.ts`. Snapshot không thay thế refinement, authorization hoặc transaction backend.

Các tương tác web được điều chỉnh cho native: lịch theo ngày, biểu đồ mẫu, sơ đồ chuồng và form nghiệp vụ. Chưa có trình Three.js 3D native, SSE/push nền hoặc offline mutations. Xem [README](../README.md) và [kịch bản kiểm thử](MOBILE_WORKFLOWS.md).
