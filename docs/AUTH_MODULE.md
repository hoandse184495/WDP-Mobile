# Module 1 — Đăng nhập và quản lý phiên

> Tài liệu chi tiết module xác thực đã hoàn thiện trước. Phạm vi ứng dụng hiện tại gồm các module nghiệp vụ tại [README](../README.md); kết quả kiểm tra mới ở [VERIFICATION.md](VERIFICATION.md).

## Phạm vi

Hoàn thiện trên dự án Expo hiện có, không tạo lại app hoặc thêm dependency. Chỉ thay đổi mobile và các kiểm thử/tài liệu liên quan. Không sửa source, cấu hình hoặc database backend; không sửa frontend web. Các module nghiệp vụ được phát triển ở giai đoạn sau, trên cùng kiến trúc phiên.

Đã đối chiếu `auth.routes.js`, `auth.controller.js`, `auth.service.js`, `password.service.js`, middleware bảo vệ route và schema Zod của backend. Các API dùng tiền tố `/api` trong URL cấu hình:

| API                          | Request                                         | Response data                       |
| ---------------------------- | ----------------------------------------------- | ----------------------------------- |
| POST `/auth/login`           | `{email,password}`                              | `{token,user}`                      |
| GET `/auth/me`               | Bearer token, hỗ trợ AbortSignal ở mobile       | `{user}`                            |
| POST `/auth/change-password` | `{currentPassword,newPassword,confirmPassword}` | `{changed:true,loginRequired:true}` |

Envelope: `{success:true,message,data}`; lỗi HTTP giữ `message`, `errors` và status. Backend chưa có refresh token hoặc logout endpoint, do đó mobile không gọi các endpoint giả. Logout chỉ xóa phiên trên thiết bị; đổi mật khẩu thu hồi phiên cũ theo xử lý backend hiện có.

## Tổ chức code

```text
features/auth/
  api/           auth-api.ts, auth-keys.ts
  hooks/         use-login, use-current-user, use-change-password,
                 use-credential-mutation, use-session-lifecycle
  components/    login-form, change-password-form, session-bootstrap
  screens/       login-screen
  schemas/       auth-schema
  stores/        session-store
  types/         auth
  utils/         session
features/profile/screens/profile-screen.tsx
providers/app-providers.tsx
```

Route files tiếp tục là thin exports. UI không gọi Axios trực tiếp. API functions xử lý schema response; hooks dùng TanStack Query; forms dùng React Hook Form/Zod và shared components/theme có sẵn.

`authKeys.me` là cache key dùng chung cho khôi phục phiên, observer vòng đời app và màn hình tài khoản. Khi mở app có token, `/auth/me` luôn được kiểm tra trước khi cho phép truy cập. Khi đăng nhập mới, user đã được backend xác thực được đưa vào cache để tránh request trùng. Khi app trở lại foreground, Query kiểm tra lại `/auth/me`; thay đổi quyền yêu cầu đăng nhập lại. Lỗi mạng của một lần refetch không tự coi token là hết hạn.

Zustand giữ trạng thái phiên và bản chụp principal phục vụ route/role guard. Dữ liệu `/auth/me` được TanStack Query quản lý và cập nhật principal sau khi xác thực. Không lưu password hoặc profile vào persistent storage thường.

## Trạng thái và hành vi

| Trạng thái      | UI và quyền truy cập                                                  |
| --------------- | --------------------------------------------------------------------- |
| `restoring`     | Loading, chưa hiển thị màn hình riêng tư hoặc form login              |
| `guest`         | Form login; phiên rỗng không gọi `/auth/me`                           |
| `authenticated` | Mở route bảo vệ, profile dùng dữ liệu Query                           |
| `restore-error` | Hiển thị lỗi và retry; mất mạng không xóa token có thể khôi phục      |
| `signing-out`   | Khóa route riêng tư, hủy query/xóa cache và xóa SecureStore           |
| `signout-error` | Tiếp tục khóa route; yêu cầu retry xóa token trước khi quay lại login |

- Login có validation, trạng thái đang gửi, khóa thao tác gửi trùng, ẩn/hiện password và lỗi API. Email được trim/lowercase theo kiểu lưu email backend; password giữ nguyên whitespace.
- SecureStore write thất bại không được coi là đăng nhập thành công; mobile thử dọn token đã lưu trước khi báo lỗi.
- 401 của phiên hiện tại dẫn về login với thông báo. 401 login không tạo phiên hoặc giả lập thành công. 401 đến muộn của token cũ không xóa token mới.
- Version của phiên cùng hàng đợi storage bảo vệ login/restore/logout khỏi response hoặc thao tác lưu/xóa đến muộn.
- Logout xóa cache tài khoản; không để thao tác logout cũ xóa token của lần login mới.
- Password mutation không tự retry, không giữ biến credentials trong mutation cache sau khi hoàn tất; các ô password được xóa sau request. Không có logging credentials.
- Đổi password theo đúng giới hạn backend: hiện tại tối đa 256 ký tự; mật khẩu mới tối thiểu 12 ký tự, tối đa 72 byte UTF-8, xác nhận phải khớp.
- Thành công đổi mật khẩu yêu cầu login lại. Sai mật khẩu hiện tại (403) giữ phiên hiện tại và hiển thị lỗi. Response đổi mật khẩu đến muộn từ phiên cũ không đăng xuất tài khoản mới.
- Response user rỗng/sai schema, role không hợp lệ, tài khoản inactive hoặc token rỗng là lỗi; không chuyển thành profile rỗng hoặc phiên thành công.

## Cách chạy

Khởi động backend theo cấu hình sẵn có trong terminal riêng. Không cần đổi backend để chạy module này. Mobile mặc định dùng `http://10.0.2.2:3000/api` cho Android Emulator; nếu backend chạy ở port khác, sửa **chỉ `.env` của mobile**.

```powershell
cd C:\WDP\Forntend-mobile\mobile_app
npm ci
# Nếu chưa có .env, sao chép .env.example; không ghi đè cấu hình local hiện có.
npm start -- --go
```

`--go` mở Metro cho Expo Go. Thiết bị cần Expo Go hỗ trợ đúng SDK 58 của dự án. Nếu dùng development build đã cài thì chạy `npm start -- --dev-client`; cấu hình build development hiện có trong `eas.json`.

Điện thoại thật phải dùng IP LAN của máy chạy backend hoặc HTTPS URL thay cho `10.0.2.2`. Không dùng localhost của điện thoại để trỏ về máy tính. Sau khi đổi `.env` mobile, khởi động lại Metro với `--clear`. Các biến EXPO_PUBLIC_* chỉ chứa cấu hình công khai.

## Kiểm thử tự động

```powershell
npm run typecheck
npx expo lint
npm run test:auth
npm test
npm run format:check
npm run export:android
```

`test:auth`: 3 suite, 49 test cho hợp đồng API, session/storage, UI/form và vòng đời phiên. UI tests đi qua form → hook → Axios adapter → schema response → storage/cache → screen; không mock thành công ở tầng UI. Chỉ adapter HTTP và native SecureStore được thay bằng fixture trong test. Đây không phải kiểm thử backend đang chạy thật.

## Kiểm tra thủ công với backend thật

1. Mở app chưa có phiên: thấy login, không thấy dữ liệu riêng tư. Nhập email sai/bỏ trống password: báo lỗi mà không gửi API.
2. Dùng tài khoản đã được cấp: thử password sai rồi đúng. Kiểm tra loading, nút/field bị khóa khi request chạy, lỗi thật hiển thị và password được xóa sau request.
3. Login thành công: mở tab Tài khoản, kiểm tra tên/email/role. Tài khoản chưa có số điện thoại hiển thị “Chưa cập nhật”. Lặp lại với các role được cấp.
4. Đóng/mở lại app: phải kiểm tra `/auth/me` trước khi vào màn hình riêng tư. Tắt mạng trước khi mở: thấy lỗi/retry, không giả lập xác thực; bật mạng và retry.
5. Khi đang đăng nhập, đưa app về nền rồi mở lại: kiểm tra `/auth/me` refetch. Nếu backend báo token không hợp lệ, app xóa phiên và yêu cầu login lại.
6. Đăng xuất rồi thử mở lại route riêng tư: phải quay về login. Đổi sang tài khoản khác: không thấy cache của tài khoản trước.
7. Đổi password: thử xác nhận lệch, password dưới 12 ký tự, vượt 72 byte UTF-8, password hiện tại sai. Thử giá trị hợp lệ: về login với thông báo và cần dùng password mới. Chỉ thực hiện bước thành công với tài khoản kiểm thử được phép đổi password.

Lúc thực hiện lượt này, HTTP GET tới backend local cổng 3000 không kết nối được. Vì vậy chưa xác minh login thật/SecureStore thật trên thiết bị; không lấy credentials, seed dữ liệu, khởi động hoặc sửa backend để che giới hạn này. Xem kết quả thực thi ở [VERIFICATION.md](VERIFICATION.md).

Tham chiếu SDK đã đối chiếu: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [SecureStore SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).
