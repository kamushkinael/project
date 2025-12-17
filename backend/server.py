from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import date
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
from io import BytesIO

from models import (
    User, UserCreate, UserResponse, LoginRequest, LoginResponse,
    Department, DepartmentCreate,
    VacationBalance, VacationBalanceCreate, VacationBalanceUpdate,
    VacationRequest, VacationRequestCreate, VacationRequestUpdate,
    RequestHistory, OverlapWarning
)
from auth import hash_password, verify_password, create_access_token, get_current_user
from email_service import email_service
from utils import calculate_work_days, export_to_csv, check_overlap

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="VacationFlow API")

from fastapi.middleware.cors import CORSMiddleware
origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)



@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Регистрация нового пользователя"""

    existing = await db.users.find_one({"login": user_data.login}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь уже существует")
    

    password_hash = hash_password(user_data.password)
    

    user = User(
        login=user_data.login,
        password_hash=password_hash,
        role=user_data.role,
        full_name=user_data.full_name,
        email=user_data.email,
        department_id=user_data.department_id,
        manager_id=user_data.manager_id
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    current_year = datetime.now(timezone.utc).year
    balance = VacationBalance(user_id=user.id, year=current_year, total_days=28)
    balance_dict = balance.model_dump()
    balance_dict['created_at'] = balance_dict['created_at'].isoformat()
    await db.vacation_balances.insert_one(balance_dict)
    
    return UserResponse(**user.model_dump())

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Авторизация пользователя"""
    user = await db.users.find_one({"login": credentials.login}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    
    token = create_access_token({"sub": user['id'], "role": user['role']})
    
    return LoginResponse(
        token=token,
        user=UserResponse(**user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Получить информацию о текущем пользователе"""
    user = await db.users.find_one({"id": current_user['sub']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    return UserResponse(**user)


# ============= DEPARTMENT ENDPOINTS =============

@api_router.post("/departments", response_model=Department)
async def create_department(dept_data: DepartmentCreate, current_user: dict = Depends(get_current_user)):
    """Создать отдел (только для HR)"""
    if current_user['role'] != 'hr':
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    
    dept = Department(name=dept_data.name, max_simultaneous_vacations=dept_data.max_simultaneous_vacations)
    dept_dict = dept.model_dump()
    dept_dict['created_at'] = dept_dict['created_at'].isoformat()
    
    await db.departments.insert_one(dept_dict)
    return dept

@api_router.get("/departments", response_model=List[Department])
async def get_departments(current_user: dict = Depends(get_current_user)):
    """Получить список отделов"""
    departments = await db.departments.find({}, {"_id": 0}).to_list(1000)
    for dept in departments:
        if isinstance(dept.get('created_at'), str):
            dept['created_at'] = datetime.fromisoformat(dept['created_at'])
    return departments


# ============= VACATION BALANCE ENDPOINTS =============

@api_router.get("/vacation-balance/my")
async def get_my_balance(current_user: dict = Depends(get_current_user)):
    """Получить свой баланс отпусков"""
    current_year = datetime.now(timezone.utc).year
    balance = await db.vacation_balances.find_one(
        {"user_id": current_user['sub'], "year": current_year},
        {"_id": 0}
    )
    
    if not balance:
        # Create default balance
        balance = VacationBalance(user_id=current_user['sub'], year=current_year, total_days=28)
        balance_dict = balance.model_dump()
        balance_dict['created_at'] = balance_dict['created_at'].isoformat()
        await db.vacation_balances.insert_one(balance_dict)
        return balance
    
    if isinstance(balance.get('created_at'), str):
        balance['created_at'] = datetime.fromisoformat(balance['created_at'])
    
    return balance

@api_router.get("/vacation-balance/{user_id}")
async def get_user_balance(user_id: str, current_user: dict = Depends(get_current_user)):
    """Получить баланс отпусков пользователя (только для HR и менеджеров)"""
    if current_user['role'] not in ['hr', 'manager']:
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    
    current_year = datetime.now(timezone.utc).year
    balance = await db.vacation_balances.find_one(
        {"user_id": user_id, "year": current_year},
        {"_id": 0}
    )
    
    if not balance:
        raise HTTPException(status_code=404, detail="Баланс не найден")
    
    if isinstance(balance.get('created_at'), str):
        balance['created_at'] = datetime.fromisoformat(balance['created_at'])
    
    return balance

@api_router.put("/vacation-balance/{user_id}")
async def update_user_balance(
    user_id: str,
    update_data: VacationBalanceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить баланс отпусков (только для HR)"""
    if current_user['role'] != 'hr':
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    
    current_year = datetime.now(timezone.utc).year
    balance = await db.vacation_balances.find_one(
        {"user_id": user_id, "year": current_year},
        {"_id": 0}
    )
    
    if not balance:
        raise HTTPException(status_code=404, detail="Баланс не найден")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.vacation_balances.update_one(
            {"user_id": user_id, "year": current_year},
            {"$set": update_dict}
        )
    
    updated_balance = await db.vacation_balances.find_one(
        {"user_id": user_id, "year": current_year},
        {"_id": 0}
    )
    
    if isinstance(updated_balance.get('created_at'), str):
        updated_balance['created_at'] = datetime.fromisoformat(updated_balance['created_at'])
    
    return updated_balance


# ============= VACATION REQUEST ENDPOINTS =============

@api_router.post("/vacation-requests", response_model=VacationRequest)
async def create_vacation_request(
    request_data: VacationRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Создать заявку на отпуск"""
    # Calculate work days
    work_days = calculate_work_days(request_data.start_date, request_data.end_date)
    
    # Check balance if annual vacation
    if request_data.vacation_type == 'annual':
        current_year = datetime.now(timezone.utc).year
        balance = await db.vacation_balances.find_one(
            {"user_id": current_user['sub'], "year": current_year},
            {"_id": 0}
        )
        
        if balance:
            available = balance['total_days'] - balance['used_days']
            if work_days > available:
                raise HTTPException(
                    status_code=400,
                    detail=f"Недостаточно дней отпуска. Доступно: {available}, требуется: {work_days}"
                )
    
    # Create request
    vacation_request = VacationRequest(
        user_id=current_user['sub'],
        start_date=request_data.start_date,
        end_date=request_data.end_date,
        vacation_type=request_data.vacation_type,
        comment=request_data.comment,
        work_days=work_days
    )
    
    request_dict = vacation_request.model_dump()
    request_dict['created_at'] = request_dict['created_at'].isoformat()
    request_dict['updated_at'] = request_dict['updated_at'].isoformat()
    
    await db.vacation_requests.insert_one(request_dict)
    
    return vacation_request

@api_router.get("/vacation-requests/my", response_model=List[VacationRequest])
async def get_my_requests(current_user: dict = Depends(get_current_user)):
    """Получить свои заявки на отпуск"""
    requests = await db.vacation_requests.find(
        {"user_id": current_user['sub']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for req in requests:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if isinstance(req.get('updated_at'), str):
            req['updated_at'] = datetime.fromisoformat(req['updated_at'])
    
    return requests

@api_router.get("/vacation-requests/department")
async def get_department_requests(current_user: dict = Depends(get_current_user)):
    """Получить заявки отдела (для менеджеров)"""
    if current_user['role'] not in ['manager', 'hr']:
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    
    # Get current user info
    user = await db.users.find_one({"id": current_user['sub']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Get all users from the same department
    department_users = await db.users.find(
        {"department_id": user['department_id']},
        {"_id": 0}
    ).to_list(1000)
    
    user_ids = [u['id'] for u in department_users]
    
    # Get requests for department
    requests = await db.vacation_requests.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Enrich with user info
    for req in requests:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if isinstance(req.get('updated_at'), str):
            req['updated_at'] = datetime.fromisoformat(req['updated_at'])
        
        # Add user info
        req_user = next((u for u in department_users if u['id'] == req['user_id']), None)
        if req_user:
            req['user_name'] = req_user['full_name']
            req['user_email'] = req_user['email']
    
    return requests

@api_router.get("/vacation-requests/all")
async def get_all_requests(current_user: dict = Depends(get_current_user)):
    """Получить все заявки (только для HR)"""
    if current_user['role'] != 'hr':
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    
    requests = await db.vacation_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Get all users
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    user_map = {u['id']: u for u in users}
    
    # Enrich requests with user info
    for req in requests:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if isinstance(req.get('updated_at'), str):
            req['updated_at'] = datetime.fromisoformat(req['updated_at'])
        
        user = user_map.get(req['user_id'])
        if user:
            req['user_name'] = user['full_name']
            req['user_email'] = user['email']
            req['department_id'] = user['department_id']
    
    return requests

@api_router.put("/vacation-requests/{request_id}")
async def update_vacation_request(
    request_id: str,
    update_data: VacationRequestUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Обновить статус заявки (только для менеджеров и HR)"""
    if current_user['role'] not in ['manager', 'hr']:
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    
    # Get request
    vacation_request = await db.vacation_requests.find_one({"id": request_id}, {"_id": 0})
    if not vacation_request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Get user info
    user = await db.users.find_one({"id": vacation_request['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Check if manager has permission (only for their department)
    if current_user['role'] == 'manager':
        manager = await db.users.find_one({"id": current_user['sub']}, {"_id": 0})
        if manager['department_id'] != user['department_id']:
            raise HTTPException(status_code=403, detail="Доступ запрещён")
    
    # Update request
    update_dict = update_data.model_dump()
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.vacation_requests.update_one(
        {"id": request_id},
        {"$set": update_dict}
    )
    
    # Create history record
    history = RequestHistory(
        request_id=request_id,
        action=update_data.status,
        comment=update_data.manager_comment,
        acted_by=current_user['sub']
    )
    history_dict = history.model_dump()
    history_dict['acted_at'] = history_dict['acted_at'].isoformat()
    await db.request_history.insert_one(history_dict)
    
    # Update vacation balance if approved
    if update_data.status == 'approved' and vacation_request['vacation_type'] == 'annual':
        current_year = datetime.now(timezone.utc).year
        await db.vacation_balances.update_one(
            {"user_id": vacation_request['user_id'], "year": current_year},
            {"$inc": {"used_days": vacation_request['work_days']}}
        )
    
    # Send email notification
    email_service.send_vacation_status_email(
        to_email=user['email'],
        employee_name=user['full_name'],
        start_date=vacation_request['start_date'],
        end_date=vacation_request['end_date'],
        status=update_data.status,
        manager_comment=update_data.manager_comment
    )
    
    # Get updated request
    updated_request = await db.vacation_requests.find_one({"id": request_id}, {"_id": 0})
    if isinstance(updated_request.get('created_at'), str):
        updated_request['created_at'] = datetime.fromisoformat(updated_request['created_at'])
    if isinstance(updated_request.get('updated_at'), str):
        updated_request['updated_at'] = datetime.fromisoformat(updated_request['updated_at'])
    
    return updated_request

@api_router.post("/vacation-requests/{request_id}/cancel")
async def cancel_vacation_request(
    request_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Отменить отпуск (сотрудник — свой, HR — любой)"""

    vacation_request = await db.vacation_requests.find_one(
        {"id": request_id},
        {"_id": 0}
    )
    if not vacation_request:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    # Проверка прав
    if current_user['role'] != 'hr' and vacation_request['user_id'] != current_user['sub']:
        raise HTTPException(status_code=403, detail="Нет прав на отмену этой заявки")

    if vacation_request['status'] == 'cancelled':
        raise HTTPException(status_code=400, detail="Заявка уже отменена")

    old_status = vacation_request['status']

    # Обновляем статус
    await db.vacation_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "cancelled",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )

    # Если был одобрен — возвращаем дни
    if old_status == "approved" and vacation_request['vacation_type'] == "annual":
        current_year = datetime.now(timezone.utc).year
        await db.vacation_balances.update_one(
            {
                "user_id": vacation_request['user_id'],
                "year": current_year
            },
            {
                "$inc": {"used_days": -vacation_request['work_days']}
            }
        )

    # История
    history = RequestHistory(
        request_id=request_id,
        action="cancelled",
        comment="Отпуск отменён",
        acted_by=current_user['sub']
    )
    history_dict = history.model_dump()
    history_dict['acted_at'] = history_dict['acted_at'].isoformat()
    await db.request_history.insert_one(history_dict)

    return {"status": "cancelled"}

@api_router.post("/vacation-requests/check-overlap", response_model=List[OverlapWarning])
async def check_vacation_overlap(
    request_data: VacationRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    """Проверить пересечение отпусков"""
    # Get user's department
    user = await db.users.find_one({"id": current_user['sub']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Get department info
    department = await db.departments.find_one({"id": user['department_id']}, {"_id": 0})
    max_allowed = department['max_simultaneous_vacations'] if department else 2
    
    # Get department users
    department_users = await db.users.find(
        {"department_id": user['department_id']},
        {"_id": 0}
    ).to_list(1000)
    user_ids = [u['id'] for u in department_users]
    
    # Get approved requests for department
    approved_requests = await db.vacation_requests.find(
        {"user_id": {"$in": user_ids}, "status": "approved"},
        {"_id": 0}
    ).to_list(1000)
    
    # Check for overlaps
    warnings = check_overlap(
        approved_requests,
        request_data.start_date,
        request_data.end_date,
        max_allowed
    )
    
    return warnings


# ============= REPORTS AND EXPORT =============

@api_router.get("/reports/vacations")
async def get_vacation_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Получить отчет по отпускам (только для HR)"""
    if current_user['role'] != 'hr':
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    
    query = {}
    if start_date and end_date:
        query['start_date'] = {"$gte": start_date, "$lte": end_date}
    
    requests = await db.vacation_requests.find(query, {"_id": 0}).to_list(1000)
    
    # Get all users
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    user_map = {u['id']: u for u in users}
    
    # Get all departments
    departments = await db.departments.find({}, {"_id": 0}).to_list(1000)
    dept_map = {d['id']: d for d in departments}
    
    # Prepare report data
    report_data = []
    for req in requests:
        user = user_map.get(req['user_id'], {})
        dept = dept_map.get(user.get('department_id', ''), {})
        
        report_data.append({
            'Сотрудник': user.get('full_name', ''),
            'Email': user.get('email', ''),
            'Отдел': dept.get('name', ''),
            'Дата начала': req['start_date'],
            'Дата окончания': req['end_date'],
            'Тип': 'Ежегодный' if req['vacation_type'] == 'annual' else 'Без сохранения ЗП',
            'Рабочих дней': req['work_days'],
            'Статус': req['status'],
            'Комментарий': req.get('comment', ''),
            'Комментарий руководителя': req.get('manager_comment', '')
        })
    
    return report_data

@api_router.get("/reports/export-csv")
async def export_report_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Экспортировать отчет в CSV (только для HR)"""
    if current_user['role'] != 'hr':
        raise HTTPException(status_code=403, detail="Доступ запрещён")
    
    # Get report data
    report_data = await get_vacation_report(start_date, end_date, current_user)
    
    # Convert to CSV
    csv_content = export_to_csv(report_data)
    
    # Return as file download
    return StreamingResponse(
        iter([csv_content.encode('utf-8-sig')]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=vacation_report.csv"
        }
    )


# ============= CALENDAR EVENTS =============

@api_router.get("/calendar/department")
async def get_department_calendar(current_user: dict = Depends(get_current_user)):
    """Получить календарь отпусков отдела для FullCalendar"""
    # Get user's department
    user = await db.users.find_one({"id": current_user['sub']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Get department users
    department_users = await db.users.find(
        {"department_id": user['department_id']},
        {"_id": 0}
    ).to_list(1000)
    user_ids = [u['id'] for u in department_users]
    user_map = {u['id']: u for u in department_users}
    
    # Get approved requests
    requests = await db.vacation_requests.find(
        {"user_id": {"$in": user_ids}, "status": "approved"},
        {"_id": 0}
    ).to_list(1000)
    
    # Format for FullCalendar
    events = []
    for req in requests:
        req_user = user_map.get(req['user_id'])
        if req_user:
            events.append({
                "id": req['id'],
                "title": req_user['full_name'],
                "start": req['start_date'],
                "end": req['end_date'],
                "backgroundColor": "#10B981",
                "borderColor": "#10B981",
                "extendedProps": {
                    "user_id": req['user_id'],
                    "vacation_type": req['vacation_type'],
                    "work_days": req['work_days']
                }
            })
    
    return events


# Include the router in the main app
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()