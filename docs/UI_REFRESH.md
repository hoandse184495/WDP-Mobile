# Giao diện mobile — 06/11/2026

## Hệ thống giao diện

- Màu chính xanh ngọc, hero xanh đậm, nền sáng, nhấn vàng và màu cảnh báo riêng.
- Typography system font, cấp độ tiêu đề/nội dung/nhãn rõ ràng, khoảng cách và bo góc dùng chung.
- Icon SVG nét đồng nhất, không dùng ký tự Unicode làm icon điều hướng.
- Nút chính có độ tương phản cao; nút phụ nền trắng viền mảnh, trạng thái nguy hiểm nền đỏ nhạt.
- Input nền nhẹ, focus/error rõ ràng; mật khẩu có nút hiện/ẩn trong trường nhập.
- Badge có chấm trạng thái; thông tin chi tiết dùng hàng nhãn/giá trị, nội dung dài tự xuống dòng.
- Loading/empty/error, lựa chọn và bảng thao tác dùng chung được chỉnh đồng bộ.

## Màn hình

Đăng nhập có khối thương hiệu và form gọn. Tổng quan có hero theo vai trò,
thẻ chỉ số, lối tắt có icon và hàng hồ sơ. Menu chia nhóm với icon và tìm kiếm.
Danh sách ngựa có chỉ số thể lực; công việc có thanh ngày gọn và loại việc bằng
icon. Tài khoản có avatar tên viết tắt, thông tin liên hệ và form bảo mật.
Danh sách nghiệp vụ, hồ sơ, thông báo và các form kế thừa hệ thống giao diện.
Thanh tab dùng icon SVG, nhãn gọn, tôn trọng safe area và ẩn khi bàn phím mở.

Không thay đổi API, quyền, bước xác nhận hoặc cách lưu dữ liệu nghiệp vụ.

## Kiểm tra

- TypeScript và lint đạt, không lỗi/cảnh báo.
- 13 suite / 242 test đạt.
- Bundle Android và iOS đã xuất thành công bằng `npx expo export --platform android --platform ios --max-workers 1 --output-dir .expo/design-refresh`.
- Chưa xác nhận bằng hình ảnh tất cả màn hình trên thiết bị thật. Khi thử bản
  xem trước, Expo Go máy ảo báo thiếu native module `ExpoCrypto`; sau đó ADB
  mất kết nối thiết bị. Không bỏ native module hoặc thay logic tạo request key
  để vượt lỗi môi trường xem trước.

Thư viện bổ sung: `react-native-svg` phiên bản tương thích SDK qua `expo install`.
Các màn hình khác nhau theo vai trò vẫn dùng cùng cấu hình điều hướng và nghiệp vụ hiện có.
