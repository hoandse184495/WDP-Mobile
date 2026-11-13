# Đồng bộ React Native với backend/web — 10/11/2026

Đối chiếu backend `34098e0`, web `c83959e` và các thay đổi cục bộ. Chỉ sửa `Forntend-mobile/mobile_app`; không sửa Flutter, backend, web, `.env`, không seed hay gửi request ghi database. Fingerprint git diff và file chưa theo dõi của backend/web giữ nguyên trước/sau.

## Các phần đã sửa

- Khẩu phần: Manager, HLV và bác sĩ có quyền tạo, sửa bản đang áp dụng/hết hiệu lực và thu hồi theo backend. Bỏ giới hạn tác giả khi sửa; quyền đọc/phạm vi ngựa vẫn do API quyết định.
- Lưu khẩu phần áp dụng ngay, có xác nhận tác động thay khẩu phần trùng kỳ/đồng bộ việc cho ăn; không hướng người dùng qua bước gửi bác sĩ duyệt như luồng cũ.
- Tạo mới có ngày hiệu lực mặc định hôm nay đến 7 ngày sau, bữa đầu tiên, mã bữa tự sinh và ẩn trường mã kỹ thuật. Sửa giữ nguyên mã bữa cũ; thêm bữa tạo mã mới. Bộ chọn ngựa/thức ăn lấy từ `/rations/options`.
- Kiểm tra vật tư trùng trong một bữa và giới hạn 3 chữ số thập phân trước khi gửi. Backend vẫn kiểm tra tồn, đơn vị và điều kiện áp dụng; mobile không bỏ qua validation.
- Lịch y tế: mặc định bật tự điều phối; cho tạo lịch chỉ có ngày, chưa có giờ. Nếu đặt khung giờ thì cần đủ giờ bắt đầu/kết thúc và địa điểm, giờ kết thúc phải sau bắt đầu. Tái khám không tạo chu kỳ lặp.
- Không hiện thao tác hoàn tất lịch tương lai; lịch tái khám cần liên kết bệnh án trước khi hoàn tất trực tiếp. Luồng khám tái khám vẫn cho lập bệnh án theo lịch đến hạn.
- Tổng quan bác sĩ đọc lịch chăm sóc y tế đang chờ từ API lịch, gồm tái khám/tiêm phòng/tẩy giun/chăm móng, sắp theo ngày và đếm lịch hôm nay; không dùng trường hẹn cũ của bệnh án thay danh sách lịch hiện tại.
- Chủ ngựa có phần khẩu phần trong thời hạn; bấm một kết quả tập mở đúng buổi tập đã chọn.
- Liên kết sự cố chỉ gợi ý phiếu đúng ngựa, do bác sĩ đang đăng nhập lập, có chẩn đoán, không ở tương lai, từ phút phát hiện trở đi và chưa gắn báo cáo khác. Chi tiết sự cố hiện kết quả chuyên môn, người báo cáo và ghi chú phân công từ API.

## Kiểm tra đã thực hiện

- 28 suite / 376 test đạt, không skip.
- TypeScript và Expo lint đạt.
- Bộ 132 schema đầu vào đang dùng khớp các schema tương ứng của backend. Không cần ghi lại snapshot.
- Kiểm thử mới đưa payload khẩu phần có mã bữa tự sinh vào Zod thật của backend và được chấp nhận; chỉ nạp validator, không kết nối DB.
- Xuất bundle Android thành công, Hermes khoảng 5,6 MB, tại `%TEMP%/equinepro-rn-sync-2026-11-10`. Đây là bundle kiểm tra đóng gói, chưa phải APK cài mới.
- Chưa thao tác đầu cuối trên điện thoại thật hoặc xác nhận upload/lưu dữ liệu thực tế trong lượt này.

## Thử lại trên app

Từ `C:\WDP\Forntend-mobile\mobile_app`, chạy `npx expo start -c` rồi reload app.

1. Manager mở Khẩu phần: tạo mới, chọn ngựa/thức ăn, đặt lượng, kiểm tra ngày và xác nhận áp dụng. Mở lại rồi thử chỉnh sửa/thu hồi trên dữ liệu bạn chủ động muốn thay đổi.
2. Bác sĩ tạo lịch y tế chưa có giờ: lưu được; muốn có hỗ trợ khám theo khung giờ thì nhập đủ giờ và địa điểm. Tái khám gửi chu kỳ 0.
3. Bác sĩ xem tổng quan: lịch chưa hoàn thành xuất hiện theo ngày; lịch tương lai chưa có nút hoàn tất, tái khám đi qua ghi nhận lần khám.
4. Chủ ngựa mở một kết quả tập để kiểm tra đúng buổi; mở khẩu phần đang áp dụng trong phạm vi ngựa của mình.
5. Bác sĩ phụ trách sự cố mở liên kết bệnh án: đối chiếu danh sách đã lọc và xem kết quả chuyên môn sau khi liên kết thành công.

Các thao tác xác nhận trong app sẽ ghi dữ liệu thật vào database đang cấu hình; bộ kiểm thử ở trên dùng mocks/fixtures và không tự thực hiện các thao tác này.
