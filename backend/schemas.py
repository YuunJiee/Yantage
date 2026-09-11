import json

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from typing import List, Optional
from datetime import datetime

from .constants import AssetCategory, Provider, GoalType, BudgetGroup


def _validate_allocation_data(value: Optional[str]) -> Optional[str]:
    """Shared by GoalBase/GoalUpdate: allocation_data, when present, must be
    a JSON object of category -> percent whose values sum to ~100 (see
    docs/specs/goals.md Decision 5)."""
    if value is None:
        return value
    try:
        parsed = json.loads(value)
    except (json.JSONDecodeError, TypeError):
        raise ValueError("allocation_data must be valid JSON")
    if not isinstance(parsed, dict) or not parsed:
        raise ValueError("allocation_data must be a non-empty JSON object")
    total = 0.0
    for v in parsed.values():
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            raise ValueError("allocation_data values must be numbers")
        total += v
    if abs(total - 100) > 0.01:
        raise ValueError("allocation_data percentages must sum to 100")
    return value

# Transaction Schemas
class TransactionBase(BaseModel):
    amount: float
    buy_price: float
    date: Optional[datetime] = None
    is_transfer: Optional[bool] = False
    note: Optional[str] = None  # Optional memo

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    buy_price: Optional[float] = None
    date: Optional[datetime] = None
    is_transfer: Optional[bool] = None
    note: Optional[str] = None

class Transaction(TransactionBase):
    id: int
    asset_id: int
    date: datetime

    model_config = ConfigDict(from_attributes=True)

# Asset Schemas
class AssetBase(BaseModel):
    name: str
    ticker: Optional[str] = None
    category: AssetCategory
    sub_category: Optional[str] = None
    include_in_net_worth: Optional[bool] = True
    icon: Optional[str] = None
    payment_due_day: Optional[int] = None  # Day of month for credit card payment (1-31)
    value_twd: Optional[float] = 0.0 # Computed field
    unrealized_pl: Optional[float] = 0.0 # Computed field
    roi: Optional[float] = 0.0 # Computed field

    source: Optional[str] = "manual"
    
    # Web3 / Wallet Fields
    network: Optional[str] = None
    contract_address: Optional[str] = None
    decimals: Optional[int] = 18
    connection_id: Optional[int] = None

class AssetCreate(AssetBase):
    current_price: Optional[float] = None

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    ticker: Optional[str] = None
    category: Optional[AssetCategory] = None
    sub_category: Optional[str] = None
    include_in_net_worth: Optional[bool] = None
    icon: Optional[str] = None
    payment_due_day: Optional[int] = None
    source: Optional[str] = None
    network: Optional[str] = None
    contract_address: Optional[str] = None
    decimals: Optional[int] = None
    connection_id: Optional[int] = None

# Crypto Connection Schema
class CryptoConnection(BaseModel):
    id: int
    name: str # e.g. "My Pionex"
    provider: Provider

    model_config = ConfigDict(from_attributes=True)

class Asset(AssetBase):
    id: int
    current_price: float
    last_updated_at: datetime
    transactions: List[Transaction] = []
    connection: Optional[CryptoConnection] = None

    model_config = ConfigDict(from_attributes=True)

class DashboardData(BaseModel):
    net_worth: float
    total_pl: float
    total_roi: float
    exchange_rate: float
    assets: List[Asset]
    updated_at: datetime
    
# Goal Schemas
class GoalBase(BaseModel):
    name: str
    target_amount: float = Field(gt=0)
    goal_type: GoalType
    allocation_data: Optional[str] = None   # JSON: {"Stock": 60, "Fluid": 40} for ASSET_ALLOCATION

    _check_allocation_data = field_validator('allocation_data')(_validate_allocation_data)

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = Field(default=None, gt=0)
    goal_type: Optional[GoalType] = None
    allocation_data: Optional[str] = None

    _check_allocation_data = field_validator('allocation_data')(_validate_allocation_data)

class Goal(GoalBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GoalForecast(BaseModel):
    goal_id: int
    current_amount: float
    target_amount: float
    avg_monthly_growth: float
    months_to_reach: float
    predicted_date: str

class ForecastResponse(BaseModel):
    growth_rate_6mo: float
    forecasts: List[GoalForecast]



# Budget Category Schemas
class BudgetCategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    budget_amount: float = Field(ge=0)
    color: Optional[str] = None
    note: Optional[str] = None
    group_name: Optional[BudgetGroup] = None

class BudgetCategoryCreate(BudgetCategoryBase):
    pass

class BudgetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    budget_amount: Optional[float] = Field(default=None, ge=0)
    color: Optional[str] = None
    note: Optional[str] = None
    group_name: Optional[BudgetGroup] = None

class IncomeItemBase(BaseModel):
    name: str
    amount: float = Field(ge=0)

class IncomeItemCreate(IncomeItemBase):
    pass

class IncomeItemUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)

class IncomeItem(IncomeItemBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BudgetCategory(BudgetCategoryBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SystemSettingBase(BaseModel):
    key: str
    value: str

class SystemSetting(SystemSettingBase):
    model_config = ConfigDict(from_attributes=True)


class TickerLookupResult(BaseModel):
    name: Optional[str] = None
    symbol: Optional[str] = None
    price: Optional[float] = None
    error: Optional[str] = None


# --- Integration / Connection schemas ---

class ConnectionCreate(BaseModel):
    name: str
    provider: Provider
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    address: Optional[str] = None

class ConnectionResponse(BaseModel):
    id: int
    name: str
    provider: Provider
    api_key_masked: Optional[str] = None
    address: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# --- Subscription / Split schemas ---

class SubscriptionMemberBase(BaseModel):
    name: str

class SubscriptionMemberCreate(SubscriptionMemberBase):
    pass

class SubscriptionMemberUpdate(BaseModel):
    name: Optional[str] = None

class SubscriptionMember(SubscriptionMemberBase):
    id: int
    subscription_id: int

    model_config = ConfigDict(from_attributes=True)


class CyclePaymentBase(BaseModel):
    member_id: int
    amount: float
    paid_at: Optional[str] = None

class CyclePaymentUpdate(BaseModel):
    paid_at: Optional[str] = None

class CyclePayment(CyclePaymentBase):
    id: int
    cycle_id: int

    model_config = ConfigDict(from_attributes=True)


class CyclePaymentWithMember(CyclePayment):
    member: SubscriptionMember

    model_config = ConfigDict(from_attributes=True)


class CollectionCycleBase(BaseModel):
    cycle_start: str
    note: Optional[str] = None

class CollectionCycleCreate(CollectionCycleBase):
    pass

class CollectionCycle(CollectionCycleBase):
    id: int
    subscription_id: int
    created_at: datetime
    payments: List[CyclePaymentWithMember] = []

    model_config = ConfigDict(from_attributes=True)


class SubscriptionBase(BaseModel):
    name: str
    total_cost: float = Field(ge=0)
    total_shares: int = Field(ge=1)
    my_shares: int = Field(ge=1)
    collection_period_months: Optional[int] = 6

    @model_validator(mode='after')
    def _check_shares(self):
        if self.my_shares > self.total_shares:
            raise ValueError("my_shares must be <= total_shares")
        return self

class SubscriptionCreate(SubscriptionBase):
    members: List[SubscriptionMemberCreate] = []

class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    total_cost: Optional[float] = Field(default=None, ge=0)
    total_shares: Optional[int] = Field(default=None, ge=1)
    my_shares: Optional[int] = Field(default=None, ge=1)
    collection_period_months: Optional[int] = None

    @model_validator(mode='after')
    def _check_shares(self):
        if self.my_shares is not None and self.total_shares is not None and self.my_shares > self.total_shares:
            raise ValueError("my_shares must be <= total_shares")
        return self

class Subscription(SubscriptionBase):
    id: int
    created_at: datetime
    members: List[SubscriptionMember] = []
    cycles: List[CollectionCycle] = []

    model_config = ConfigDict(from_attributes=True)
