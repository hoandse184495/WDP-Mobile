# Đồng bộ mobile React Native — 19/11/2026

Đối chiếu backend `f2725f5` và frontend web `810ef07`. Chỉ sửa `Forntend-mobile/mobile_app`; không đổi backend, frontend web, .env hoặc database.

Các phần đã cập nhật:

- Sinh lại contract đầu vào từ schema backend hiện tại.
- Kho độc lập khu chuồng: tạo/sửa kho chọn nhiều Groom, nạp đúng Groom đang gắn; Tủ thuốc chọn Vet. Không còn bắt chọn khu khi tạo Kho phụ.
- Bỏ menu và thao tác giao khu cũ; giữ phân công ngựa, chuyển ô và bàn giao Groom.
- Chuyển giữa mọi kho hoạt động, loại chính kho nguồn khỏi kho nhận; lọc thuốc/thức ăn theo đích, lô hết hạn hoặc thuốc thiếu HSD. Đổi nguồn/đích sẽ xóa các dòng cũ để chọn lại.
- Nhập hàng/chuyển hàng có bước xác nhận đối chiếu trước khi ghi tồn.
- Thủ kho được tạo kiểm kê giao Groom và yêu cầu đếm lại. Chỉ Manager xác nhận; Thủ kho không hủy phiên đã khóa kiểm đếm hoặc tự điều phối phiên giao chính mình.
- Vet được đề xuất bổ sung thuốc, xem tồn Tủ thuốc và đề nghị xử lý thuốc. Người lập được tự hủy đề nghị còn chờ; không được hủy phiếu người khác hoặc tự duyệt.
- Tổng quan Thủ kho có dự báo thức ăn 7 ngày: nhu cầu, tồn Kho tổng/Kho phụ, thiếu hụt, nhu cầu từng khu và trạng thái trống. Ghi “ngựa đang lưu trú” để không nhầm với số ngựa có khẩu phần.
- Màn hình tồn kho hiện Groom/Vet phụ trách và cảnh báo kho khóa kiểm kê.
- Công việc hoàn thành sau bàn giao giữ nguyên người thực hiện, kết quả và ảnh bằng chứng ở chế độ chỉ đọc. Không mở telemetry của công việc lịch sử mà backend giới hạn quyền Groom; không tự lọc bỏ các việc backend đã cho phép xem.

Kiểm tra nhanh trên máy Android sau Reload:

1. Thủ kho: tạo Kho phụ không chọn khu, gắn 2 Groom; mở lại thiết lập để kiểm tra hai lựa chọn được giữ.
2. Chuyển Kho tổng > Kho phụ: không chọn được thuốc; chuyển sang Tủ thuốc: chỉ thuốc có lô/HSD. Đổi nguồn/đích phải chọn lại vật tư.
3. Thủ kho tạo kiểm kê giao Groom; Groom đếm/gửi; Thủ kho xem/yêu cầu đếm lại; Manager xác nhận. Khi counting không hiện nút cho Thủ kho hủy phiên.
4. Vet đề nghị bổ sung thuốc và lập đề nghị xử lý thuốc; chỉ phiếu còn chờ do chính mình lập có nút tự hủy.
5. Thủ kho mở Tổng quan, đối chiếu dự báo với web cùng database.
6. Sau bàn giao Groom A > B, mở công việc đã hoàn thành ở tài khoản được backend cấp quyền: vẫn thấy người thực hiện cũ, ghi chú và ảnh; không có nút sửa/kết thúc lại.

Giới hạn: test tự động dùng fixture/API adapter và component React Native. Xuất bundle Android xác minh đóng gói JavaScript, không tương đương đã cài APK hoặc kiểm thử mọi thao tác trên thiết bị thật. Quyền xem lịch sử sau bàn giao do backend mới quyết định; mobile không tự mở rộng quyền. Yêu cầu bổ sung cho Kho tổng vẫn không được backend hiện tại hỗ trợ; mobile chỉ hiển thị kho trong options được phép.

Kết quả kiểm tra sau cập nhật: 41 test suites / 454 tests đạt; TypeScript đạt; lint đạt không lỗi/cảnh báo; xuất bundle Android thành công tại dist/mobile-sync-20261119. Chưa cài/chạy xác minh trên thiết bị thật trong lượt này.
