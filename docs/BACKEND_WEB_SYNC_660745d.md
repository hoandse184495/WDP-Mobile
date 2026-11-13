# React Native theo backend 660745d và web 6578712

Ngày cập nhật: 10/11/2026. Chỉ sửa `Forntend-mobile/mobile_app`. Không sửa Flutter, backend, frontend web, `.env` hoặc cài thêm thư viện. Đối chiếu cả working tree hiện có; fingerprint Git diff và file chưa theo dõi của backend/web giữ nguyên sau lượt làm việc.

Tài liệu này cập nhật tiếp [lượt đồng bộ trước](BACKEND_WEB_SYNC_2026_11_10.md). Các mô tả cũ về bắt buộc giờ/địa điểm khám và checkpoint hỗ trợ y tế được thay bằng hành vi dưới đây.

## Các thay đổi

| Phần | Hành vi trên React Native |
| --- | --- |
| Hồ sơ sức khỏe | Hồ sơ ngựa có nút Hồ sơ sức khỏe và thuốc. Gọi `/horses/:id/health-dossier`, kiểm tra đúng ngựa, phân nhóm lần khám, lịch chăm sóc và chấn thương. Manager, bác sĩ và Owner được xem theo quyền API; ngựa Owner chưa tiếp nhận hiển thị lý do hạn chế. |
| Lần khám và thuốc | Thẻ mở rộng hiển thị chỉ số, chẩn đoán, điều trị, đơn, lượng kê/đã xuất/còn lại, phiếu xuất, lô và người bàn giao. Thuốc ghi ngoài đơn được bỏ trùng tên theo cách web đang dùng. Giữ giá trị 0. |
| Nhật ký theo ngày | Giữ `medicalRecords` và `medicalSchedules` mới từ API. Gộp vào timeline và bộ lọc Chăm sóc y tế, có ngày thực hiện, thuốc, liều, lô, phản ứng và phiếu xuất. |
| Tủ thuốc thú y | Menu Y tế & sự cố có Tủ thuốc thú y cho Manager, bác sĩ và Thủ kho. Hiển thị tồn có thể xuất do API tính, tìm thuốc theo tên/mã, mở xem các lô đủ điều kiện. Không tự coi tổng tồn vật lý là tồn được phép xuất. |
| Đơn thuốc | Bác sĩ được xuất đơn của mình từ tủ thuốc, Thủ kho dùng kho chung. Nạp sẵn toàn bộ lượng còn lại; bỏ nhập cấp từng phần. Vẫn bắt buộc xác nhận bàn giao thực tế; gửi revision, stockVersion, previewHash và requestKey theo API. Nếu bác sĩ chưa có tủ hoạt động, hiện hướng dẫn và chặn xác nhận. |
| Hoàn tất tiêm phòng/tẩy giun | Nạp lịch và snapshot tồn tủ mới trước khi mở form. Chọn thuốc, lượng xuất, ngày và liều thực hiện, phản ứng, ngày hẹn tiếp theo hoặc không đặt thêm. Kiểm tra ngày, tồn, đơn vị cái, độ chính xác lượng và phiên bản. Backend vẫn quyết định lô và trừ tồn trong transaction. |
| Loại lịch khác | Tái khám/chăm móng không nhận xuất thuốc từ lịch. Giữ điều kiện đến ngày thực hiện và bệnh án liên kết cho hoàn tất tái khám. Giờ khám tùy chọn theo backend mới; nếu đủ hai giờ thì kiểm tra thứ tự và giới hạn 12 giờ. |
| Hỗ trợ khám | Bỏ bước bắt buộc xác nhận tự hoàn tất checkpoint đã được backend loại bỏ. Hoàn tất công việc vẫn cần ảnh bằng chứng; không gửi cờ xác nhận mốc tự động từ form hoàn thành. |
| Kho | Schema có loại Tủ thuốc thú y và Vet phụ trách chính. Chọn Vet qua `/inventory/options`, không gọi danh sách nhân sự vượt quyền Thủ kho. Ẩn và bỏ trường khu/Vet không liên quan theo loại kho. |
| Sự cố | HLV được xem và xử lý nhóm vận hành; bác sĩ xử lý nhóm sức khỏe; Manager có cả hai. Nhận ca không còn giới hạn ưu tiên khẩn. Hiển thị người phụ trách và vai trò mới. Đóng báo cáo cần ghi chú tối thiểu 3 ký tự theo backend mới. |

Các màn hình hồ sơ/tủ thuốc dùng danh sách và thẻ thu gọn, chỉ mở thêm thông tin khi chọn. Không hiển thị JSON hoặc ID nội bộ thay tên.

## Kiểm tra

- 30 suite / 405 test đạt; không skip.
- TypeScript và Expo lint đạt, không còn cảnh báo.
- Đồng bộ 132 input schema từ backend vào snapshot mobile.
- Công cụ kiểm tra route/quyền đặt trong mobile tại `scripts/inspect-backend-routes.cjs`, nạp backend ở tiến trình đọc riêng; không cần khôi phục hay sửa script trong backend.
- Có kiểm thử API/UI về phạm vi ngựa, dữ liệu hạn chế, lỗi 403 khi làm mới, quyền 6 vai trò, tồn/phiên bản tủ, xuất đủ đơn, ngày thực hiện/ngày hẹn, chọn thuốc, xóa ngày khỏi form và nhóm nhật ký y tế.
- Android export thành công, bundle Hermes khoảng 5,6 MB, tài nguyên GLB vẫn được đóng gói. Đầu ra `%TEMP%/equinepro-rn-660745d-verified` là bundle kiểm tra, chưa phải APK mới.
- Không seed/migrate hoặc gửi request ghi database trong lượt này. Chưa kiểm thử đầu cuối trên điện thoại thật với dữ liệu đang vận hành.

## Mở và kiểm tra

Chạy trong `C:\WDP\Forntend-mobile\mobile_app`:

```powershell
npx expo start -c
```

Sau đó reload app React Native đang dùng.

1. Manager/bác sĩ/Owner: Đàn ngựa → chọn ngựa → Hồ sơ sức khỏe và thuốc. Mở một lần khám, kiểm tra đơn và lịch sử xuất. Groom/HLV không được mở màn hình lâm sàng chi tiết.
2. Bác sĩ: Chức năng → Y tế & sự cố → Tủ thuốc thú y; xem thuốc, lượng còn khả dụng và lô. Thủ kho tạo tủ có Vet phụ trách và chuyển thuốc vào tủ nếu chưa có dữ liệu.
3. Bác sĩ: Lịch y tế → lịch tiêm phòng/tẩy giun đến hạn → Ghi kết quả lịch y tế. Chọn thuốc và lượng thực tế, nhập liều, ngày thực hiện, kết quả và ngày hẹn nếu cần. Xác nhận sẽ ghi dữ liệu và trừ tồn thật.
4. Bác sĩ: Đơn thuốc → mở đơn của mình → Xuất đủ thuốc và bàn giao. Kiểm tra toàn bộ lượng còn lại và nguồn tủ, xác nhận bàn giao trước khi lưu. Tải lại hồ sơ khi API báo tồn/phiên bản đã thay đổi.
5. Owner: Nhật ký chăm sóc → ngày có khám/tiêm phòng → Chăm sóc y tế; mở thẻ để xem nội dung đã lưu.
6. HLV: Báo cáo sự cố vận hành → nhận ca/đóng với ghi chú; không hiện thao tác xử lý sức khỏe. Manager/bác sĩ dùng đúng nhóm theo vai trò.

Các kiểm thử dùng mocks/fixtures; thao tác xác nhận trực tiếp trong app sẽ thay đổi database đang cấu hình.
