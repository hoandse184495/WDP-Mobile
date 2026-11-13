# Đồng bộ mobile với backend và web — 09/11/2026

## Phạm vi

Chỉ chỉnh `Forntend-mobile/mobile_app`. Backend và web được đọc để đối chiếu. Fingerprint working tree của cả hai được lưu trước khi sửa và kiểm tra lại; không sửa source/cấu hình backend/web, không migrate, seed hoặc ghi database.

Backend đối chiếu: commit `731c224`, gồm các thay đổi checklist, telemetry và điều phối y tế. Mobile tiếp tục dùng các thư viện đã cài, không cài thêm dependency.

## Thay đổi

| Luồng               | Xử lý trên mobile                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checklist công việc | Groom được tải/gỡ ảnh và hoàn thành từ `scheduled` hoặc `in_progress`; công việc đã kết thúc vẫn chỉ đọc. Ảnh và điều kiện khóa từ server vẫn được kiểm tra. Không thêm cổng chặn theo giờ local.                                                                                                                                                                   |
| Bắt đầu buổi tập    | Gửi `scenario` đã chọn qua `/daily-tasks/:id/start`. Sau thao tác làm mới cả telemetry; số liệu mô phỏng được ghi nhãn rõ. Hoàn thành bị chặn khi lượt mô phỏng còn chạy.                                                                                                                                                                                           |
| Hỗ trợ khám         | Các checkpoint được mở từ trạng thái chờ. Hoàn thành trực tiếp chỉ gửi `autoCompleteCheckpoints=true` khi người dùng chủ động xác nhận đã bàn giao và đưa ngựa về. Không tick sẵn xác nhận thực tế.                                                                                                                                                                 |
| Cho ăn              | Form kết thúc theo checklist mới, yêu cầu chọn tình trạng ăn và ghi chú khi bất thường/khẩu phần đổi. Không chặn kết thúc theo yêu cầu xuất kho cũ mà BE hiện không áp dụng. Xuất thức ăn là thao tác riêng, không tự suy ra đã trừ kho từ kết quả ăn. Không tiếp tục hiển thị form lượng thừa ở bước kết thúc khi BE không còn lưu các trường đó ở luồng hiện tại. |
| Giao việc           | HLV và Manager đều chọn được các loại công việc mà BE cho phép; vẫn kiểm tra phân công/scope tại server. Bổ sung thao tác giao nhiều công việc qua `/daily-tasks/bulk`, có khóa gửi lại ổn định cho mỗi dòng và validation mục tiêu/giờ/khẩu phần theo dòng. Lịch lặp có preview vẫn giữ nguyên.                                                                    |
| Form nhiều dòng     | Đọc đúng ngựa/giáo án của từng phần tử; không lấy nhầm dữ liệu từ phần ngoài. Lọc giáo án/khẩu phần theo ngựa được chọn.                                                                                                                                                                                                                                            |
| Nhận ngựa trực tiếp | Thêm lựa chọn ô trống, HLV, Groom và bác sĩ từ `/stables`; lựa chọn để trống không gửi chuỗi rỗng làm ObjectId. Thông báo ngựa mới cần khám đầu vào.                                                                                                                                                                                                                |
| Khẩn cấp            | Manager/Vet có thao tác khóa/mở khóa theo trạng thái hiện tại, có lý do và hộp xác nhận. Các vai trò khác không thấy quyền này. Tổng quan Vet có hàng đợi ngựa tạm khóa chờ khám xác nhận.                                                                                                                                                                          |
| Y tế                | Snapshot mới có chiều cao trong bệnh án/lần khám. Danh sách/chi tiết hiện số đo chiều cao. Form lịch khám có `autoCoordinate` và lựa chọn Groom theo phân công ngựa, tránh gọi `/users` bằng quyền Vet.                                                                                                                                                             |
| Đánh giá tập        | HLV có thể nhập điểm thể lực 0–100; để trống không ghi điểm. Groom không được gửi trường này qua thao tác ghi chú. Làm mới hồ sơ ngựa sau đánh giá.                                                                                                                                                                                                                 |

Đã đồng bộ 132 Zod input contracts vào snapshot mobile. Fingerprint: `c355c18cb003eb346f5a7cee8bf9c25ffee5bb9fddb42e24d441971b81fb08f5`.

## Kiểm tra

Kết quả cuối:

| Kiểm tra                | Kết quả                                           |
| ----------------------- | ------------------------------------------------- |
| TypeScript              | Đạt                                               |
| Expo lint               | Đạt                                               |
| Test mobile             | 15 suite, 263 test đạt                            |
| Android export          | Đạt; 1.762 module được bundle, có Hermes artifact |
| Backend/web fingerprint | Giữ nguyên so với đầu lượt làm việc               |

Artifact Android: thư mục TEMP/equinepro-mobile-android-20261109-final.

Unit/UI tests dùng mock network/native modules và đối chiếu endpoint/quyền từ source router; không coi là E2E thiết bị.

- Hồi quy: hoàn thành checklist trực tiếp, không có ảnh, xác nhận hỗ trợ khám không tick sẵn, mô phỏng và payload scenario, ngựa bị khóa, phân quyền khẩn cấp, các trường mới, giao việc theo đợt, chọn hồ sơ đúng dòng và hàng đợi Vet.
- Backend không phản hồi tại `http://127.0.0.1:3000/` khi kiểm tra; không khởi động/sửa backend để vượt qua giới hạn này.
- `.env` mobile đang dùng API LAN do người dùng cấu hình; không thay `.env` mobile hoặc backend/web.
- Export Android tạo Hermes bundle, không phải APK/AAB hoặc bằng chứng app đã chạy trên điện thoại.

## Kiểm tra nhanh khi backend chạy lại

1. Mở mobile, đăng nhập Groom. Chọn việc chăm sóc chưa bắt đầu, tải ảnh và xác nhận hoàn thành trực tiếp. Thử không có ảnh để thấy nút bị chặn.
2. Chọn buổi tập, chọn kịch bản và bắt đầu; xác nhận thấy telemetry mô phỏng. Dừng/chốt mô phỏng trước khi nộp kết quả.
3. Chọn việc hỗ trợ khám, thử hoàn thành khi chưa xác nhận bàn giao/đưa về; sau đó xác nhận thực tế và gửi lại.
4. Với việc cho ăn, chọn rõ kết quả ăn; thử ăn bất thường không có ghi chú. Đối chiếu phiếu xuất riêng nếu có thao tác kho.
5. Đăng nhập Manager/Vet, mở ngựa đủ điều kiện, kiểm tra khóa khẩn cấp và mở khóa với lý do. Hàng đợi bác sĩ phải phản ánh dữ liệu server.
6. Manager thêm ngựa, chọn ô trống và nhân sự; thử bỏ trống các lựa chọn tùy chọn. Kiểm tra hồ sơ mới chờ khám đầu vào.
7. Vet ghi chiều cao trong bệnh án, tạo lịch có giờ và bật tự điều phối; chọn Groom đúng ngựa hoặc dùng phân công hiện hành của server.
8. HLV đánh giá buổi tập, nhập điểm thể lực; kiểm tra hồ sơ ngựa đã được cập nhật.
9. Manager/HLV chọn Giao nhiều công việc tại màn hình lịch ngày. Thêm hai dòng dùng hai ngựa/giáo án khác nhau; kiểm tra lựa chọn từng dòng, thử giờ kết thúc trước giờ bắt đầu và quyền của Groom.

Camera, thư viện ảnh, SecureStore và thao tác thật Android/iOS vẫn cần xác minh trên development build khi backend truy cập được.

## Tài liệu nền tảng đã đối chiếu

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Expo Router SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/router/)
- [ImagePicker SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/)
