# Kiểm tra trên thiết bị

> Cập nhật 09/11/2026: [đồng bộ backend/web và hướng dẫn kiểm tra mobile](BACKEND_SYNC_2026_11_09.md). Các luồng checklist/điều phối bên dưới áp dụng theo cập nhật mới này.

Dùng tài khoản và dữ liệu kiểm thử được cấp trên backend đang chạy. Thao tác ghi sẽ thay đổi dữ liệu qua API hiện có; chọn dữ liệu kiểm thử phù hợp.

## Chung

1. Cấu hình API URL mobile, mở development build và đăng nhập lần lượt 6 vai trò.
2. Kiểm tra menu, route không có quyền, danh sách loading/empty/error/retry, bộ lọc và phân trang.
3. Ngắt mạng, thử retry, lỗi 403/409/429. Khi 409, tải lại và đối chiếu; không tự tăng revision.
4. Kiểm tra ngày công việc UTC+7, chuyển tài khoản không còn cache cũ, restore và hết hạn phiên.

## Chủ ngựa

1. Tạo/sửa nháp tiếp nhận, tải ảnh/đăng ký/phả hệ/tiêm chủng, mở tài liệu và gửi duyệt.
2. Bổ sung theo yêu cầu, theo dõi kết quả, xem ngựa thuộc sở hữu.
3. Gửi đề xuất phả hệ, kiểm tra trạng thái chờ duyệt.

## Manager

1. Ngựa: tạo/sửa/ảnh/nhận dạng/phả hệ/duyệt/xác minh/lưu trữ.
2. Chuồng: tạo/sửa khu và ô, bảo trì/mặt bằng, chuyển ngựa, phân Groom/HLV/khu và công suất.
3. Bàn giao Groom: xem xung đột; đổi lựa chọn phải xem trước lại, chỉ xác nhận khi sẵn sàng.
4. Tiếp nhận: phân thẩm định, quyết định cuối, kế hoạch và xác nhận trả ngựa khi đủ điều kiện.
5. Công việc: giao một ngày/nhiều ngày; preview xung đột, sửa/hủy, xử lý cảnh báo và điều phối khám.
6. Kiểm kê: giao người đếm đúng kho/khu, đối soát/đếm lại/hủy; quyết định xử lý vật tư.
7. Nhân sự: tạo/sửa/kích hoạt/vô hiệu/reset password; giám sát theo ngày/nhân viên/hàng đợi và audit.

## Bác sĩ thú y

1. Bệnh án với triệu chứng/thuốc, lần khám có chấn thương mới/đã có, lịch hẹn và phiên bản chấn thương.
2. Điều trị/hồi phục/kết luận; kiểm tra vùng/bên/dữ liệu bề mặt nếu có.
3. Tái khám: ghi kết luận, cập nhật chấn thương, lịch tiếp theo và chốt lịch hiện tại.
4. Nhận ca sự cố, khám/liên kết bệnh án; Manager xác nhận vận hành sau khám.
5. Duyệt/ban hành/thu hồi khẩu phần; chốt đơn thuốc, người nhận, cấp một phần và dừng phần chưa cấp.
6. Thẩm định tiếp nhận và xác nhận đủ điều kiện trả ngựa.

## HLV

1. Tạo/sửa giáo án nhiều bài, revision và ngưỡng từng bài.
2. Giao lịch tập một ngày/nhiều ngày, đúng bài/ngựa/Groom phân công.
3. Đánh giá kết quả/cảnh báo, ngừng giáo án khi cần.
4. Soạn khẩu phần nhiều bữa, gửi duyệt/sửa; thẩm định đầu vào khi được giao.

## Groom

1. Mở việc trong ngày, bắt đầu, thêm/gỡ ảnh, hoàn thành hoặc báo trở ngại.
2. Cho ăn: preview xuất kho/HSD, lượng thừa, kết quả ăn và ngoại lệ chưa xuất.
3. Tập: số đo thực tế khi không có mô phỏng; hoặc start/stop mô phỏng API với nhãn rõ nguồn dữ liệu.
4. Hỗ trợ khám: xác nhận bàn giao bác sĩ → đưa về → ảnh → hoàn thành.
5. Sự cố: đúng một đối tượng, tác động công việc, nháp/ảnh/gửi.
6. Kiểm kê: xác nhận đóng băng thực tế, lưu từng trang; null là chưa đếm, không phải 0; gửi khi đủ toàn bộ dòng.
7. Mở thông báo giao theo đợt; kiểm tra task không còn trong phạm vi được báo rõ.

## Thủ kho

1. Tạo/sửa vật tư/thuốc/kho; thuốc phải có hàm lượng và dạng thuốc.
2. Phiếu nhập/chuyển: nháp → sửa → xác nhận hoặc hủy, lô/HSD, nguồn khác đích, số lượng.
3. Bổ sung: tính nhu cầu theo kho/vật tư, đề nghị, xét duyệt, preview, cấp một phần/toàn bộ.
4. Thuốc: người nhận/lô/tồn, lượng cấp và ghi chú; thiếu xác nhận bàn giao phải không gửi được.
5. Kiểm kê kho chung theo phân công, đề nghị xử lý vật tư, sổ kho/lô/loại/chứng từ.

Đã chạy kiểm thử nghiệp vụ/API với MongoDB local biệt lập ngày 05/11/2026; xem [báo cáo và giới hạn kiểm chứng](ROLE_FLOW_AUDIT.md). Checklist thao tác UI trên thiết bị ở trên chưa được tự động thực thi. Camera, document picker, chia sẻ tài liệu và keychain vẫn cần kiểm tra trên thiết bị. Chưa có Three.js native, SSE/push nền hoặc ghi offline.
