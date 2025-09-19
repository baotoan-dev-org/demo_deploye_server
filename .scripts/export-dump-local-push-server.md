# ✅ EXPORT DUMP AT LOCAL AND PUSH SERVER

## 🔸 [Local] Truy cập vào container MySQL

```bash
docker exec -it mysql-local bash
```

## 🔸 [Trong container - Local] Xuất file dump từ database

```bash
mysqldump -u root -plocal mysql_local > /tmp/office_db.sql
```

> ⚠️ Lưu ý: Không có khoảng trắng giữa `-p` và mật khẩu (`-p<password>`).

## 🔸 [Local] Thoát khỏi container

```bash
exit
```

## 🔸 [Local] Copy file dump ra Desktop

```bash
docker cp mysql-local:/tmp/office_db.sql ~/Desktop/office_db.sql
```

## 🔸 [Local] Đẩy file dump lên server develop qua SSH

```bash
scp ~/Desktop/office_db.sql devops@172.17.90.183:/home/devops/
```

## 🔸 [Local] Đẩy file dump lên server production qua SSH

```bash
scp ~/Desktop/office_db.sql devops@172.17.90.187:/home/devops/
```
