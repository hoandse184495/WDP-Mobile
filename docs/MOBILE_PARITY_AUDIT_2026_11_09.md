# Đối chiếu mobile với backend và web — 09/11/2026

> Bổ sung tiếp ngày 09/11/2026: [mô hình chấn thương 3D, SSE và tìm kiếm nhiều trang](MOBILE_LIVE_3D_SEARCH_2026_11_09.md). Các giới hạn về ba mục này trong nội dung lịch sử bên dưới đã được cập nhật theo báo cáo mới.

> Cập nhật sau rà soát: 7 mục chính bên dưới đã được xử lý trong mobile. Xem [bản sửa và cách kiểm tra](MOBILE_SEVEN_FIXES_2026_11_09.md). Nội dung thiếu sót bên dưới là ghi nhận trước khi sửa.

## Kết luận

Mobile có phần lớn nhóm nghiệp vụ, nhưng chưa tương đương đầy đủ với web. Có các trường hợp backend đã trả dữ liệu hoặc cấp quyền nhưng mobile chưa hiển thị/cho thao tác; test hiện tại vẫn đạt vì chưa bao phủ các trường hợp này.

Lượt rà soát này chỉ đọc backend/web, kiểm tra mobile và ghi báo cáo. Không sửa luồng nghiệp vụ, không thay .env, không seed/migrate, không gửi request ghi database. Có bỏ BOM ở đầu file Choice do lint phát hiện; thay đổi này chỉ sửa encoding.

## Cơ sở đối chiếu

- Backend local: commit 731c224; web local: commit 9b91b5f; có tính cả working tree hiện tại, không chỉ commit.
- Đọc 200 khai báo route backend, registry 102 thao tác và 28 module danh sách mobile, các API adapter, router, màn hình web và các màn hình mobile tương ứng.
- Tái tạo 132 JSON input schema từ Zod backend trong bộ nhớ và so với snapshot mobile: không khác biệt. SHA-256: c355c18cb003eb346f5a7cee8bf9c25ffee5bb9fddb42e24d441971b81fb08f5.
- Script dò endpoint chỉ là bước tìm ứng viên. Đã kiểm tra tay các endpoint được ghép động, dùng helper upload hoặc dùng trong bộ lọc; không ghi nhầm là thiếu.
- GET http://127.0.0.1:3000/ trả 200; web không phản hồi ở cổng 5173 tại thời điểm rà soát. Không đăng nhập hoặc chạy đủ luồng với tài khoản thật trong lượt này.

## Những điểm thiếu hoặc chưa khớp đã xác nhận

### 1. Manager chưa được tạo, sửa và ngừng dùng giáo án trên mobile

**Ưu tiên cao.** Backend cho cả Manager và HLV tạo/sửa/xóa mềm giáo án. Web cũng mở các quyền này. Mobile chỉ hiện nút tạo/sửa và cho vào màn hình biên tập khi là HLV; thao tác training.delete cũng chỉ khai báo HLV.

Ảnh hưởng: Manager dùng mobile không thực hiện được các thao tác mà tài khoản đó làm được trên web. Không cần sửa backend để giải quyết.

Bằng chứng:

- BE: src/routes/trainingPlan.routes.js, POST/PUT/DELETE có club_manager và head_trainer; service xử lý theo vai trò.
- Web: src/utils/trainingView.js, trainingPermissions; src/components/TrainingPlanCards.jsx.
- Mobile: [training-editor-screen.tsx](../src/features/training/components/training-editor-screen.tsx:225), [workspace-screen.tsx](../src/features/workspace/components/workspace-screen.tsx:82), [record-screen.tsx](../src/features/workspace/components/record-screen.tsx:65), [work-operations.ts](../src/features/operations/contracts/work-operations.ts:161).

Lưu ý riêng: Manager đã có thao tác hiệu chỉnh kết quả buổi tập có lý do; không kết luận toàn bộ quyền sửa kết quả của Manager bị thiếu. Không nên chuyển Manager thẳng sang form đánh giá HLV vì backend yêu cầu overrideReason cho thay đổi của Manager.

### 2. Kết quả bữa ăn bị loại khỏi dữ liệu mobile sau khi nhận API

**Ưu tiên cao.** Backend lưu feedingOutcome; web hiển thị lại kết quả bữa ăn. Mobile có form gửi kết quả, nhưng taskSchema không khai báo feedingOutcome và dùng Zod object không passthrough nên trường này bị bỏ sau parse. Chi tiết việc hoàn thành hiện chỉ có ghi chú, không có kết quả ăn.

Ảnh hưởng: chọn Ăn ít/Bỏ ăn/Không cho ăn rồi hoàn thành; mở lại mobile sẽ không thấy tình trạng đã ghi như trên web. Đây là mất thông tin ở lớp đọc/hiển thị mobile, không phải chứng cứ dữ liệu đã mất trong MongoDB.

Đã chạy probe schema bằng fixture trong bộ nhớ: parsedTaskHasFeedingOutcome=false.

- BE: src/models/DailyTask.js, feedingOutcome.
- Web: src/pages/DailyTasks.jsx:294; src/pages/FeedIssues.jsx.
- Mobile: [task.ts](../src/features/tasks/types/task.ts:3), [task-detail-screen.tsx](../src/features/tasks/components/task-detail-screen.tsx:172).

### 3. Hồ sơ ngựa thiếu phần đọc nhận dạng và hộ chiếu

**Ưu tiên cao.** Backend trả identity và identityRevision; web có HorsePassport để đọc mã chip, hộ chiếu, sổ đăng ký, quốc gia sinh và đặc điểm nhận dạng. horseSchema của mobile chưa khai báo hai trường này, nên chúng bị bỏ khi parse. Màn hình chi tiết ngựa cũng chưa có phần nhận dạng tương đương.

Ảnh hưởng: người dùng xem hồ sơ mobile không đối chiếu được các thông tin nhận dạng đã lưu. Mobile đã có thao tác Manager cập nhật nhận dạng qua form chung; thiếu ở phần giữ dữ liệu và trình bày lại, không phải thiếu hoàn toàn API chỉnh sửa.

Đã chạy probe schema bằng fixture: parsedHorseHasIdentity=false, parsedHorseHasIdentityRevision=false.

- BE: src/models/Horse.js; src/controllers/horse.controller.js getHorseById.
- Web: src/components/HorsePassport.jsx; src/pages/HorseDetail.jsx.
- Mobile: [horse.ts](../src/features/horses/types/horse.ts:3), [horse-detail-screen.tsx](../src/features/horses/components/horse-detail-screen.tsx), [operations-api.ts](../src/features/operations/api/operations-api.ts) đã có đường lấy context để sửa identity.

### 4. Ô chuồng chưa có chi tiết vận hành như web

**Ưu tiên cao.** Mobile mở ô chuồng bằng dữ liệu workspace /stables và hiện thuộc tính ô. Chưa gọi GET /stables/stalls/:id/details.

Web dùng endpoint này để hiện ngựa đang ở, Groom phụ trách, công việc theo ngày, quyền báo sự cố và lịch sử lưu trú (Manager). Các phần này chưa có trong màn hình chi tiết ô của mobile, dù backend đã hỗ trợ.

- BE: src/routes/stable.routes.js:11; src/services/stable.service.js stallDetails.
- Web: src/components/StableStallDetails.jsx.
- Mobile: [workspace-api.ts](../src/features/workspace/api/workspace-api.ts:47), [catalog.ts](../src/features/workspace/types/catalog.ts), [record-extras.tsx](../src/features/workspace/components/record-extras.tsx), [stable-map.tsx](../src/features/stables/components/stable-map.tsx).

Không cần mở rộng dữ liệu vượt quyền: endpoint hiện có đã lọc phạm vi, historyAllowed và canReportIncident.

### 5. Nhật ký thiếu xem thay đổi trước/sau và lý do

**Ưu tiên vừa.** Backend trả metadata; web dùng AuditChangeDetails để hiển thị before/after, reason và các trường thay đổi. Mobile chỉ hiện action, actor, targetType, description, thời điểm. Nhấn Xem thêm cũng không có phần metadata vì module audit không có nhánh hiển thị phần này.

Ảnh hưởng: Manager biết có thao tác xảy ra nhưng chưa đối chiếu được giá trị cũ/mới ngay trên mobile.

- BE: src/services/auditLog.service.js; src/models/AuditLog.js.
- Web: src/components/AuditChangeDetails.jsx; src/pages/AuditLogs.jsx.
- Mobile: [catalog.ts](../src/features/workspace/types/catalog.ts:336), [record-details.tsx](../src/features/workspace/components/record-details.tsx), [workspace-screen.tsx](../src/features/workspace/components/workspace-screen.tsx).

### 6. Form đánh giá HLV chưa nạp kết quả và nhận xét đang có

**Ưu tiên vừa.** Form mobile chỉ nhận id, mặc định điểm 3 và ghi chú rỗng; không nạp bản ghi buổi tập để điền dữ liệu hiện tại. Danh sách cho mở đánh giá cả buổi completed đã có đánh giá. Web truyền session vào form và điền nhận xét đang có.

Ảnh hưởng: khi đánh giá lại, mobile không cho xem chỉ số ngay trong form; người dùng có thể gửi mặc định 3 và ghi chú rỗng thay cho nội dung cũ nếu không nhập lại. Đây là rủi ro suy ra từ payload và defaultValues, chưa thao tác ghi đè dữ liệu thật để thử.

- Web: src/pages/TrainingPlans.jsx ReviewForm.
- Mobile: [session-review-screen.tsx](../src/features/training/components/session-review-screen.tsx:13), [workspace-screen.tsx](../src/features/workspace/components/workspace-screen.tsx:123), [training-api.ts](../src/features/training/api/training-api.ts).

### 7. Thông báo trỏ tới buổi tập đã đánh giá chưa mở đúng bản ghi

**Ưu tiên vừa.** Backend trả đường dẫn training?tab=sessions&session=<id> khi thông báo chờ đánh giá cũ được mở sau khi kết quả đã được đánh giá. Web hỗ trợ chọn session; mobile xử lý review nhưng chưa xử lý session, nên nhánh mặc định chỉ mở toàn bộ danh sách kết quả.

Ảnh hưởng: không mất quyền truy cập, nhưng người dùng phải tìm lại đúng buổi tập thay vì mở trực tiếp từ thông báo.

- BE: src/services/notification.service.js:181.
- Web: src/pages/TrainingPlans.jsx selectedSession.
- Mobile: [notifications-screen.tsx](../src/features/notifications/components/notifications-screen.tsx:66).

## Những phần còn đơn giản hơn web

| Nội dung               | Web                                                                    | Mobile hiện tại                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Thông báo và telemetry | Kết nối SSE có token                                                   | Thông báo polling 30 giây khi màn hình thông báo được mount; telemetry polling 2 giây khi run đang chạy. Chưa dùng hai endpoint stream, chưa có thông báo đẩy nền. |
| Vị trí chấn thương     | Mô hình ngựa 3D và đánh dấu tương tác                                  | Có form vùng/bên và dữ liệu tọa độ theo schema; chưa có trình chọn điểm 3D tương đương. Có trường trong schema không đồng nghĩa đã có trải nghiệm 3D.              |
| Danh sách chọn dài     | Web có bộ chọn/tìm theo nguồn dữ liệu                                  | Choice mobile mới lọc các mục đã tải. Ví dụ ngựa tải theo trang 20 mục; mục ở trang tiếp theo cần Tải thêm. Chưa phải tìm kiếm server ngay trong hộp chọn.         |
| Chi tiết đơn/kho       | Nhãn và bố cục riêng cho từng nghiệp vụ                                | Một số phần còn dùng ResponseSummary đệ quy, nhãn chưa dịch đủ (available, issues, confirmed At...), ngày còn có thể là ISO và khối lồng nhau dài.                 |
| Chi tiết buổi tập      | Snapshot bài tập, liên kết về công việc/ảnh bằng chứng và số đo đầy đủ | Mobile có chỉ số cơ bản, ghi chú và nguồn mô phỏng; chưa có toàn bộ bố cục chi tiết/liên kết về công việc như SessionDetail trên web.                              |

Nguồn: web src/utils/notificationStream.js, src/utils/trainingTelemetry.js, src/components/SessionDetail.jsx, src/components/MedicalDetails.jsx; mobile use-telemetry.ts, notifications-screen.tsx, choice.tsx, use-horses.ts, response-summary.tsx và record-details.tsx.

SSE là cách cập nhật dữ liệu, không phải một nghiệp vụ hoàn toàn thiếu. Ghi offline chưa được xác nhận là chức năng web có sẵn nên không tính là lỗi thiếu ngang bằng web.

## Các nhóm đã có, không cần viết lại từ đầu

- Tài khoản và phiên: đăng nhập, khôi phục, đổi mật khẩu, đăng xuất, 401 và guard vai trò.
- Tiếp nhận: tài liệu, gửi/bổ sung, phân công, thẩm định, quyết định và trả ngựa.
- Ngựa và chuồng: tạo/sửa, ảnh, phả hệ, nhận dạng dạng thao tác, lưu trú, phân công, bàn giao có preview và khóa tập khẩn cấp.
- Công việc: checklist, ảnh, bắt đầu/hoàn thành, giao nhiều công việc, lịch nhiều ngày, checkpoint y tế và mô phỏng tập.
- Y tế và dinh dưỡng: bệnh án, lần khám/chấn thương, lịch/điều phối, khẩu phần/duyệt và xuất thức ăn.
- Đơn thuốc và kho: chốt/dừng đơn, cấp thuốc có đối chiếu phiên bản, nhập/chuyển, bổ sung, kiểm kê, xử lý hỏng và sổ kho.
- Nhân sự, thông báo và giám sát theo vai trò đã có màn hình/API, nhưng chi tiết ở các điểm trên còn cần hoàn thiện.

Có API và form chưa chứng minh mọi tổ hợp chuyển trạng thái đã chạy thành công trên thiết bị.

## Kiểm tra trong lượt này

| Kiểm tra                       | Kết quả                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| TypeScript                     | Đạt                                                                                   |
| Bộ test mobile                 | 17 suite / 270 test đạt, gồm kiểm tra endpoint/quyền một chiều mobile gửi tới backend |
| Lint                           | Đạt sau khi bỏ BOM ở đầu file Choice; không còn cảnh báo                              |
| Snapshot schema đầu vào        | 132 schema khớp backend hiện tại                                                      |
| Probe schema phản hồi          | Xác nhận identity, identityRevision và feedingOutcome bị bỏ sau parse                 |
| Kết nối backend                | GET / trả 200; không thực hiện đăng nhập/ghi nghiệp vụ                                |
| Web chạy thật                  | Không phản hồi tại localhost:5173; đối chiếu source                                   |
| E2E đủ 6 vai trò trên thiết bị | Chưa thực hiện trong lượt này                                                         |

Test endpoint hiện tại bảo đảm thao tác mobile đã khai báo không dùng endpoint/quyền sai. Nó không bảo đảm chiều ngược lại rằng mọi quyền/chức năng web đều đã được đưa lên mobile; quyền Manager với giáo án là một ví dụ.

## Thứ tự hoàn thiện đề xuất

1. Giữ và hiển thị kết quả bữa ăn, thông tin nhận dạng ngựa.
2. Bổ sung quyền tạo/sửa/ngừng giáo án cho Manager đúng backend.
3. Dùng endpoint chi tiết ô chuồng để hiện ngựa, người chăm sóc, việc theo ngày và lịch sử theo quyền.
4. Nạp nội dung hiện tại khi HLV đánh giá; thêm before/after cho nhật ký và mở đúng session từ thông báo.
5. Hoàn thiện nhãn/ngày giờ/khối chi tiết, tìm kiếm server trong bộ chọn; sau đó bổ sung trải nghiệm 3D và cập nhật trực tiếp nếu cần ngang web.

Những hạng mục này có thể triển khai ở mobile bằng API hiện có; không cần sửa backend để giải quyết các điểm đã nêu.

Đối chiếu fingerprint working tree ở cuối lượt: backend và frontend web đều giữ nguyên so với đầu lượt rà soát.
