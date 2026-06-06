from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class CryptoConnection(Base):
    __tablename__ = "crypto_connections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String) # e.g. "My Pionex", "Main Wallet"
    provider = Column(String) # "pionex", "max", "wallet"
    api_key = Column(String, nullable=True)
    api_secret = Column(String, nullable=True)
    address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

    assets = relationship("Asset", back_populates="connection", cascade="all, delete-orphan")

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    ticker = Column(String, index=True) # e.g., AAPL, BTC/USDT
    category = Column(String, index=True) # e.g., Investment, Fluid, Fixed, Receivables, Liabilities
    sub_category = Column(String, nullable=True) # e.g., Cash, Stock, Real Estate
    current_price = Column(Float, default=0.0)
    last_updated_at = Column(DateTime, default=datetime.now)
    is_favorite = Column(Boolean, default=False)
    include_in_net_worth = Column(Boolean, default=True)
    icon = Column(String, nullable=True)
    manual_avg_cost = Column(Float, nullable=True)
    payment_due_day = Column(Integer, nullable=True)  # Day of month for credit card payment (1-31)
    source = Column(String, default="manual") # manual, max, binance
    
    # Pro Features
    network = Column(String, nullable=True) # e.g. "Scroll", "Ethereum", "BSC"
    contract_address = Column(String, nullable=True) # 0x...
    decimals = Column(Integer, default=18) # for Web3 precision

    # Multi-Integration
    connection_id = Column(Integer, ForeignKey("crypto_connections.id"), nullable=True)
    connection = relationship("CryptoConnection", back_populates="assets")

    transactions = relationship("Transaction", back_populates="asset")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    amount = Column(Float) # Quantity
    buy_price = Column(Float) # Average Cost
    date = Column(DateTime, default=datetime.now)
    is_transfer = Column(Boolean, default=False)
    note = Column(String, nullable=True)  # Optional memo / description

    asset = relationship("Asset", back_populates="transactions")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    target_amount = Column(Float)
    goal_type = Column(String)  # "NET_WORTH" | "ASSET_ALLOCATION"
    currency = Column(String, default="TWD")
    description = Column(String, nullable=True)  # human-readable note
    allocation_data = Column(String, nullable=True)  # JSON: {"Stock": 60, "Fluid": 40} for ASSET_ALLOCATION
    created_at = Column(DateTime, default=datetime.now)


class BudgetCategory(Base):
    __tablename__ = "budget_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)          # e.g. "食物", "交通"
    icon = Column(String, nullable=True)       # Emoji, e.g. "🍜"
    budget_amount = Column(Float)              # Monthly budget in TWD
    color = Column(String, nullable=True)      # Optional color hint
    note = Column(String, nullable=True)       # Optional note
    group_name = Column(String, nullable=True) # Macro group: "Fixed", "Living", "Investment", "Growth"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

class IncomeItem(Base):
    __tablename__ = "income_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)          # e.g. "Salary", "Dividend"
    amount = Column(Float)                     # Expected monthly income
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String)


class NetWorthHistory(Base):
    """Daily net worth snapshots for fast historical queries."""
    __tablename__ = "net_worth_history"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, unique=True, index=True)  # YYYY-MM-DD
    value = Column(Float)
    breakdown = Column(String, nullable=True)   # JSON: {"Fluid": 100, "Stock": 200, ...}
    created_at = Column(DateTime, default=datetime.now)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    total_cost = Column(Float)            # 每個收款週期的總費用
    total_shares = Column(Integer)        # 總份數（所有人）
    my_shares = Column(Integer)           # 我自己負責的份數
    collection_period_months = Column(Integer, default=6)  # 收款週期（月）
    created_at = Column(DateTime, default=datetime.now)

    members = relationship("SubscriptionMember", back_populates="subscription", cascade="all, delete-orphan")
    cycles = relationship("CollectionCycle", back_populates="subscription", cascade="all, delete-orphan")


class SubscriptionMember(Base):
    """需要向我付款的成員（不含我自己負責的份）"""
    __tablename__ = "subscription_members"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    name = Column(String)

    subscription = relationship("Subscription", back_populates="members")
    payments = relationship("CyclePayment", back_populates="member", cascade="all, delete-orphan")


class CollectionCycle(Base):
    __tablename__ = "collection_cycles"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    cycle_start = Column(String)          # YYYY-MM-DD
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    subscription = relationship("Subscription", back_populates="cycles")
    payments = relationship("CyclePayment", back_populates="cycle", cascade="all, delete-orphan")


class CyclePayment(Base):
    __tablename__ = "cycle_payments"

    id = Column(Integer, primary_key=True, index=True)
    cycle_id = Column(Integer, ForeignKey("collection_cycles.id"))
    member_id = Column(Integer, ForeignKey("subscription_members.id"))
    paid_at = Column(String, nullable=True)   # YYYY-MM-DD，null = 未付
    note = Column(String, nullable=True)

    cycle = relationship("CollectionCycle", back_populates="payments")
    member = relationship("SubscriptionMember", back_populates="payments")
