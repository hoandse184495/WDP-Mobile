# Xử lý lỗi khởi động mobile

## Mở thử trên trình duyệt

Tại thư mục mobile, dừng Metro cũ bằng Ctrl+C rồi chạy:

```powershell
npx expo start --clear --web --max-workers 2
```

Metro cần khởi động lại sau khi thêm file theo nền tảng để bỏ đường dẫn module đã lưu trong cache.

Android/iOS tiếp tục lưu token bằng SecureStore. Trình duyệt dùng file `src/core/storage/token-storage.web.ts` với sessionStorage: phiên tồn tại khi tải lại cùng tab, và được xóa khi đăng xuất hoặc đóng tab. Không gọi SecureStore trên web vì module không hỗ trợ nền tảng này. Render phía server không đọc bộ nhớ trình duyệt; lỗi storage bị chặn được chuyển tới màn hình thử lại phiên hiện có.

Nguồn API: [Expo SecureStore SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).

Log trỏ tới `fetchThenEvalJs.js` là vị trí nạp bundle; cần xem lỗi JavaScript trong trình duyệt để biết nguyên nhân. Khi kiểm tra có cảnh báo SVG nhận `accessible={false}` của native; Icon hiện dùng `aria-hidden` trên web và giữ `accessible` trên native.

## Android: không tìm thấy thiết bị hoặc emulator ENOENT

Thông báo này xảy ra trước khi app Android được mở. Kiểm tra SDK và thiết bị trong chính terminal đang chạy Expo:

```powershell
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
adb devices
emulator -list-avds
```

Nếu Android Studio cài SDK ở vị trí khác, thay ANDROID_HOME bằng vị trí đó. Đây là biến cho terminal hiện tại, không thay cấu hình hệ thống.

Mở một máy ảo có trong danh sách bằng Android Studio > Device Manager, hoặc kết nối điện thoại đã bật USB debugging. Chỉ tiếp tục khi adb devices báo thiết bị ở trạng thái device; nếu unauthorized, xác nhận cho phép trên điện thoại.

Dự án có expo-dev-client. Chế độ Using development build cần app development build đã được cài, không chỉ có QR của Metro. Nếu chưa có app, với Android SDK/JDK đã sẵn sàng:

```powershell
npx expo run:android
```

Lệnh này build và cài ứng dụng, đồng thời có thể sinh thư mục native qua Expo. Những lần chạy tiếp theo dùng:

```powershell
npx expo start --dev-client --clear --max-workers 2
```

Sau đó nhấn a. Expo Go chỉ dùng được khi hỗ trợ đúng SDK 58 và các module native của dự án; phím s không cài development build.

Nguồn: [thiết lập máy ảo Android](https://docs.expo.dev/workflow/android-studio-emulator/), [development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## API

Giữ EXPO_PUBLIC_API_URL trỏ tới máy đang chạy backend. Mở giao diện đăng nhập thành công không chứng minh API đã kết nối được. Bản sửa khởi động không đổi backend hay .env.
