# Kết quả kiểm tra

> Cập nhật 09/11/2026: [đồng bộ backend/web và hướng dẫn kiểm tra mobile](BACKEND_SYNC_2026_11_09.md). Các luồng checklist/điều phối bên dưới áp dụng theo cập nhật mới này.

> Báo cáo mới ngày 05/11/2026: [kiểm tra nghiệp vụ theo vai trò](ROLE_FLOW_AUDIT.md).

Thực hiện ngày 02/11/2026 trên Windows, Node.js 22.22.3. Nội dung bên dưới là kết quả lịch sử, chưa phải chứng nhận phát hành production.

| Kiểm tra                                | Kết quả                                            |
| --------------------------------------- | -------------------------------------------------- |
| `npm run typecheck`                     | Đạt; TypeScript strict, gồm test source            |
| `npm run lint`                          | Đạt, không lỗi/cảnh báo                            |
| `npm test -- --silent`                  | 9 suite, 88 test đạt; tự kết thúc, không forceExit |
| `npx expo install --check`              | Dependency tương thích SDK, up to date             |
| `npx expo-doctor`                       | 20/20 kiểm tra đạt                                 |
| `npm run export:android`                | Đã xuất bundle Hermes; không phải APK              |
| HTTP GET `http://127.0.0.1:3000/`       | Không kết nối được                                 |
| Backend E2E / Android-iOS thiết bị thật | Chưa thực hiện                                     |

## Phạm vi kiểm thử tự động

- Login/me/password, 6 role, SecureStore đọc/ghi/xóa lỗi, restore offline/retry, response muộn của phiên cũ, query cache và logout.
- UI login, danh sách loading/empty/error/retry, route guard.
- Task evidence bắt buộc, finish chăm sóc, ngoại lệ cho ăn, số đo và validation giáo án/lịch.
- Registry thao tác có hợp đồng và vai trò hợp lệ; quyền thủ kho tách với ngựa/nhân sự; assignment cho ca khám, task hỗ trợ và kiểm kê.
- Payload Groom không gửi số đo/nhận xét HLV; giữ null khác 0 khi kiểm kê; lấy đúng trang kiểm đếm; phiên bản lịch/chấn thương.
- Đơn thuốc dùng revision, stockVersion và previewHash vừa lấy từ server; xác nhận bàn giao không đánh dấu sẵn.
- UI cấp thuốc → API adapter: chưa xác nhận thực tế không gửi; sau xác nhận gửi lượng và concurrency guards đúng. Manager bị chặn trước request vào màn hình cấp thuốc.
- Batch và task thường dùng cùng quy đổi UTC+7 và request key; bộ lọc và pagination server; delete envelope không có data; lỗi 409 được giữ là lỗi.

HTTP adapter và native modules được thay bằng fixtures trong tests; runtime không dùng mocks. Không coi test adapter là kiểm thử server thật.

## Phạm vi file

Chỉ ghi trong `C:\WDP\Forntend-mobile\mobile_app`. Backend và web giữ nguyên trạng thái git ban đầu: chỉ `package-lock.json` đã thay đổi sẵn. Backend lock SHA256 vẫn là `E516531EA0A9EF6D8DEE07B2F116CF315C50C5939D7B28A2B00CDCC68AD5D6DB`.

Không sửa `.env` backend/web, không chạy migrate/seed hoặc ghi DB. Script contracts chỉ đọc schema công khai rồi ghi snapshot trong mobile.

## Cần xác minh trên môi trường chạy thật

- Kịch bản [từng vai trò](MOBILE_WORKFLOWS.md), quyền/scope, transaction, revision stale, retry sau timeout và dữ liệu nhiều trang.
- Camera/thư viện ảnh, tài liệu PDF/ảnh, quyền từ chối, signed URL hết hạn, keychain và chuyển tài khoản trên development build.
- Giao việc nhiều ngày, bàn giao Groom, tái khám nhiều chấn thương, cấp thuốc một phần, xuất thức ăn và kiểm kê nhiều trang trên dữ liệu kiểm thử.
- Chưa có SSE/push nền/ghi offline; Three.js 3D web chưa tái tạo native. Telemetry vẫn là mô phỏng, được ghi nhãn rõ.
- Chưa ký APK/AAB/IPA, upload store hoặc deploy. Chưa chạy dependency audit mới sau khi thêm native modules; không dùng kết quả audit cũ làm kết quả hiện tại.

Hướng dẫn cài/chạy ở [README](../README.md).
