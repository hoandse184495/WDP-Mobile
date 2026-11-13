# Đồng bộ mobile theo backend và web mới — 09/11/2026

Đối chiếu backend commit 34098e0 và web commit b61d750, kèm các thay đổi cục bộ hiện có. Chỉ sửa mobile; không thay source backend/web, .env hoặc database. Mô hình 3D và kết nối SSE của lượt trước được giữ lại.

## Những thay đổi đã đưa vào mobile

| Phần                    | Mobile hiện có                                                                                                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nhật ký chăm sóc        | Màn hình theo ngày Việt Nam, Hôm nay/Hôm qua và bộ chọn ngày; gộp công việc và buổi tập theo thời gian; lọc bữa ăn, huấn luyện, chăm sóc/chuồng và hỗ trợ y tế.                                                                  |
| Tổng hợp                | Hiện số bữa và số buổi tập gọn; mở Xem tổng hợp trong ngày để xem Groom, HLV, ô chuồng, thời điểm ăn/vệ sinh, cự ly, nhịp tim và thông tin sức khỏe từ server.                                                                   |
| Chi tiết hoạt động      | Mở từng dòng để xem thời gian, người phụ trách, hướng dẫn, ghi nhận, kết quả ăn, phần thừa, số đo buổi tập và nhận xét. Giữ đúng lượng 0 và phân biệt trạng thái hủy với hoàn thành.                                             |
| Ảnh nhật ký             | Xem ảnh và mở lớn; không lưu cache ảnh riêng tư trên đĩa. Lỗi ảnh/hết hạn URL có nút tải lại nhật ký. Ảnh Unsplash được backend dùng làm fallback có nhãn ảnh minh họa.                                                          |
| Lịch sử khóa huấn luyện | Mở gọn trong hồ sơ ngựa, hiển thị từng nhóm 5 lần ghi nhận. Có hành động, ngày giờ, người thực hiện, vai trò và nội dung/lý do. Hoàn tất khám đầu vào có nhãn riêng. API chỉ trả tối đa 50 lần gần nhất.                         |
| Chờ khám xác nhận       | Hồ sơ ngựa hiện trạng thái tạm khóa và lý do. Màn hình Bệnh án có hàng đợi cho Manager/bác sĩ; tổng quan bác sĩ liên kết về hàng đợi. Đọc qua các trang ngựa trong phạm vi tài khoản, không thêm bộ lọc ngoài hợp đồng API.      |
| Khám nhanh              | Bác sĩ mở Khám xác nhận cho ngựa này để vào lần khám đã điền đúng ngựa và loại cấp cứu. Tải lại hồ sơ qua API trước khi nạp form, bỏ dữ liệu khám cũ từ ngựa khác.                                                               |
| Khóa/mở khóa            | Manager/bác sĩ có nút ở hồ sơ ngựa và chi tiết ô chuồng, lý do khóa gợi ý có thể chỉnh sửa; màn mở khóa nhắc điều kiện chấn thương. Backend quyết định và vẫn có thể từ chối; mobile không tự thay trạng thái để vượt điều kiện. |

Các API mới được nối vào mobile:

- GET /horses/:id/care-journal?date=YYYY-MM-DD.
- GET /horses/:id/lock-history.

Mobile xác minh quyền trên GET /horses/:id trước khi đọc hai feed mới. Khi API chi tiết trả 403/404, không gửi tiếp request nhật ký/lịch sử. Query key tách tài khoản, vai trò, ngựa và ngày; đổi ngày hủy request cũ. Khi làm mới bị từ chối, màn hình bỏ nội dung nhật ký cũ và hiện lỗi/thử lại.

## Cách mở trên app

1. Đăng nhập chủ ngựa: Trang chủ > Nhật ký chăm sóc chiến mã > chọn ngựa > Mở nhật ký chăm sóc. Hoặc mở hồ sơ ngựa > Nhật ký chăm sóc theo ngày.
2. Chọn ngày và nhóm hoạt động; nhấn Xem chi tiết hoạt động ở dòng cần trình bày. Thông tin tổng hợp chi tiết nằm sau nút Xem tổng hợp trong ngày.
3. Trong hồ sơ ngựa, nhấn Xem lịch sử khóa huấn luyện để xem các mốc ghi nhận.
4. Manager/bác sĩ: Bệnh án & điều trị > Chờ khám xác nhận. Bác sĩ mở khám từ đúng ngựa; bổ sung dữ liệu khám thực tế và lưu theo luồng sẵn có. Với chấn thương, bộ chọn điểm 3D vẫn nằm trong phần chấn thương của lần khám.
5. Khóa/mở huấn luyện cũng có trong hồ sơ ngựa và chi tiết ô chuồng. Groom, HLV, Owner không có quyền dùng các nút này.

Nhật ký lọc hoạt động theo ngày; sức khỏe, người phụ trách và lần khám gần nhất là thông tin hiện tại do backend trả, không phải ảnh chụp lịch sử tại ngày đã chọn. UI có ghi rõ điều này. Nhật ký là màn hình xem dữ liệu, không thực hiện cho ăn/cấp thuốc hay hoàn tất công việc thay người dùng.

## Kiểm tra

- 27 suite / 363 test mobile đạt, tiến trình tự kết thúc.
- TypeScript và Expo lint đạt.
- Android export thành công, bundle Hermes khoảng 5,5 MB; GLB 3D vẫn có trong tài nguyên đóng gói. Đầu ra: TEMP/equinepro-care-journal-android. Đây chưa phải APK.
- So sánh fingerprint git status, diff và file untracked: backend/web giữ nguyên so với đầu lượt sửa.

24 test mới kiểm tra hợp đồng API, phạm vi truy cập, ngày hợp lệ, phản hồi sai ngày/ngựa, đổi ngày và hủy truy vấn, phản hồi muộn, lỗi 403 khi làm mới, danh sách rỗng, phân nhóm timeline, phần thừa 0, URL/preview/tải lại ảnh, lịch sử khóa nạp khi mở, quyền 6 vai trò và nạp form khám không mang theo chẩn đoán cũ.

Kiểm thử API/UI dùng fixtures, không ghi database. Chưa thực hiện kiểm thử đầu cuối trên điện thoại thật với dữ liệu của bạn. Không cài thêm thư viện native trong lượt đồng bộ này; khởi động lại Metro bằng npx expo start -c rồi reload app để nhận thay đổi.
