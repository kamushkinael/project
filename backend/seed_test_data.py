
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from auth import hash_password
from datetime import datetime, timezone
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def seed_test_data():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]

    departments = [
        {"name": "Разработка", "max_simultaneous_vacations": 2},
        {"name": "Продажи", "max_simultaneous_vacations": 2},
        {"name": "HR", "max_simultaneous_vacations": 1},
    ]

    dept_map = {}
    for dept in departments:
        existing = await db.departments.find_one({"name": dept["name"]})
        if not existing:
            dept["id"] = str(uuid.uuid4())
            dept["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.departments.insert_one(dept)
            dept_map[dept["name"]] = dept["id"]
        else:
            dept_map[dept["name"]] = existing["id"]

    users = [
        {"login": "hr_admin", "password": "password123", "role": "hr", "full_name": "Елена Смирнова", "email": "hr@example.com", "department": "HR"},
        {"login": "dev_manager", "password": "password123", "role": "manager", "full_name": "Алексей Иванов", "email": "dev_manager@example.com", "department": "Разработка"},
        {"login": "sales_manager", "password": "password123", "role": "manager", "full_name": "Мария Петрова", "email": "sales_manager@example.com", "department": "Продажи"},
    ]

    for u in users:
        existing = await db.users.find_one({"login": u["login"]})
        if not existing:
            user_doc = {
                "id": str(uuid.uuid4()),
                "login": u["login"],
                "password_hash": hash_password(u["password"]),
                "role": u["role"],
                "full_name": u["full_name"],
                "email": u["email"],
                "department_id": dept_map[u["department"]],
                "manager_id": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
    
    print("Тестовые данные созданы (если их ещё не было)")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_test_data())
