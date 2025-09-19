# ✅ IMPORT DUMP TO DEVELOP

## 🔸 [Server] Copy file dump vào container MySQL (trên server)

```bash
docker cp /home/devops/office_db.sql office-mysql:/tmp/office_db.sql
```

## 🔸 [Server] Xoá và tạo lại database trong container

```bash
docker exec -it office-mysql mysql -u root -poffice@develop -e "DROP DATABASE office_develop; CREATE DATABASE office_develop;"
```

## 🔸 [Server] Restore file dump vào database

```bash
docker exec -it office-mysql sh -c 'mysql -u root -poffice@develop office_develop < /tmp/office_db.sql'
```

## 🔸 [Server] Xoá file dump khỏi container server

```bash
docker exec office-mysql rm /tmp/office_db.sql
```

## 🔸 [Server] Xoá file dump khỏi file hệ thống server

```bash
rm /home/devops/office_db.sql
```
