# Hoàn thiện 7 phần mobile — 09/11/2026

> Bổ sung tiếp ngày 09/11/2026: [mô hình chấn thương 3D, SSE và tìm kiếm nhiều trang](MOBILE_LIVE_3D_SEARCH_2026_11_09.md). Các giới hạn về ba mục này trong nội dung lịch sử bên dưới đã được cập nhật theo báo cáo mới.

Chỉ sửa mobile. Backend/web được dùng để đọc hợp đồng API và đối chiếu hành vi; không đổi .env, database hoặc dependency.

## Các phần đã sửa

| Phần              | Kết quả trên mobile                                                                                                                                                                                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Giáo án           | Manager và HLV được tạo, sửa và ngừng dùng giáo án. Cả nút vào form, route guard và thao tác ngừng dùng đều theo cùng quyền. Sau lưu làm mới giáo án, tùy chọn giao việc và tổng quan.                                                                                                                                                          |
| Kết quả cho ăn    | Giữ feedingOutcome và acknowledgedRationChange khi parse dữ liệu. Mở việc đã hoàn thành hiện tình trạng ăn, ghi nhận thay đổi khẩu phần nếu có và ghi chú đã lưu. Không tự suy ra đã xuất kho.                                                                                                                                                  |
| Nhận dạng ngựa    | Giữ identity và identityRevision, hiện mã chip, hộ chiếu, đơn vị đăng ký, quốc gia sinh, đặc điểm nhận dạng. Hồ sơ cũ chưa có thông tin hiện Chưa bổ sung. Thao tác cập nhật nhận dạng của Manager vẫn dùng API/revision hiện có.                                                                                                               |
| Ô chuồng          | Gọi GET /stables/stalls/:id/details theo ngày chọn. Hiện ngựa đang ở, Groom, thời điểm vào ô, công việc trong ngày và trạng thái. Manager chỉ thấy lịch sử khi backend trả historyAllowed=true; lịch sử đóng gọn trước khi người dùng mở. Bác sĩ xem việc nhưng không có nút vào route công việc dành cho Manager/HLV/Groom.                    |
| Nhật ký           | Nhấn Xem thêm ở một bản ghi để xem lý do và các trường trước/sau thực sự thay đổi. Giữ giá trị 0, false, null đúng ý nghĩa; ngày giờ theo Việt Nam, loại trường thông tin xác thực và đường dẫn lưu trữ khỏi khối so sánh.                                                                                                                      |
| Đánh giá buổi tập | Nạp đúng bản ghi trước khi mở form, điền điểm/nhận xét đang có; hiện số đo, snapshot bài tập và lối mở công việc/bằng chứng theo quyền. Buổi chưa đánh giá không tự điền điểm. Lỗi tải có Thử lại; buổi hủy không cho đánh giá; tải lại nền không thay nội dung đang soạn. Điểm thể lực vẫn tùy chọn, không tự gửi giá trị thay cho người dùng. |
| Thông báo         | Xử lý cả tham số session và review. Thông báo buổi đã đánh giá mở đúng chi tiết, thông báo cần đánh giá mở đúng form. Giữ đường dẫn tới tiếp nhận, lịch khám, đơn thuốc, sự cố, công việc và đợt công việc. Luôn lấy target đã được backend kiểm tra quyền.                                                                                     |

## Cách lấy đúng buổi tập

Backend hiện chưa có GET /training-sessions/:id. Mobile tìm bản ghi trong các trang GET /training-sessions mà backend đã giới hạn theo vai trò/ngựa. Có xử lý bản ghi ở trang sau và lỗi không tìm thấy/ngoài phạm vi; không thêm endpoint backend, không dùng dữ liệu ngoài scope và không bỏ qua 403/404.

Với dữ liệu rất lớn, mở một buổi tập cũ có thể cần tải nhiều trang. Đây là giới hạn của API hiện tại. Màn hình dùng loading/error/retry khi chờ và giữ AbortSignal của request.

## Kiểm tra nhanh trên app

1. Manager > Giáo án > Tạo giáo án. Mở giáo án có sẵn: thấy Sửa giáo án và Thao tác với hồ sơ > Ngừng sử dụng giáo án. Các thay đổi chỉ được ghi sau khi người dùng xác nhận/lưu.
2. Groom > Công việc > mở một việc cho ăn đã hoàn thành có kết quả. Kiểm tra tình trạng ăn và ghi chú, sau tải lại vẫn đúng dữ liệu đã lưu.
3. Hồ sơ ngựa > Nhận dạng & đăng ký: đối chiếu chip/hộ chiếu; hồ sơ chưa có dữ liệu không tự điền mã.
4. Ô chuồng > mở ô > chọn ngày để xem việc. Kiểm tra ngựa, Groom và giờ vào ô. Manager bấm Xem lịch sử lưu trú; các vai trò khác không thấy lịch sử riêng của Manager.
5. Nhật ký > Xem thêm ở bản ghi có metadata.before/after: kiểm tra lý do, giá trị cũ/mới. Bản ghi cũ không có snapshot có thông báo phù hợp.
6. HLV > Kết quả huấn luyện > Đánh giá buổi tập: điểm và ghi chú cũ được nạp; sửa điểm vẫn giữ ghi chú. Buổi chưa đánh giá bắt buộc chọn điểm. Hủy/thoát không tự ghi dữ liệu.
7. Mở thông báo buổi tập đã đánh giá: vào đúng hồ sơ; thông báo đang chờ đánh giá vào đúng form. Thử bản ghi không còn quyền để thấy lỗi từ backend.

## Xác minh

Kiểm tra mới gồm quyền của đủ 6 vai trò, schema phản hồi ngựa/công việc, endpoint chi tiết ô theo ngày, buổi tập ở trang thứ hai/không tìm thấy, các dạng target thông báo, nhật ký không lộ trường bí mật, form đánh giá nạp dữ liệu/không chọn sẵn/không mất bản đang soạn, và quyền xem lịch sử ô chuồng.

Test API dùng HTTP adapter và test UI dùng native mocks; không ghi database thật. Export Android kiểm tra bundle, không phải APK/AAB và không thay thế việc chạy đủ 6 vai trò trên điện thoại.

Kết quả cuối:

| Kiểm tra                 | Kết quả                                                   |
| ------------------------ | --------------------------------------------------------- |
| Toàn bộ test mobile      | 20 suite / 315 test đạt, 0 bỏ qua; tiến trình tự kết thúc |
| TypeScript               | Đạt                                                       |
| Expo lint                | Đạt, không lỗi/cảnh báo                                   |
| Prettier                 | Đạt                                                       |
| Android export           | Đạt: 1.770 module, Hermes bundle khoảng 4,8 MB            |
| Backend/web working tree | Fingerprint giữ nguyên so với đầu lượt sửa                |

Artifact Android: thư mục TEMP/equinepro-seven-fixes-android. Đây là bundle kiểm tra, chưa phải bản cài APK.

Các hạng mục bổ sung ngoài bảng 7 mục trong báo cáo cũ (SSE/push nền, trình chọn điểm chấn thương 3D và tìm kiếm server ngay trong mọi hộp chọn) chưa triển khai trong lượt này.
