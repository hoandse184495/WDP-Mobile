# Kiểm tra nghiệp vụ theo vai trò — 05/11/2026

## Phạm vi và phương pháp

Đối chiếu mobile, backend và frontend web. Chạy toàn bộ 84 file test backend
với MongoDB replica set local, mỗi file một database tạm và một tiến trình
Node riêng. Các bài integration tạo fixture, gửi HTTP vào API và đối chiếu DB.
Không seed/xóa database ứng dụng hoặc database test được cấu hình sẵn.

Kiểm thử mobile dùng adapter/native mocks, kết hợp kiểm tra endpoint/quyền
trực tiếp từ router backend và đối chiếu snapshot schema. Đây là kiểm tra
nghiệp vụ/API và UI được mô phỏng, chưa phải thao tác đủ mọi màn hình trên điện thoại.

## Ma trận vai trò

| Vai trò  | Luồng đã đối chiếu, có kiểm thử tự động liên quan                                                                                                                | File test backend tiêu biểu                                                                                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chủ ngựa | Đăng nhập/đổi mật khẩu; ngựa thuộc sở hữu; nháp tiếp nhận → tài liệu → gửi/bổ sung; đề xuất phả hệ; kết quả tập, khẩu phần và lịch sử khám                       | `passwordSecurity.api.integration`, `assignedHorseAccess.api.integration`, `admissions.api.integration`, `pedigree.api.integration`                                                                    |
| Quản lý  | Phân thẩm định/duyệt/trả ngựa; chuồng/lưu trú/phân Groom-HLV-khu; bàn giao có preview; giao nhiều ngày; điều phối khám; sự cố; nhân sự, kiểm kê, xử lý vật tư    | `admissionCoordination.api.integration`, `groomHandover.api.integration`, `taskBatch.api.integration`, `medicalCoordination.api.integration`, `staffWork.api.integration`, `stocktake.api.integration` |
| HLV      | Giáo án nhiều bài/revision; giao đúng ngựa/người/bài/hiệu lực; đánh giá kết quả; soạn/gửi sửa khẩu phần; thẩm định được giao                                     | `trainingExercises.api.integration`, `trainingFlows.api.integration`, `trainingTaskOnly.api.integration`, `rations.api.integration`, `admissions.api.integration`                                      |
| Bác sĩ   | Bệnh án/lần khám nhiều chấn thương; điều trị → hồi phục → kết luận; lịch/tái khám; nhận ca/liên kết kết quả; duyệt khẩu phần; chốt/dừng đơn; thẩm định/clearance | `multiInjuryEncounter.api.integration`, `medicalEncounter.api.integration`, `medicalSchedules.api.integration`, `incidentDomains.api.integration`, `prescriptions.api.integration`                     |
| Groom    | Phạm vi phân công; bắt đầu/ảnh/hoàn thành/trở ngại; tập/mô phỏng; xuất thức ăn/lượng thừa; bàn giao khám/đưa về; sự cố; kiểm kê                                  | `dailyTasks.api.integration`, `taskEvidence.api.integration`, `trainingTelemetry.api.integration`, `feedingStock.api.integration`, `medicalCoordination.api.integration`, `stocktake.api.integration`  |
| Thủ kho  | Vật tư/thuốc/kho; nhập/chuyển nháp → xác nhận/hủy; bổ sung một phần; cấp thuốc đúng lô/người nhận/xác nhận; kiểm kê; đề nghị xử lý; sổ kho                       | `warehouseKeeper.api.integration`, `inventory.api.integration`, `replenishment.api.integration`, `prescriptions.api.integration`, `stockLedger.api.integration`, `stockDisposal.api.integration`       |

Tên file trong bảng có đuôi `.test.js`, nằm trong `test` backend. Phạm vi gồm
quyền, scope, chuyển trạng thái, concurrency/revision, retry và rollback theo
các kịch bản có sẵn; không khẳng định bao phủ mọi tổ hợp đầu vào.

## Lỗi đã sửa

1. Công suất Groom: sửa POST thành PATCH đúng endpoint backend.
2. Tạo nhanh sự cố: bỏ lối vào form cũ 5 loại/2 đối tượng, chuyển sang form
   hợp đồng 9 loại, ngựa/ô/khu/kho, vật tư/lô/công việc và date picker.
3. Sự cố y tế: ẩn đóng trước khi có kết quả Vet; chỉ cho tự nhận ca khẩn chưa
   có Vet. Form trạng thái chỉ cho bước tiếp theo hợp lệ; ghi chú theo quy tắc server.
4. Tiếp nhận: thao tác thẩm định chỉ cho đúng người được phân công. Sau tạo
   tiếp nhận/sự cố, mở hồ sơ vừa tạo để bổ sung tài liệu/ảnh và gửi.
5. Bộ lọc xuất thức ăn: sửa khóa `feedingIssues` thành `feedIssues`.
6. Web: Tổng quan từng bị mất khỏi menu nhóm của Quản lý/Bác sĩ vì Đơn thuốc
   đứng đầu mảng. Đã sửa thứ tự và thêm kiểm thử cả 6 vai trò.
7. Test runner backend: tương thích Node 22, DB và process riêng từng file,
   tránh fixture lẫn nhau gây sai số người nhận thông báo, kho chung và index.
8. OpenAPI sự cố: cập nhật 9 loại, 5 endpoint phân công/khám và quy tắc sign-off.
   Test ghi chú theo hành vi hiện tại; giáo án fixture dùng kỳ tương đối để không hết hạn.

Không nới quyền hoặc bỏ validation backend để làm test đạt.

## Kết quả thực thi

| Kiểm tra                                                                  | Kết quả                                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Backend: đủ 84 file với DB riêng                                          | 331/334 đạt; 3 lỗi tại 2 file                                          |
| Kiểm lại `incidents.test.js` sau sửa docs/kỳ vọng ghi chú                 | 3/3 đạt                                                                |
| Kiểm lại `mongoTransactions.integration.test.js` sau sửa hiệu lực fixture | 2/2 đạt                                                                |
| Backend tổng hợp sau kiểm lại 2 file                                      | 334/334 trường hợp đã đạt, không skip; không phải một lượt chạy đủ mới |
| Mobile toàn bộ                                                            | 13 suite, 242 test đạt                                                 |
| Hợp đồng endpoint/quyền mobile ↔ backend                                  | 127 trường hợp nằm trong 242 test, gồm context/preview và tham chiếu   |
| Snapshot Zod mobile ↔ backend                                             | 129 schema, không khác biệt                                            |
| TypeScript / lint mobile                                                  | Đạt, không lỗi/cảnh báo                                                |
| Bundle iOS                                                                | Xuất thành công tại `.expo/role-audit`, không phải IPA                 |
| Web lần chạy đủ ban đầu                                                   | 162 test: 157 đạt, 4 không đạt, 1 skip                                 |
| Điều hướng web sau sửa                                                    | 3/3 đạt, gồm Tổng quan cho 6 vai trò                                   |

## Bốn kiểm thử giao diện web còn không đạt

- `test/form-design.test.js:37`: các nhãn nhóm trường bệnh án khác chuỗi test yêu cầu.
- `test/form-rollout.test.js:23`: test chốt 54 form, source có 63.
- `test/horse-model.test.js:142`: kỳ vọng mô hình 3D ngay trên trang y tế không khớp markup hiện tại.
- `test/interface-design.test.js:21`: test đợi “Báo cáo sự cố”, menu/breadcrumb dùng “Báo cáo & hỗ trợ”.

Giữ nguyên trạng thái không đạt; cần đối chiếu yêu cầu thiết kế trước khi cập
nhật các assertion. Không đổi giao diện/quyền để chiều test cũ.

## Chưa kiểm chứng trên thiết bị thật

- Thao tác đủ mọi màn hình bằng 6 tài khoản trên iPhone/Android; bàn phím, cuộn,
  chuyển app nền/foreground, mất mạng và timeout từ điện thoại.
- Camera, thư viện ảnh, document picker, share sheet, keychain và quyền bị từ chối.
- Dịch vụ lưu trữ thật: integration tests thay storage bằng fixture để kiểm tra
  scope/transaction/lỗi, không xác nhận Supabase thực tế.
- Three.js native, SSE/push nền và ghi offline chưa triển khai.

Checklist thiết bị: [MOBILE_WORKFLOWS.md](MOBILE_WORKFLOWS.md).
