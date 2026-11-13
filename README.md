# EquinePro Mobile

> Đã hoàn thiện [7 điểm còn thiếu so với web/backend](docs/MOBILE_SEVEN_FIXES_2026_11_09.md): giáo án Manager, nhận dạng, kết quả ăn, chi tiết ô, nhật ký, đánh giá và thông báo.

> Cập nhật 09/11/2026: [đồng bộ backend/web và hướng dẫn kiểm tra mobile](docs/BACKEND_SYNC_2026_11_09.md). Các luồng checklist/điều phối bên dưới áp dụng theo cập nhật mới này.

Ứng dụng React Native tiếp tục trên source `Forntend-mobile/mobile_app` hiện có. Chỉ sửa mobile; backend và frontend web được dùng để đối chiếu nghiệp vụ/API.

Expo SDK 58, React Native 0.88, React 19.3, TypeScript strict, Expo Router, TanStack Query, React Hook Form, Zod và Zustand. UI tiếng Việt, dùng chung theme/components, không trả dữ liệu giả khi API lỗi.

> Nếu gặp lỗi khởi động Android hoặc trình duyệt: xem [cách xử lý](docs/STARTUP_TROUBLESHOOTING.md).

## Chạy ứng dụng

Yêu cầu Node.js 22 và backend hiện có đang chạy.

```powershell
cd C:\WDP\Forntend-mobile\mobile_app
npm ci
# Chỉ sao chép nếu chưa có .env của mobile:
Copy-Item .env.example .env
npm start
```

Cấu hình công khai trong `.env` mobile:

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

- Android Emulator: `10.0.2.2` trỏ về máy phát triển nếu backend chạy port 3000.
- Điện thoại thật: dùng `http://<IP-LAN-máy-chạy-backend>:3000/api`, cùng mạng LAN. Không dùng localhost trên điện thoại.
- iOS Simulator: dùng URL backend mà máy Mac truy cập được.
- Sau khi đổi URL mobile: `npx expo start --clear`.
- Có native modules mới: tạo development build bằng `npx expo run:android`, sau đó `npx expo start --dev-client`. iOS local cần macOS/Xcode. Expo Go phải hỗ trợ đúng SDK 58 và các modules đang dùng.
- Staging/production bắt buộc HTTPS. Cấu hình URL tương ứng trong môi trường EAS; chưa ký hoặc phát hành app.

Không sao chép `.env` backend/web vào mobile; không đưa JWT secret, mật khẩu, MongoDB URI hoặc Supabase service key vào ứng dụng.

## Phạm vi chức năng

Điều hướng và thao tác theo 6 vai trò: Manager, thủ kho, HLV, bác sĩ, Groom và chủ ngựa. Backend xác định quyền/phạm vi cuối cùng.

| Nhóm         | Luồng mobile                                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tài khoản    | Đăng nhập, SecureStore, khôi phục qua `/auth/me`, đăng xuất, đổi mật khẩu, kiểm tra phiên foreground, xử lý 401                                     |
| Tổng quan    | Dashboard Manager/HLV, ngựa trong phạm vi, hàng đợi kho/thuốc/bổ sung cho thủ kho                                                                   |
| Ngựa         | Tìm kiếm/phân trang, tạo/sửa/lưu trữ, ảnh đại diện, nhận dạng, phả hệ, đề xuất/duyệt/xác minh                                                       |
| Tiếp nhận    | Hồ sơ chủ ngựa, tài liệu raw, gửi duyệt, phân công, duyệt Groom/Vet/HLV/Manager, kế hoạch trả ngựa, xác nhận thú y và rời CLB                       |
| Chuồng       | Khu/ô, mặt bằng, bảo trì, lưu trú/chuyển ngựa, phân công Groom/HLV/khu, công suất, xem trước/xác nhận bàn giao                                      |
| Công việc    | Lịch ngày, lọc trạng thái, giao/sửa/hủy, giao nhiều ngày có preview, bắt đầu/hoàn thành, ảnh, báo trở ngại và xử lý cảnh báo                        |
| Huấn luyện   | Giáo án nhiều bài, tạo/sửa/ngừng dùng, kết quả, đánh giá HLV, ghi chú Groom, hiệu chỉnh Manager có lý do                                            |
| Theo dõi tập | Bắt đầu/dừng mô phỏng API, biểu đồ mẫu, chỉ số/cảnh báo; nhãn rõ dữ liệu mô phỏng, không phải số đo thiết bị                                        |
| Y tế         | Bệnh án, triệu chứng/thuốc, lần khám nhiều chấn thương có version, hồi phục/kết luận, lịch hẹn, tái khám và chốt lịch                               |
| Hỗ trợ khám  | Manager điều phối, Groom xác nhận bàn giao bác sĩ/đưa ngựa về, bằng chứng và hoàn thành                                                             |
| Khẩu phần    | Soạn/sửa nhiều bữa, vật tư/lượng, gửi/duyệt/yêu cầu sửa/ban hành/thu hồi, xuất thức ăn và ghi nhận lượng thừa                                       |
| Đơn thuốc    | Chốt/dừng đơn, chọn người nhận, đối chiếu lô/tồn, cấp một phần/toàn bộ, xác nhận bàn giao, lịch sử cấp                                              |
| Kho          | Danh mục/kho, nhập/chuyển nháp–xác nhận–hủy, tồn theo lô/HSD, tính nhu cầu/duyệt/cấp bổ sung, kiểm kê theo trang/đối soát/đếm lại/hủy, xử lý vật tư |
| Sổ kho       | Kho/vật tư/ngày/lô/loại, đầu/cuối kỳ, chênh lệch, chứng từ gốc                                                                                      |
| Sự cố        | 9 loại, đối tượng ngựa/ô/khu/kho, vật tư/lô/công việc, ảnh thêm/gỡ, gửi, giao/nhận ca, ghi/liên kết kết quả khám, Manager đóng                      |
| Nhân sự      | Tạo/sửa, kích hoạt/vô hiệu, reset mật khẩu, giám sát theo ngày/nhân viên/hàng đợi và audit                                                          |
| Thông báo    | Phân trang/chưa đọc, đọc/đọc hết với mốc server, mở hồ sơ và đợt công việc                                                                          |

Danh sách có loading, empty, error/retry và phân trang theo server. Form chọn hồ sơ tham chiếu qua API. Các xác nhận thực tế không đánh dấu sẵn. Revision, stockVersion, previewHash và requestKey theo từng nghiệp vụ; lỗi 409 cần tải lại và đối chiếu hồ sơ.

Mặt bằng xem bằng sơ đồ native và sửa bằng khối/toạ độ. Chấn thương chọn điểm trên mô hình 3D đóng gói cùng app, dùng cùng hình học và tọa độ với web. Thông báo và telemetry nhận cập nhật SSE có xác thực khi app đang mở; xuống nền thì đóng kết nối và quay lại sẽ kết nối lại. Ô chọn hỗ trợ tìm kiếm máy chủ hoặc đọc các trang trong phạm vi quyền khi API chưa có search. Chưa có push nền hay hàng đợi ghi offline. Xem [hướng dẫn và kết quả kiểm tra](docs/MOBILE_LIVE_3D_SEARCH_2026_11_09.md).

Nhật ký chăm sóc theo ngày, lịch sử khóa/mở huấn luyện và luồng khám xác nhận đã được nối theo backend/web mới. Xem [hướng dẫn và kiểm tra bản đồng bộ](docs/BACKEND_SYNC_CARE_JOURNAL_2026_11_09.md).

## Kiến trúc và bảo trì

- `src/app`: route mỏng, Expo Router và guard.
- `src/core`, `src/shared`: network, storage, theme, UI dùng chung, ngày giờ native.
- `src/features`: API, hooks, components/screens từng nhóm; cấu hình thao tác riêng tại admissions/medical/inventory/stables.
- `src/features/operations`: API, hooks, contracts, form components và screen nghiệp vụ dùng chung.
- `src/features/workspace`: danh sách, bộ lọc và chi tiết theo module.
- `__tests__`: validation, API adapter, session, UI flows.

TanStack Query quản lý server state; Zustand giữ trạng thái phiên. Form dùng snapshot JSON Schema từ Zod input của backend; app chạy độc lập, không import backend. Refinement không chuyển được sang JSON Schema được bổ sung ở mobile; backend vẫn xác thực đầy đủ.

Khi API được cập nhật, đối chiếu thay đổi rồi chạy từ thư mục mobile:

```powershell
node scripts/sync-api-contracts.cjs
npm run format
npm run typecheck
npm run lint
npm test
```

Script chỉ đọc schema công khai và ghi snapshot mobile, không đọc `.env`, kết nối DB hoặc ghi backend. Không chạy trong startup/build.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm test
npm run format:check
npx expo install --check
npx expo-doctor
npm run export:android
```

`export:android` tạo Hermes bundle, không tạo APK. Xem [kết quả](docs/VERIFICATION.md), [kịch bản từng vai trò](docs/MOBILE_WORKFLOWS.md), [xác thực](docs/AUTH_MODULE.md) và [đối chiếu source](docs/PROJECT_ANALYSIS.md).

Backend local port 3000 chưa truy cập được tại lần kiểm tra này nên chưa xác minh E2E, camera/keychain/document picker trên thiết bị. Không lấy credentials, seed DB hoặc sửa backend để vượt qua giới hạn đó.
