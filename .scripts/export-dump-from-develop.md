# ✅ EXPORT DUMP FROM DEVELOP SERVER TO LOCAL

## 🔸 [Local] SSH vào server develop

```bash
ssh devops@172.17.90.183
```

## 🔸 [Server - Develop] Truy cập vào container MySQL

```bash
docker exec -it office-mysql bash
```

## 🔸 [Trong container - Server Develop] Xuất file dump từ database

```bash
mysqldump -u root -poffice@develop office_develop > /tmp/office_db.sql
```

> ⚠️ Lưu ý: Không có khoảng trắng giữa `-p` và mật khẩu (`-p<password>`).

## 🔸 [Server - Develop] Thoát khỏi container

```bash
exit
```

## 🔸 [Server - Develop] Copy file dump ra ngoài container

```bash
docker cp office-mysql:/tmp/office_db.sql /home/devops/office_db.sql
```

## 🔸 [Local] Copy file dump từ server về máy local

```bash
scp devops@172.17.90.183:/home/devops/office_db.sql ~/Desktop/office_db.sql
```

## 🔸 [Server - Develop] Xoá file dump khỏi container

```bash
docker exec office-mysql rm /tmp/office_db.sql
```

## 🔸 [Server - Develop] Xoá file dump khỏi hệ thống server

```bash
rm /home/devops/office_db.sql
```
