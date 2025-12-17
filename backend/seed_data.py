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

async def seed_database():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    await db.departments.delete_many({})
    await db.users.delete_many({})
    await db.vacation_balances.delete_many({})
    await db.vacation_requests.delete_many({})
    await db.request_history.delete_many({})
    
    print("Очистка базы данных завершена")
    
    departments = [
        {"id": str(uuid.uuid4()), "name": "Разработка", "max_simultaneous_vacations": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Продажи", "max_simultaneous_vacations": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "HR", "max_simultaneous_vacations": 1, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    await db.departments.insert_many(departments)
    print(f"Создано {len(departments)} отделов")
    
    dev_dept_id = departments[0]['id']
    sales_dept_id = departments[1]['id']
    hr_dept_id = departments[2]['id']
    
    dev_manager_id = str(uuid.uuid4())
    sales_manager_id = str(uuid.uuid4())
    
    users = [
        {
            "id": str(uuid.uuid4()),
            "login": "hr_admin",
            "password_hash": hash_password("password123"),
            "role": "hr",
            "full_name": "Елена Смирнова",
            "email": "hr@example.com",
            "department_id": hr_dept_id,
            "manager_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        {
            "id": dev_manager_id,
            "login": "dev_manager",
            "password_hash": hash_password("password123"),
            "role": "manager",
            "full_name": "Алексей Иванов",
            "email": "dev_manager@example.com",
            "department_id": dev_dept_id,
            "manager_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        {
            "id": sales_manager_id,
            "login": "sales_manager",
            "password_hash": hash_password("password123"),
            "role": "manager",
            "full_name": "Мария Петрова",
            "email": "sales_manager@example.com",
            "department_id": sales_dept_id,
            "manager_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        {
            "id": str(uuid.uuid4()),
            "login": "developer1",
            "password_hash": hash_password("password123"),
            "role": "employee",
            "full_name": "Дмитрий Соколов",
            "email": "dev1@example.com",
            "department_id": dev_dept_id,
            "manager_id": dev_manager_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "login": "developer2",
            "password_hash": hash_password("password123"),
            "role": "employee",
            "full_name": "Анна Кузнецова",
            "email": "dev2@example.com",
            "department_id": dev_dept_id,
            "manager_id": dev_manager_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        
        {
            "id": str(uuid.uuid4()),
            "login": "sales1",
            "password_hash": hash_password("password123"),
            "role": "employee",
            "full_name": "Сергей Морозов",
            "email": "sales1@example.com",
            "department_id": sales_dept_id,
            "manager_id": sales_manager_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "login": "sales2",
            "password_hash": hash_password("password123"),
            "role": "employee",
            "full_name": "Ольга Новикова",
            "email": "sales2@example.com",
            "department_id": sales_dept_id,
            "manager_id": sales_manager_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    
    await db.users.insert_many(users)
    print(f"Создано {len(users)} пользователей")
    
    
    current_year = datetime.now(timezone.utc).year
    balances = []
    for user in users:
        balances.append({
            "id": str(uuid.uuid4()),
            "user_id": user['id'],
            "year": current_year,
            "total_days": 28,
            "used_days": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.vacation_balances.insert_many(balances)
    print(f"Создано {len(balances)} балансов отпусков")
    
    print("Данные для входа")
    print("HR: логин='hr_admin', пароль='password123'")
    print("Менеджер разработки: логин='dev_manager', пароль='password123'")
    print("Менеджер продаж: логин='sales_manager', пароль='password123'")
    print("Сотрудник: логин='developer1', пароль='password123'")
    print("Сотрудник: логин='sales1', пароль='password123'")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())