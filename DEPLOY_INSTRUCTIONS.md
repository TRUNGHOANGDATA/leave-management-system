# Hướng dẫn Deploy lên Vercel

Dưới đây là các bước để đưa ứng dụng của bạn lên Vercel để chạy ổn định hơn:

## 1. Đưa code lên GitHub

Hiện tại mình đã chuẩn bị code ở máy local (đã git init và commit). Bạn cần làm tiếp các bước sau:

1.  Đăng nhập vào GitHub và tạo một **Repository mới**.
    *   Tên (ví dụ): `leave-management-system`
    *   Để chế độ **Public** hoặc **Private** tuỳ bạn.
    *   **QUAN TRỌNG**: Không tick chọn "Add a README file", "Add .gitignore", hay License. Để repo hoàn toàn trống.
2.  Sau khi tạo, copy đường link HTTPS của repo (ví dụ: `https://github.com/username/repo-name.git`).
3.  Quay lại VS Code, mở Terminal (Ctrl+`), và dán các lệnh sau (thay link của bạn vào):

```bash
git remote add origin <LINK_REPO_CUA_BAN>
git branch -M main
git push -u origin main
```

*(Nếu GitHub yêu cầu đăng nhập, bạn làm theo hướng dẫn của nó)*

## 2. Deploy trên Vercel

1.  Truy cập [Vercel Dashboard](https://vercel.com/dashboard).
2.  Bấm **Add New...** -> **Project**.
3.  Chọn **Import** cạnh repo `leave-management-system` bạn vừa push lên.
4.  Trong phần **Configure Project**:
    *   **Framework Preset**: Next.js (Mặc định).
    *   **Environment Variables**: Bạn cần thêm các biến môi trường sau (Copy từ file `.env.local` hoặc từ Supabase Dashboard):
        *   `NEXT_PUBLIC_SUPABASE_URL`: (Giá trị URL Supabase)
        *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Giá trị Anon Key)
5.  Bấm **Deploy**.

## 3. Hoàn tất

Sau khi Vercel build xong (khoảng 1-2 phút), bạn sẽ có đường link domain (ví dụ: `leave-management-system.vercel.app`).
Bạn có thể gửi link này cho mọi người dùng thử!
