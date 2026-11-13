# Mobile theo vai trò và đối chiếu web

Nguồn đối chiếu: frontend web `src/App.jsx`, `src/utils/roles.js`,
`src/pages/dashboards/*` và `src/api/workspaceService.js`. Chỉ sửa mobile.

| Vai trò  | Tổng quan trên mobile                                                                                       | Lối vào chính                                                 |
| -------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Quản lý  | Chỉ số vận hành, sức khỏe, nhịp độ tập, thể lực/giáo án và cảnh báo                                         | Công việc, tiếp nhận, chuồng, huấn luyện, giám sát nhân sự    |
| HLV      | Chỉ số tập, hàng đợi đánh giá toàn bộ lịch sử, thể lực/giáo án và cảnh báo                                  | Giáo án, kết quả, lịch công việc, sức khỏe, khẩu phần         |
| Bác sĩ   | Chấn thương chưa khỏi, hồi phục, khóa tập, bệnh án; ưu tiên điều trị và lịch tái khám gần nhất của mỗi ngựa | Bệnh án, chấn thương, lịch y tế, đơn thuốc, sự cố             |
| Groom    | Giáo án đủ điều kiện trong thời hạn, khóa tập, buổi đã hoàn thành và cảnh báo; hướng dẫn và nhật ký         | Công việc hôm nay, hướng dẫn tập, chuồng, sự cố, xuất thức ăn |
| Chủ ngựa | Ngựa thuộc sở hữu, thể lực trung bình, giáo án, sức khỏe; hồ sơ ngựa, nhận xét và lịch sử khám              | Hồ sơ ngựa, giáo án, kết quả, bệnh án, tiếp nhận              |
| Thủ kho  | Số kho và hàng đợi đơn thuốc/bổ sung theo API                                                               | Cấp phát, kho, bổ sung, kiểm kê, sổ kho                       |

Menu nhóm như web: Ngựa & chuồng trại; Huấn luyện & chăm sóc;
Y tế & sự cố; Kho & vật tư; Quản trị hệ thống. Có tìm kiếm trong các mục
được cấp quyền. Các màn hình con như ô chuồng, phân công, nhập/chuyển kho,
giám sát nhân sự vẫn truy cập được trong nhóm tương ứng.

## Thích nghi cho điện thoại

- Một nút chính trên tổng quan, tối đa bốn lối tắt; kéo xuống để làm mới.
- Chạm thẻ hồ sơ để vào chi tiết, không lặp nút mở hồ sơ trên mỗi thẻ.
- Thao tác theo quyền/trạng thái đặt trong bảng trượt; chọn thao tác mới mở form.
  Các bước xác nhận, kiểm tra revision và kiểm tra API vẫn nằm trong form hiện có.
- Bộ lọc trạng thái công việc gói trong một menu; nút về hôm nay chỉ xuất hiện khi xem ngày khác.
- Sổ kho có màn hình chọn kho/vật tư độc lập, vẫn mở được từ tồn kho.
- Tổng quan hiển thị tối đa bốn hồ sơ mỗi mục, có liên kết tới danh sách đầy đủ.
  Số tổng hợp của bác sĩ/Groom/chủ ngựa và hàng đợi HLV lấy đủ các trang,
  không dùng độ dài trang đầu làm tổng số.

## Quyền API và giới hạn

Backend là nguồn quyết định quyền cuối cùng. Web có đường dẫn huấn luyện cho
bác sĩ nhưng API giáo án chỉ cấp cho quản lý/HLV/Groom/chủ ngựa: mobile đưa
bác sĩ đến chỉ số buổi tập. Chủ ngựa không có lịch công việc nội bộ hoặc danh
sách chấn thương; Groom vẫn xem được chấn thương theo quyền backend.
Thủ kho không có xuất thức ăn của Groom.

Biểu đồ mobile dùng cột số buổi tập tối đa bảy ngày có hoạt động gần nhất
trong kỳ 30 ngày, kèm vận tốc/nhịp tim trung bình ngày gần nhất; không sao chép
biểu đồ hai trục Recharts của web. Mặt bằng vẫn dùng sơ đồ native hiện có;
mô hình chấn thương Three.js, SSE/push nền và ghi offline chưa được bổ sung.

Kiểm thử adapter và giao diện dùng dữ liệu mô phỏng hợp đồng, không thay thế
kiểm tra thao tác thực tế của sáu tài khoản trên iPhone/Android với backend.
