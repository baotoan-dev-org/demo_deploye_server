# ✅ IMPORT DUMP TO DEVELOP

## 🔸 [Local] Copy file dump vào container local

```bash
docker cp office_db.sql mysql-local:/tmp/office_db.sql
```

## 🔸 [Local] Xoá và tạo lại database trong container

```bash
docker exec -it mysql-local mysql -u root -plocal -e "DROP DATABASE office_local; CREATE DATABASE office_local;"
```

## 🔸 [Local] Restore file dump vào database

```bash
docker exec -it mysql-local sh -c 'mysql -u root -plocal office_local < /tmp/office_db.sql'
```

## 🔸 [Local] Xoá file dump khỏi container local

```bash
docker exec mysql-local rm /tmp/office_db.sql
```

## 🔸 [Local] Xoá file dump khỏi file hệ thống local

```bash
rm office_db.sql
```
