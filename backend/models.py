from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    login: str
    password_hash: str
    role: str
    full_name: str
    email: EmailStr
    department_id: str
    manager_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    login: str
    password: str
    role: str
    full_name: str
    email: EmailStr
    department_id: str
    manager_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    login: str
    role: str
    full_name: str
    email: str
    department_id: str
    manager_id: Optional[str] = None

class LoginRequest(BaseModel):
    login: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse

class Department(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    max_simultaneous_vacations: int = 2
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepartmentCreate(BaseModel):
    name: str
    max_simultaneous_vacations: int = 2

class VacationBalance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    year: int
    total_days: int = 28
    used_days: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VacationBalanceCreate(BaseModel):
    user_id: str
    year: int
    total_days: int = 28

class VacationBalanceUpdate(BaseModel):
    total_days: Optional[int] = None
    used_days: Optional[int] = None

class VacationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    start_date: str
    end_date: str
    vacation_type: str  
    status: str = "pending"
    comment: Optional[str] = None
    manager_comment: Optional[str] = None
    work_days: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VacationRequestCreate(BaseModel):
    start_date: str
    end_date: str
    vacation_type: str
    comment: Optional[str] = None

class VacationRequestUpdate(BaseModel):
    status: str
    manager_comment: Optional[str] = None

class RequestHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    action: str  
    comment: Optional[str] = None
    acted_by: str  
    acted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OverlapWarning(BaseModel):
    date: str
    count: int
    employees: List[str]
    max_allowed: int